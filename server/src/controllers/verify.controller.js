import { Report } from '../models/Report.js';
import { TestSession } from '../models/TestSession.js';
import { sha256 } from '../utils/hash.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyReportArtifact } from '../services/digitalSignature.service.js';
import { readStoredFile } from '../services/fileStorage.service.js';

const PUBLICLY_VERIFIABLE_STATUSES = ['published', 'archived', 'revoked'];
const MAX_SERIAL_LOOKUP_RESULTS = 25;

export const lookupReportsBySerialNumber = asyncHandler(async (req, res) => {
  const serialNumber = String(req.query.serialNumber || '').trim();
  if (!serialNumber || serialNumber.length > 120) {
    throw new AppError(400, 'INVALID_SERIAL_NUMBER', 'Enter a valid instrument serial number');
  }

  const escapedSerialNumber = serialNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sessions = await TestSession.find({
    serialNumber: { $regex: `^${escapedSerialNumber}$`, $options: 'i' },
  }).select('_id');
  const reports = await Report.find({
    status: { $in: PUBLICLY_VERIFIABLE_STATUSES },
    testSessionId: { $in: sessions.map((session) => session._id) },
  })
    .select('reportNumber status generatedAt publishedAt supersededByReportId testSessionId')
    .sort({ generatedAt: -1 })
    .limit(MAX_SERIAL_LOOKUP_RESULTS + 1)
    .populate({
      path: 'testSessionId',
      select: 'serialNumber overallResult instrumentModelId',
      populate: { path: 'instrumentModelId', select: 'modelName accuracyClass' },
    });

  const matchingRecords = reports.filter((report) => report.testSessionId);
  const matchingReports = matchingRecords.slice(0, MAX_SERIAL_LOOKUP_RESULTS).map((report) => ({
      reportNumber: report.reportNumber,
      status: report.status,
      generatedAt: report.generatedAt,
      publishedAt: report.publishedAt,
      isSuperseded: Boolean(report.supersededByReportId),
      serialNumber: report.testSessionId.serialNumber,
      overallResult: report.testSessionId.overallResult,
      instrumentModelName: report.testSessionId.instrumentModelId?.modelName || 'Unknown',
      accuracyClass: report.testSessionId.instrumentModelId?.accuracyClass || 'Unknown',
    }));

  res.status(200).json({
    success: true,
    data: {
      reports: matchingReports,
      hasMore: matchingRecords.length > MAX_SERIAL_LOOKUP_RESULTS,
    },
  });
});

export const verifyReport = asyncHandler(async (req, res) => {
  const { reportNumberOrHash } = req.params;

  let report = await Report.findOne({ reportNumber: reportNumberOrHash }).populate({
    path: 'testSessionId',
    populate: { path: 'instrumentModelId' },
  }).populate('supersededByReportId', 'reportNumber');

  if (!report) {
    report = await Report.findOne({ contentHash: reportNumberOrHash }).populate({
      path: 'testSessionId',
      populate: { path: 'instrumentModelId' },
    }).populate('supersededByReportId', 'reportNumber');
  }

  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'No report matches this number or hash');
  }

  // WP6 §12.4: Only published/archived/revoked/superseded reports are publicly verifiable.
  // integrity_tagged reports have not yet been published; treat as not found.
  const isSupersededReport = Boolean(report.supersededByReportId);
  if (!PUBLICLY_VERIFIABLE_STATUSES.includes(report.status) && !isSupersededReport) {
    throw new AppError(404, 'NOT_FOUND', 'No report matches this number or hash');
  }

  const session = report.testSessionId;
  const model = session?.instrumentModelId;

  let actualPdfHash = null;
  try {
    actualPdfHash = sha256(await readStoredFile({
      storageFileId: report.pdfStorageFileId,
      filePath: report.pdfPath,
    }));
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }
  const isIntegrityVerified = Boolean(
    actualPdfHash && actualPdfHash === report.contentHash &&
    verifyReportArtifact(actualPdfHash, report, 'PDF')
  );

  const isRevoked = report.status === 'revoked';

  res.status(200).json({
    success: true,
    data: {
      reportNumber: report.reportNumber,
      status: report.status,
      isRevoked,
      isPublished: report.status === 'published',
      isSuperseded: isSupersededReport,
      supersededByReportNumber: report.supersededByReportId?.reportNumber || null,
      revocationReason: report.revocationReason || null,
      publishedAt: report.publishedAt || null,
      revocationNotice: isRevoked ? 'WARNING: This report has been REVOKED by the Legal Metrology Authority' : null,
      generatedAt: report.generatedAt,
      contentHash: report.contentHash,
      signatureAlgorithm: report.signatureAlgorithm || 'HMAC-SHA256',
      isIntegrityVerified,
      isDigitalSignatureVerified: Boolean(isIntegrityVerified && report.pdfSignature),
      certificateFingerprint: report.certificateFingerprint || null,
      signerKeyId: report.signerKeyId || null,
      signatureType: report.pdfSignature ? 'PKI certificate-backed detached signature' : 'legacy server HMAC integrity tag; report is not PKI-signed',
      instrumentModelName: model?.modelName || 'Unknown',
      accuracyClass: model?.accuracyClass || 'Unknown',
      serialNumber: session?.serialNumber || null,
      overallResult: session?.overallResult || 'Unknown',
      overallVerdict: session?.overallResult || 'Unknown',
    },
  });
});
