/**
 * LIC does not key its premium rate table, or its rebate, on completed years.
 *
 * Probing the calculator across a spread of dates of birth shows the quoted
 * rate stepping on a six-month boundary. On plan 833 a customer born
 * 1978-07-12 (456 whole months to the 2018-07-12 calculation date, band 80) is
 * quoted 103.25 per 1000, while one born 1978-01-12 (486 months, band 81) is
 * quoted 103.65 - and both are 40 years old. The step is real and large: 92.5%
 * of plan 833's age/term combinations differ between the two halves of an age
 * year, by up to 0.83%.
 *
 * The band is therefore
 *
 *     floor(complete months from date of birth to the commencement date / 6)
 *
 * and it depends on the commencement date too, not only on the date of birth:
 * the same customer can move from band 76 to band 77 purely by waiting six
 * months before the policy starts.
 *
 * Plans that are not LIC legacy plans never store a band, so callers can always
 * fall back to plain entry age.
 */

/** Whole months from `from` to `to`. */
export function completeMonthsBetween(from: Date, to: Date): number {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());

  // If the day-of-month has not been reached, the last month is incomplete.
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;

  return months;
}

/**
 * The half-year age band LIC would use for this customer.
 * Returns null when either date is missing or nonsensical, so callers can fall
 * back to integer entry age.
 */
export function licAgeBand(
  dateOfBirth: Date | string | null | undefined,
  onDate: Date | string | null | undefined,
): number | null {
  if (!dateOfBirth || !onDate) return null;

  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const ref = typeof onDate === "string" ? new Date(onDate) : onDate;

  if (Number.isNaN(dob.getTime()) || Number.isNaN(ref.getTime())) return null;

  const months = completeMonthsBetween(dob, ref);
  if (months < 0) return null;

  return Math.floor(months / 6);
}

/** Completed years, i.e. plain entry age - kept for the UI and validation. */
export function completedYears(dob: Date, onDate: Date): number {
  const months = completeMonthsBetween(dob, onDate);
  return Math.floor(months / 12);
}