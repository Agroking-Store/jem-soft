import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export const getFamilyHistories = async () => {
  return await prisma.familyHistory.findMany({
    include: {
      group: {
        select: {
          groupCode: true,
          groupName: true,
          name: true,
        },
      },
      member: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          salutation: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
};

export const getFamilyHistoriesByMember = async (memberId: string) => {
  return await prisma.familyHistory.findMany({
    where: { memberId },
    include: {
      group: {
        select: {
          id: true,
          groupCode: true,
          groupName: true,
          name: true,
        },
      },
      member: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          salutation: true,
        },
      },
      records: true,
    },
    orderBy: {
      date: "desc",
    },
  });
};

export const getFamilyHistoryById = async (id: string) => {
  const record = await prisma.familyHistory.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          groupCode: true,
          groupName: true,
          name: true,
        },
      },
      member: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          salutation: true,
        },
      },
      records: true,
    },
  });
  if (!record) throw new AppError("Family history record not found", 404);
  return record;
};

export interface IFamilyHistoryRecordInput {
  relation: string;
  age: number;
  stateOfHealth: string;
  isDead?: boolean;
  ageAtDeath?: number;
  causeOfDeath?: string;
}

export interface IFamilyHistoryInput {
  groupId: string;
  memberId: string;
  date?: string | Date;
  records: IFamilyHistoryRecordInput[];
}

export const createFamilyHistory = async (data: IFamilyHistoryInput) => {
  return await prisma.$transaction(async (tx) => {
    const familyHistory = await tx.familyHistory.create({
      data: {
        groupId: data.groupId,
        memberId: data.memberId,
        date: data.date ? new Date(data.date) : new Date(),
        records: {
          create: data.records.map((r) => ({
            relation: r.relation,
            age: Number(r.age),
            stateOfHealth: r.stateOfHealth,
            isDead: !!r.isDead,
            ageAtDeath: r.ageAtDeath ? Number(r.ageAtDeath) : null,
            causeOfDeath: r.causeOfDeath || null,
          })),
        },
      },
      include: {
        group: {
          select: {
            id: true,
            groupCode: true,
            groupName: true,
            name: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            salutation: true,
          },
        },
        records: true,
      },
    });
    return familyHistory;
  });
};

export const updateFamilyHistory = async (id: string, data: IFamilyHistoryInput) => {
  const existing = await prisma.familyHistory.findUnique({ where: { id } });
  if (!existing) throw new AppError("Family history record not found", 404);

  return await prisma.$transaction(async (tx) => {
    // Delete existing sub-records
    await tx.familyHistoryRecord.deleteMany({
      where: { familyHistoryId: id },
    });

    // Update parent and create new sub-records
    const updated = await tx.familyHistory.update({
      where: { id },
      data: {
        groupId: data.groupId,
        memberId: data.memberId,
        date: data.date ? new Date(data.date) : new Date(),
        records: {
          create: data.records.map((r) => ({
            relation: r.relation,
            age: Number(r.age),
            stateOfHealth: r.stateOfHealth,
            isDead: !!r.isDead,
            ageAtDeath: r.ageAtDeath ? Number(r.ageAtDeath) : null,
            causeOfDeath: r.causeOfDeath || null,
          })),
        },
      },
      include: {
        group: {
          select: {
            id: true,
            groupCode: true,
            groupName: true,
            name: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            salutation: true,
          },
        },
        records: true,
      },
    });
    return updated;
  });
};

export const deleteFamilyHistory = async (id: string) => {
  const existing = await prisma.familyHistory.findUnique({ where: { id } });
  if (!existing) throw new AppError("Family history record not found", 404);
  await prisma.familyHistory.delete({ where: { id } });
};
