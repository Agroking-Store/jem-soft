import { Request, Response, NextFunction } from "express";
import * as claimService from "../services/claimService.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createClaimSchema,
  updateClaimSchema,
} from "../validations/claimValidation.js";

export const getClaims = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const claims = await claimService.getAllClaims();
    res.status(200).json({ success: true, data: claims });
  },
);

export const getClaimById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const claim = await claimService.getClaimByIdWithDocuments(id);

    if (!claim) {
      return next(new AppError("Claim not found.", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        claim,
      },
    });
  },
);

export const calculateClaimAmount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { policyId, claimType, claimDate } = req.query as {
      policyId?: string;
      claimType?: string;
      claimDate?: string;
    };

    if (!policyId || !claimType) {
      return next(new AppError("policyId and claimType are required.", 400));
    }

    const calculation = await claimService.calculateClaimAmount(
      policyId,
      claimType,
      claimDate,
    );

    res.status(200).json({ success: true, data: calculation });
  },
);

export const getLoanDetails = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { policyId, claimDate } = req.query as {
      policyId?: string;
      claimDate?: string;
    };

    if (!policyId) {
      return next(new AppError("policyId is required.", 400));
    }

    const loanDetails = await claimService.getLoanDetailsWithCalculatedInterest(
      policyId,
      claimDate,
    );

    res.status(200).json({ success: true, data: loanDetails });
  },
);

export const addClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate request body
    const validationResult = createClaimSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError(errors[0].message, 400));
    }

    const newClaim = await claimService.createClaim(
      validationResult.data,
      req.user!.id,
    );
    res.status(201).json({ success: true, data: newClaim });
  },
);

export const updateClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate request body
    const validationResult = updateClaimSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError(errors[0].message, 400));
    }

    const updatedClaim = await claimService.updateClaimById(
      req.params.id,
      validationResult.data,
      req.user!.id,
    );
    res.status(200).json({ success: true, data: updatedClaim });
  },
);

export const deleteClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await claimService.deleteClaimById(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Claim deleted successfully" });
  },
);

// ======================================================
// Document Management Handlers
// ======================================================

export const uploadClaimDocuments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: claimId } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return next(new AppError("No files uploaded.", 400));
    }

    // Verify claim exists
    const claim = await claimService.getClaimById(claimId);
    if (!claim) {
      return next(new AppError("Claim not found.", 404));
    }

    // Create document records for each uploaded file
    const documents = await Promise.all(
      files.map((file) =>
        claimService.createClaimDocument({
          claimId,
          fileName: file.filename,
          originalName: file.originalname,
          fileUrl: `/api/claims/documents/file/${file.filename}`,
          fileType: file.mimetype,
          fileSize: file.size,
        }),
      ),
    );

    res.status(201).json({
      success: true,
      message: "Documents uploaded successfully",
      data: documents,
    });
  },
);

export const deleteClaimDocument = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: claimId, documentId } = req.params;

    // Verify document exists and belongs to the claim
    const document = await claimService.getClaimDocumentById(documentId);
    if (!document) {
      return next(new AppError("Document not found.", 404));
    }

    if (document.claimId !== claimId) {
      return next(new AppError("Document does not belong to this claim.", 403));
    }

    // Delete from database
    await claimService.deleteClaimDocument(documentId);

    // Delete physical file
    const { deleteFile } = await import("../utils/fileUpload.js");
    deleteFile(document.fileName);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  },
);

export const getClaimDocuments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: claimId } = req.params;

    // Verify claim exists
    const claim = await claimService.getClaimById(claimId);
    if (!claim) {
      return next(new AppError("Claim not found.", 404));
    }

    const documents = await claimService.getClaimDocuments(claimId);

    res.status(200).json({
      success: true,
      data: documents,
    });
  },
);

export const downloadClaimDocument = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileName } = req.params;

    const { getFilePath } = await import("../utils/fileUpload.js");
    const filePath = getFilePath(fileName);

    res.download(filePath, (err) => {
      if (err) {
        next(new AppError("Error downloading file.", 500));
      }
    });
  },
);
