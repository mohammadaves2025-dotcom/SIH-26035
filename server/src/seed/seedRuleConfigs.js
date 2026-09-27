import mongoose from 'mongoose';
import { RuleConfig } from '../models/RuleConfig.js';
import { env } from '../config/env.js';

export const initialRules = [
  {
    oimlEdition: 'R76-1:2006',
    status: 'draft',
    sourceReference: null,
    validationNote: null,
    createdBy: null,
    approvedBy: null,
    approvedAt: null,
    accuracyClass: 'I',
    effectiveDate: new Date('2006-01-01'),
    bands: [
      { uptoMultipleOfE: 50000, mpeFactor: 0.5 },
      { uptoMultipleOfE: 200000, mpeFactor: 1.0 },
      { uptoMultipleOfE: 999999999, mpeFactor: 1.5 },
    ],
  },
  {
    oimlEdition: 'R76-1:2006',
    status: 'draft',
    sourceReference: null,
    validationNote: null,
    createdBy: null,
    approvedBy: null,
    approvedAt: null,
    accuracyClass: 'II',
    effectiveDate: new Date('2006-01-01'),
    bands: [
      { uptoMultipleOfE: 5000, mpeFactor: 0.5 },
      { uptoMultipleOfE: 20000, mpeFactor: 1.0 },
      { uptoMultipleOfE: 100000, mpeFactor: 1.5 },
    ],
  },
  {
    oimlEdition: 'R76-1:2006',
    status: 'draft',
    sourceReference: null,
    validationNote: null,
    createdBy: null,
    approvedBy: null,
    approvedAt: null,
    accuracyClass: 'III',
    effectiveDate: new Date('2006-01-01'),
    bands: [
      { uptoMultipleOfE: 500, mpeFactor: 0.5 },
      { uptoMultipleOfE: 2000, mpeFactor: 1.0 },
      { uptoMultipleOfE: 10000, mpeFactor: 1.5 },
    ],
  },
  {
    oimlEdition: 'R76-1:2006',
    status: 'draft',
    sourceReference: null,
    validationNote: null,
    createdBy: null,
    approvedBy: null,
    approvedAt: null,
    accuracyClass: 'IIII',
    effectiveDate: new Date('2006-01-01'),
    bands: [
      { uptoMultipleOfE: 50, mpeFactor: 0.5 },
      { uptoMultipleOfE: 200, mpeFactor: 1.0 },
      { uptoMultipleOfE: 1000, mpeFactor: 1.5 },
    ],
  },
];

export async function seedRuleConfigs() {
  console.log('Seeding RuleConfigs...');
  for (const rule of initialRules) {
    await RuleConfig.findOneAndUpdate(
      { accuracyClass: rule.accuracyClass, oimlEdition: rule.oimlEdition },
      rule,
      { upsert: true, new: true }
    );
  }
  console.log('RuleConfigs seeded successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seedRuleConfigs.js')) {
  mongoose.connect(env.MONGO_URI).then(async () => {
    await seedRuleConfigs();
    await mongoose.disconnect();
  });
}
