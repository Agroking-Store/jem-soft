import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export interface IAdvisorInput {
  providerId: string;
  advisorCode: string;
  advisorName: string;
  email?: string | null;
  phone?: string | null;
  licenseNumber?: string | null;
  panNumber?: string | null;
  branchCode?: string | null;
  designation?: string | null;
  joiningDate?: string | Date | null;
  isActive?: boolean;
}

export interface IAdvisorUpdate {
  providerId?: string;
  advisorCode?: string;
  advisorName?: string;
  email?: string | null;
  phone?: string | null;
  licenseNumber?: string | null;
  panNumber?: string | null;
  branchCode?: string | null;
  designation?: string | null;
  joiningDate?: string | Date | null;
  isActive?: boolean;
}

const advisorSelect = {
  id: true,
  providerId: true,
  advisorCode: true,
  advisorName: true,
  email: true,
  phone: true,
  licenseNumber: true,
  panNumber: true,
  branchCode: true,
  designation: true,
  joiningDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const validateRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  return value.trim();
};

const ensureProviderExists = async (providerId: string) => {
  const provider = await prisma.insuranceProvider.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    throw new AppError("Provider not found", 404);
  }
};

const normalizeDate = (value: string | Date | null | undefined) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }

    const parsedDate = new Date(trimmedValue);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new AppError("joiningDate must be a valid date", 400);
    }

    return parsedDate;
  }

  if (Number.isNaN(value.getTime())) {
    throw new AppError("joiningDate must be a valid date", 400);
  }

  return value;
};

export const getAdvisors = async () => {
  return await prisma.advisor.findMany({
    select: advisorSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getAllAdvisors = async () => {
  return getAdvisors();
};

export const getAdvisorById = async (id: string) => {
  const advisor = await prisma.advisor.findUnique({
    where: { id },
    select: advisorSelect,
  });

  if (!advisor) {
    throw new AppError("Advisor not found", 404);
  }

  return advisor;
};

export const createAdvisor = async (data: IAdvisorInput) => {
  const providerId = validateRequiredString(data.providerId, "providerId");
  const advisorCode = validateRequiredString(data.advisorCode, "advisorCode");
  const advisorName = validateRequiredString(data.advisorName, "advisorName");

  await ensureProviderExists(providerId);

  const existingAdvisor = await prisma.advisor.findFirst({
    where: {
      providerId,
      advisorCode,
    },
  });

  if (existingAdvisor) {
    throw new AppError(
      "An advisor with this code already exists for the selected provider.",
      400,
    );
  }

  return await prisma.advisor.create({
    data: {
      providerId,
      advisorCode,
      advisorName,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      licenseNumber: data.licenseNumber?.trim() || null,
      panNumber: data.panNumber?.trim() || null,
      branchCode: data.branchCode?.trim() || null,
      designation: data.designation?.trim() || null,
      joiningDate: normalizeDate(data.joiningDate),
      isActive: data.isActive ?? true,
    },
    select: advisorSelect,
  });
};

export const updateAdvisor = async (id: string, data: IAdvisorUpdate) => {
  const existingAdvisor = await prisma.advisor.findUnique({ where: { id } });
  if (!existingAdvisor) {
    throw new AppError("Advisor not found", 404);
  }

  const updateData: Record<string, unknown> = {};

  if (data.providerId !== undefined) {
    const providerId = validateRequiredString(data.providerId, "providerId");
    await ensureProviderExists(providerId);
    updateData.providerId = providerId;
  }

  if (data.advisorCode !== undefined) {
    updateData.advisorCode = validateRequiredString(
      data.advisorCode,
      "advisorCode",
    );
  }

  if (data.advisorName !== undefined) {
    updateData.advisorName = validateRequiredString(
      data.advisorName,
      "advisorName",
    );
  }

  if (data.email !== undefined) {
    updateData.email = data.email?.trim() || null;
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone?.trim() || null;
  }

  if (data.licenseNumber !== undefined) {
    updateData.licenseNumber = data.licenseNumber?.trim() || null;
  }

  if (data.panNumber !== undefined) {
    updateData.panNumber = data.panNumber?.trim() || null;
  }

  if (data.branchCode !== undefined) {
    updateData.branchCode = data.branchCode?.trim() || null;
  }

  if (data.designation !== undefined) {
    updateData.designation = data.designation?.trim() || null;
  }

  if (data.joiningDate !== undefined) {
    updateData.joiningDate = normalizeDate(data.joiningDate);
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    return existingAdvisor;
  }

  const providerId =
    (updateData.providerId as string | undefined) ?? existingAdvisor.providerId;
  const advisorCode =
    (updateData.advisorCode as string | undefined) ??
    existingAdvisor.advisorCode;

  const duplicateAdvisor = await prisma.advisor.findFirst({
    where: {
      providerId,
      advisorCode,
      NOT: { id },
    },
  });

  if (duplicateAdvisor) {
    throw new AppError(
      "An advisor with this code already exists for the selected provider.",
      400,
    );
  }

  return await prisma.advisor.update({
    where: { id },
    data: updateData,
    select: advisorSelect,
  });
};

export const deleteAdvisor = async (id: string) => {
  const existingAdvisor = await prisma.advisor.findUnique({ where: { id } });
  if (!existingAdvisor) {
    throw new AppError("Advisor not found", 404);
  }

  await prisma.advisor.delete({ where: { id } });
};
