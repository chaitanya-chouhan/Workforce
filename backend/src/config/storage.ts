import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

// Private storage directories (excluded from git and never exposed via express.static)
export const IDENTITY_DOCS_DIR = path.resolve(process.cwd(), 'uploads', 'identity_documents');
export const COMPLAINT_EVIDENCE_DIR = path.resolve(process.cwd(), 'uploads', 'complaint_evidence');

// Ensure private directories exist with restricted access
for (const dir of [IDENTITY_DOCS_DIR, COMPLAINT_EVIDENCE_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Multer storage for private identity documents (Aadhaar / Govt ID)
const identityStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, IDENTITY_DOCS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const uniqueId = crypto.randomUUID();
    cb(null, `id_doc_${uniqueId}${ext}`);
  },
});

export const uploadIdentityDocument = multer({
  storage: identityStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Only JPEG, PNG, WebP, and PDF documents are supported.'));
    }
  },
});

// Multer storage for private complaint evidence
const complaintEvidenceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, COMPLAINT_EVIDENCE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const uniqueId = crypto.randomUUID();
    cb(null, `evidence_${uniqueId}${ext}`);
  },
});

export const uploadComplaintEvidence = multer({
  storage: complaintEvidenceStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid evidence format. Only JPEG, PNG, WebP, and PDF files are supported.'));
    }
  },
});

/**
 * Safely removes a file from private storage (for document cleanup or retention policy).
 */
export function removePrivateFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.warn(`[Storage] Failed to unlink file ${filePath}:`, err);
  }
  return false;
}
