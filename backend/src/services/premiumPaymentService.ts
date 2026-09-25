import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notificationService.js";
import { NotificationType } from "@prisma/client";

export interface PremiumPaymentData {
  policyId: string;
  installmentNo?: number;
  dueDate: string;
  paidDate?: string | null;
  premiumAmount: number;
  lateFee?: number | null;
  paymentMode?: string | null;
  paymentStatusId?: string;
  futureDueDate : string;
  paymentDetails : string;
}

export interface PremiumPaymentUpdateData {
  installmentNo?: number;
  dueDate?: string;
  paidDate?: string | null;
  premiumAmount?: number;
  lateFee?: number | null;
  paymentMode?: string | null;
  paymentStatusId?: string;
   futureDueDate : string;
  paymentDetails : string;
}

const paymentInclude = {
  paymentStatus: true,
  policy: {
    select: {
      id: true,
      policyNumber: true,
      commencementDate: true,
      nextPremiumDueDate: true,
      CustomerMaster: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
};

const getStatus = async (statusCode: string) => {
  const status = await prisma.paymentStatusMaster.findUnique({
    where: { statusCode },
  });

  if (!status) {
    throw new AppError(`Payment status ${statusCode} is not configured`, 500);
  }

  return status;
};

const validateAmount = (amount: number, fieldName = "premiumAmount") => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(`${fieldName} must be greater than zero`, 400);
  }
};


const validatePaymentStatus = async (paymentStatusId?: string) => {
  if (!paymentStatusId) return undefined;

  const status = await prisma.paymentStatusMaster.findUnique({
    where: { id: paymentStatusId },
  });

  if (!status) throw new AppError("Payment status not found", 404);
  return status;
};

export const getPaymentsByPolicyId = async (policyId: string) => {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: { id: true },
  });

  if (!policy) throw new AppError("Policy not found", 404);

  return prisma.premiumPayment.findMany({
    where: { policyId },
    include: paymentInclude,
    orderBy: [
      { installmentNo: "asc" },
      { dueDate: "asc" },
    ],
  });
};

export const getAllPayments = async () => {
  return prisma.premiumPayment.findMany({
    include: paymentInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const getPaymentById = async (id: string) => {
  const payment = await prisma.premiumPayment.findUnique({
    where: { id },
    include: paymentInclude,
  });

  if (!payment) throw new AppError("Premium payment not found", 404);
  return payment;
};

export const createPayment = async (data: PremiumPaymentData) => {
  const policy = await prisma.policy.findUnique({
    where: { id: data.policyId },
    select: { id: true , policyNumber : true  },
    
  });

  if (!policy) throw new AppError("Policy not found", 404);

  if (data.installmentNo !== undefined && data.installmentNo !== null) {
    if (!Number.isInteger(data.installmentNo) || data.installmentNo < 1) {
      throw new AppError("installmentNo must be a positive integer", 400);
    }

    const existingPayments = await prisma.premiumPayment.findMany({
      where: {
        policyId: data.policyId,
        paymentStatus: {
          statusCode: { notIn: ["FAILED", "CANCELLED"] },
        },
      },
      select: { installmentNo: true },
    });

    const highestPaid = existingPayments.reduce((max, p) => {
      const num = Number(p.installmentNo);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);

    if (highestPaid > 0 && data.installmentNo <= highestPaid) {
      throw new AppError(
        `Installment #${data.installmentNo} has already been paid for this policy. Next installment must be at least #${highestPaid + 1}.`,
        400,
      );
    }
  }

  validateAmount(data.premiumAmount);
  
  const status = await validatePaymentStatus(data.paymentStatusId) ?? await getStatus(data.paidDate ? "PAID" : "UNPAID");
  const formattedDueDate = new Date(data.dueDate);
  const formattedPaidDate = data.paidDate ? new Date(data.paidDate) : null;

  const payment = await prisma.premiumPayment.create({
    data: {
      policyId: data.policyId,
      installmentNo: data.installmentNo ?? null,
      dueDate: formattedDueDate,
      paidDate: formattedPaidDate,
      premiumAmount: data.premiumAmount,
      lateFee: data.lateFee ?? null,
      paymentMode: data.paymentMode ?? null,
      paymentStatusId: status.id,
      paymentDetails : data.paymentDetails,
    },
    include: paymentInclude,
  });

  const parsedFutureDueDate =
    data.futureDueDate && !isNaN(new Date(data.futureDueDate).getTime())
      ? new Date(data.futureDueDate)
      : null;
  await prisma.policy.update({
    where: { id: data.policyId },
    data: { nextPremiumDueDate: parsedFutureDueDate },
  });

  //Create Notification
  await prisma.$transaction(async (tx) => {
    await createNotification(tx, {
        title: "Policy Premium Paid",
        message: `Premium for Policy (${policy.policyNumber}) has been paid on ${data.paidDate}.`,
        type: NotificationType.PREMIUM_PAID,
        policyId: policy.id,
      });
  });

   

  return payment;
};

export const updatePayment = async (id: string, data: PremiumPaymentUpdateData) => {
  const existing = await prisma.premiumPayment.findUnique({
    where: { id },
  });

  if (!existing) throw new AppError("Premium payment not found", 404);

  const policy = await prisma.policy.findUnique({
    where: { id : existing.policyId },
    select: { id: true , policyNumber : true  },
  });

  const formattedDueDate = data.dueDate ? new Date(data.dueDate) : existing.dueDate;
  const formattedPaidDate = data.paidDate ? new Date(data.paidDate) : existing.paidDate;

  if (data.installmentNo !== undefined && data.installmentNo !== null) {
    if (!Number.isInteger(data.installmentNo) || data.installmentNo < 1) {
      throw new AppError("installmentNo must be a positive integer", 400);
    }

    const existingPayments = await prisma.premiumPayment.findMany({
      where: {
        policyId: existing.policyId,
        id: { not: id },
        paymentStatus: {
          statusCode: { notIn: ["FAILED", "CANCELLED"] },
        },
      },
      select: { installmentNo: true },
    });

    const highestPaid = existingPayments.reduce((max, p) => {
      const num = Number(p.installmentNo);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);

    if (highestPaid > 0 && data.installmentNo <= highestPaid) {
      throw new AppError(
        `Installment #${data.installmentNo} has already been paid for this policy. Next installment must be at least #${highestPaid + 1}.`,
        400,
      );
    }
  }

  if (data.premiumAmount !== undefined) validateAmount(data.premiumAmount);


  const status = await validatePaymentStatus(data.paymentStatusId);

  //Create Notification
  await prisma.$transaction(async (tx) => {
    await createNotification(tx, {
        title: "Policy Premium Updated",
        message: `Premium record for Policy (${policy?.policyNumber}) has been updated.`,
        type: NotificationType.PREMIUM_UPDATED,
        policyId: policy?.id,
      });
  });

  return prisma.premiumPayment.update({
    where: { id },
    data: {
      installmentNo: data.installmentNo,
      dueDate: formattedDueDate,
      paidDate: formattedPaidDate,
      premiumAmount: data.premiumAmount,
      lateFee: data.lateFee,
      paymentMode: data.paymentMode,
      paymentStatusId: data.paymentStatusId,
      paymentDetails : data.paymentDetails,
    },
    include: paymentInclude,
  });
};

// export const markPaymentAsPaid = async (
//   id: string,
//   data: { paidDate: string; paymentMode: string; receiptNumber?: string | null; lateFee?: number | null },
// ) => {
//   const payment = await prisma.premiumPayment.findUnique({ where: { id } });
//   if (!payment) throw new AppError("Premium payment not found", 404);

//   const paidDate = validateDate(data.paidDate, "paidDate");
//   if (paidDate < payment.dueDate) {
//     throw new AppError("paidDate cannot be before dueDate", 400);
//   }
//   if (!data.paymentMode?.trim()) {
//     throw new AppError("paymentMode is required", 400);
//   }
//   if (data.lateFee !== undefined && data.lateFee !== null) validateAmount(data.lateFee, "lateFee");

//   const paidStatus = await getStatus("PAID");

//   return prisma.premiumPayment.update({
//     where: { id },
//     data: {
//       paidDate,
//       paymentMode: data.paymentMode.trim(),
//       lateFee: data.lateFee ?? payment.lateFee,
//       paymentStatusId: paidStatus.id,
//     },
//     include: paymentInclude,
//   });
// };

export const deletePayment = async (id: string) => {
  const payment = await prisma.premiumPayment.findUnique({ where: { id } });
  if (!payment) throw new AppError("Premium payment not found", 404);

  const policy = await prisma.policy.findUnique({
    where: { id : payment?.policyId },
    select: { id: true , policyNumber : true  },
    
  });
  // const paidStatus = await getStatus("PAID");
  // if (payment.paymentStatusId === paidStatus.id) {
  //   throw new AppError("Paid premium payments cannot be deleted", 400);
  // }

  await prisma.premiumPayment.delete({ where: { id } });

  //Create Notification
  await prisma.$transaction(async (tx) => {
    await createNotification(tx, {
        title: "Policy Premium Deleted",
        message: `Premium record for Policy (${policy?.policyNumber}) has been deleted.`,
        type: NotificationType.PREMIUM_DELETED,
        policyId: policy?.id,
      });
  });
};
