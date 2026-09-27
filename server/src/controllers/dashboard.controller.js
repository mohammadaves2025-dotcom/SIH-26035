import { TestSession } from '../models/TestSession.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { Manufacturer } from '../models/Manufacturer.js';
import { Report } from '../models/Report.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const { role, labId, email } = req.user;

  let sessionFilter = {};
  let modelFilter = {};

  if (['lab_technician', 'lab_admin'].includes(role)) {
    sessionFilter = { labId: labId || null };
  } else if (role === 'reviewer') {
    sessionFilter = { labId: labId || null };
  } else if (role === 'manufacturer') {
    const mfg = await Manufacturer.findOne({ contactEmail: email });
    if (mfg) {
      const models = await InstrumentModel.find({ manufacturerId: mfg._id }).select('_id');
      const modelIds = models.map((m) => m._id);
      sessionFilter = { instrumentModelId: { $in: modelIds } };
      modelFilter = { manufacturerId: mfg._id };
    } else {
      sessionFilter = { instrumentModelId: { $in: [] } };
      modelFilter = { manufacturerId: null };
    }
  }

  const sessions = await TestSession.find(sessionFilter).populate('instrumentModelId', 'accuracyClass modelName');
  const sessionIds = sessions.map((s) => s._id);

  const reportFilter = { testSessionId: { $in: sessionIds } };

  const [totalSessions, passedCount, failedCount, totalReports, totalInstruments, totalManufacturers] = await Promise.all([
    TestSession.countDocuments(sessionFilter),
    TestSession.countDocuments({ ...sessionFilter, overallResult: 'pass' }),
    TestSession.countDocuments({ ...sessionFilter, overallResult: 'fail' }),
    Report.countDocuments(reportFilter),
    InstrumentModel.countDocuments(modelFilter),
    ['admin', 'doca_officer'].includes(role) ? Manufacturer.countDocuments() : Promise.resolve(0),
  ]);

  const statusBreakdown = { draft: 0, submitted: 0, under_review: 0, passed: 0, failed: 0, report_generated: 0, published: 0 };
  const byAccuracyClass = { I: 0, II: 0, III: 0, IIII: 0 };
  const sessionsByLab = {};

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = Array(12).fill(0);

  for (const s of sessions) {
    if (statusBreakdown[s.status] !== undefined) {
      statusBreakdown[s.status]++;
    }
    const cls = s.instrumentModelId?.accuracyClass;
    if (cls && byAccuracyClass[cls] !== undefined) {
      byAccuracyClass[cls]++;
    }
    if (s.labId) {
      sessionsByLab[s.labId] = (sessionsByLab[s.labId] || 0) + 1;
    }
    if (s.createdAt) {
      const mIdx = new Date(s.createdAt).getMonth();
      monthCounts[mIdx]++;
    }
  }

  const currentMonthIdx = new Date().getMonth();
  const startIdx = Math.max(0, currentMonthIdx - 5);
  const monthlyTrend = monthNames.slice(startIdx, currentMonthIdx + 1).map((m, idx) => ({
    month: m,
    count: monthCounts[startIdx + idx],
  }));

  res.status(200).json({
    success: true,
    data: {
      totalSessions,
      passedCount,
      failedCount,
      totalReports,
      totalInstruments,
      totalManufacturers,
      statusBreakdown,
      byAccuracyClass,
      sessionsByLab,
      monthlyTrend,
      userRole: role,
    },
  });
});
