import { RuleConfig } from '../models/RuleConfig.js';
import { appendAuditLog } from '../services/auditLogger.service.js';
import { resolveRuleConfig } from '../services/ruleResolver.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createRuleConfig = asyncHandler(async (req, res) => {
  const ruleConfig = await RuleConfig.create(req.body);

  await appendAuditLog({
    entityType: 'RuleConfig',
    entityId: ruleConfig._id,
    action: 'create',
    userId: req.user.sub,
  });

  res.status(201).json({
    success: true,
    data: ruleConfig,
  });
});

export const getRuleConfigs = asyncHandler(async (req, res) => {
  const { accuracyClass, effectiveDate } = req.query;

  if (effectiveDate && accuracyClass) {
    const resolved = await resolveRuleConfig(accuracyClass, new Date(effectiveDate));
    return res.status(200).json({
      success: true,
      data: [resolved],
    });
  }

  const query = {};
  if (accuracyClass) {
    query.accuracyClass = accuracyClass;
  }

  const configs = await RuleConfig.find(query).sort({ effectiveDate: -1 });

  res.status(200).json({
    success: true,
    data: configs,
  });
});
