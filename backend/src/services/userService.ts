import { prisma } from "../config/database.js";


export const updateProfile = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
  }
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email is already in use");
    }
  }

 return prisma.user.update({
  where: { id: userId },
  data: {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.email !== undefined && { email: data.email }),
  },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
  },
});
};