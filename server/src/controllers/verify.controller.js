import fs from 'fs';
import path from 'path';
import { Report } from '../models/Report.js';
import { verifySignature, sha256 } from '../utils/hash.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const verifyReport = asyncHandler(async (req, res) => {
  const { reportNumberOrHash } = req.params;

  let report = await Report.findOne({ reportNumber: reportNumberOrHash }).populate({
    path: 'testSessionId',
    populate: { path: 'instrumentModelId' },
  });

  if (!report) {
    report = await Report.findOne({ contentHash: reportNumberOrHash }).populate({
      path: 'testSessionId',
      populate: { path: 'instrumentModelId' },
    });
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
    verifySignature(actualPdfHash, report.hmacTag)
  );

  res.status(200).json({
    success: true,
    data: {
      reportNumber: report.reportNumber,
      status: report.status,
      generatedAt: report.generatedAt,
      contentHash: report.contentHash,
      signatureAlgorithm: report.signatureAlgorithm || 'HMAC-SHA256',
      isIntegrityVerified,
      signatureType: 'server HMAC integrity tag; report is not PKI-signed',
      instrumentModelName: model?.modelName || 'Unknown',
      accuracyClass: model?.accuracyClass || 'Unknown',
      overallResult: session?.overallResult || 'Unknown',
    },
  });
});
