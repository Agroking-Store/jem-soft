import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

export interface IClientInput {
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  password: string;
}

export interface IClientUpdate {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export const getClients = async () => {
  return await prisma.client.findMany({
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

export const getClientById = async (id: string) => {
  const client = await prisma.client.findUnique({
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
  if (!client) throw new AppError("Client not found", 404);
  return client;
};

export const createClient = async (data: IClientInput) => {
  const existing = await prisma.client.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("A client with this email already exists.", 400);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  const client = await prisma.client.create({
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
  return client;
};

export const updateClient = async (id: string, data: IClientUpdate) => {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new AppError("Client not found", 404);

  const updateData: IClientUpdate & { password?: string } = { ...data };

  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(data.password, salt);
  }

  return await prisma.client.update({
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

export const deleteClient = async (id: string) => {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new AppError("Client not found", 404);
  await prisma.client.delete({ where: { id } });
};

export const loginClient = async (email: string, password: string) => {
  const client = await prisma.client.findUnique({ where: { email } });
  if (!client) throw new AppError("Invalid email or password", 401);

  const isValid = await bcrypt.compare(password, client.password);
  if (!isValid) throw new AppError("Invalid email or password", 401);

  return {
    id: client.id,
    name: client.name,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
};
