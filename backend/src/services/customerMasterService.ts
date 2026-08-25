import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export interface ICustomerMasterInput {
  groupId?: string;
  salutation?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dob?: string | Date;
  isGroupHead?: boolean;
  customerType?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  guardianId?: string;
  salutationLetter?: string;

  contactInfo?: {
    mobile1?: string;
    mobile2?: string;
    landline1Std?: string;
    landline1Number?: string;
    landline2Std?: string;
    landline2Number?: string;
    faxStd?: string;
    faxNumber?: string;
    emailPersonal?: string;
    emailBusiness?: string;
    skypeId?: string;
  };

  addresses?: Array<{
    addressType: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    addressLine4?: string;
    city?: string;
    pin?: string;
    country?: string;
    state?: string;
    area?: string;
    useGroupAddress?: boolean;
  }>;

  bankDetails?: Array<{
    isDefault?: boolean;
    ifscCode?: string;
    bankName?: string;
    bankBranch?: string;
    city?: string;
    accountType?: string;
    accountNumber?: string;
    micrNumber?: string;
  }>;

  miscInfo?: {
    relationToGroup?: string;
    dobForGreetings?: string | Date;
    marriageDate?: string | Date;
    isMarried?: boolean;
    demiseDate?: string | Date;
    isDead?: boolean;
    fatherName?: string;
    motherName?: string;
    spouseName?: string;
    nationality?: string;
    qualification?: string;
    occupationType?: string;
    occupation?: string;

    employer?: string;
    natureOfDuties?: string;
    referredBy?: string;
    heightFt?: string;
    weightKg?: string;
    incomeSlab?: string;
    religion?: string;
    crmGroups?: string;
    passportNumber?: string;
    passportExpiryDate?: string | Date;
    gstNumber?: string;
    specialNote?: string;
  };

  preferences?: {
    preferredCommAddress?: string;
    smsMarketing?: boolean;
    emailMarketing?: boolean;
  };
}

const CUSTOMER_MASTER_INCLUDE = {
  group: {
    select: {
      id: true,
      groupCode: true,
      groupName: true,
    },
  },
  guardian: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  contactInfo: true,
  addresses: true,
  bankDetails: true,
  miscInfo: true,
  preferences: true,
  familyHistories: {
    include: {
      records: true,
    },
  },
  medicalHistories: {
    include: {
      records: true,
    },
  },
  policies: {
    include: {
      product: true,
      status: true,
      premiumMode: true,
      premium: true,
      nominees: true,
      branch: true,
      advisor: true,
    },
  },
} as const;

export const getCustomersMaster = async () => {
  return await prisma.customerMaster.findMany({
    include: CUSTOMER_MASTER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomerMasterById = async (id: string) => {
  const customer = await prisma.customerMaster.findUnique({
    where: { id },
    include: CUSTOMER_MASTER_INCLUDE,
  });
  if (!customer) throw new AppError("Customer Master entry not found", 404);
  return customer;
};

export const createCustomerMaster = async (data: ICustomerMasterInput) => {
  // Build nested prisma creation structure
  const customer = await prisma.customerMaster.create({
    data: {
      groupId: data.groupId || null,
      salutation: data.salutation || null,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      gender: data.gender || null,
      dob: data.dob ? new Date(data.dob) : null,
      isGroupHead: data.isGroupHead ?? false,
      customerType: data.customerType || null,
      panNumber: data.panNumber || null,
      aadhaarNumber: data.aadhaarNumber || null,
      guardianId: data.guardianId || null,
      salutationLetter: data.salutationLetter || null,

      contactInfo: data.contactInfo
        ? {
            create: {
              mobile1: data.contactInfo.mobile1 || null,
              mobile2: data.contactInfo.mobile2 || null,
              landline1Std: data.contactInfo.landline1Std || null,
              landline1Number: data.contactInfo.landline1Number || null,
              landline2Std: data.contactInfo.landline2Std || null,
              landline2Number: data.contactInfo.landline2Number || null,
              faxStd: data.contactInfo.faxStd || null,
              faxNumber: data.contactInfo.faxNumber || null,
              emailPersonal: data.contactInfo.emailPersonal || null,
              emailBusiness: data.contactInfo.emailBusiness || null,
              skypeId: data.contactInfo.skypeId || null,
            },
          }
        : undefined,

      addresses: data.addresses?.length
        ? {
            createMany: {
              data: data.addresses.map((a) => ({
                addressType: a.addressType,
                addressLine1: a.addressLine1 || null,
                addressLine2: a.addressLine2 || null,
                addressLine3: a.addressLine3 || null,
                addressLine4: a.addressLine4 || null,
                city: a.city || null,
                pin: a.pin || null,
                country: a.country || "India",
                state: a.state || null,
                area: a.area || null,
                useGroupAddress: a.useGroupAddress ?? false,
              })),
            },
          }
        : undefined,

      bankDetails: data.bankDetails?.length
        ? {
            createMany: {
              data: data.bankDetails.map((b) => ({
                isDefault: b.isDefault ?? false,
                ifscCode: b.ifscCode || null,
                bankName: b.bankName || null,
                bankBranch: b.bankBranch || null,
                city: b.city || null,
                accountType: b.accountType || null,
                accountNumber: b.accountNumber || null,
                micrNumber: b.micrNumber || null,
              })),
            },
          }
        : undefined,

      miscInfo: data.miscInfo
        ? {
            create: {
              relationToGroup: data.miscInfo.relationToGroup || null,
              dobForGreetings: data.miscInfo.dobForGreetings ? new Date(data.miscInfo.dobForGreetings) : null,
              marriageDate: data.miscInfo.marriageDate ? new Date(data.miscInfo.marriageDate) : null,
              isMarried: data.miscInfo.isMarried ?? false,
              demiseDate: data.miscInfo.demiseDate ? new Date(data.miscInfo.demiseDate) : null,
              isDead: data.miscInfo.isDead ?? false,
              fatherName: data.miscInfo.fatherName || null,
              motherName: data.miscInfo.motherName || null,
              spouseName: data.miscInfo.spouseName || null,
              nationality: data.miscInfo.nationality || "Indian",
              occupationType: data.miscInfo.occupationType || null,
              occupation: data.miscInfo.occupation || null,
              employer: data.miscInfo.employer || null,
              natureOfDuties: data.miscInfo.natureOfDuties || null,
              referredBy: data.miscInfo.referredBy || null,
              heightFt: data.miscInfo.heightFt || null,
              weightKg: data.miscInfo.weightKg || null,
              incomeSlab: data.miscInfo.incomeSlab || null,
              religion: data.miscInfo.religion || null,
              crmGroups: data.miscInfo.crmGroups || null,
              passportNumber: data.miscInfo.passportNumber || null,
              passportExpiryDate: data.miscInfo.passportExpiryDate ? new Date(data.miscInfo.passportExpiryDate) : null,
              gstNumber: data.miscInfo.gstNumber || null,
              specialNote: data.miscInfo.specialNote || null,
            },
          }
        : undefined,

      preferences: data.preferences
        ? {
            create: {
              preferredCommAddress: data.preferences.preferredCommAddress || null,
              smsMarketing: data.preferences.smsMarketing ?? true,
              emailMarketing: data.preferences.emailMarketing ?? true,
            },
          }
        : undefined,
    },
    include: CUSTOMER_MASTER_INCLUDE,
  });
  return customer;
};

export const updateCustomerMaster = async (id: string, data: ICustomerMasterInput) => {
  const existing = await prisma.customerMaster.findUnique({ where: { id } });
  if (!existing) throw new AppError("Customer Master entry not found", 404);

  // Perform nested update
  // For relations we can delete existing ones and create fresh, or upsert.
  // Deleting and creating is simpler and cleaner for array values (addresses, bankDetails).
  // For single relations (contactInfo, miscInfo, preferences), we can upsert or update directly.

  const customer = await prisma.customerMaster.update({
    where: { id },
    data: {
      groupId: data.groupId !== undefined ? (data.groupId || null) : undefined,
      salutation: data.salutation !== undefined ? (data.salutation || null) : undefined,
      firstName: data.firstName,
      middleName: data.middleName !== undefined ? (data.middleName || null) : undefined,
      lastName: data.lastName,
      gender: data.gender !== undefined ? (data.gender || null) : undefined,
      dob: data.dob !== undefined ? (data.dob ? new Date(data.dob) : null) : undefined,
      isGroupHead: data.isGroupHead !== undefined ? data.isGroupHead : undefined,
      customerType: data.customerType !== undefined ? (data.customerType || null) : undefined,
      panNumber: data.panNumber !== undefined ? (data.panNumber || null) : undefined,
      aadhaarNumber: data.aadhaarNumber !== undefined ? (data.aadhaarNumber || null) : undefined,
      guardianId: data.guardianId !== undefined ? (data.guardianId || null) : undefined,
      salutationLetter: data.salutationLetter !== undefined ? (data.salutationLetter || null) : undefined,

      contactInfo: data.contactInfo
        ? {
            upsert: {
              create: {
                mobile1: data.contactInfo.mobile1 || null,
                mobile2: data.contactInfo.mobile2 || null,
                landline1Std: data.contactInfo.landline1Std || null,
                landline1Number: data.contactInfo.landline1Number || null,
                landline2Std: data.contactInfo.landline2Std || null,
                landline2Number: data.contactInfo.landline2Number || null,
                faxStd: data.contactInfo.faxStd || null,
                faxNumber: data.contactInfo.faxNumber || null,
                emailPersonal: data.contactInfo.emailPersonal || null,
                emailBusiness: data.contactInfo.emailBusiness || null,
                skypeId: data.contactInfo.skypeId || null,
              },
              update: {
                mobile1: data.contactInfo.mobile1 || null,
                mobile2: data.contactInfo.mobile2 || null,
                landline1Std: data.contactInfo.landline1Std || null,
                landline1Number: data.contactInfo.landline1Number || null,
                landline2Std: data.contactInfo.landline2Std || null,
                landline2Number: data.contactInfo.landline2Number || null,
                faxStd: data.contactInfo.faxStd || null,
                faxNumber: data.contactInfo.faxNumber || null,
                emailPersonal: data.contactInfo.emailPersonal || null,
                emailBusiness: data.contactInfo.emailBusiness || null,
                skypeId: data.contactInfo.skypeId || null,
              },
            },
          }
        : undefined,

      addresses: data.addresses
        ? {
            deleteMany: {},
            createMany: {
              data: data.addresses.map((a) => ({
                addressType: a.addressType,
                addressLine1: a.addressLine1 || null,
                addressLine2: a.addressLine2 || null,
                addressLine3: a.addressLine3 || null,
                addressLine4: a.addressLine4 || null,
                city: a.city || null,
                pin: a.pin || null,
                country: a.country || "India",
                state: a.state || null,
                area: a.area || null,
                useGroupAddress: a.useGroupAddress ?? false,
              })),
            },
          }
        : undefined,

      bankDetails: data.bankDetails
        ? {
            deleteMany: {},
            createMany: {
              data: data.bankDetails.map((b) => ({
                isDefault: b.isDefault ?? false,
                ifscCode: b.ifscCode || null,
                bankName: b.bankName || null,
                bankBranch: b.bankBranch || null,
                city: b.city || null,
                accountType: b.accountType || null,
                accountNumber: b.accountNumber || null,
                micrNumber: b.micrNumber || null,
              })),
            },
          }
        : undefined,

      miscInfo: data.miscInfo
        ? {
            upsert: {
              create: {
                relationToGroup: data.miscInfo.relationToGroup || null,
                dobForGreetings: data.miscInfo.dobForGreetings ? new Date(data.miscInfo.dobForGreetings) : null,
                marriageDate: data.miscInfo.marriageDate ? new Date(data.miscInfo.marriageDate) : null,
                isMarried: data.miscInfo.isMarried ?? false,
                demiseDate: data.miscInfo.demiseDate ? new Date(data.miscInfo.demiseDate) : null,
                isDead: data.miscInfo.isDead ?? false,
                fatherName: data.miscInfo.fatherName || null,
                motherName: data.miscInfo.motherName || null,
                spouseName: data.miscInfo.spouseName || null,
                nationality: data.miscInfo.nationality || "Indian",
                qualification: data.miscInfo.qualification || null,
                occupationType: data.miscInfo.occupationType || null,

                occupation: data.miscInfo.occupation || null,
                employer: data.miscInfo.employer || null,
                natureOfDuties: data.miscInfo.natureOfDuties || null,
                referredBy: data.miscInfo.referredBy || null,
                heightFt: data.miscInfo.heightFt || null,
                weightKg: data.miscInfo.weightKg || null,
                incomeSlab: data.miscInfo.incomeSlab || null,
                religion: data.miscInfo.religion || null,
                crmGroups: data.miscInfo.crmGroups || null,
                passportNumber: data.miscInfo.passportNumber || null,
                passportExpiryDate: data.miscInfo.passportExpiryDate ? new Date(data.miscInfo.passportExpiryDate) : null,
                gstNumber: data.miscInfo.gstNumber || null,
                specialNote: data.miscInfo.specialNote || null,
              },
              update: {
                relationToGroup: data.miscInfo.relationToGroup || null,
                dobForGreetings: data.miscInfo.dobForGreetings ? new Date(data.miscInfo.dobForGreetings) : null,
                marriageDate: data.miscInfo.marriageDate ? new Date(data.miscInfo.marriageDate) : null,
                isMarried: data.miscInfo.isMarried ?? false,
                demiseDate: data.miscInfo.demiseDate ? new Date(data.miscInfo.demiseDate) : null,
                isDead: data.miscInfo.isDead ?? false,
                fatherName: data.miscInfo.fatherName || null,
                motherName: data.miscInfo.motherName || null,
                spouseName: data.miscInfo.spouseName || null,
                nationality: data.miscInfo.nationality || "Indian",
                qualification: data.miscInfo.qualification || null,
                occupationType: data.miscInfo.occupationType || null,

                occupation: data.miscInfo.occupation || null,
                employer: data.miscInfo.employer || null,
                natureOfDuties: data.miscInfo.natureOfDuties || null,
                referredBy: data.miscInfo.referredBy || null,
                heightFt: data.miscInfo.heightFt || null,
                weightKg: data.miscInfo.weightKg || null,
                incomeSlab: data.miscInfo.incomeSlab || null,
                religion: data.miscInfo.religion || null,
                crmGroups: data.miscInfo.crmGroups || null,
                passportNumber: data.miscInfo.passportNumber || null,
                passportExpiryDate: data.miscInfo.passportExpiryDate ? new Date(data.miscInfo.passportExpiryDate) : null,
                gstNumber: data.miscInfo.gstNumber || null,
                specialNote: data.miscInfo.specialNote || null,
              },
            },
          }
        : undefined,

      preferences: data.preferences
        ? {
            upsert: {
              create: {
                preferredCommAddress: data.preferences.preferredCommAddress || null,
                smsMarketing: data.preferences.smsMarketing ?? true,
                emailMarketing: data.preferences.emailMarketing ?? true,
              },
              update: {
                preferredCommAddress: data.preferences.preferredCommAddress || null,
                smsMarketing: data.preferences.smsMarketing ?? true,
                emailMarketing: data.preferences.emailMarketing ?? true,
              },
            },
          }
        : undefined,
    },
    include: CUSTOMER_MASTER_INCLUDE,
  });
  return customer;
};

export const deleteCustomerMaster = async (id: string) => {
  const existing = await prisma.customerMaster.findUnique({ where: { id } });
  if (!existing) throw new AppError("Customer Master entry not found", 404);
  await prisma.customerMaster.delete({ where: { id } });
};
