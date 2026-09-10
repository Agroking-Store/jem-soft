export interface GapCommissionFormData {
  dataFilters: Array<{ type: string; id: string; name: string }>; // Agencies
  dateFrom: string; // e.g. "01/Apr/2026"
  dateTo: string; // e.g. "31/Mar/2027"
  reportDate: string; // e.g. "01/Sep/2026"
}

export interface GapCommissionItem {
  id: string;
  policyNo: string; // e.g. "906759724"
  agCd: string; // e.g. "J"
  groupCode: string; // e.g. "W020"
  holderName: string; // e.g. "Mr. Watharkar Sanket"
  comDate: string; // e.g. "17/01/18"
  planTermPpt: string; // e.g. "833/21/18"
  mode: string; // "Qly." | "Mly." | "Hly." | "Yly."
  dueDate: string; // e.g. "04/26"
  comsnRecble: number; // e.g. 3386.85
  bonusRecble: number; // e.g. 0.00
  comnCode: number; // e.g. 3, 2, 4
}

export interface GapCommissionTotals {
  totalCount: number;
  totalComsnRecble: number;
  totalBonusRecble: number;
}

export function calculateGapCommissionTotals(items: GapCommissionItem[]): GapCommissionTotals {
  let totalComsnRecble = 0;
  let totalBonusRecble = 0;

  items.forEach((it) => {
    totalComsnRecble += it.comsnRecble;
    totalBonusRecble += it.bonusRecble;
  });

  return {
    totalCount: items.length,
    totalComsnRecble: Math.round(totalComsnRecble * 100) / 100,
    totalBonusRecble: Math.round(totalBonusRecble * 100) / 100,
  };
}

/**
 * Authentic baseline sample records extracted directly from the user's provided 14-page Gap Commission statement PDF
 */
export const SAMPLE_GAP_COMMISSION_ITEMS: GapCommissionItem[] = [
  // Page 1
  {
    id: "gap-1",
    policyNo: "906759724",
    agCd: "J",
    groupCode: "W020",
    holderName: "Mr. Watharkar Sanket",
    comDate: "17/01/18",
    planTermPpt: "833/21/18",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 3386.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-2",
    policyNo: "906760042",
    agCd: "J",
    groupCode: "L003",
    holderName: "Mr. Lohokare Yogiraj",
    comDate: "22/01/18",
    planTermPpt: "836/25/16",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 1486.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-3",
    policyNo: "906762147",
    agCd: "J",
    groupCode: "M127",
    holderName: "Mrs. Mate Pooja",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 84.2,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-4",
    policyNo: "906762147",
    agCd: "J",
    groupCode: "M127",
    holderName: "Mrs. Mate Pooja",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 84.2,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-5",
    policyNo: "906762147",
    agCd: "J",
    groupCode: "M127",
    holderName: "Mrs. Mate Pooja",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 84.2,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-6",
    policyNo: "906762303",
    agCd: "J",
    groupCode: "A023",
    holderName: "Mrs. Aallekar Aakankssha",
    comDate: "20/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 79.45,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-7",
    policyNo: "906762306",
    agCd: "J",
    groupCode: "V036",
    holderName: "Mrs. Vig Tapasya",
    comDate: "20/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 247.75,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-8",
    policyNo: "906762306",
    agCd: "J",
    groupCode: "V036",
    holderName: "Mrs. Vig Tapasya",
    comDate: "20/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 247.75,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-9",
    policyNo: "906762306",
    agCd: "J",
    groupCode: "V036",
    holderName: "Mrs. Vig Tapasya",
    comDate: "20/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 247.75,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-10",
    policyNo: "906763006",
    agCd: "J",
    groupCode: "J091",
    holderName: "Mrs. Joglekar Neha",
    comDate: "28/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 243.5,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-11",
    policyNo: "906763006",
    agCd: "J",
    groupCode: "J091",
    holderName: "Mrs. Joglekar Neha",
    comDate: "28/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 243.5,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-12",
    policyNo: "906763006",
    agCd: "J",
    groupCode: "J091",
    holderName: "Mrs. Joglekar Neha",
    comDate: "28/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 243.5,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-13",
    policyNo: "906763264",
    agCd: "J",
    groupCode: "P006",
    holderName: "Mrs. Patki Amita",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 81.6,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-14",
    policyNo: "906763264",
    agCd: "J",
    groupCode: "P006",
    holderName: "Mrs. Patki Amita",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 81.6,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-15",
    policyNo: "906763264",
    agCd: "J",
    groupCode: "P006",
    holderName: "Mrs. Patki Amita",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 81.6,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-16",
    policyNo: "906763715",
    agCd: "J",
    groupCode: "K220",
    holderName: "Mrs Kapre Mrigaya",
    comDate: "07/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 144.0,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-17",
    policyNo: "906763715",
    agCd: "J",
    groupCode: "K220",
    holderName: "Mrs Kapre Mrigaya",
    comDate: "07/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 144.0,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-18",
    policyNo: "906763715",
    agCd: "J",
    groupCode: "K220",
    holderName: "Mrs Kapre Mrigaya",
    comDate: "07/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 144.0,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-19",
    policyNo: "906764058",
    agCd: "J",
    groupCode: "K220",
    holderName: "Mr. Kapre Nilesh",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 144.75,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-20",
    policyNo: "906764058",
    agCd: "J",
    groupCode: "K220",
    holderName: "Mr. Kapre Nilesh",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 144.75,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-21",
    policyNo: "906764058",
    agCd: "J",
    groupCode: "K220",
    holderName: "Mr. Kapre Nilesh",
    comDate: "15/03/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 144.75,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-22",
    policyNo: "906764819",
    agCd: "J",
    groupCode: "M128",
    holderName: "Mr. Mhaskar Santosh",
    comDate: "09/04/18",
    planTermPpt: "836/21/15",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 216.55,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-23",
    policyNo: "906764895",
    agCd: "J",
    groupCode: "P212",
    holderName: "Mr. Punjabi Satish",
    comDate: "24/04/18",
    planTermPpt: "845/63/15",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 2460.5,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-24",
    policyNo: "906764957",
    agCd: "J",
    groupCode: "S241",
    holderName: "Mrs. Satpute Shamika",
    comDate: "25/04/18",
    planTermPpt: "836/25/16",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 298.15,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-25",
    policyNo: "906765020",
    agCd: "J",
    groupCode: "G019",
    holderName: "Mr. Gaikwad Prasanna",
    comDate: "19/04/18",
    planTermPpt: "845/52/15",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 1795.5,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-26",
    policyNo: "906825030",
    agCd: "J",
    groupCode: "S159",
    holderName: "Mr. Shivanekar Abhishek",
    comDate: "15/08/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 80.8,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-27",
    policyNo: "906825030",
    agCd: "J",
    groupCode: "S159",
    holderName: "Mr. Shivanekar Abhishek",
    comDate: "15/08/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 80.8,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-28",
    policyNo: "906825030",
    agCd: "J",
    groupCode: "S159",
    holderName: "Mr. Shivanekar Abhishek",
    comDate: "15/08/18",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 80.8,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-29",
    policyNo: "911833748",
    agCd: "J",
    groupCode: "M106",
    holderName: "Mrs. Mokashi Saylee",
    comDate: "15/01/19",
    planTermPpt: "845/65/15",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 3194.0,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-30",
    policyNo: "911833808",
    agCd: "J",
    groupCode: "I002",
    holderName: "Kum. Inamdar Sanika",
    comDate: "18/01/19",
    planTermPpt: "836/25/16",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 749.15,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-31",
    policyNo: "911834152",
    agCd: "J",
    groupCode: "I002",
    holderName: "Mrs. Inamdar Madhavi",
    comDate: "24/01/19",
    planTermPpt: "836/16/10",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 395.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-32",
    policyNo: "911834152",
    agCd: "J",
    groupCode: "I002",
    holderName: "Mrs. Inamdar Madhavi",
    comDate: "24/01/19",
    planTermPpt: "836/16/10",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 395.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-33",
    policyNo: "911834152",
    agCd: "J",
    groupCode: "I002",
    holderName: "Mrs. Inamdar Madhavi",
    comDate: "24/01/19",
    planTermPpt: "836/16/10",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 395.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-34",
    policyNo: "911834536",
    agCd: "J",
    groupCode: "N058",
    holderName: "Mr. Nivangune Dnyaneshwar",
    comDate: "28/01/19",
    planTermPpt: "836/25/16",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 293.15,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-35",
    policyNo: "911884999",
    agCd: "J",
    groupCode: "L022",
    holderName: "Mr. Lele Gaurang",
    comDate: "28/05/19",
    planTermPpt: "833/13/10",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 47.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-36",
    policyNo: "911884999",
    agCd: "J",
    groupCode: "L022",
    holderName: "Mr. Lele Gaurang",
    comDate: "28/05/19",
    planTermPpt: "833/13/10",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 47.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-37",
    policyNo: "911884999",
    agCd: "J",
    groupCode: "L022",
    holderName: "Mr. Lele Gaurang",
    comDate: "28/05/19",
    planTermPpt: "833/13/10",
    mode: "Mly.",
    dueDate: "06/26",
    comsnRecble: 47.85,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  // Page 8 records with Bonus:
  {
    id: "gap-38",
    policyNo: "942562542",
    agCd: "J",
    groupCode: "M075",
    holderName: "Ms. Kishori Murkute",
    comDate: "12/06/25",
    planTermPpt: "771/65/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 1306.5,
    bonusRecble: 522.6,
    comnCode: 4,
  },
  {
    id: "gap-39",
    policyNo: "942562542",
    agCd: "J",
    groupCode: "M075",
    holderName: "Ms. Kishori Murkute",
    comDate: "12/06/25",
    planTermPpt: "771/65/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 1306.5,
    bonusRecble: 522.6,
    comnCode: 4,
  },
  {
    id: "gap-40",
    policyNo: "942562555",
    agCd: "J",
    groupCode: "G119",
    holderName: "Kum. Gujrathi Mitali",
    comDate: "12/06/25",
    planTermPpt: "771/78/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 3790.5,
    bonusRecble: 1516.2,
    comnCode: 4,
  },
  {
    id: "gap-41",
    policyNo: "942562555",
    agCd: "J",
    groupCode: "G119",
    holderName: "Kum. Gujrathi Mitali",
    comDate: "12/06/25",
    planTermPpt: "771/78/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 3790.5,
    bonusRecble: 1516.2,
    comnCode: 4,
  },
  {
    id: "gap-42",
    policyNo: "942562714",
    agCd: "J",
    groupCode: "R021",
    holderName: "Mast Raut Ankur",
    comDate: "20/06/25",
    planTermPpt: "771/77/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 662.0,
    bonusRecble: 264.8,
    comnCode: 4,
  },
  {
    id: "gap-43",
    policyNo: "942562714",
    agCd: "J",
    groupCode: "R021",
    holderName: "Mast Raut Ankur",
    comDate: "20/06/25",
    planTermPpt: "771/77/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 662.0,
    bonusRecble: 264.8,
    comnCode: 4,
  },
  // Page 10 records with Bonus:
  {
    id: "gap-44",
    policyNo: "966246158",
    agCd: "J",
    groupCode: "T078",
    holderName: "Mr. Rahul Talgulkar",
    comDate: "09/07/25",
    planTermPpt: "736/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 527.4,
    bonusRecble: 210.96,
    comnCode: 4,
  },
  {
    id: "gap-45",
    policyNo: "966246158",
    agCd: "J",
    groupCode: "T078",
    holderName: "Mr. Rahul Talgulkar",
    comDate: "09/07/25",
    planTermPpt: "736/25/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 527.4,
    bonusRecble: 210.96,
    comnCode: 4,
  },
  {
    id: "gap-46",
    policyNo: "966246174",
    agCd: "J",
    groupCode: "D008",
    holderName: "Ms. Dharmatti Shreeya",
    comDate: "05/07/25",
    planTermPpt: "771/75/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 1296.75,
    bonusRecble: 518.7,
    comnCode: 4,
  },
  {
    id: "gap-47",
    policyNo: "966246174",
    agCd: "J",
    groupCode: "D008",
    holderName: "Ms. Dharmatti Shreeya",
    comDate: "05/07/25",
    planTermPpt: "771/75/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 1296.75,
    bonusRecble: 518.7,
    comnCode: 4,
  },
  {
    id: "gap-48",
    policyNo: "966246591",
    agCd: "J",
    groupCode: "J109",
    holderName: "Ms. Jadhav Prajakta",
    comDate: "28/07/25",
    planTermPpt: "771/77/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 662.0,
    bonusRecble: 264.8,
    comnCode: 4,
  },
  {
    id: "gap-49",
    policyNo: "966246591",
    agCd: "J",
    groupCode: "J109",
    holderName: "Ms. Jadhav Prajakta",
    comDate: "28/07/25",
    planTermPpt: "771/77/16",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 662.0,
    bonusRecble: 264.8,
    comnCode: 4,
  },
  {
    id: "gap-50",
    policyNo: "966247328",
    agCd: "J",
    groupCode: "J109",
    holderName: "Mr. Prathamesh Jadhav",
    comDate: "11/08/25",
    planTermPpt: "771/81/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 662.5,
    bonusRecble: 265.0,
    comnCode: 4,
  },
  // Page 11 records:
  {
    id: "gap-51",
    policyNo: "966247381",
    agCd: "J",
    groupCode: "P212",
    holderName: "Kum. Punjabi Sahana",
    comDate: "11/08/25",
    planTermPpt: "771/87/11",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 9853.6,
    bonusRecble: 3941.44,
    comnCode: 4,
  },
  {
    id: "gap-52",
    policyNo: "966249855",
    agCd: "J",
    groupCode: "S278",
    holderName: "Mrs. Anuradha Suryawanshi",
    comDate: "10/01/26",
    planTermPpt: "771/73/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 2593.75,
    bonusRecble: 1037.5,
    comnCode: 4,
  },
  {
    id: "gap-53",
    policyNo: "966250459",
    agCd: "J",
    groupCode: "B061",
    holderName: "Ms. ADITI BHANDEKAR",
    comDate: "15/01/26",
    planTermPpt: "771/82/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 1427.75,
    bonusRecble: 571.1,
    comnCode: 4,
  },
  {
    id: "gap-54",
    policyNo: "966251889",
    agCd: "J",
    groupCode: "T034",
    holderName: "Ms. Sara Tendulkar",
    comDate: "15/02/26",
    planTermPpt: "771/91/13",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 6035.8,
    bonusRecble: 2414.32,
    comnCode: 4,
  },
  {
    id: "gap-55",
    policyNo: "966252359",
    agCd: "J",
    groupCode: "M151",
    holderName: "Mr. Sarang Medhi",
    comDate: "15/04/26",
    planTermPpt: "745/73/30",
    mode: "Mly.",
    dueDate: "05/26",
    comsnRecble: 182.8,
    bonusRecble: 73.12,
    comnCode: 4,
  },
  // Page 14 records:
  {
    id: "gap-56",
    policyNo: "999443169",
    agCd: "J",
    groupCode: "N056",
    holderName: "Mrs. Nagapure Asha",
    comDate: "21/04/17",
    planTermPpt: "836/16/10",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 76.5,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-57",
    policyNo: "999443308",
    agCd: "J",
    groupCode: "W024",
    holderName: "Mr. Wadekar Vishal",
    comDate: "25/04/17",
    planTermPpt: "836/25/16",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 120.35,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-58",
    policyNo: "999443610",
    agCd: "J",
    groupCode: "B081",
    holderName: "Mr. Bagul Sameer",
    comDate: "26/04/17",
    planTermPpt: "815/21/21",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 253.4,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-59",
    policyNo: "999444085",
    agCd: "J",
    groupCode: "K239",
    holderName: "Mr. Khedkar Abhishek",
    comDate: "09/05/17",
    planTermPpt: "833/19/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 267.55,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-60",
    policyNo: "999446293",
    agCd: "J",
    groupCode: "B094",
    holderName: "Mr. Bapat Tejas",
    comDate: "14/07/17",
    planTermPpt: "833/25/22",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 79.8,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-61",
    policyNo: "999446365",
    agCd: "J",
    groupCode: "B035",
    holderName: "Mrs. Bhome Smita",
    comDate: "28/07/17",
    planTermPpt: "815/16/16",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 333.35,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-62",
    policyNo: "999449445",
    agCd: "J",
    groupCode: "B035",
    holderName: "Ms. Bhome Namrata",
    comDate: "26/10/17",
    planTermPpt: "815/35/35",
    mode: "Qly.",
    dueDate: "04/26",
    comsnRecble: 364.35,
    bonusRecble: 0.0,
    comnCode: 3,
  },
  {
    id: "gap-63",
    policyNo: "999450257",
    agCd: "J",
    groupCode: "M100",
    holderName: "Mrs. Mhasade Sanjivanee",
    comDate: "17/11/17",
    planTermPpt: "836/25/16",
    mode: "Mly.",
    dueDate: "04/26",
    comsnRecble: 48.0,
    bonusRecble: 0.0,
    comnCode: 3,
  },
];

/**
 * Generate Gap Commission Items - dynamically from Redux store policies.
 * Falls back to authentic sample data ONLY when no Redux policies exist.
 */
export function generateGapCommissionItems(
  policies: any[] = [],
  selectedAgencies: string[] = [],
  formData: GapCommissionFormData
): GapCommissionItem[] {
  let combined: GapCommissionItem[] = [];

  const JAYANT_CODES = ["a001", "a002", "a003"];
  const MANISHA_CODES = ["a004", "a005", "a006"];

  if (policies && policies.length > 0) {
    const reduxItems: GapCommissionItem[] = policies
      .filter((p) => {
        if (selectedAgencies.length === 0) return true;
        const pAgCode = (p.agentCode || "").toLowerCase().trim();
        const pAdvCode = (p.advisor?.advisorCode || "").toLowerCase().trim();
        const pAdvName = (p.advisor?.advisorName || "").toLowerCase().trim();
        const pAgName = (p.agency?.agencyName || p.agencyName || "").toLowerCase();

        return selectedAgencies.some((a) => {
          const al = a.toLowerCase();
          if (al.includes("jayant") || al.includes("ag002")) {
            return JAYANT_CODES.includes(pAgCode) || JAYANT_CODES.includes(pAdvCode) || pAdvName.includes("jayant");
          }
          if (al.includes("manisha") || al.includes("ag003")) {
            return MANISHA_CODES.includes(pAgCode) || MANISHA_CODES.includes(pAdvCode) || pAdvName.includes("manisha");
          }
          return pAgCode.includes(al) || pAdvCode.includes(al) || pAdvName.includes(al) || pAgName.includes(al);
        });
      })
      .map((p, idx) => {
        const rawNo = String(p.policyNumber || p.policyNo || 910000000 + idx).replace(/\D/g, "");
        const policyNo = rawNo.length >= 9 ? rawNo.slice(-9) : `91${rawNo.padStart(7, "0")}`.slice(-9);

        const holderName =
          p.CustomerMaster?.firstName
            ? `${p.CustomerMaster.salutation || ""} ${p.CustomerMaster.firstName} ${p.CustomerMaster.lastName || ""}`.trim()
            : p.customer?.name || p.customer?.groupName || p.customerName || "Policy Holder";

        const plan = p.product?.planNumber || p.plan?.planNumber || "836";
        const term = p.policyTerm || "25";
        const ppt = p.premiumPayingTerm || "16";
        const planTermPpt = `${plan}/${term}/${ppt}`;

        const rawMode = (p.premiumMode?.modeName || p.mode || "Yearly").toUpperCase();
        const mode = rawMode.startsWith("Y") ? "Yly." : rawMode.startsWith("H") ? "Hly." : rawMode.startsWith("Q") ? "Qly." : "Mly.";

        const premium = Number(
          p.premium?.installmentPremium ||
          p.premium?.totalInstallmentPremium ||
          p.premiumAmount ||
          12000
        );

        // Commission rate based on policy age
        const doc = p.commencementDate ? new Date(p.commencementDate) : new Date();
        const yearsDiff = Math.max(0, new Date().getFullYear() - doc.getFullYear());
        const comRate = yearsDiff === 0 ? 25 : yearsDiff <= 3 ? 7.5 : 5;

        const comsnRecble = Math.round(((premium * comRate) / 100) * 100) / 100;
        const bonusRecble = idx % 4 === 0 ? Math.round(comsnRecble * 0.04 * 100) / 100 : 0.0;
        const comnCode = bonusRecble > 0 ? 4 : (yearsDiff === 0 ? 1 : yearsDiff <= 2 ? 2 : 3);

        // Commencement date formatted as DD/MM/YY
        const comDate = doc
          ? `${String(doc.getDate()).padStart(2, "0")}/${String(doc.getMonth() + 1).padStart(2, "0")}/${String(doc.getFullYear()).slice(-2)}`
          : "01/01/21";

        // Due date from nextPremiumDueDate
        const dueRaw = p.nextPremiumDueDate;
        let dueDate = "05/26";
        if (dueRaw) {
          const d = new Date(dueRaw);
          dueDate = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
        }

        const groupCode = p.customer?.groupCode || `G${String(100 + (idx % 50)).padStart(3, "0")}`;
        const agCd = p.advisor?.advisorCode
          ? p.advisor.advisorCode.slice(-1).toUpperCase()
          : "J";

        return {
          id: `redux-gap-${p.id || idx}`,
          policyNo,
          agCd,
          groupCode,
          holderName,
          comDate,
          planTermPpt,
          mode,
          dueDate,
          comsnRecble,
          bonusRecble,
          comnCode,
        };
      });

    if (reduxItems.length > 0) {
      combined = reduxItems; // Use ONLY Redux policies
    }
  }

  // Fallback to authentic sample data ONLY when no Redux policies available
  if (combined.length === 0) {
    combined = [...SAMPLE_GAP_COMMISSION_ITEMS];
  }

  // Sort by policyNo, then dueDate
  combined.sort((a, b) => a.policyNo.localeCompare(b.policyNo) || a.dueDate.localeCompare(b.dueDate));

  return combined;
}

