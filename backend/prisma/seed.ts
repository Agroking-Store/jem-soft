import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Seed Policy Statuses
  const policyStatuses = [
    { statusName: 'Active', statusCode: 'ACTIVE', description: 'The policy is currently active.' },
    { statusName: 'Pending', statusCode: 'PENDING', description: 'The policy is pending approval or first payment.' },
    { statusName: 'Lapsed', statusCode: 'LAPSED', description: 'The policy has lapsed due to non-payment.' },
    { statusName: 'Completed', statusCode: 'COMPLETED', description: 'The policy term has completed.' },
    { statusName: 'Surrendered', statusCode: 'SURRENDERED', description: 'The policy was surrendered before maturity.' },
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
    console.log(`Upserted policy status: ${status.statusName}`);
  }

  // Seed Premium Modes
  const premiumModes = [
    { modeName: 'Yearly', modeCode: 'YLY', months: 12, description: 'Once a year' },
    { modeName: 'Half-Yearly', modeCode: 'HLY', months: 6, description: 'Twice a year' },
    { modeName: 'Quarterly', modeCode: 'QLY', months: 4, description: 'Four times a year' },
    { modeName: 'Monthly', modeCode: 'MLY', months: 1, description: 'Every month' },
    { modeName: 'Single', modeCode: 'SIN', months: 0, description: 'One-time payment' },
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
    console.log(`Upserted premium mode: ${mode.modeName}`);
  }

  // Seed Insurance Providers
  const providersData = [
    { name: 'Aditya Birla Sun Life Insurance Company Limited', type: 'Insurance', code: 'ABSLI' },
    { name: 'Aegon Life Insurance Company Limited', type: 'Insurance', code: 'AEGON' },
    { name: 'Aviva Life Insurance Company', type: 'Insurance', code: 'AVIVA' },
    { name: 'Axis Max Life Insurance Limited', type: 'Insurance', code: 'AXIS_MAX' },
    { name: 'Bajaj Allianz Life Insurance Company', type: 'Insurance', code: 'BAJAJ_ALLIANZ' },
    { name: 'Bharti AXA Life Insurance Company', type: 'Insurance', code: 'BHARTI_AXA' },
    { name: 'Canara HSBC Life Insurance Company Limited', type: 'Insurance', code: 'CANARA_HSBC' },
    { name: 'DHFL Pramerica Life Insurance Company', type: 'Insurance', code: 'DHFL_PRAMERICA' },
    { name: 'Digit Life Insurance', type: 'Insurance', code: 'DIGIT' },
    { name: 'Edelweiss Tokio Life Insurance Company', type: 'Insurance', code: 'EDELWEISS_TOKIO' },
    { name: 'Exide Life Insurance Company', type: 'Insurance', code: 'EXIDE' },
    { name: 'Future Generali India Life Insurance Company', type: 'Insurance', code: 'FUTURE_GENERALI' },
    { name: 'HDFC Life Insurance Company Limited', type: 'Insurance', code: 'HDFC_LIFE' },
    { name: 'ICICI Prudential Life Insurance Company Limited', type: 'Insurance', code: 'ICICI_PRU' },
    { name: 'Ageas Federal Life Insurance Company Limited', type: 'Insurance', code: 'AGEAS_FEDERAL' },
    { name: 'IndiaFirst Life Insurance Company', type: 'Insurance', code: 'INDIAFIRST' },
    { name: 'Kotak Life Insurance', type: 'Insurance', code: 'KOTAK' },
    { name: 'Life Insurance Corporation of India', type: 'Insurance', code: 'LIC' },
    { name: 'Max Life Insurance Company', type: 'Insurance', code: 'MAX_LIFE' },
    { name: 'PNB MetLife India Insurance Company Limited', type: 'Insurance', code: 'PNB_METLIFE' },
    { name: 'Postal Life Insurance', type: 'Insurance', code: 'PLI' },
    { name: 'Reliance Nippon Life Insurance Company', type: 'Insurance', code: 'RELIANCE_NIPPON' },
    { name: 'Sahara India Life Insurance Company', type: 'Insurance', code: 'SAHARA' },
    { name: 'SBI Life Insurance Company Limited', type: 'Insurance', code: 'SBI_LIFE' },
    { name: 'Shriram Life Insurance Company', type: 'Insurance', code: 'SHRIRAM' },
    { name: 'Star Union Dai-ichi Life Insurance Company', type: 'Insurance', code: 'SUD' },
    { name: 'Tata AIA Life Insurance Company Limited', type: 'Insurance', code: 'TATA_AIA' },
    { name: 'Unit Trust of India', type: 'Insurance', code: 'UTI' },
  ];

  console.log('Seeding insurance providers...');
  for (const providerData of providersData) {
    await prisma.insuranceProvider.upsert({
      where: { code: providerData.code },
      update: {
        name: providerData.name,
        type: providerData.type,
      },
      create: providerData,
    });
    console.log(`Upserted provider: ${providerData.name}`);
  }

  // Seed Product Categories
  const dbProviders = await prisma.insuranceProvider.findMany({ select: { id: true, code: true } });
  console.log('Seeding product categories...');
  for (const provider of dbProviders) {
    await prisma.productCategory.upsert({
      where: { categoryCode: `${provider.code}_LIFE` },
      update: {
        categoryName: 'Life Insurance',
        description: 'Life insurance products',
      },
      create: {
        providerId: provider.id,
        categoryName: 'Life Insurance',
        categoryCode: `${provider.code}_LIFE`,
        description: 'Life insurance products',
      },
    });
    console.log(`Upserted category 'Life Insurance' for ${provider.code}`);
  }

  // Seed Products
  const dbCategories = await prisma.productCategory.findMany({ select: { id: true, providerId: true, categoryCode: true } });
  const categoryMap = new Map(dbCategories.map(c => [c.categoryCode, { id: c.id, providerId: c.providerId }]));

  const productsData = [
    // LIC Products
    { productName: 'Single Premium Endowment Plan', productCode: 'SPEP', planNumber: '717', providerCode: 'LIC' },
    { productName: 'LICs New Jeevan Anand', productCode: 'LNJA', planNumber: '715', providerCode: 'LIC' },
    { productName: 'LIC Jeevan Labh', productCode: 'LJL', planNumber: '736', providerCode: 'LIC' },
    // Aditya Birla Sun Life Insurance Products
    { productName: 'ABSLI DigiShield Plan', productCode: 'ADP', planNumber: 'ABSLI001', providerCode: 'ABSLI' },
    { productName: 'ABSLI Salaried Term Plan', productCode: 'ASTP', planNumber: 'ABSLI002', providerCode: 'ABSLI' },
    // ICICI Pru Products
    { productName: 'ICICI Pru Signature Secure', productCode: 'IPSS', planNumber: 'ICICIPRU001', providerCode: 'ICICI_PRU' }, // No change needed here
    { productName: 'ICICI Pru Protect N Gain Whole Life', productCode: 'IPPNGWL', planNumber: 'ICICIPRU002', providerCode: 'ICICI_PRU' }, // No change needed here
  ];

  console.log('Seeding products...');
  for (const productData of productsData) {
    const categoryInfo = categoryMap.get(`${productData.providerCode}_LIFE`);
    if (!categoryInfo) {
        console.warn(
            `Category ${productData.providerCode}_LIFE not found. Skipping ${productData.productName}`
        );
        continue;   
    }

      await prisma.productMaster.upsert({
        where: { providerId_productCode: { providerId: categoryInfo.providerId, productCode: productData.productCode } },
        update: { 
            categoryId: categoryInfo.id,
            productName: productData.productName, 
            planNumber: productData.planNumber 
        },
        create: {
          providerId: categoryInfo.providerId,
          categoryId: categoryInfo.id,
          productName: productData.productName,
          productCode: productData.productCode,
          planNumber: productData.planNumber,
        },
      });
      console.log(`Upserted product: ${productData.productName}`);
    }
  

  // Seed Rider Master
  const ridersData = [
    { riderName: 'Accidental Death and Disability Benefit Rider', riderCode: 'ADDB', description: 'Provides benefit on accidental death or disability.' },
    { riderName: 'Term Assurance Rider', riderCode: 'TERM', description: 'Provides an additional term life cover.' },
    { riderName: 'Critical Illness Rider', riderCode: 'CI', description: 'Covers a list of specified critical illnesses.' },
    { riderName: 'Waiver of Premium Rider', riderCode: 'WOP', description: 'Waives future premiums on disability or critical illness.' },
  ];

  console.log('Seeding riders...');
  for (const riderData of ridersData) {
    await prisma.riderMaster.upsert({
      where: { riderCode: riderData.riderCode },
      update: {
        riderName: riderData.riderName,
        description: riderData.description,
      },
      create: riderData,
    });
    console.log(`Upserted rider: ${riderData.riderName}`);
  }

  console.log(`Seeding finished.`);

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