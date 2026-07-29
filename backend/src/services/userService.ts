import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const getAllUsers = async () => {
  return prisma.user.findMany({
    select: safeUserSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) throw new AppError("Email already in use", 400);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      role: data.role,
      isActive: true,
    },
    select: safeUserSelect,
  });
};

export const updateUser = async (
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  },
) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new AppError("Email already in use", 400);
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && {
        email: data.email.toLowerCase().trim(),
      }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: safeUserSelect,
  });
};

export const deleteUser = async (id: string, requestingUserId: string) => {
  if (id === requestingUserId) {
    throw new AppError("You cannot delete your own account", 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);

  await prisma.user.delete({ where: { id } });
};

export const resetUserPassword = async (
  id: string,
  newPassword: string,
  requestingUserId: string,
) => {
  if (id === requestingUserId) {
    throw new AppError("Use the profile page to change your own password", 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
};

export const updateProfile = async (
  userId: string,
  data: { name?: string; email?: string },
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new AppError("Email already in use", 400);
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
    },
    select: safeUserSelect,
  });
};
