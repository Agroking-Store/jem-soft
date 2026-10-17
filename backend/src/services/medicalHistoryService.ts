import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export interface IMedicalHistoryRecordInput {
  medicalHistoryDate?: string | Date;
  age?: number | null;
  gender?: string | null;
  bloodGroup: string;
  bloodPressure?: string | null;
  pulse?: string | null;
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  abdomen?: number | null;
  identificationMark?: string | null;
  spectaclesDetails?: string | null;
  dentalDetails?: string | null;
  majorIllness?: string | null;
  operationAccident?: string | null;
  specialReport?: string | null;
  doctorName?: string | null;
  medicalExaminationDate?: string | Date | null;
}

export interface IMedicalHistoryInput {
  memberId: string;
  date?: string | Date;
  records: IMedicalHistoryRecordInput[];
}

export const getMedicalHistoriesByMember = async (memberId: string) => {
  return await prisma.medicalHistory.findMany({
    where: { memberId },
    include: { records: true },
    orderBy: { date: "desc" },
  });
};

export const getMedicalHistoryById = async (id: string) => {
  const record = await prisma.medicalHistory.findUnique({
    where: { id },
    include: { records: true },
  });
  if (!record) throw new AppError("Medical history record not found", 404);
  return record;
};

const mapRecord = (r: IMedicalHistoryRecordInput) => ({
  medicalHistoryDate: r.medicalHistoryDate ? new Date(r.medicalHistoryDate) : new Date(),
  age: r.age ?? null,
  gender: r.gender || null,
  bloodGroup: r.bloodGroup,
  bloodPressure: r.bloodPressure || null,
  pulse: r.pulse || null,
  height: r.height ?? null,
  weight: r.weight ?? null,
  chest: r.chest ?? null,
  abdomen: r.abdomen ?? null,
  identificationMark: r.identificationMark || null,
  spectaclesDetails: r.spectaclesDetails || null,
  dentalDetails: r.dentalDetails || null,
  majorIllness: r.majorIllness || null,
  operationAccident: r.operationAccident || null,
  specialReport: r.specialReport || null,
  doctorName: r.doctorName || null,
  medicalExaminationDate: r.medicalExaminationDate ? new Date(r.medicalExaminationDate) : null,
});

export const createMedicalHistory = async (data: IMedicalHistoryInput) => {
  return await prisma.$transaction(async (tx) => {
    const medicalHistory = await tx.medicalHistory.create({
      data: {
        memberId: data.memberId,
        date: data.date ? new Date(data.date) : new Date(),
        records: {
          create: data.records.map(mapRecord),
        },
      },
      include: { records: true },
    });
    return medicalHistory;
  });
};

export const updateMedicalHistory = async (id: string, data: IMedicalHistoryInput) => {
  const existing = await prisma.medicalHistory.findUnique({ where: { id } });
  if (!existing) throw new AppError("Medical history record not found", 404);

  return await prisma.$transaction(async (tx) => {
    await tx.medicalHistoryRecord.deleteMany({
      where: { medicalHistoryId: id },
    });

    const updated = await tx.medicalHistory.update({
      where: { id },
      data: {
        memberId: data.memberId,
        date: data.date ? new Date(data.date) : new Date(),
        records: {
          create: data.records.map(mapRecord),
        },
      },
      include: { records: true },
    });
    return updated;
  });
};

export const deleteMedicalHistory = async (id: string) => {
  const existing = await prisma.medicalHistory.findUnique({ where: { id } });
  if (!existing) throw new AppError("Medical history record not found", 404);
  await prisma.medicalHistory.delete({ where: { id } });
};