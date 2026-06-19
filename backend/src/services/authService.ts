import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { IUser, IUserInput } from "../types/index.js";
import bcrypt from "bcryptjs";

export const registerUser = async (userData: IUserInput): Promise<IUser> => {
  const { name, email, password } = userData;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("Email already registered. Please login.", 400);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: userData.role || "CLIENT",
    },
  });

  return newUser;
};

export const loginUser = async (email: string, password: string): Promise<IUser> => {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // Check if password matches
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  return user;
};

export const getUserById = async (userId: string): Promise<IUser | null> => {
  return await prisma.user.findUnique({ where: { id: userId } });
};