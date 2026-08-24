export type Policy360Status =
  | "Active"
  | "Lapsed"
  | "Matured"
  | "Pending"
  | "Claimed";

export interface Policy360Record {
  policyNumber: string;
  lifeAssured: string;
  mobileNumber: string;
  group: string;
  plan: string;
  sumAssured: string;
  premium: string;
  premiumMode: string;
  premiumDueDate: string;
  daysUnpaid: number;
  status: Policy360Status;
}

export const POLICY_360_RECORDS: Policy360Record[] = [
  {
    policyNumber: "120004355",
    lifeAssured: "Narendra Modi",
    mobileNumber: "9876543210",
    group: "Spiderman-001",
    plan: "715 - LIC's New Jeevan Anand",
    sumAssured: "₹1,00,000",
    premium: "₹4,905.54",
    premiumMode: "Half-Yearly",
    premiumDueDate: "18-May-2026",
    daysUnpaid: 93,
    status: "Active",
  },
  {
    policyNumber: "1200043567",
    lifeAssured: "Ramesh Kumar",
    mobileNumber: "9876543210",
    group: "Avengers-004",
    plan: "715 - LIC's New Jeevan Anand",
    sumAssured: "₹2,00,000",
    premium: "₹4,905.54",
    premiumMode: "Half-Yearly",
    premiumDueDate: "18-May-2026",
    daysUnpaid: 93,
    status: "Lapsed",
  },
  {
    policyNumber: "1200043578",
    lifeAssured: "Rahul Patel",
    mobileNumber: "9123456780",
    group: "Justice-012",
    plan: "914 - LIC's Jeevan Umang",
    sumAssured: "₹5,00,000",
    premium: "₹8,250.00",
    premiumMode: "Yearly",
    premiumDueDate: "04-Jun-2026",
    daysUnpaid: 0,
    status: "Pending",
  },
  {
    policyNumber: "1200043589",
    lifeAssured: "Meera Sharma",
    mobileNumber: "9988776655",
    group: "Fantastic-021",
    plan: "935 - LIC's New Jeevan Shanti",
    sumAssured: "₹3,00,000",
    premium: "₹6,100.00",
    premiumMode: "Quarterly",
    premiumDueDate: "22-Apr-2026",
    daysUnpaid: 0,
    status: "Matured",
  },
];

export const POLICY_360_PLANS = Array.from(
  new Set(POLICY_360_RECORDS.map((record) => record.plan)),
);

export const POLICY_360_STATUSES: Policy360Status[] = [
  "Active",
  "Lapsed",
  "Matured",
  "Pending",
  "Claimed",
];
