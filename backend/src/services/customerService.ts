import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

export interface ICustomerInput {
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  password: string;
}

export interface ICustomerUpdate {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export const getCustomers = async () => {
  return await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!customer) throw new AppError("Customer not found", 404);
  return customer;
};

export const createCustomer = async (data: ICustomerInput) => {
  const existing = await prisma.customer.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("A customer with this email already exists.", 400);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return customer;
};

export const updateCustomer = async (id: string, data: ICustomerUpdate) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new AppError("Customer not found", 404);

  const updateData: ICustomerUpdate & { password?: string } = { ...data };

  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(data.password, salt);
  }

  return await prisma.customer.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
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
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};
