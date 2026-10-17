import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

export interface ICustomerInput {
  groupCode: string;
  groupName: string;
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  password?: string;

  // Customer Group fields
  category?: string;

  // Contact Info
  mobilePersonal?: string;
  emailPersonal?: string;
  mobileBusiness?: string;
  emailBusiness?: string;

  // Preferred Communication Address
  prefCommAddress?: string;

  // Residence Address
  resAddressLine1?: string;
  resAddressLine2?: string;
  resAddressLine3?: string;
  resAddressLine4?: string;
  resCity?: string;
  resPin?: string;
  resState?: string;
  resCountry?: string;
  resArea?: string;

  // Office Address
  offAddressLine1?: string;
  offAddressLine2?: string;
  offAddressLine3?: string;
  offAddressLine4?: string;
  offCity?: string;
  offPin?: string;
  offState?: string;
  offCountry?: string;
  offArea?: string;
}

export interface ICustomerUpdate {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  password?: string;

  // Customer Group fields
  groupCode?: string;
  groupName?: string;
  category?: string;

  // Contact Info
  mobilePersonal?: string;
  emailPersonal?: string;
  mobileBusiness?: string;
  emailBusiness?: string;

  // Preferred Communication Address
  prefCommAddress?: string;

  // Residence Address
  resAddressLine1?: string;
  resAddressLine2?: string;
  resAddressLine3?: string;
  resAddressLine4?: string;
  resCity?: string;
  resPin?: string;
  resState?: string;
  resCountry?: string;
  resArea?: string;

  // Office Address
  offAddressLine1?: string;
  offAddressLine2?: string;
  offAddressLine3?: string;
  offAddressLine4?: string;
  offCity?: string;
  offPin?: string;
  offState?: string;
  offCountry?: string;
  offArea?: string;
}

const CUSTOMER_GROUP_SELECT = {
  id: true,
  name: true,
  companyName: true,
  email: true,
  phone: true,
  groupCode: true,
  groupName: true,
  category: true,
  mobilePersonal: true,
  emailPersonal: true,
  mobileBusiness: true,
  emailBusiness: true,
  prefCommAddress: true,
  resAddressLine1: true,
  resAddressLine2: true,
  resAddressLine3: true,
  resAddressLine4: true,
  resCity: true,
  resPin: true,
  resState: true,
  resCountry: true,
  resArea: true,
  offAddressLine1: true,
  offAddressLine2: true,
  offAddressLine3: true,
  offAddressLine4: true,
  offCity: true,
  offPin: true,
  offState: true,
  offCountry: true,
  offArea: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { policies: true } },
} as const;



export const getCustomers = async () => {
  return await prisma.customer.findMany({
    select: CUSTOMER_GROUP_SELECT,
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      members: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          salutation: true,
        },
      },
      policies: {
        include: {
          CustomerMaster: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              salutation: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              productName: true,
              planNumber: true,
            },
          },
          status: {
            select: {
              id: true,
              statusName: true,
              statusCode: true,
            },
          },
          premium: {
            select: {
              id: true,
              sumAssured: true,
              installmentPremium: true,
              totalInstallmentPremium: true,
            },
          },
          premiumMode: {
            select: {
              id: true,
              modeName: true,
            },
          },
        },
      },
    },
  });
  if (!customer) throw new AppError("Customer not found", 404);
  return customer;
};

export const createCustomer = async (data: ICustomerInput) => {
  const groupCode = data.groupCode?.trim();
  if (!groupCode) throw new AppError("Group code is required.", 400);

  const groupName = (data.groupName || data.name)?.trim();
  if (!groupName) throw new AppError("Group name is required.", 400);

  const existingGroup = await prisma.customer.findUnique({ where: { groupCode } });
  if (existingGroup) {
    throw new AppError("already created group of this code", 400);
  }

  const email = data.email?.trim() || null;
  if (email) {
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) throw new AppError("A customer with this email already exists.", 400);
  }

  let hashedPassword: string | null = null;
  if (data.password?.trim()) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(data.password.trim(), salt);
  }

  const customer = await prisma.customer.create({
    data: {
      groupCode,
      groupName,
      name: data.name?.trim() || groupName,
      companyName: data.companyName?.trim() || null,
      email,
      phone: data.phone?.trim() || null,
      password: hashedPassword,
      category: data.category?.trim() || null,
      mobilePersonal: data.mobilePersonal?.trim() || null,
      emailPersonal: data.emailPersonal?.trim() || null,
      mobileBusiness: data.mobileBusiness?.trim() || null,
      emailBusiness: data.emailBusiness?.trim() || null,
      prefCommAddress: data.prefCommAddress || null,
      resAddressLine1: data.resAddressLine1?.trim() || null,
      resAddressLine2: data.resAddressLine2?.trim() || null,
      resAddressLine3: data.resAddressLine3?.trim() || null,
      resAddressLine4: data.resAddressLine4?.trim() || null,
      resCity: data.resCity?.trim() || null,
      resPin: data.resPin?.trim() || null,
      resState: data.resState?.trim() || null,
      resCountry: data.resCountry || "India",
      resArea: data.resArea?.trim() || null,
      offAddressLine1: data.offAddressLine1?.trim() || null,
      offAddressLine2: data.offAddressLine2?.trim() || null,
      offAddressLine3: data.offAddressLine3?.trim() || null,
      offAddressLine4: data.offAddressLine4?.trim() || null,
      offCity: data.offCity?.trim() || null,
      offPin: data.offPin?.trim() || null,
      offState: data.offState?.trim() || null,
      offCountry: data.offCountry || "India",
      offArea: data.offArea?.trim() || null,
    },
    select: CUSTOMER_GROUP_SELECT,
  });
  return customer;
};

export const updateCustomer = async (id: string, data: ICustomerUpdate) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new AppError("Customer not found", 404);

  const updateData: any = { ...data };

  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(data.password, salt);
  } else {
    delete updateData.password;
  }

  if (data.groupCode) {
    const groupCode = data.groupCode.trim();
    if (groupCode !== existing.groupCode) {
      const existingGroup = await prisma.customer.findUnique({ where: { groupCode } });
      if (existingGroup) {
        throw new AppError("already created group of this code", 400);
      }
    }
    updateData.groupCode = groupCode;
  } else if (data.hasOwnProperty("groupCode")) {
    updateData.groupCode = null;
  }

  return await prisma.customer.update({
    where: { id },
    data: updateData,
    select: CUSTOMER_GROUP_SELECT,
  });
};

export const deleteCustomer = async (id: string) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new AppError("Customer not found", 404);
  await prisma.customer.delete({ where: { id } });
};

export const loginCustomer = async (email: string, password: string) => {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer || !customer.password) throw new AppError("Invalid email or password", 401);

  const isValid = await bcrypt.compare(password, customer.password);
  if (!isValid) throw new AppError("Invalid email or password", 401);

  return {
    id: customer.id,
    name: customer.name,
    companyName: customer.companyName,
    email: customer.email,
    phone: customer.phone,
    groupCode: customer.groupCode,
    groupName: customer.groupName,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};

export const getCustomerByGroupCode = async (groupCode: string) => {
  const customer = await prisma.customer.findUnique({
    where: { groupCode },
    include: {
      members: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          salutation: true,
        },
      },
      policies: {
        include: {
          CustomerMaster: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              salutation: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              productName: true,
              planNumber: true,
            },
          },
          status: {
            select: {
              id: true,
              statusName: true,
              statusCode: true,
            },
          },
          premium: {
            select: {
              id: true,
              sumAssured: true,
              installmentPremium: true,
              totalInstallmentPremium: true,
            },
          },
          premiumMode: {
            select: {
              id: true,
              modeName: true,
            },
          },
        },
      },
    },
  });
  if (!customer) throw new AppError("Customer group not found", 404);
  return customer;
};


