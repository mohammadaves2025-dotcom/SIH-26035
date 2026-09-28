import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Attachment } from '../models/Attachment.js';
import { TestSession } from '../models/TestSession.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { appendAuditLog } from '../services/auditLogger.service.js';
import { assertSessionAccess } from '../utils/tenantAccess.js';

const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  },
});

export const multerUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    if (!allowed.has(file.mimetype)) return cb(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP, PDF, DOCX, and text files are accepted'));
    cb(null, true);
  },
});

function validateMagicBytes(filePath) {
  const buffer = Buffer.alloc(12);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // PDF: 25 50 44 46 (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return true;
  // DOCX / ZIP: 50 4B 03 04 (PK..)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return true;
  // WebP: RIFF (52 49 46 46) + WEBP at offset 8
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;

  // Plain text / CSV: printable ASCII or UTF8 whitespace
  const isText = buffer.every(b => (b >= 9 && b <= 13) || (b >= 32 && b <= 126) || b === 0);
  if (isText) return true;

  return false;
}

export const uploadAttachment = asyncHandler(async (req, res) => {
  const session = await TestSession.findById(req.params.id);
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  await assertSessionAccess(req, session);

  if (!['draft', 'submitted'].includes(session.status)) {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Attachments can only be added to draft or submitted test sessions'
    );
  }

  if (!req.file) {
    throw new AppError(400, 'VALIDATION_ERROR', 'File is required');
  }

  if (!validateMagicBytes(req.file.path)) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    throw new AppError(400, 'INVALID_FILE_TYPE', 'File content magic bytes do not match expected signature');
  }

  const fileType = req.body.fileType;
  if (!['photo', 'document'].includes(fileType)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      "fileType must be 'photo' or 'document'"
    );
  }

  const relativePath = path.join('uploads', 'attachments', req.file.filename);

  const attachment = await Attachment.create({
    testSessionId: session._id,
    fileType,
    filePath: relativePath,
    originalFilename: req.file.originalname,
    uploadedBy: req.user.sub,
  });
  await appendAuditLog({ entityType: 'Attachment', entityId: attachment._id, action: 'upload', userId: req.user.sub });

  res.status(201).json({
    success: true,
    data: attachment,
  });
});

export const getAttachments = asyncHandler(async (req, res) => {
  const session = await TestSession.findById(req.params.id);
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  await assertSessionAccess(req, session);

  const attachments = await Attachment.find({ testSessionId: session._id })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: attachments,
  });
});

export const downloadAttachment = asyncHandler(async (req, res) => {
  const attachment = await Attachment.findById(req.params.attachmentId);
  if (!attachment) throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
  const session = await TestSession.findById(attachment.testSessionId);
  if (!session) throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  await assertSessionAccess(req, session);

  const absolutePath = path.resolve(process.cwd(), attachment.filePath);
  const allowedRoot = path.resolve(uploadDir);
  if (!absolutePath.startsWith(`${allowedRoot}${path.sep}`) || !fs.existsSync(absolutePath)) {
    throw new AppError(404, 'NOT_FOUND', 'Attachment file is unavailable');
  }
  res.download(absolutePath, path.basename(attachment.originalFilename || absolutePath));
});
