import { Report } from '../models/Report.js';
import { TestSession } from '../models/TestSession.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { verifySignature } from '../utils/hash.js';
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

  const isSignatureValid = report.digitalSignature ? verifySignature(report.contentHash, report.digitalSignature) : false;

  res.status(200).json({
    success: true,
    data: {
      reportNumber: report.reportNumber,
      status: report.status,
      signedAt: report.signedAt,
      contentHash: report.contentHash,
      digitalSignature: report.digitalSignature,
      signatureAlgorithm: report.signatureAlgorithm || 'HMAC-SHA256',
      isSignatureValid,
      instrumentModelName: model?.modelName || 'Unknown',
      accuracyClass: model?.accuracyClass || 'Unknown',
      overallResult: session?.overallResult || 'Unknown',
    },
  });
});
