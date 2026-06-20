import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { IUser, IUserInput } from "../types/index.js";

export const registerUser = async (userData: IUserInput): Promise<IUser> => {
  const { name, email, password } = userData;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already registered. Please login.", 400);
  }

  // Create new user
  const newUser = await User.create({
    name,
    email,
    password,
    role: userData.role || "CLIENT",
  });

  return newUser;
};

export const loginUser = async (email: string, password: string): Promise<IUser> => {
  // Find user by email and include password
  const user = await User.findOne({ email }).select("+password");
  
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // Check if password matches
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  return user;
};

export const getUserById = async (userId: string): Promise<IUser | null> => {
  return await User.findById(userId);
};