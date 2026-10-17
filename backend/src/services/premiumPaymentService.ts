import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notificationService.js";
import { NotificationType } from "@prisma/client";
import { addMonths } from "date-fns";
import {
  LAPSED_THRESHOLD_DAYS,
  LAPSED_EXCLUDED_POLICY_STATUS_CODES,
} from "../constants/lapsedPolicy.js";

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
    include: {
      CustomerMaster: true,
      customer: true,
      product: true,
      premiumMode: true,
      advisor: true,
      branch: true,
      premium: true,
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
  let payment = await prisma.premiumPayment.findUnique({
    where: { id },
    include: paymentInclude,
  });

  if (!payment) {
    // If id is a policyId, retrieve the most recent premium payment for that policy
    payment = await prisma.premiumPayment.findFirst({
      where: { policyId: id },
      include: paymentInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  if (!payment) {
    // If id is a notificationId, retrieve the policyId and find its payment
    const notif = await prisma.notification.findUnique({
      where: { id },
    });
    if (notif?.policyId) {
      payment = await prisma.premiumPayment.findFirst({
        where: { policyId: notif.policyId },
        include: paymentInclude,
        orderBy: { createdAt: "desc" },
      });
    }
  }

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

  // If the policy was marked LAPSED and this payment brings it back up to date, restore status to IN-FORCE / ACTIVE
  const policyRecord = await prisma.policy.findUnique({
    where: { id: data.policyId },
    include: { status: true },
  });

  const isLapsed = policyRecord?.status?.statusCode?.toUpperCase() === "LAPSED";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isUpToDate =
    !parsedFutureDueDate ||
    Math.floor((today.getTime() - new Date(parsedFutureDueDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)) < 60;

  if (isLapsed && isUpToDate && (status.statusCode === "PAID" || !!data.paidDate)) {
    const activeStatus = await prisma.policyStatusMaster.findFirst({
      where: {
        OR: [
          { statusCode: { equals: "IN-FORCE", mode: "insensitive" } },
          { statusCode: { equals: "ACTIVE", mode: "insensitive" } },
        ],
      },
    });

    await prisma.policy.update({
      where: { id: data.policyId },
      data: {
        nextPremiumDueDate: parsedFutureDueDate,
        statusId: activeStatus ? activeStatus.id : undefined,
      },
    });
  } else {
    await prisma.policy.update({
      where: { id: data.policyId },
      data: { nextPremiumDueDate: parsedFutureDueDate },
    });
  }

  //Create Notification
  await prisma.$transaction(async (tx) => {
    await createNotification(tx, {
        title: "Policy Premium Paid",
        message: `Premium for Policy (${policy.policyNumber}) has been paid on ${data.paidDate}. [paymentId:${payment.id}]`,
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
    where: { id: existing.policyId },
    include: { status: true, premiumMode: true },
  });

  const formattedDueDate = data.dueDate ? new Date(data.dueDate) : existing.dueDate;
  const formattedPaidDate = data.paidDate ? new Date(data.paidDate) : (data.paidDate === null ? null : existing.paidDate);

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

  await validatePaymentStatus(data.paymentStatusId);

  const updatedPayment = await prisma.premiumPayment.update({
    where: { id },
    data: {
      installmentNo: data.installmentNo,
      dueDate: formattedDueDate,
      paidDate: formattedPaidDate,
      premiumAmount: data.premiumAmount,
      lateFee: data.lateFee,
      paymentMode: data.paymentMode,
      paymentStatusId: data.paymentStatusId,
      paymentDetails: data.paymentDetails,
    },
    include: paymentInclude,
  });

  // Re-evaluate policy status & nextPremiumDueDate
  if (policy) {
    const isPaymentPaid = !!formattedPaidDate || updatedPayment.paymentStatus?.statusCode === "PAID";
    const parsedFutureDueDate =
      data.futureDueDate && !isNaN(new Date(data.futureDueDate).getTime())
        ? new Date(data.futureDueDate)
        : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isPaymentPaid) {
      const isLapsed = policy.status?.statusCode?.toUpperCase() === "LAPSED";
      const isUpToDate =
        !parsedFutureDueDate ||
        Math.floor((today.getTime() - new Date(parsedFutureDueDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)) < LAPSED_THRESHOLD_DAYS;

      if (isLapsed && isUpToDate) {
        const activeStatus = await prisma.policyStatusMaster.findFirst({
          where: {
            OR: [
              { statusCode: { equals: "IN-FORCE", mode: "insensitive" } },
              { statusCode: { equals: "ACTIVE", mode: "insensitive" } },
            ],
          },
        });

        await prisma.policy.update({
          where: { id: policy.id },
          data: {
            nextPremiumDueDate: parsedFutureDueDate || policy.nextPremiumDueDate,
            statusId: activeStatus ? activeStatus.id : undefined,
          },
        });
      } else if (parsedFutureDueDate) {
        await prisma.policy.update({
          where: { id: policy.id },
          data: { nextPremiumDueDate: parsedFutureDueDate },
        });
      }
    } else {
      // Payment was updated to unpaid
      const remainingPaidPayments = await prisma.premiumPayment.findMany({
        where: {
          policyId: policy.id,
          id: { not: id },
          OR: [
            { paidDate: { not: null } },
            { paymentStatus: { statusCode: "PAID" } },
          ],
        },
        orderBy: [
          { installmentNo: "desc" },
          { dueDate: "desc" },
        ],
      });

      let targetDueDate = new Date(formattedDueDate);
      if (remainingPaidPayments.length > 0) {
        const latestPaid = remainingPaidPayments[0];
        const modeMonths = policy.premiumMode?.months || 12;
        const nextAfterPaid = addMonths(new Date(latestPaid.dueDate), modeMonths);
        if (nextAfterPaid < targetDueDate) {
          targetDueDate = nextAfterPaid;
        }
      }

      const due = new Date(targetDueDate);
      due.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const isExcluded = LAPSED_EXCLUDED_POLICY_STATUS_CODES.includes(
        policy.status?.statusCode?.toUpperCase() || ""
      );

      if (daysOverdue >= LAPSED_THRESHOLD_DAYS && !isExcluded) {
        const lapsedStatus = await prisma.policyStatusMaster.findFirst({
          where: { statusCode: { equals: "LAPSED", mode: "insensitive" } },
        });

        if (lapsedStatus) {
          await prisma.policy.update({
            where: { id: policy.id },
            data: {
              nextPremiumDueDate: targetDueDate,
              statusId: lapsedStatus.id,
            },
          });
        }
      } else {
        await prisma.policy.update({
          where: { id: policy.id },
          data: { nextPremiumDueDate: targetDueDate },
        });
      }
    }
  }

  // Create Notification
  await prisma.$transaction(async (tx) => {
    await createNotification(tx, {
      title: "Policy Premium Updated",
      message: `Premium record for Policy (${policy?.policyNumber}) has been updated. [paymentId:${id}]`,
      type: NotificationType.PREMIUM_UPDATED,
      policyId: policy?.id,
    });
  });

  return updatedPayment;
};

export const deletePayment = async (id: string) => {
  const payment = await prisma.premiumPayment.findUnique({
    where: { id },
    include: {
      paymentStatus: true,
      policy: {
        include: {
          status: true,
          premiumMode: true,
        },
      },
    },
  });

  if (!payment) throw new AppError("Premium payment not found", 404);

  const policy = payment.policy;

  await prisma.premiumPayment.delete({ where: { id } });

  // Recalculate policy state after deleting this payment
  let targetDueDate = new Date(payment.dueDate);

  // Check remaining paid payments for this policy
  const remainingPaidPayments = await prisma.premiumPayment.findMany({
    where: {
      policyId: payment.policyId,
      OR: [
        { paidDate: { not: null } },
        { paymentStatus: { statusCode: "PAID" } },
      ],
    },
    orderBy: [
      { installmentNo: "desc" },
      { dueDate: "desc" },
    ],
  });

  if (remainingPaidPayments.length > 0) {
    const latestPaid = remainingPaidPayments[0];
    const modeMonths = policy?.premiumMode?.months || 12;
    const nextAfterPaid = addMonths(new Date(latestPaid.dueDate), modeMonths);
    if (nextAfterPaid < targetDueDate) {
      targetDueDate = nextAfterPaid;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(targetDueDate);
  due.setHours(0, 0, 0, 0);

  const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const isExcluded = LAPSED_EXCLUDED_POLICY_STATUS_CODES.includes(
    policy?.status?.statusCode?.toUpperCase() || ""
  );

  let transitionedToLapsed = false;

  if (daysOverdue >= LAPSED_THRESHOLD_DAYS && !isExcluded) {
    const lapsedStatus = await prisma.policyStatusMaster.findFirst({
      where: { statusCode: { equals: "LAPSED", mode: "insensitive" } },
    });

    if (lapsedStatus && policy) {
      await prisma.policy.update({
        where: { id: policy.id },
        data: {
          nextPremiumDueDate: targetDueDate,
          statusId: lapsedStatus.id,
        },
      });
      transitionedToLapsed = true;
    } else if (policy) {
      await prisma.policy.update({
        where: { id: policy.id },
        data: { nextPremiumDueDate: targetDueDate },
      });
    }
  } else if (policy) {
    await prisma.policy.update({
      where: { id: policy.id },
      data: { nextPremiumDueDate: targetDueDate },
    });
  }

  // Create Notifications
  await prisma.$transaction(async (tx) => {
    await createNotification(tx, {
      title: "Policy Premium Deleted",
      message: `Premium record for Policy (${policy?.policyNumber}) has been deleted.`,
      type: NotificationType.PREMIUM_DELETED,
      policyId: policy?.id,
    });

    if (transitionedToLapsed && policy) {
      await createNotification(tx, {
        title: "Policy Lapsed",
        message: `Policy (${policy.policyNumber}) has reverted to Lapsed status due to unpaid premium due on ${due.toISOString().slice(0, 10)} (${daysOverdue} days overdue).`,
        type: NotificationType.POLICY_LAPSED,
        policyId: policy.id,
      });
    }
  });
};
