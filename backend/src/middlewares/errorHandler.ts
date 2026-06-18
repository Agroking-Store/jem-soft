import { Request, Response, NextFunction } from "express";
import { IAppError, IErrorResponse } from "../types/index.js";

export const globalErrorHandler = (
  err: IAppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  const errorResponse: IErrorResponse = {
    status: err.status,
    message: err.message,
  };

  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    console.error("Error:", err);
  } else {
    console.error("Error:", {
      message: err.message,
      statusCode: err.statusCode,
      status: err.status,
    });
  }

  if (err.name === "CastError") {
    errorResponse.message = "Invalid ID format";
    err.statusCode = 400;
  }

  if (err.name === "ValidationError") {
    errorResponse.message = err.message;
    err.statusCode = 400;
  }

  if ((err as any).code === 11000) {
    errorResponse.message = "Duplicate field value entered";
    err.statusCode = 400;
  }

  res.status(err.statusCode).json(errorResponse);
};