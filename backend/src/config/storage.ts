import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

// Private storage directories (excluded from git and never exposed via express.static)
export const IDENTITY_DOCS_DIR = path.resolve(process.cwd(), 'uploads', 'identity_documents');
export const COMPLAINT_EVIDENCE_DIR = path.resolve(process.cwd(), 'uploads', 'complaint_evidence');

// Safe MIME-to-extension mapping to prevent extension spoofing
export const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

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
    const safeExt = MIME_EXTENSION_MAP[file.mimetype] || '.bin';
    const uniqueId = crypto.randomUUID();
    cb(null, `id_doc_${uniqueId}${safeExt}`);
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
    const safeExt = MIME_EXTENSION_MAP[file.mimetype] || '.bin';
    const uniqueId = crypto.randomUUID();
    cb(null, `evidence_${uniqueId}${safeExt}`);
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
 * Validates file magic bytes to prevent file-type spoofing attacks.
 */
export function verifyFileSignature(filePath: string, expectedMime: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    switch (expectedMime) {
      case 'image/jpeg':
        // JPEG magic number: FF D8 FF
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      case 'image/png':
        // PNG magic number: 89 50 4E 47
        return (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        );
      case 'image/webp':
        // RIFF header (52 49 46 46) + WEBP at offset 8 (57 45 42 50)
        return (
          buffer[0] === 0x52 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46 &&
          buffer[3] === 0x46 &&
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        );
      case 'application/pdf':
        // PDF magic number: %PDF- (25 50 44 46 2D)
        return (
          buffer[0] === 0x25 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x44 &&
          buffer[3] === 0x46
        );
      default:
        return false;
    }
  } catch (err) {
    console.warn(`[Storage] Signature verification failed for ${filePath}:`, err);
    return false;
  }
}

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
