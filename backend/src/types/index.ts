import { Request } from "express";

export interface IUser {
  id: string;  
  name: string;
  email: string;
  password?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserInput {
  name: string;
  email: string;
  password: string;
  role?: "ADMIN" | "ADVISOR" | "VIEWER";
}

export interface ILoginInput {
  email: string;
  password: string;
}

export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthResponse {
  status: string;
  token: string;
  data: {
    user: IUserResponse;
  };
}

export interface IJwtPayload {
  id: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface IAppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  code?: number;
  name: string;
}

export interface IErrorResponse {
  status: string;
  message: string;
  stack?: string;
}

export interface IAuthenticatedRequest extends Request {
  user?: IUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}