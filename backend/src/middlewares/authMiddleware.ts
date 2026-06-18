import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { User } from "../models/User.js";
import { IJwtPayload, IUser } from "../types/index.js";

export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Get token from header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IJwtPayload;

      // Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next(
          new AppError("The user belonging to this token no longer exists.", 401)
        );
      }

      // Grant access to route
      req.user = currentUser;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new AppError("Invalid token. Please log in again.", 401));
      }
      if (error instanceof jwt.TokenExpiredError) {
        return next(new AppError("Your token has expired! Please log in again.", 401));
      }
      return next(new AppError("Authentication failed.", 401));
    }
  }
);

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (!roles.includes(user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};