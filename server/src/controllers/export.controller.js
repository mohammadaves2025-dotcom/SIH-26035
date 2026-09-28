import { Report } from '../models/Report.js';
import { TestSession } from '../models/TestSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const exportLegalMetrologyData = asyncHandler(async (req, res) => {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const fromParam = req.query.from || req.query.startDate;
  const toParam = req.query.to || req.query.endDate;

  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to = toParam ? new Date(toParam) : now;

  const query = {
    status: 'integrity_tagged',
    generatedAt: { $gte: from, $lte: to },
  };
  if (req.user.role === 'lab_admin') {
    const sessionIds = await TestSession.find({ labId: req.user.labId || null }).distinct('_id');
    query.testSessionId = { $in: sessionIds };
  }

  const reports = await Report.find(query).populate({
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
      generatedAt: report.generatedAt,
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
