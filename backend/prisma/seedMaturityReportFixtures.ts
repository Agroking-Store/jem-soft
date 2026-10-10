import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  { planNumber: "714", productCode: "512N277V03", policyTerm: 20, premiumPayingTerm: 15 },
  { planNumber: "715", productCode: "512N279V03", policyTerm: 20, premiumPayingTerm: 15 },
  { planNumber: "717", productCode: "512N283V03", policyTerm: 15, premiumPayingTerm: 1 },
  { planNumber: "733", productCode: "512N297V03", policyTerm: 20, premiumPayingTerm: 15 },
  { planNumber: "736", productCode: "512N304V03", policyTerm: 20, premiumPayingTerm: 16 },
  { planNumber: "748", productCode: "512N316V03", policyTerm: 20, premiumPayingTerm: 15 },
  { planNumber: "720", productCode: "512N280V03", policyTerm: 20, premiumPayingTerm: 20 },
  { planNumber: "721", productCode: "512N278V03", policyTerm: 25, premiumPayingTerm: 25 },
  { planNumber: "732", productCode: "512N296V03", policyTerm: 20, premiumPayingTerm: 20 },
  { planNumber: "734", productCode: "512N299V03", policyTerm: 20, premiumPayingTerm: 20 },
  { planNumber: "774", productCode: "512N365V02", policyTerm: 15, premiumPayingTerm: 10 },
  { planNumber: "912", productCode: "512N387V02", policyTerm: 15, premiumPayingTerm: 10 },
  { planNumber: "881", productCode: "512N389V01", policyTerm: 25, premiumPayingTerm: 15 },
  { planNumber: "888", productCode: "512N393V01", policyTerm: 15, premiumPayingTerm: 1 },
  { planNumber: "889", productCode: "512N394V01", policyTerm: 15, premiumPayingTerm: 10 },
  { planNumber: "890", productCode: "512N395V01", policyTerm: 15, premiumPayingTerm: 15 },
  { planNumber: "770", productCode: "512N397V01", policyTerm: 20, premiumPayingTerm: 15 },
] as const;

const members = [
  { firstName: "Maturity", lastName: "Fixture One", dob: new Date("1984-02-16") },
  { firstName: "Maturity", lastName: "Fixture Two", dob: new Date("1987-06-24") },
  { firstName: "Maturity", lastName: "Fixture Three", dob: new Date("1991-10-08") },
  { firstName: "Maturity", lastName: "Fixture Four", dob: new Date("1993-03-29") },
];

async function main() {
  const [lic, activeStatus, yearlyMode, onlinePayment, branch, advisor] = await Promise.all([
    prisma.insuranceProvider.findUnique({ where: { code: "LIC" } }),
    prisma.policyStatusMaster.findUnique({ where: { statusCode: "ACTIVE" } }),
    prisma.premiumModeMaster.findUnique({ where: { modeCode: "YLY" } }),
    prisma.paymentModeMaster.findUnique({ where: { modeCode: "ONL" } }),
    prisma.licBranch.findFirst({ orderBy: { branchCode: "asc" } }),
    prisma.advisor.findFirst({ where: { provider: { code: "LIC" } }, orderBy: { advisorCode: "asc" } }),
  ]);

  if (!lic || !activeStatus || !yearlyMode || !onlinePayment) {
    throw new Error("Required LIC master data is missing. Run npm run seed first.");
  }

  const group = await prisma.customer.upsert({
    where: { groupCode: "LIC-MAT-QA" },
    update: {
      name: "LIC Maturity Report QA Fixtures",
      groupName: "LIC Maturity Report QA Fixtures",
      category: "Client",
    },
    create: {
      name: "LIC Maturity Report QA Fixtures",
      groupCode: "LIC-MAT-QA",
      groupName: "LIC Maturity Report QA Fixtures",
      category: "Client",
      email: "lic.maturity.qa@jemsoft.local",
      phone: "9000000000",
      password: "local-fixture-only",
      resCountry: "India",
    },
  });

  const memberRecords = [];
  for (const [index, member] of members.entries()) {
    const existing = await prisma.customerMaster.findFirst({
      where: { groupId: group.id, firstName: member.firstName, lastName: member.lastName },
    });
    const record = existing || await prisma.customerMaster.create({
      data: {
        groupId: group.id,
        firstName: member.firstName,
        lastName: member.lastName,
        dob: member.dob,
        gender: index % 2 === 0 ? "MALE" : "FEMALE",
        customerType: "QA_FIXTURE",
        isGroupHead: index === 0,
        contactInfo: {
          create: {
            mobile1: `90000000${String(index + 1).padStart(2, "0")}`,
            emailPersonal: `maturity.fixture.${index + 1}@jemsoft.local`,
          },
        },
      },
    });
    memberRecords.push(record);
  }

  const attributeCodes = ["MATURITY_AMOUNT", "BONUS_GA", "FAB_LA", "OUTSTANDING_PREMIUM"] as const;
  const attributeNames: Record<(typeof attributeCodes)[number], string> = {
    MATURITY_AMOUNT: "Maturity Amount",
    BONUS_GA: "Bonus/GA",
    FAB_LA: "FAB/LA",
    OUTSTANDING_PREMIUM: "Less O/S Premium",
  };
  const attributes = new Map<string, string>();
  for (const code of attributeCodes) {
    const attribute = await prisma.productAttributeMaster.upsert({
      where: { attributeCode: code },
      update: { attributeName: attributeNames[code], dataType: "Number", isActive: true },
      create: { attributeCode: code, attributeName: attributeNames[code], dataType: "Number", isActive: true },
    });
    attributes.set(code, attribute.id);
  }

  for (const [index, plan] of plans.entries()) {
    const product = await prisma.productMaster.findFirst({
      where: { providerId: lic.id, productCode: plan.productCode },
    });
    if (!product) throw new Error(`LIC plan ${plan.planNumber} (${plan.productCode}) is missing from Product Master.`);

    const maturityDate = new Date(2026, 3 + (index % 12), 10 + (index % 15));
    const commencementDate = new Date(maturityDate);
    commencementDate.setFullYear(commencementDate.getFullYear() - plan.policyTerm);
    const sumAssured = 200000 + (index % 6) * 100000;
    const policy = await prisma.policy.upsert({
      where: { policyNumber: `LIC-QA-MAT-${plan.planNumber}-${String(index + 1).padStart(2, "0")}` },
      update: {
        productId: product.id,
        CustomerMasterId: memberRecords[index % memberRecords.length].id,
        commencementDate,
        maturityDate,
        policyTerm: plan.policyTerm,
        premiumPayingTerm: plan.premiumPayingTerm,
        agentCode: advisor?.advisorCode || "LIC-QA",
        branchId: branch?.id,
        advisorId: advisor?.id,
      },
      create: {
        clientId: group.id,
        CustomerMasterId: memberRecords[index % memberRecords.length].id,
        providerId: lic.id,
        productId: product.id,
        statusId: activeStatus.id,
        premiumModeId: yearlyMode.id,
        paymentModeId: onlinePayment.id,
        advisorId: advisor?.id,
        branchId: branch?.id,
        policyNumber: `LIC-QA-MAT-${plan.planNumber}-${String(index + 1).padStart(2, "0")}`,
        proposalNumber: `LIC-QA-PROP-${plan.planNumber}-${String(index + 1).padStart(2, "0")}`,
        issueDate: commencementDate,
        commencementDate,
        maturityDate,
        policyTerm: plan.policyTerm,
        premiumPayingTerm: plan.premiumPayingTerm,
        nextPremiumDueDate: maturityDate,
        agentCode: advisor?.advisorCode || "LIC-QA",
        remarks: "Local QA fixture mapped to an official LIC plan.",
      },
    });

    const annualPremium = Math.round(sumAssured * 0.05);
    await prisma.policyPremiumCalculation.upsert({
      where: { policyId: policy.id },
      update: {
        sumAssured,
        basicYearlyPremium: annualPremium,
        totalYearlyPremium: annualPremium,
        installmentPremium: annualPremium,
        totalInstallmentPremium: annualPremium,
      },
      create: {
        policyId: policy.id,
        sumAssured,
        basicYearlyPremium: annualPremium,
        totalYearlyPremium: annualPremium,
        installmentPremium: annualPremium,
        totalInstallmentPremium: annualPremium,
      },
    });

    for (const code of attributeCodes) {
      await prisma.policyAttribute.upsert({
        where: { policyId_attributeId: { policyId: policy.id, attributeId: attributes.get(code)! } },
        update: { value: code === "MATURITY_AMOUNT" ? String(sumAssured) : "0" },
        create: { policyId: policy.id, attributeId: attributes.get(code)!, value: code === "MATURITY_AMOUNT" ? String(sumAssured) : "0" },
      });
    }
  }

  console.log(JSON.stringify({ groupCode: group.groupCode, members: memberRecords.length, policies: plans.length }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
