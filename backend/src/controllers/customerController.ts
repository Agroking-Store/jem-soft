import { Request, Response, NextFunction } from "express";
import * as customerService from "../services/customerService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { generateToken } from "../utils/generateToken.js";

export const getAllCustomers = catchAsync(async (_req: Request, res: Response) => {
  const customers = await customerService.getCustomers();
  res.status(200).json({ status: "success", data: { customers } });
});

export const getCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(req.params.id);
  res.status(200).json({ status: "success", data: { customer } });
});

export const createCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json({ status: "success", data: { customer } });
});

export const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.status(200).json({ status: "success", data: { customer } });
});

export const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  await customerService.deleteCustomer(req.params.id);
  res.status(204).json({ status: "success", data: null });
});

export const loginCustomer = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new Error("Please provide email and password"));
  }
  const customer = await customerService.loginCustomer(email, password);
  const token = generateToken(customer.id, "CUSTOMER_PORTAL");
  res.status(200).json({
    status: "success",
    token,
    data: { customer },
  });
});

export const getCustomerByCode = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerByGroupCode(req.params.groupCode);
  res.status(200).json({ status: "success", data: { customer } });
});

