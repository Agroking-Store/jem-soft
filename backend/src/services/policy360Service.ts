import { prisma } from "../config/database.js";
import { addMonths } from "date-fns";
import {
  LAPSED_THRESHOLD_DAYS,
  LAPSED_EXCLUDED_POLICY_STATUS_CODES,
  PAID_PAYMENT_STATUS_CODES,
  FIRST_INSTALLMENT_IMPLICITLY_PAID,
} from "../constants/lapsedPolicy.js";

const MS_PER_DAY = 86_400_000;

export interface LapsedPolicyRow {
  policyId: string;
  policyNumber: string;
  lifeAssuredName: string;
  planNumber: string | null;
  planName: string;
  premiumAmount: number;
  premiumMode: string;
  premiumDueDate: string;
  daysUnpaid: number;
  mobileNumber: string | null;
  status: string;
}

interface PaymentLike {
  installmentNo: number | null;
  dueDate: Date;
  paidDate: Date | null;
  premiumAmount: unknown;
  paymentStatus: { statusCode: string } | null;
}

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buildLifeAssuredName = (customer: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string =>
  [customer.firstName, customer.middleName, customer.lastName]
    .filter((part) => part && part.trim())
    .join(" ");

const isSuccessfulPayment = (payment: PaymentLike): boolean =>
  !!payment.paidDate ||
  PAID_PAYMENT_STATUS_CODES.includes(payment.paymentStatus?.statusCode ?? "");

/**
 * Total number of premium installments of the policy, derived from the
 * premium paying term (years) and the premium mode interval (months).
 * e.g. Monthly (1) with PPT 15 -> 180 installments; Half-Yearly (6) with
 * PPT 15 -> 30 installments. Returns null when the PPT is unknown, in
 * which case the schedule is simply bounded by today.
 */
const getTotalInstallments = (
  premiumPayingTerm: number | null,
  monthsInterval: number,
): number | null => {
  if (!premiumPayingTerm || premiumPayingTerm <= 0) return null;
  const perYear = 12 / monthsInterval;
  return Math.floor(perYear * premiumPayingTerm);
};

/**
 * Generate the expected premium installment due dates of a policy up to
 * today, based on the existing project schedule logic.
 *
 * Slot k=0 is the installment due AT commencementDate (the initial premium,
 * implicitly paid at issue — policyService.createPolicy sets
 * nextPremiumDueDate = commencementDate + premiumMode.months and
 * PremiumPaymentForm records the first payment with installmentNo=1 at
 * that next due date). Slots k>=1 fall on
 * commencementDate + k * premiumMode.months and match payment
 * installmentNo (payment #1 -> k=1).
 *
 * Returns [{ installmentNo, dueDate }] with dueDate <= today, ordered asc.
 */
const generateDueInstallments = (
  commencementDate: Date,
  monthsInterval: number,
  premiumPayingTerm: number | null,
  today: Date,
): Array<{ installmentNo: number; dueDate: Date }> => {
  if (!monthsInterval || monthsInterval <= 0) return [];

  const totalInstallments = getTotalInstallments(
    premiumPayingTerm,
    monthsInterval,
  );

  const dueInstallments: Array<{ installmentNo: number; dueDate: Date }> = [];
  let installmentNo = 0;
  // Hard safety cap to avoid unbounded loops on odd data.
  while (installmentNo <= 1000) {
    const dueDate = addMonths(
      startOfDay(commencementDate),
      installmentNo * monthsInterval,
    );
    if (dueDate > today) break;
    if (totalInstallments !== null && installmentNo >= totalInstallments) break;
    dueInstallments.push({ installmentNo, dueDate });
    installmentNo++;
  }
  return dueInstallments;
};

/**
 * Returns all policies whose OLDEST UNPAID premium installment (due on or
 * before today) has been unpaid for at least LAPSED_THRESHOLD_DAYS days.
 *
 * - Expected installments are generated from the premium schedule
 *   (commencementDate + premium mode interval), so a policy is detected
 *   even when NO PremiumPayment record exists for an overdue installment.
 * - An installment is paid only when a successful payment record exists
 *   for it (or, for the first installment, per the existing system
 *   convention that it is collected at commencement).
 * - Future due installments are never considered.
 * - If all due installments are paid, the policy is not returned.
 * - Policies with no premium-payment data are handled safely.
 * - Policies that are no longer active premium-paying policies (claimed,
 *   matured/completed, surrendered, fully/reduced paid-up) are excluded.
 */
export const getLapsedPolicies = async (
  search?: string,
): Promise<LapsedPolicyRow[]> => {
  const today = startOfDay(new Date());

  // Single query with includes — avoids N+1 queries.
  const policies = await prisma.policy.findMany({
    where: {
      status: {
        statusCode: { notIn: LAPSED_EXCLUDED_POLICY_STATUS_CODES },
      },
    },
    select: {
      id: true,
      policyNumber: true,
      commencementDate: true,
      premiumPayingTerm: true,
      CustomerMaster: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          contactInfo: { select: { mobile1: true } },
        },
      },
      product: { select: { planNumber: true, productName: true } },
      premiumMode: { select: { modeName: true, months: true } },
      premium: {
        select: { installmentPremium: true, totalInstallmentPremium: true },
      },
      premiumPayments: {
        orderBy: [{ dueDate: "asc" }],
        select: {
          installmentNo: true,
          dueDate: true,
          paidDate: true,
          premiumAmount: true,
          paymentStatus: { select: { statusCode: true } },
        },
      },
    },
  });

  const normalizedSearch = search?.trim().toLowerCase();

  const lapsedPolicies: LapsedPolicyRow[] = [];

  for (const policy of policies) {
    const monthsInterval = policy.premiumMode?.months ?? 0;
    if (!monthsInterval || monthsInterval <= 0) continue;

    const commencement = startOfDay(policy.commencementDate);
    if (commencement > today) continue;

    // Expected installments due so far, from the premium schedule.
    const dueInstallments = generateDueInstallments(
      commencement,
      monthsInterval,
      policy.premiumPayingTerm ?? null,
      today,
    );
    if (dueInstallments.length === 0) continue;

    // Index payment records by installment number / due date string.
    const paidByNo = new Set<number>();
    const paidByDate = new Set<string>();
    const unpaidByNo = new Set<number>();
    const unpaidByDate = new Set<string>();
    for (const payment of policy.premiumPayments) {
      if (isSuccessfulPayment(payment)) {
        if (payment.installmentNo != null) paidByNo.add(payment.installmentNo);
        paidByDate.add(toDateString(payment.dueDate));
      } else {
        if (payment.installmentNo != null) unpaidByNo.add(payment.installmentNo);
        unpaidByDate.add(toDateString(payment.dueDate));
      }
    }

    const isPaidInstallment = (
      installmentNo: number,
      dueDateString: string,
    ): boolean => {
      // A successful payment record for this installment marks it paid.
      if (paidByNo.has(installmentNo) || paidByDate.has(dueDateString)) {
        return true;
      }
      // Existing system convention: the initial premium due at commencement
      // (slot 0) is implicitly paid unless explicitly marked unpaid.
      if (
        FIRST_INSTALLMENT_IMPLICITLY_PAID &&
        installmentNo === 0 &&
        !unpaidByNo.has(0) &&
        !unpaidByDate.has(dueDateString)
      ) {
        return true;
      }
      return false;
    };

    // Oldest unpaid installment (list is ordered by due date asc).
    const oldestUnpaid = dueInstallments.find(
      ({ installmentNo, dueDate }) =>
        !isPaidInstallment(installmentNo, toDateString(dueDate)),
    );
    if (!oldestUnpaid) continue;

    const daysUnpaid = Math.floor(
      (today.getTime() - startOfDay(oldestUnpaid.dueDate).getTime()) /
        MS_PER_DAY,
    );

    if (daysUnpaid < LAPSED_THRESHOLD_DAYS) continue;

    // Prefer the explicit payment record's amount; fall back to the
    // policy's calculated installment premium.
    const explicitPayment = policy.premiumPayments.find(
      (payment) =>
        (payment.installmentNo != null &&
          payment.installmentNo === oldestUnpaid.installmentNo) ||
        toDateString(payment.dueDate) === toDateString(oldestUnpaid.dueDate),
    );
    const fallbackPremium = Number(
      policy.premium?.totalInstallmentPremium ??
        policy.premium?.installmentPremium ??
        0,
    );
    const premiumAmount = explicitPayment
      ? Number(explicitPayment.premiumAmount)
      : fallbackPremium;

    const lifeAssuredName = buildLifeAssuredName(policy.CustomerMaster);

    const row: LapsedPolicyRow = {
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      lifeAssuredName,
      planNumber: policy.product?.planNumber ?? null,
      planName: policy.product?.productName ?? "",
      premiumAmount,
      premiumMode: policy.premiumMode?.modeName ?? "",
      premiumDueDate: toDateString(oldestUnpaid.dueDate),
      daysUnpaid,
      mobileNumber: policy.CustomerMaster?.contactInfo?.mobile1 ?? null,
      status: "Lapsed",
    };

    if (normalizedSearch) {
      const searchable = [
        row.policyNumber,
        row.lifeAssuredName,
        row.planNumber ?? "",
        row.planName,
        row.mobileNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(normalizedSearch)) continue;
    }

    lapsedPolicies.push(row);
  }

  // Most-overdue policies first.
  lapsedPolicies.sort((a, b) => b.daysUnpaid - a.daysUnpaid);

  return lapsedPolicies;
};
