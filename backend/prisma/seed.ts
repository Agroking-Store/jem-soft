import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Minimal initial admin/provider/advisor seed (from HEAD) ---
  const passwordHash = await bcrypt.hash("Admin@1234", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@jemsoft.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@jemsoft.com",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const providerLic = await prisma.insuranceProvider.upsert({
    where: { code: "LIC" },
    update: {},
    create: {
      type: "Insurance",
      name: "Life Insurance Corporation",
      code: "LIC",
      description: "Seeded provider for advisor testing",
      isActive: true,
    },
  });

  const advisor = await prisma.advisor.upsert({
    where: {
      providerId_advisorCode: {
        providerId: providerLic.id,
        advisorCode: "ADV001",
      },
    },
    update: {},
    create: {
      providerId: providerLic.id,
      advisorCode: "ADV001",
      advisorName: "Rahul Sharma",
      email: "rahul@jemsoft.com",
      phone: "9876543210",
      licenseNumber: "LIC123456",
      panNumber: "ABCDE1234F",
      branchCode: "PUNE01",
      designation: "Senior Advisor",
      joiningDate: new Date("2025-01-01T00:00:00.000Z"),
      isActive: true,
    },
  });

  console.log("Initial admin/provider/advisor seed complete");

  // --- Extended masters and data seeding (from incoming) ---
  console.log("Start seeding additional masters ...");

  // Seed Policy Statuses
  const policyStatuses = [
    {
      statusName: "Active",
      statusCode: "ACTIVE",
      description: "The policy is currently active.",
    },
    {
      statusName: "Pending",
      statusCode: "PENDING",
      description: "The policy is pending approval or first payment.",
    },
    {
      statusName: "Lapsed",
      statusCode: "LAPSED",
      description: "The policy has lapsed due to non-payment.",
    },
    {
      statusName: "Completed",
      statusCode: "COMPLETED",
      description: "The policy term has completed.",
    },
    {
      statusName: "Surrendered",
      statusCode: "SURRENDERED",
      description: "The policy was surrendered before maturity.",
    },
  ];

  for (const status of policyStatuses) {
    await prisma.policyStatusMaster.upsert({
      where: { statusCode: status.statusCode },
      update: {
        statusName: status.statusName,
        description: status.description,
      },
      create: status,
    });
  }

  // Seed Premium Modes
  const premiumModes = [
    {
      modeName: "Yearly",
      modeCode: "YLY",
      months: 12,
      description: "Once a year",
    },
    {
      modeName: "Half-Yearly",
      modeCode: "HLY",
      months: 6,
      description: "Twice a year",
    },
    {
      modeName: "Quarterly",
      modeCode: "QLY",
      months: 4,
      description: "Four times a year",
    },
    {
      modeName: "Monthly",
      modeCode: "MLY",
      months: 1,
      description: "Every month",
    },
    {
      modeName: "Single",
      modeCode: "SIN",
      months: 0,
      description: "One-time payment",
    },
  ];

  for (const mode of premiumModes) {
    await prisma.premiumModeMaster.upsert({
      where: { modeCode: mode.modeCode },
      update: {
        modeName: mode.modeName,
        months: mode.months,
        description: mode.description,
      },
      create: mode,
    });
  }

  // Seed Insurance Providers (merged list)
  const providersData = [
    {
      name: "Aditya Birla Sun Life Insurance Company Limited",
      type: "Insurance",
      code: "ABSLI",
    },
    {
      name: "Aegon Life Insurance Company Limited",
      type: "Insurance",
      code: "AEGON",
    },
    { name: "Aviva Life Insurance Company", type: "Insurance", code: "AVIVA" },
    {
      name: "Axis Max Life Insurance Limited",
      type: "Insurance",
      code: "AXIS_MAX",
    },
    {
      name: "Bajaj Allianz Life Insurance Company",
      type: "Insurance",
      code: "BAJAJ_ALLIANZ",
    },
    {
      name: "Bharti AXA Life Insurance Company",
      type: "Insurance",
      code: "BHARTI_AXA",
    },
    {
      name: "Canara HSBC Life Insurance Company Limited",
      type: "Insurance",
      code: "CANARA_HSBC",
    },
    {
      name: "DHFL Pramerica Life Insurance Company",
      type: "Insurance",
      code: "DHFL_PRAMERICA",
    },
    { name: "Digit Life Insurance", type: "Insurance", code: "DIGIT" },
    {
      name: "Edelweiss Tokio Life Insurance Company",
      type: "Insurance",
      code: "EDELWEISS_TOKIO",
    },
    { name: "Exide Life Insurance Company", type: "Insurance", code: "EXIDE" },
    {
      name: "Future Generali India Life Insurance Company",
      type: "Insurance",
      code: "FUTURE_GENERALI",
    },
    {
      name: "HDFC Life Insurance Company Limited",
      type: "Insurance",
      code: "HDFC_LIFE",
    },
    {
      name: "ICICI Prudential Life Insurance Company Limited",
      type: "Insurance",
      code: "ICICI_PRU",
    },
    {
      name: "Ageas Federal Life Insurance Company Limited",
      type: "Insurance",
      code: "AGEAS_FEDERAL",
    },
    {
      name: "IndiaFirst Life Insurance Company",
      type: "Insurance",
      code: "INDIAFIRST",
    },
    { name: "Kotak Life Insurance", type: "Insurance", code: "KOTAK" },
    {
      name: "Life Insurance Corporation of India",
      type: "Insurance",
      code: "LIC",
    },
    { name: "Max Life Insurance Company", type: "Insurance", code: "MAX_LIFE" },
    {
      name: "PNB MetLife India Insurance Company Limited",
      type: "Insurance",
      code: "PNB_METLIFE",
    },
    { name: "Postal Life Insurance", type: "Insurance", code: "PLI" },
    {
      name: "Reliance Nippon Life Insurance Company",
      type: "Insurance",
      code: "RELIANCE_NIPPON",
    },
    {
      name: "Sahara India Life Insurance Company",
      type: "Insurance",
      code: "SAHARA",
    },
    {
      name: "SBI Life Insurance Company Limited",
      type: "Insurance",
      code: "SBI_LIFE",
    },
    {
      name: "Shriram Life Insurance Company",
      type: "Insurance",
      code: "SHRIRAM",
    },
    {
      name: "Star Union Dai-ichi Life Insurance Company",
      type: "Insurance",
      code: "SUD",
    },
    {
      name: "Tata AIA Life Insurance Company Limited",
      type: "Insurance",
      code: "TATA_AIA",
    },
    { name: "Unit Trust of India", type: "Insurance", code: "UTI" },
  ];

  for (const providerData of providersData) {
    await prisma.insuranceProvider.upsert({
      where: { code: providerData.code },
      update: {
        name: providerData.name,
        type: providerData.type,
      },
      create: providerData,
    });
  }

  // Seed Product Categories
  const dbProviders = await prisma.insuranceProvider.findMany({
    select: { id: true, code: true },
  });
  for (const provider of dbProviders) {
    await prisma.productCategory.upsert({
      where: { categoryCode: `${provider.code}_LIFE` },
      update: {
        categoryName: "Life Insurance",
        description: "Life insurance products",
      },
      create: {
        providerId: provider.id,
        categoryName: "Life Insurance",
        categoryCode: `${provider.code}_LIFE`,
        description: "Life insurance products",
      },
    });
  }

  // Seed Products
  const dbCategories = await prisma.productCategory.findMany({
    select: { id: true, providerId: true, categoryCode: true },
  });
  const categoryMap = new Map(
    dbCategories.map((c) => [
      c.categoryCode,
      { id: c.id, providerId: c.providerId },
    ]),
  );

  const productsData = [
    {
      productName: "Single Premium Endowment Plan",
      productCode: "SPEP",
      planNumber: "717",
      providerCode: "LIC",
    },
    {
      productName: "LICs New Jeevan Anand",
      productCode: "LNJA",
      planNumber: "715",
      providerCode: "LIC",
    },
    {
      productName: "LIC Jeevan Labh",
      productCode: "LJL",
      planNumber: "736",
      providerCode: "LIC",
    },
    {
      productName: "ABSLI DigiShield Plan",
      productCode: "ADP",
      planNumber: "ABSLI001",
      providerCode: "ABSLI",
    },
    {
      productName: "ABSLI Salaried Term Plan",
      productCode: "ASTP",
      planNumber: "ABSLI002",
      providerCode: "ABSLI",
    },
    {
      productName: "ICICI Pru Signature Secure",
      productCode: "IPSS",
      planNumber: "ICICIPRU001",
      providerCode: "ICICI_PRU",
    },
    {
      productName: "ICICI Pru Protect N Gain Whole Life",
      productCode: "IPPNGWL",
      planNumber: "ICICIPRU002",
      providerCode: "ICICI_PRU",
    },
    //FUTURE GENERALI
    {
      productName: "Accident Suraksha",
      productCode: "GCIPAIP18040V021718",
      planNumber: "FG001",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName:
        "Arogya Sanjeevani Policy, Generali Central Insurance Company Limited",
      productCode: "GCIHLIP20160V011920",
      planNumber: "FG002",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Aarogya Bima",
      productCode: "GCIHLIP23052V032223",
      planNumber: "FG003",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Advantage Top-Up",
      productCode: "GCIHLIP23053V032223",
      planNumber: "FG004",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Criticare",
      productCode: "GCIHLIP22104V022122",
      planNumber: "FG005",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Health Suraksha",
      productCode: "GCIHLIP25017V052425",
      planNumber: "FG006",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Hospicash",
      productCode: "GCIHLIP22105V022122",
      planNumber: "FG007",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Varishta Bima",
      productCode: "GCIHLIP24138V042324",
      planNumber: "FG008",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Health Total",
      productCode: "GCIHLIP25037V062425",
      planNumber: "FG009",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName:
        "Saral Suraksha Bima, Generali Central Insurance Company Limited",
      productCode: "GCIPAIP21623V012021",
      planNumber: "FG010",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Sukshma Hospi-Cash (Micro-Insurance Product)",
      productCode: "GCIHMIP22106V032122",
      planNumber: "FG011",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Surakshit Loan Bima",
      productCode: "GCIHLIP22112V032122",
      planNumber: "FG012",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Health Elite",
      productCode: "GCIHLIP22234V012122",
      planNumber: "FG013",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Health Absolute",
      productCode: "GCIHLIP26043V032526",
      planNumber: "FG014",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName:
        "HIV & Disability Suraksha, Generali Central Insurance Company Limited",
      productCode: "GCIHLIP23198V012223",
      planNumber: "FG015",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "D.I.Y HEALTH",
      productCode: "GCIHLIP24025V012324",
      planNumber: "FG016",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Surrogacy Health Cover",
      productCode: "GCIHLIP24147V012324",
      planNumber: "FG017",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Health PowHER",
      productCode: "GCIHLIP24180V012324",
      planNumber: "FG018",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Health Vital",
      productCode: "GCIHLIP25038V022425",
      planNumber: "FG019",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName:
        "Corona Kavach Policy, Generali Central Insurance Company Limited",
      productCode: "GCIHLIP21076V012021",
      planNumber: "FG020",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName:
        "Corona Rakshak Policy, Generali Central Insurance Company Limited",
      productCode: "GCIHLIP21075V012021",
      planNumber: "FG021",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Health Protect – Group",
      productCode: "GCIHLGP22109V032122",
      planNumber: "FG022",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Poorna Suraksha – Group",
      productCode: "GCIHLGP26042V052526",
      planNumber: "FG023",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Group Health Insurance (Revised)",
      productCode: "GCIHLGP21165V022021",
      planNumber: "FG024",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Group Health Insurance (Small and Mid-Size groups)",
      productCode: "GCIHLGP21164V022021",
      planNumber: "FG025",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName:
        "Group Arogya Sanjeevani Policy, Generali Central Insurance Company Limited",
      productCode: "GCIHLGP21490V012021",
      planNumber: "FG026",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Alpa Bima – Group",
      productCode: "GCIHLGP22108V022122",
      planNumber: "FG027",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Advantage Top-Up – Group",
      productCode: "GCIHLGP21154V022021",
      planNumber: "FG028",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Travel Suraksha",
      productCode: "IRDA/NL-HLT/GCI/P-T/V.I/76/13-14",
      planNumber: "FG029",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Shubh Yatra",
      productCode: "GCITIDP20115V011920",
      planNumber: "FG030",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Easy Travel Schengen",
      productCode: "IRDAI/HLT/GCI/P-T/V.I/2/16-17",
      planNumber: "FG031",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Easy Travel Worldwide",
      productCode: "IRDAI/HLT/GCI/P-T/V. I/1/16-17",
      planNumber: "FG032",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Travel Suraksha – Schengen Travel",
      productCode: "IRDA/NL-HLT/GCI/P-T/V.II/78/13-14",
      planNumber: "FG033",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Travel Suraksha Select",
      productCode: "IRDAI/HLT/GCI/P-T/V.I/30/16-17",
      planNumber: "FG034",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Student Suraksha",
      productCode: "GCITIDP21520V022021",
      planNumber: "FG035",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Jet Set Secure",
      productCode: "GCITIOP24165V012324",
      planNumber: "FG036",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Motor Protect Private Car Package Policy",
      productCode: "IRDAN132RPMT0001V06201213",
      planNumber: "FG037",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Motor Protect Two-Wheeler Package Policy",
      productCode: "IRDAN132RPMT0016V03200708",
      planNumber: "FG038",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Motor Protect Commercial Vehicle Package Policy",
      productCode: "IRDAN132RPMT0015V03200708",
      planNumber: "FG039",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Standalone Motor Secure OD Private Car Policy",
      productCode: "IRDAN132RPMT0001V02201920",
      planNumber: "FG040",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Standalone Motor Protect OD Two Wheeler Policy",
      productCode: "IRDAN132RPMT0002V02201920",
      planNumber: "FG041",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Home Secure Policy",
      productCode: "IRDAN132RPMS0005V02200809",
      planNumber: "FG042",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "GC Bharat Griha Raksha",
      productCode: "IRDAN132RPPR0005V02202021",
      planNumber: "FG043",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Standard Fire & Special Perils Policy",
      productCode: "IRDAN132RPPR0002V01200708",
      planNumber: "FG044",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Fire Suraksha Policy",
      productCode: "IRDAN132RPPR0084V01202425",
      planNumber: "FG045",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "GC Bharat Laghu Udyam Suraksha",
      productCode: "IRDAN132RPPR0003V02202021",
      planNumber: "FG046",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "GC Bharat Sookshma Udyam Suraksha",
      productCode: "IRDAN132RPPR0004V02202021",
      planNumber: "FG047",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Marine Insurance – Cargo (Retail)",
      productCode: "IRDAN132RPMR0013V01200708",
      planNumber: "FG048",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Business Suraksha",
      productCode: "IRDAN132RPMS0005V01200910",
      planNumber: "FG049",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Public Liability Policy – Industrial Risks",
      productCode: "IRDAN132RPLB0018V01202223",
      planNumber: "FG050",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Cyber Risks Insurance",
      productCode: "IRDAN132CPLB0023V01201920",
      planNumber: "FG051",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Personal Cyber Risks Policy",
      productCode: "IRDAN132RPLB0001V01202021",
      planNumber: "FG052",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Contractors All Risk Insurance",
      productCode: "IRDAN132RPEN0006V02200708",
      planNumber: "FG053",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Industrial All Risk Policy",
      productCode: "IRDAN132CPPR0004V01200708",
      planNumber: "FG054",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Group Personal Accident (Revised)",
      productCode: "GCIHLGP21545V022021",
      planNumber: "FG055",
      providerCode: "FUTURE_GENERALI",
    },
    {
      productName: "Employee Compensation Insurance Policy",
      productCode: "IRDAN132RPMS0003V02201213",
      planNumber: "FG056",
      providerCode: "FUTURE_GENERALI",
    },
    //CANARA HSBC LIFE INSURANCE
    {
      productName: "Canara HSBC Life Insurance Alpha Wealth",
      productCode: "136L088V02",
      planNumber: "CH001",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance EZ Pension",
      productCode: "136L094V01",
      planNumber: "CH002",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Group Advantage Term Plus",
      productCode: "136N077V02",
      planNumber: "CH003",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Group Asset Secure",
      productCode: "136N082V02",
      planNumber: "CH004",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Group Secure",
      productCode: "136N024V07",
      planNumber: "CH005",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Group Secure Plus",
      productCode: "136N090V01",
      planNumber: "CH006",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Group Term Edge Plan",
      productCode: "136N070V02",
      planNumber: "CH007",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Group Traditional Plan",
      productCode: "136N014V03",
      planNumber: "CH008",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Guaranteed Assured Income",
      productCode: "136N097V04",
      planNumber: "CH009",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Guaranteed Fortune Plan",
      productCode: "136N084V04",
      planNumber: "CH010",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Guaranteed Suraksha Kavach",
      productCode: "136N078V03",
      planNumber: "CH011",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance IncomeNow",
      productCode: "136N121V01",
      planNumber: "CH012",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Legacy Builder",
      productCode: "136L095V01",
      planNumber: "CH013",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Pension4Life",
      productCode: "136N071V11",
      planNumber: "CH014",
      providerCode: "CANARA_HSBC",
    },
    {
      productName:
        "Canara HSBC Life Insurance Pradhan Mantri Jeevan Jyoti Bima Yojana",
      productCode: "136G046V01",
      planNumber: "CH015",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Promise2Protect",
      productCode: "136N091V01",
      planNumber: "CH016",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Promise4Future",
      productCode: "136N119V01",
      planNumber: "CH017",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Promise4Growth",
      productCode: "136L089V02",
      planNumber: "CH018",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Promise4Growth Plus",
      productCode: "136L093V01",
      planNumber: "CH019",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Promise4Life",
      productCode: "136N120V01",
      planNumber: "CH020",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Promise4Wealth",
      productCode: "136L096V01",
      planNumber: "CH021",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Sampoorna Kavach Plan",
      productCode: "136N022V03",
      planNumber: "CH022",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Saral Jeevan Bima",
      productCode: "136N075V02",
      planNumber: "CH023",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Saral Pension",
      productCode: "136N076V03",
      planNumber: "CH024",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance SecureInvest",
      productCode: "136L092V02",
      planNumber: "CH025",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Smart Guaranteed Pension",
      productCode: "136N086V03",
      planNumber: "CH026",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Wealth Edge",
      productCode: "136L085V04",
      planNumber: "CH027",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance Young Term Plan",
      productCode: "136N087V03",
      planNumber: "CH028",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance iSelect Guaranteed Future",
      productCode: "136N081V07",
      planNumber: "CH029",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance iSelect Guaranteed Future Plus",
      productCode: "136N098V04",
      planNumber: "CH030",
      providerCode: "CANARA_HSBC",
    },
    {
      productName: "Canara HSBC Life Insurance iSelect Smart360 Term Plan",
      productCode: "136N080V02",
      planNumber: "CH031",
      providerCode: "CANARA_HSBC",
    },
    //PNB METLIFE
    {
      productName: "PNB MetLife Group Term Life Plus",
      productCode: "117N049V04",
      planNumber: "PM001",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Loan & Life Suraksha",
      productCode: "117N080V03",
      planNumber: "PM002",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Unit Linked Employee Benefit Plan",
      productCode: "117L084V03",
      planNumber: "PM003",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Traditional Employee Benefits Plan",
      productCode: "117N085V02",
      planNumber: "PM004",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Bachat Yojna",
      productCode: "117N120V01",
      planNumber: "PM005",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Retirement Savings Plan",
      productCode: "117N060V01",
      planNumber: "PM006",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Complete Care Plus",
      productCode: "117N093V04",
      planNumber: "PM007",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Pradhan Mantri Jeevan Jyoti Bima Yojana",
      productCode: "117N105V01",
      planNumber: "PM008",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Immediate Annuity Plan",
      productCode: "117N072V01",
      planNumber: "PM009",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Mera Wealth Plan",
      productCode: "117L098V07",
      planNumber: "PM010",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Complete Loan Protection Plan",
      productCode: "117N104V01",
      planNumber: "PM011",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife POS Suraksha",
      productCode: "117N143V01",
      planNumber: "PM012",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Bima Yojna",
      productCode: "117N120V01",
      planNumber: "PM013",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Aajeevan Suraksha Plan",
      productCode: "117N128V01",
      planNumber: "PM014",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Super Saver Plan",
      productCode: "117N131V06",
      planNumber: "PM015",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Guaranteed Future Plan",
      productCode: "117N124V16",
      planNumber: "PM016",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Smart Platinum Plus",
      productCode: "117L125V06",
      planNumber: "PM017",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Mera Term Plan Plus",
      productCode: "117N126V04",
      planNumber: "PM018",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Group Flexi Term Plus",
      productCode: "117N127V01",
      planNumber: "PM019",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Saral Jeevan Bima",
      productCode: "117N129V01",
      planNumber: "PM020",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Century Plan",
      productCode: "117N130V01",
      planNumber: "PM021",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Saral Pension Plan",
      productCode: "117N132V01",
      planNumber: "PM022",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Guaranteed Goal Plan",
      productCode: "117N131V06",
      planNumber: "PM023",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Group Secured Gain",
      productCode: "117N136V01",
      planNumber: "PM024",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Goal Ensuring Multiplier",
      productCode: "117L133V05",
      planNumber: "PM025",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Grand Assured Income Plan",
      productCode: "117N134V08",
      planNumber: "PM026",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Genius Plan",
      productCode: "117N135V04",
      planNumber: "PM027",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife TULIP",
      productCode: "117L137V01",
      planNumber: "PM028",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Smart Invest Pension Plan",
      productCode: "117L138V01",
      planNumber: "PM029",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Long Income For Tomorrow",
      productCode: "117N140V01",
      planNumber: "PM030",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife GROW Plan",
      productCode: "117L145V01",
      planNumber: "PM031",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Smart Goal Ensuring Multiplier",
      productCode: "117L139V02",
      planNumber: "PM032",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Dhan Suraksha Yojna",
      productCode: "117N168V01",
      planNumber: "PM033",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Smart Invest Pension Plan Pro",
      productCode: "117L138V04",
      planNumber: "PM034",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Group Protection Plan",
      productCode: "117N161V01",
      planNumber: "PM035",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife DigiProtect Term Plan",
      productCode: "117N141V01",
      planNumber: "PM036",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife RISE Plan",
      productCode: "117N169V01",
      planNumber: "PM037",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Smart Platinum Pro",
      productCode: "117L142V02",
      planNumber: "PM038",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Term with Unit Linked Insurance Plan (TULIP)",
      productCode: "117L136V03",
      planNumber: "PM039",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Accidental Death Benefit Plus Rider",
      productCode: "117B020V04",
      planNumber: "PM040",
      providerCode: "PNB_METLIFE",
    },
    {
      productName: "PNB MetLife Serious Illness Rider",
      productCode: "117B021V04",
      planNumber: "PM041",
      providerCode: "PNB_METLIFE",
    },
    {
      productName:
        "PNB MetLife Group Accidental Permanent & Total Disability Plus Rider",
      productCode: "117B016V02",
      planNumber: "PM042",
      providerCode: "PNB_METLIFE",
    },
    //AXIS MAX LIFE
    {
      productName: "Axis Max Life Smart Term Plan Plus",
      productCode: "104N127V05",
      planNumber: "AX001",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Secure Plus Plan",
      productCode: "104N118V13",
      planNumber: "AX002",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Term with Additional Returns",
      productCode: "104L128V01",
      planNumber: "AX003",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Flexi Wealth Plan",
      productCode: "104L115V04",
      planNumber: "AX004",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Platinum Wealth Plan",
      productCode: "104L090V07",
      planNumber: "AX005",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Fast Track Super",
      productCode: "104L082V05",
      planNumber: "AX006",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Flexi Wealth Advantage Plan",
      productCode: "104L121V04",
      planNumber: "AX007",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Guaranteed LifeTime Income Plan",
      productCode: "104N076V22",
      planNumber: "AX008",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Saral Pension Plan",
      productCode: "104N119V04",
      planNumber: "AX009",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Online Savings Plan",
      productCode: "104L098V06",
      planNumber: "AX010",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Wealth Advantage Guarantee Plan",
      productCode: "104N124V17",
      planNumber: "AX011",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Wealth Advantage Growth PAR Plan",
      productCode: "104N135V03",
      planNumber: "AX012",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Wealth Income Plan",
      productCode: "104N120V04",
      planNumber: "AX013",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Wealth Plan",
      productCode: "104N116V15",
      planNumber: "AX014",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Savings Advantage Plan",
      productCode: "104N111V04",
      planNumber: "AX015",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Wealth Advantage Guarantee ELITE",
      productCode: "104N138V04",
      planNumber: "AX016",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Smart Value Income & Benefit Enhancer Plan",
      productCode: "104N159V04",
      planNumber: "AX017",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Monthly Income Advantage Plan",
      productCode: "104N091V07",
      planNumber: "AX018",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Secure Earnings & Wellness Advantage Plan",
      productCode: "104N136V03",
      planNumber: "AX019",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Axis Max Life Group Saral Suraksha Plan",
      productCode: "104N114V03",
      planNumber: "AX020",
      providerCode: "AXIS_MAX",
    },
    {
      productName: "Niva Bupa ReAssure",
      productCode: "NBHHLIP23107V022223",
      planNumber: "AX021",
      providerCode: "AXIS_MAX",
    },
    //RELIANCE NIPPON LIFE (INDUSIND NIPPON LIFE)
    {
      productName: "Reliance Nippon Life Digi-Term Insurance Plan",
      productCode: "121N135V03",
      planNumber: "RN001",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Protection Plus",
      productCode: "121N137V01",
      planNumber: "RN002",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Super Suraksha Plus",
      productCode: "121N144V01",
      planNumber: "RN003",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Saral Jeevan Bima",
      productCode: "121N141V01",
      planNumber: "RN004",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Guaranteed Advantage Income Plan",
      productCode: "121N150V01",
      planNumber: "RN005",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Nishchit Samrudhi Plus",
      productCode: "121N156V03",
      planNumber: "RN006",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Super Endowment Plan",
      productCode: "121N110V02",
      planNumber: "RN007",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Increasing Income Insurance Plan",
      productCode: "121N115V02",
      planNumber: "RN008",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Bluechip Savings Plan",
      productCode: "121N103V01",
      planNumber: "RN009",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Smart Total Advantage Return",
      productCode: "121N128V02",
      planNumber: "RN010",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Fixed Money Back Plan",
      productCode: "121N108V02",
      planNumber: "RN011",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Prosperity Plus",
      productCode: "121L134V03",
      planNumber: "RN012",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Classic Plan II",
      productCode: "121L114V02",
      planNumber: "RN013",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Smart Savings Insurance Plan",
      productCode: "121L117V02",
      planNumber: "RN014",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Premier Wealth Insurance Plan",
      productCode: "121L120V02",
      planNumber: "RN015",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Smart Pension Plan",
      productCode: "121L122V02",
      planNumber: "RN016",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Nishchit Pension",
      productCode: "121N158V03",
      planNumber: "RN017",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Immediate Annuity Plan",
      productCode: "121N126V03",
      planNumber: "RN018",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Saral Pension Plan",
      productCode: "121N141V01",
      planNumber: "RN019",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Child Plan",
      productCode: "121N107V02",
      planNumber: "RN020",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Education Plan",
      productCode: "121N106V02",
      planNumber: "RN021",
      providerCode: "RELIANCE_NIPPON",
    },
    {
      productName: "Reliance Nippon Life Group Term Assurance Plus",
      productCode: "121N093V02",
      planNumber: "RN022",
      providerCode: "RELIANCE_NIPPON",
    },
  ];

  for (const productData of productsData) {
    const categoryInfo = categoryMap.get(`${productData.providerCode}_LIFE`);
    if (!categoryInfo) continue;

    await prisma.productMaster.upsert({
      where: {
        providerId_productCode: {
          providerId: categoryInfo.providerId,
          productCode: productData.productCode,
        },
      },
      update: {
        categoryId: categoryInfo.id,
        productName: productData.productName,
        planNumber: productData.planNumber,
      },
      create: {
        providerId: categoryInfo.providerId,
        categoryId: categoryInfo.id,
        productName: productData.productName,
        productCode: productData.productCode,
        planNumber: productData.planNumber,
      },
    });
  }

  // Seed Rider Master
  const ridersData = [
    {
      riderName: "Accidental Death and Disability Benefit Rider",
      riderCode: "ADDB",
      description: "Provides benefit on accidental death or disability.",
    },
    {
      riderName: "Term Assurance Rider",
      riderCode: "TERM",
      description: "Provides an additional term life cover.",
    },
    {
      riderName: "Critical Illness Rider",
      riderCode: "CI",
      description: "Covers a list of specified critical illnesses.",
    },
    {
      riderName: "Waiver of Premium Rider",
      riderCode: "WOP",
      description: "Waives future premiums on disability or critical illness.",
    },
  ];

  for (const riderData of ridersData) {
    await prisma.riderMaster.upsert({
      where: { riderCode: riderData.riderCode },
      update: {
        riderName: riderData.riderName,
        description: riderData.description,
      },
      create: riderData,
    });
  }

  console.log("Seeding finished.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
