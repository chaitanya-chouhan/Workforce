import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error Handler]', err);

  // Handle Multer upload errors or file filter rejections
  if (err.name === 'MulterError') {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'The uploaded file exceeds the maximum 5MB size limit. Please select a smaller file.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'An unexpected file field was received. Please use the designated upload field.';
    }
    res.status(400).json({
      success: false,
      error: `File upload error: ${message}`,
      code: err.code,
    });
    return;
  }

  // Handle explicit file format rejections from multer fileFilter
  if (
    err.message &&
    (err.message.toLowerCase().includes('file type') ||
      err.message.toLowerCase().includes('document format') ||
      err.message.toLowerCase().includes('evidence format') ||
      err.message.toLowerCase().includes('invalid file') ||
      err.message.toLowerCase().includes('supported'))
  ) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle standard errors
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.',
  });
}
