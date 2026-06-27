import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

export interface ICustomerInput {
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  password: string;

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

/** Auto-generate next group code like A001, A002 ... */
async function generateGroupCode(): Promise<string> {
  const last = await prisma.customer.findFirst({
    where: { groupCode: { not: null } },
    orderBy: { groupCode: "desc" },
    select: { groupCode: true },
  });

  if (!last?.groupCode) return "A001";

  const num = parseInt(last.groupCode.replace(/\D/g, ""), 10) + 1;
  return `A${String(num).padStart(3, "0")}`;
}

export const getCustomers = async () => {
  return await prisma.customer.findMany({
    select: CUSTOMER_GROUP_SELECT,
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: CUSTOMER_GROUP_SELECT,
  });
  if (!customer) throw new AppError("Customer not found", 404);
  return customer;
};

export const createCustomer = async (data: ICustomerInput) => {
  const existing = await prisma.customer.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("A customer with this email already exists.", 400);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  const groupCode = data.groupCode || (await generateGroupCode());

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      groupCode,
      groupName: data.groupName || data.name,
      category: data.category,
      mobilePersonal: data.mobilePersonal,
      emailPersonal: data.emailPersonal,
      mobileBusiness: data.mobileBusiness,
      emailBusiness: data.emailBusiness,
      prefCommAddress: data.prefCommAddress,
      resAddressLine1: data.resAddressLine1,
      resAddressLine2: data.resAddressLine2,
      resAddressLine3: data.resAddressLine3,
      resAddressLine4: data.resAddressLine4,
      resCity: data.resCity,
      resPin: data.resPin,
      resState: data.resState,
      resCountry: data.resCountry || "India",
      resArea: data.resArea,
      offAddressLine1: data.offAddressLine1,
      offAddressLine2: data.offAddressLine2,
      offAddressLine3: data.offAddressLine3,
      offAddressLine4: data.offAddressLine4,
      offCity: data.offCity,
      offPin: data.offPin,
      offState: data.offState,
      offCountry: data.offCountry || "India",
      offArea: data.offArea,
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
  if (!customer) throw new AppError("Invalid email or password", 401);

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

