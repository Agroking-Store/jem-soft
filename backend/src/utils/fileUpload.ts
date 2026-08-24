import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { fileURLToPath } from "url";
import type { Request, Response, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed file extensions
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// Maximum file size (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

// Upload directory
const UPLOAD_DIR = path.join(__dirname, "../../uploads/claim-documents");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: Function) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: Request, file: any, cb: Function) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (_req: Request, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  // Check extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(
      new Error("Only PDF, JPG, JPEG and PNG files are allowed.") as any,
      false,
    );
    return;
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    cb(
      new Error("Invalid file type. Please upload PDF or image files.") as any,
      false,
    );
    return;
  }

  cb(null, true);
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Error handler for file upload
export const handleUploadError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size must not exceed 10 MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Maximum file count exceeded.",
      });
    }
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  }
  next();
};

// Delete file from disk
export const deleteFile = (fileName: string): boolean => {
  try {
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

// Get file URL (for serving files)
export const getFileUrl = (fileName: string): string => {
  return `/api/claims/documents/file/${fileName}`;
};

// Get file path for serving
export const getFilePath = (fileName: string): string => {
  return path.join(UPLOAD_DIR, fileName);
};

// Validate file size
export const validateFileSize = (sizeInBytes: number): boolean => {
  return sizeInBytes <= MAX_FILE_SIZE;
};

export const UPLOAD_CONFIG = {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_DIR,
};
