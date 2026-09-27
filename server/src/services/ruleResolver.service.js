import { RuleConfig } from '../models/RuleConfig.js';
import { AppError } from '../utils/AppError.js';

export async function resolveRuleConfig(accuracyClass, testDate) {
  const dateObj = new Date(testDate);
  const config = await RuleConfig.findOne({
    accuracyClass,
    effectiveDate: { $lte: dateObj },
  }).sort({ effectiveDate: -1 });

  if (!config) {
    throw new AppError(
      422,
      'NO_RULE_CONFIG_FOUND',
      `No rule configuration for class ${accuracyClass} effective on or before ${testDate}`
    );
  }
  return config;
}
