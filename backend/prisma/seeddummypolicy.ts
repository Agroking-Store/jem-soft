import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================");
  console.log("JEM Soft - LIC Test Policy Seed");
  console.log("=================================\n");

  // =====================================================
  // 1. LIC PROVIDER
  // =====================================================

  const lic = await prisma.insuranceProvider.upsert({
    where: {
      code: "LIC",
    },
    update: {
      name: "Life Insurance Corporation of India",
      type: "Insurance",
      isActive: true,
    },
    create: {
      code: "LIC",
      name: "Life Insurance Corporation of India",
      type: "Insurance",
      description: "LIC test provider",
      isActive: true,
    },
  });

  console.log(`LIC Provider: ${lic.name}`);

  // =====================================================
  // 2. LIC PRODUCT CATEGORY
  // =====================================================

  const category = await prisma.productCategory.upsert({
    where: {
      categoryCode: "LIC_LIFE",
    },
    update: {
      categoryName: "Life Insurance",
      isActive: true,
    },
    create: {
      providerId: lic.id,
      categoryName: "Life Insurance",
      categoryCode: "LIC_LIFE",
      description: "LIC Life Insurance Products",
      isActive: true,
    },
  });

  console.log(`Category: ${category.categoryName}`);

  // =====================================================
  // 3. LIC PRODUCTS
  // =====================================================

  const planNumbers = [
    "714",
    "715",
    "717",
    "733",
    "736",
    "745",
    "771",
    "774",
    "760",
    "912",
    "888",
    "889",
    "748",
    "720",
    "721",
    "881",
    "883",
    "751",
    "880",
  ];

  const productNames: Record<string, string> = {
    "714": "LIC Jeevan Anand",
    "715": "LIC New Endowment Plan",
    "717": "LIC New Money Back Plan",
    "733": "LIC Jeevan Lakshya",
    "736": "LIC Jeevan Labh",
    "745": "LIC New Jeevan Anand",
    "771": "LIC New Endowment Plan",
    "774": "LIC Jeevan Umang",
    "760": "LIC Bima Jyoti",
    "912": "LIC Dhan Sanchay",
    "888": "LIC Jeevan Utsav",
    "889": "LIC Bima Ratna",
    "748": "LIC Jeevan Tarun",
    "720": "LIC New Children's Money Back Plan",
    "721": "LIC Jeevan Tarun",
    "881": "LIC Single Premium Endowment Plan",
    "883": "LIC Jeevan Kiran",
    "751": "LIC Jeevan Amar",
    "880": "LIC Tech Term",
  };

  const products = [];

  for (const planNumber of planNumbers) {
    const productCode = `LIC_PLAN_${planNumber}`;

    const product = await prisma.productMaster.upsert({
      where: {
        providerId_productCode: {
          providerId: lic.id,
          productCode,
        },
      },
      update: {
        productName:
          productNames[planNumber] ?? `LIC Plan ${planNumber}`,
        planNumber,
        isActive: true,
        productType: "Life Insurance",
      },
      create: {
        providerId: lic.id,
        categoryId: category.id,
        productName:
          productNames[planNumber] ?? `LIC Plan ${planNumber}`,
        productCode,
        planNumber,
        productType: "Life Insurance",
        description: `LIC test product - Plan ${planNumber}`,
        isActive: true,
      },
    });

    products.push(product);

    console.log(
      `Product: ${product.productName} | Plan ${planNumber}`
    );
  }

  // =====================================================
  // 4. TEST CUSTOMER GROUP
  // =====================================================

  const customer = await prisma.customer.upsert({
    where: {
      email: "lic.test.customer@jemsoft.local",
    },
    update: {
      name: "LIC Test Customer Group",
      phone: "9000000000",
      password: "test-password",
      groupCode: "LIC_TEST_GROUP",
      groupName: "LIC Test Group",
      category: "Client",
    },
    create: {
      name: "LIC Test Customer Group",
      email: "lic.test.customer@jemsoft.local",
      phone: "9000000000",
      password: "test-password",
      groupCode: "LIC_TEST_GROUP",
      groupName: "LIC Test Group",
      category: "Client",
      resCountry: "India",
    },
  });

  console.log(`Customer Group: ${customer.name}`);

  // =====================================================
  // 5. CUSTOMER MEMBERS
  // =====================================================

  const memberData = [
    {
      firstName: "Rohit",
      middleName: "",
      lastName: "Sharma",
      gender: "Male",
      dob: new Date("1990-05-15"),
      panNumber: "ABCDE1234F",
      isGroupHead: true,
    },
    {
      firstName: "Shweta",
      middleName: "",
      lastName: "Sharma",
      gender: "Female",
      dob: new Date("1993-08-21"),
      panNumber: "BCDEF2345G",
      isGroupHead: false,
    },
    {
      firstName: "Aahan",
      middleName: "",
      lastName: "Sharma",
      gender: "Male",
      dob: new Date("2010-03-10"),
      panNumber: "CDEFG3456H",
      isGroupHead: false,
    },
  ];

  const members = [];

  for (const data of memberData) {
    let member = await prisma.customerMaster.findFirst({
      where: {
        groupId: customer.id,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    if (!member) {
      member = await prisma.customerMaster.create({
        data: {
          groupId: customer.id,
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          gender: data.gender,
          dob: data.dob,
          panNumber: data.panNumber,
          isGroupHead: data.isGroupHead,
          customerType: "INDIVIDUAL",
        },
      });
    }

    members.push(member);

    console.log(
      `Customer Member: ${member.firstName} ${member.lastName}`
    );
  }

  // =====================================================
  // 6. POLICY STATUS
  // =====================================================

  const activeStatus = await prisma.policyStatusMaster.upsert({
    where: {
      statusCode: "ACTIVE",
    },
    update: {
      statusName: "Active",
      isActive: true,
    },
    create: {
      statusCode: "ACTIVE",
      statusName: "Active",
      description: "Active policy",
      isActive: true,
    },
  });

  console.log("Policy Status: ACTIVE");

  // =====================================================
  // 7. PREMIUM MODE
  // =====================================================

  const yearlyMode = await prisma.premiumModeMaster.upsert({
    where: {
      modeCode: "YLY",
    },
    update: {
      modeName: "Yearly",
      months: 12,
    },
    create: {
      modeCode: "YLY",
      modeName: "Yearly",
      months: 12,
      description: "Yearly premium payment mode",
    },
  });

  console.log("Premium Mode: YLY");

  // =====================================================
  // 7B. PAYMENT MODE
  // =====================================================

  const onlinePaymentMode = await prisma.PaymentModeMaster.findUnique({
    where: {
      modeCode: "ONL",
    },
  });

  if (!onlinePaymentMode) {
    throw new Error("Payment mode ONL not found");
  }

  console.log(`Payment Mode: ${onlinePaymentMode.modeName}`);

  // =====================================================
  // 8. CREATE TEST POLICIES
  // =====================================================

  let created = 0;
  let skipped = 0;

  const startDate = new Date("2026-01-01");

  for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
    const member = members[memberIndex];

    /*
     * To avoid creating 57 policies unnecessarily,
     * create 5 policies for each member.
     *
     * Total:
     * 3 members × 5 policies = 15 policies
     */

    const selectedProducts = products.slice(0, 5);

    for (
      let productIndex = 0;
      productIndex < selectedProducts.length;
      productIndex++
    ) {
      const product = selectedProducts[productIndex];

      if (!product.planNumber) {
        continue;
      }

      const policyNumber =
        `LIC-TEST-${String(memberIndex + 1).padStart(2, "0")}-${product.planNumber}`;

      const proposalNumber =
        `PROP-TEST-${String(memberIndex + 1).padStart(2, "0")}-${product.planNumber}`;

      // ---------------------------------------------------
      // Check existing policy
      // ---------------------------------------------------

      const existingPolicy = await prisma.policy.findUnique({
        where: {
          policyNumber,
        },
      });

      if (existingPolicy) {
        console.log(`Skipped: ${policyNumber}`);
        skipped++;
        continue;
      }

      // ---------------------------------------------------
      // Dates
      // ---------------------------------------------------

      const commencementDate = new Date(startDate);

      commencementDate.setMonth(
        commencementDate.getMonth() + memberIndex
      );

      const issueDate = new Date(commencementDate);

      const policyTerm = 20;

      const maturityDate = new Date(commencementDate);

      maturityDate.setFullYear(
        maturityDate.getFullYear() + policyTerm
      );

      const premiumPayingTerm = 15;

      // ---------------------------------------------------
      // Create Policy
      // ---------------------------------------------------

      const policy = await prisma.policy.create({
        data: {
          customer: {
            connect: {
              id: customer.id,
            },
          },

          CustomerMaster: {
            connect: {
              id: member.id,
            },
          },

          provider: {
            connect: {
              id: lic.id,
            },
          },

          product: {
            connect: {
              id: product.id,
            },
          },

          status: {
            connect: {
              id: activeStatus.id,
            },
          },

          premiumMode: {
            connect: {
              id: yearlyMode.id,
            },
          },

          paymentMode: {
            connect: {
              id: onlinePaymentMode.id,
            },
          },

          policyNumber,
          proposalNumber,

          issueDate,
          commencementDate,
          maturityDate,

          policyTerm,
          premiumPayingTerm,

          nextPremiumDueDate: new Date("2027-01-01"),

          agentCode: `LIC-AGENT-${1000 + memberIndex}`,

          remarks: `Test LIC policy for ${member.firstName} ${member.lastName}`,
        },
      });

      // ---------------------------------------------------
      // Create Dummy Premium Calculation
      // ---------------------------------------------------

      const sumAssured =
        500000 + productIndex * 500000;

      const basicYearlyPremium =
        25000 + productIndex * 5000;

      const installmentPremium =
        basicYearlyPremium;

      await prisma.policyPremiumCalculation.create({
        data: {
          policyId: policy.id,

          sumAssured,

          tabularRate: 25,
          tabularPremium: basicYearlyPremium,

          rebateRate: 0,
          rebateAmount: 0,

          modeFactor: 1,

          extraClassRate: 0,
          extraClassAmount: 0,

          riderPremium: 0,

          basicYearlyPremium,
          totalYearlyPremium: basicYearlyPremium,

          installmentPremium,

          gst: 0,

          totalInstallmentPremium: installmentPremium,
        },
      });

      // ---------------------------------------------------
      // Create Dummy Nominee
      // ---------------------------------------------------

      await prisma.nominee.create({
        data: {
          policyId: policy.id,

          nomineeName: "Test Nominee",
          relationship: "Spouse",

          dateOfBirth: new Date("1992-06-15"),

          percentage: 100,

          phone: "9111111111",

          email: "nominee@jemsoft.local",

          address: "Pune, Maharashtra, India",
        },
      });

      created++;

      console.log(
        `Created: ${policyNumber} | ${member.firstName} ${member.lastName} | Plan ${product.planNumber}`
      );
    }
  }

  // =====================================================
  // 9. SUMMARY
  // =====================================================

  console.log("\n=================================");
  console.log("LIC TEST POLICY SEED COMPLETED");
  console.log("=================================");

  console.log(`Provider       : LIC`);
  console.log(`Members        : ${members.length}`);
  console.log(`Products       : ${products.length}`);
  console.log(`Policies Created: ${created}`);
  console.log(`Policies Skipped: ${skipped}`);
  console.log(`Total Expected : 15`);

  console.log("=================================\n");

  console.log("Test Customer:");
  console.log("LIC Test Customer Group");

  console.log("\nTest members:");
  for (const member of members) {
    console.log(
      `- ${member.firstName} ${member.lastName}`
    );
  }

  console.log("\nThese policies should now be available in:");
  console.log("1. Customer → LIC → Policies");
  console.log("2. Policy List");
  console.log("3. Policy Details");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });