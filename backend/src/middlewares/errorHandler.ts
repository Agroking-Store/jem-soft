import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { IAppError, IErrorResponse } from "../types/index.js";

export const globalErrorHandler = (
  err: IAppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  const prismaError = err as IAppError & {
    code?: string;
    meta?: Record<string, unknown>;
  };

  // Handle Prisma database errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        // Unique constraint violation
        const target = err.meta?.target;
        const fields = Array.isArray(target)
          ? target.join(", ")
          : target
            ? String(target)
            : "field";

        const readableFields: Record<string, string> = {
          policyNumber: "Policy number",
          email: "Email address",
          phone: "Phone number",
        };

        const readableField =
          readableFields[fields] || fields;

        message = `${readableField} already exists. Please use a unique value.`;
        statusCode = 409;
        break;
      }

      case "P2003":
        // Foreign key constraint violation
        message = "The referenced record does not exist or cannot be used.";
        statusCode = 409;
        break;

      case "P2025":
        // Record not found
        message = "The requested record was not found.";
        statusCode = 404;
        break;

      case "P2014":
        // Required relation violation
        message = "This operation violates a required relationship.";
        statusCode = 409;
        break;

      case "P2000":
        // Value too long for column
        message = "One or more field values exceed the allowed length.";
        statusCode = 400;
        break;

      case "P2011":
        // Null constraint violation
        message = "A required field cannot be empty.";
        statusCode = 400;
        break;

      case "P2006":
        // Invalid field value
        message = "One or more fields contain invalid values.";
        statusCode = 400;
        break;

      case "P2019":
        // Invalid input
        message = "Invalid input provided.";
        statusCode = 400;
        break;

      default:
        message = "A database error occurred.";
        statusCode = 500;
        break;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    // Prisma query validation error
    message = "Invalid data provided for the database operation.";
    statusCode = 400;
  }

  // Build the response after error classification
  const status = statusCode >= 500 ? "error" : "fail";

  const errorResponse: IErrorResponse = {
    status,
    message,
  };

  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    console.error("Error:", err);
  } else {
    console.error("Error:", {
      message,
      statusCode,
      status,
      prismaCode: prismaError.code,
    });
  }

  res.status(statusCode).json(errorResponse);
};
/*What changed?
- Removed
   MongoDB CastError handling.
- Removed
   MongoDB 11000 duplicate-key handling.
- Added Prisma's native error classes.
- P2002 now returns 409 Conflict, rather than 400.
- P2003 returns 409.
- P2025 returns 404.
- Prisma validation errors return 400.
- Unknown database errors return a generic 500 response.
ALL Done*/
