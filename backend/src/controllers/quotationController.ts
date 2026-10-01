import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as quotationService from "../services/quotationService.js";

export const getNextRefNo = catchAsync(async (_req: Request, res: Response) => {
  const nextRefNo = await quotationService.getNextQuotationRefNo();
  res.status(200).json({
    status: "success",
    data: { nextRefNo },
  });
});

export const calculateQuotationPreview = catchAsync(
  async (req: Request, res: Response) => {
    const result = await quotationService.calculateQuotation(req.body);
    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);

export const createQuotation = catchAsync(
  async (req: Request, res: Response) => {
    const quotation = await quotationService.createQuotation(req.body);
    res.status(201).json({
      status: "success",
      data: { quotation },
    });
  },
);

export const getAllQuotations = catchAsync(
  async (req: Request, res: Response) => {
    const { productType, search, field, page, limit } = req.query;
    const result = await quotationService.getQuotations({
      productType: productType ? String(productType) : undefined,
      search: search ? String(search) : undefined,
      field: field ? String(field) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 6,
    });
    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);

export const getQuotationById = catchAsync(
  async (req: Request, res: Response) => {
    const quotation = await quotationService.getQuotationById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { quotation },
    });
  },
);

export const deleteQuotation = catchAsync(
  async (req: Request, res: Response) => {
    await quotationService.deleteQuotation(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Quotation deleted successfully",
    });
  },
);
