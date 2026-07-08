import { Request, Response, NextFunction } from "express";
import * as userService from "../services/userService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";

export const updateProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {


  if (!req.user) {
    return next(new AppError("User not authenticated.", 401));
  }
  const { name, email } = req.body;



  // Validation goes here
  if (!name && !email) {
    return next(new Error("Please provide a name or email to update."));
  }

  if (name !== undefined && typeof name !== "string") {
    return next(new Error("Name must be a string."));
  }

  if (name !== undefined && name.trim().length === 0) {
    return next(new Error("Name cannot be empty."));
  }

  if (email !== undefined && typeof email !== "string") {
    return next(new Error("Email must be a string."));
  }

  if (
    email !== undefined &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return next(new Error("Please provide a valid email address."));
  }

  // Call the service here
  const updatedUser = await userService.updateProfile(req.user.id, {
    name: name?.trim(),
    email: email?.trim()?.toLowerCase(),
  });

  res.status(200).json({
    message: "Profile updated successfully",
    user: updatedUser,
  });

});