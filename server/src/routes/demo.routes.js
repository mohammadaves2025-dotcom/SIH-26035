import { Router } from 'express';
import { seedDemoData } from '../seed/seedDemoData.js';
import { TestSession } from '../models/TestSession.js';
import { Observation } from '../models/Observation.js';
import { Report } from '../models/Report.js';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();

router.get('/status', async (req, res, next) => {
  try {
    const sessionCount = await TestSession.countDocuments();
    res.json({
      success: true,
      data: {
        isDemoDataIncluded: sessionCount > 0,
        sessionCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/seed', async (req, res, next) => {
  try {
    const result = await seedDemoData();
    res.json({
      success: true,
      message: 'Legal Metrology demo datasets populated successfully',
      data: { ...result, isDemoDataIncluded: true },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/clear', async (req, res, next) => {
  try {
    await Promise.all([
      TestSession.deleteMany({}),
      Observation.deleteMany({}),
      Report.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    res.json({
      success: true,
      message: 'Demo test sessions cleared successfully',
      data: { isDemoDataIncluded: false, sessionCount: 0 },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
