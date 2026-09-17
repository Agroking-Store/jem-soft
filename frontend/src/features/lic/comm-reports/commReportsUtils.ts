/**
 * Helper to calculate default date range for commission reports.
 * By default: previous full calendar month.
 * E.g., If current date is in September 2026 -> 1st Aug 2026 to 31st Aug 2026.
 * When in October 2026 -> 1st Sept 2026 to 30th Sept 2026.
 */
export function getDefaultCommissionDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (e.g. 8 for Sept)

  // 1st day of previous month
  const prevMonthFirstDay = new Date(year, month - 1, 1);
  // Last day of previous month (day 0 of current month)
  const prevMonthLastDay = new Date(year, month, 0);

  const formatLocalDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    fromDate: formatLocalDate(prevMonthFirstDay),
    toDate: formatLocalDate(prevMonthLastDay),
  };
}

/**
 * Safely format customer full name
 */
export function getCustomerFullName(customer?: {
  salutation?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  name?: string | null;
  groupName?: string | null;
} | null): string {
  if (!customer) return "-";
  
  const parts = [
    customer.salutation,
    customer.firstName,
    customer.middleName,
    customer.lastName,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return customer.name || customer.groupName || "-";
}
