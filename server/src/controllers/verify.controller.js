import fs from 'fs';
import path from 'path';
import { Report } from '../models/Report.js';
import { sha256 } from '../utils/hash.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyReportArtifact } from '../services/digitalSignature.service.js';

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

  const session = report.testSessionId;
  const model = session?.instrumentModelId;

  const pdfPath = path.resolve(process.cwd(), report.pdfPath);
  const pdfExists = fs.existsSync(pdfPath);
  const actualPdfHash = pdfExists ? sha256(fs.readFileSync(pdfPath)) : null;
  const isIntegrityVerified = Boolean(
    actualPdfHash && actualPdfHash === report.contentHash &&
    verifyReportArtifact(actualPdfHash, report, 'PDF')
  );

  const isRevoked = report.status === 'revoked';
  const isSuperseded = Boolean(report.supersededByReportId);

  res.status(200).json({
    success: true,
    data: {
      reportNumber: report.reportNumber,
      status: report.status,
      isRevoked,
      isPublished: report.status === 'published',
      isSuperseded,
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
