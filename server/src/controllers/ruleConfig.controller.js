import { RuleConfig } from '../models/RuleConfig.js';
import { appendAuditLog } from '../services/auditLogger.service.js';
import { resolveRuleConfig } from '../services/ruleResolver.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const createRuleConfig = asyncHandler(async (req, res) => {
  const ruleConfig = await RuleConfig.create({ ...req.body, status: 'draft', createdBy: req.user.sub });

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

export const activateRuleConfig = asyncHandler(async (req, res) => {
  const { sourceReference, validationNote } = req.body;
  const ruleConfig = await RuleConfig.findById(req.params.id);
  if (!ruleConfig) {
    throw new AppError(404, 'NOT_FOUND', 'Rule configuration not found');
  }
  if (ruleConfig.status === 'active') {
    throw new AppError(409, 'INVALID_STATE', 'Rule configuration is already active');
  }
  if (!ruleConfig.createdBy) {
    throw new AppError(422, 'RULE_REVIEW_REQUIRED', 'Seeded or unowned example rules cannot be activated; create a reviewed rule configuration first');
  }
  if (ruleConfig.createdBy.toString() === req.user.sub) {
    throw new AppError(403, 'SEPARATION_OF_DUTIES', 'The rule author cannot provide the metrology expert approval');
  }
  const conflictingActiveRule = await RuleConfig.findOne({
    _id: { $ne: ruleConfig._id },
    accuracyClass: ruleConfig.accuracyClass,
    effectiveDate: ruleConfig.effectiveDate,
    status: 'active',
  });
  if (conflictingActiveRule) {
    throw new AppError(409, 'RULE_VERSION_CONFLICT', 'An active rule already exists for this accuracy class and effective date');
  }
  ruleConfig.sourceReference = sourceReference.trim();
  ruleConfig.validationNote = validationNote.trim();
  ruleConfig.approvedBy = req.user.sub;
  ruleConfig.approvedAt = new Date();
  ruleConfig.status = 'active';
  await ruleConfig.save();
  await appendAuditLog({
    entityType: 'RuleConfig',
    entityId: ruleConfig._id,
    action: `activate: ${sourceReference.trim()}`,
    userId: req.user.sub,
  });
  res.status(200).json({ success: true, data: ruleConfig });
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

  const configs = await RuleConfig.find(query)
    .populate('createdBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .sort({ effectiveDate: -1 });

  res.status(200).json({
    success: true,
    data: configs,
  });
});
