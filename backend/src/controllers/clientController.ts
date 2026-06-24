import { Request, Response, NextFunction } from "express";
import * as clientService from "../services/clientService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { generateToken } from "../utils/generateToken.js";

export const getAllClients = catchAsync(async (_req: Request, res: Response) => {
  const clients = await clientService.getClients();
  res.status(200).json({ status: "success", data: { clients } });
});

export const getClient = catchAsync(async (req: Request, res: Response) => {
  const client = await clientService.getClientById(req.params.id);
  res.status(200).json({ status: "success", data: { client } });
});

export const createClient = catchAsync(async (req: Request, res: Response) => {
  const client = await clientService.createClient(req.body);
  res.status(201).json({ status: "success", data: { client } });
});

export const updateClient = catchAsync(async (req: Request, res: Response) => {
  const client = await clientService.updateClient(req.params.id, req.body);
  res.status(200).json({ status: "success", data: { client } });
});

export const deleteClient = catchAsync(async (req: Request, res: Response) => {
  await clientService.deleteClient(req.params.id);
  res.status(204).json({ status: "success", data: null });
});

export const loginClient = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new Error("Please provide email and password"));
  }
  const client = await clientService.loginClient(email, password);
  const token = generateToken(client.id, "CLIENT_PORTAL");
  res.status(200).json({
    status: "success",
    token,
    data: { client },
  });
});
