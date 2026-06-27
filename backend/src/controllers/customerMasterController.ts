import { Request, Response } from "express";
import * as customerMasterService from "../services/customerMasterService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getAllCustomersMaster = catchAsync(async (_req: Request, res: Response) => {
  const customers = await customerMasterService.getCustomersMaster();
  res.status(200).json({ status: "success", data: { customers } });
});

export const getCustomerMaster = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerMasterService.getCustomerMasterById(req.params.id);
  res.status(200).json({ status: "success", data: { customer } });
});

export const createCustomerMaster = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerMasterService.createCustomerMaster(req.body);
  res.status(201).json({ status: "success", data: { customer } });
});

export const updateCustomerMaster = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerMasterService.updateCustomerMaster(req.params.id, req.body);
  res.status(200).json({ status: "success", data: { customer } });
});

export const deleteCustomerMaster = catchAsync(async (req: Request, res: Response) => {
  await customerMasterService.deleteCustomerMaster(req.params.id);
  res.status(204).json({ status: "success", data: null });
});
