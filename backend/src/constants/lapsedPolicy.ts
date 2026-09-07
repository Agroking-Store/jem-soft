/**
 * Lapsed policy business rules.
 *
 * A policy is treated as LAPSED when its OLDEST UNPAID premium installment
 * has remained unpaid for LAPSED_THRESHOLD_DAYS days or more.
 *
 * The threshold is defined here (single backend location) instead of
 * repeating the number across multiple files.
 */
export const LAPSED_THRESHOLD_DAYS = 60;

/**
 * Policies with these statuses are no longer active premium-paying policies
 * and must never appear in the Lapsed Policies list.
 *
 * Uses the exact existing statusCode values from
 * backend/prisma/masterData/policyStatuses.ts.
 */
export const LAPSED_EXCLUDED_POLICY_STATUS_CODES: string[] = [
  "CLAIMED",
  "MATURITY CLAIMED",
  "SURRENDERED",
  "COMPLETED",
  "FULLY PAID UP",
  "REDUCED PAID-UP",
];

/** Status codes of PremiumPayment.paymentStatus treated as PAID. */
export const PAID_PAYMENT_STATUS_CODES: string[] = ["PAID"];

/**
 * Whether the FIRST premium installment (due at commencement) is implicitly
 * treated as PAID when no explicit PremiumPayment record exists for it.
 *
 * This mirrors the existing business logic in policyService.createPolicy,
 * which sets nextPremiumDueDate = commencementDate + premiumMode.months
 * (i.e. the first premium is collected at commencement and the next due
 * date starts from the following interval).
 */
export const FIRST_INSTALLMENT_IMPLICITLY_PAID = true;

