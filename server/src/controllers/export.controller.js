import { Report } from '../models/Report.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const exportLegalMetrologyData = asyncHandler(async (req, res) => {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const from = req.query.from ? new Date(req.query.from) : defaultFrom;
  const to = req.query.to ? new Date(req.query.to) : now;

  const reports = await Report.find({
    status: 'signed',
    signedAt: { $gte: from, $lte: to },
  }).populate({
    path: 'testSessionId',
    populate: {
      path: 'instrumentModelId',
      populate: { path: 'manufacturerId' },
    },
  });

  const exportData = reports.map((report) => {
    const session = report.testSessionId;
    const model = session?.instrumentModelId;
    const manufacturer = model?.manufacturerId;

    return {
      reportNumber: report.reportNumber,
      instrumentModelName: model?.modelName || 'Unknown',
      manufacturerName: manufacturer?.name || 'Unknown',
      accuracyClass: model?.accuracyClass || 'Unknown',
      overallResult: session?.overallResult || 'Unknown',
      signedAt: report.signedAt,
    };
  });

  res.status(200).json({
    success: true,
    data: exportData,
    meta: {
      from,
      to,
      count: exportData.length,
    },
  });
});
