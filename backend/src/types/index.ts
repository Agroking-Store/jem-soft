import { Request } from "express";
import { Document, Types } from "mongoose"; 

export interface IUser extends Document {
  _id: Types.ObjectId;  
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "ADVISOR" | "CLIENT";
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserInput {
  name: string;
  email: string;
  password: string;
  role?: "ADMIN" | "ADVISOR" | "CLIENT";
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