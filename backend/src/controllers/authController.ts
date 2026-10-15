import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService.js";
import { generateToken } from "../utils/generateToken.js";
import { catchAsync } from "../utils/catchAsync.js";
import { IAuthResponse } from "../types/index.js";

export const register = catchAsync(
  async (req: Request, res: Response) => {
    const user = await authService.registerUser(req.body);
    const token = generateToken(user.id, user.role);

    // Create user response with id
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response: IAuthResponse = {
      status: "success",
      token,
      data: { user: userResponse },
    };

    res.status(201).json(response);
  }
);

export const login = catchAsync(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await authService.loginUser(email, password);
    const token = generateToken(user.id, user.role);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response: IAuthResponse = {
      status: "success",
      token,
      data: { user: userResponse },
    };

    res.status(200).json(response);
  }
);

export const getCurrentUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return next(new Error("User not found"));
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      status: "success",
      data: { user: userResponse },
    });
  }
);