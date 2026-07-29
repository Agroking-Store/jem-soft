import { Request, Response, NextFunction } from "express";
import * as userService from "../services/userService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users },
  });
});

export const getUserById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { user },
    });
  },
);

export const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return next(
        new AppError("name, email, password and role are required", 400),
      );
    }

    const allowedRoles = ["ADMIN", "ADVISOR", "VIEWER"];
    if (!allowedRoles.includes(role)) {
      return next(new AppError("Role must be ADMIN, ADVISOR or VIEWER", 400));
    }

    if (password.length < 6) {
      return next(new AppError("Password must be at least 6 characters", 400));
    }

    const user = await userService.createUser({ name, email, password, role });

    res.status(201).json({
      status: "success",
      data: { user },
    });
  },
);

export const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, role, isActive } = req.body;

    if (role !== undefined) {
      const allowedRoles = ["ADMIN", "ADVISOR", "VIEWER"];
      if (!allowedRoles.includes(role)) {
        return next(new AppError("Role must be ADMIN, ADVISOR or VIEWER", 400));
      }
    }

    const user = await userService.updateUser(req.params.id, {
      name,
      email,
      role,
      isActive,
    });

    res.status(200).json({
      status: "success",
      data: { user },
    });
  },
);

export const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    await userService.deleteUser(req.params.id, req.user.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);

export const resetUserPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return next(
        new AppError("New password must be at least 6 characters", 400),
      );
    }

    await userService.resetUserPassword(
      req.params.id,
      newPassword,
      req.user.id,
    );

    res.status(200).json({
      status: "success",
      message: "Password reset successfully",
    });
  },
);

export const updateProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { name, email } = req.body;

    if (!name && !email) {
      return next(new AppError("Please provide name or email to update", 400));
    }

    const updatedUser = await userService.updateProfile(req.user.id, {
      name: name?.trim(),
      email: email?.trim()?.toLowerCase(),
    });

    res.status(200).json({
      status: "success",
      data: { user: updatedUser },
    });
  },
);
