import mongoose from 'mongoose';
import { TestType } from '../models/TestType.js';
import { User } from '../models/User.js';

export const initialTestTypes = [
  {
    testTypeId: 'T-A4-ACC',
    testName: 'Accuracy',
    oimlAnnexRef: 'A4_accuracy',
    formulaRef: 'E = I - L',
    description: 'Accuracy of indication across the weighing range',
    mandatoryFor: [
      { accuracyClass: 'I', verificationStage: 'all' },
      { accuracyClass: 'II', verificationStage: 'all' },
      { accuracyClass: 'III', verificationStage: 'all' },
      { accuracyClass: 'IIII', verificationStage: 'all' }
    ],
    status: 'approved'
  },
  {
    testTypeId: 'T-A4-ECC',
    testName: 'Eccentricity',
    oimlAnnexRef: 'A4_eccentricity',
    formulaRef: 'E = I - L',
    description: 'Errors of indication for eccentric loading',
    mandatoryFor: [
      { accuracyClass: 'I', verificationStage: 'all' },
      { accuracyClass: 'II', verificationStage: 'all' },
      { accuracyClass: 'III', verificationStage: 'all' },
      { accuracyClass: 'IIII', verificationStage: 'all' }
    ],
    status: 'approved'
  },
  {
    testTypeId: 'T-A4-REP',
    testName: 'Repeatability',
    oimlAnnexRef: 'A4_repeatability',
    formulaRef: 'R = I_max - I_min',
    description: 'Repeatability of indication',
    mandatoryFor: [
      { accuracyClass: 'I', verificationStage: 'all' },
      { accuracyClass: 'II', verificationStage: 'all' },
      { accuracyClass: 'III', verificationStage: 'all' },
      { accuracyClass: 'IIII', verificationStage: 'all' }
    ],
    status: 'approved'
  },
  {
    testTypeId: 'T-A4-DISC',
    testName: 'Discrimination',
    oimlAnnexRef: 'A4_discrimination',
    formulaRef: 'E = I - L',
    description: 'Discrimination at various loads',
    mandatoryFor: [
      { accuracyClass: 'I', verificationStage: 'all' },
      { accuracyClass: 'II', verificationStage: 'all' },
      { accuracyClass: 'III', verificationStage: 'all' },
      { accuracyClass: 'IIII', verificationStage: 'all' }
    ],
    status: 'approved'
  },
  {
    testTypeId: 'T-A1-ADMIN',
    testName: 'Administrative Examination',
    oimlAnnexRef: 'A1_administrative',
    formulaRef: 'Manual',
    description: 'Verification of descriptive markings and conformity',
    mandatoryFor: [
      { accuracyClass: 'I', verificationStage: 'all' },
      { accuracyClass: 'II', verificationStage: 'all' },
      { accuracyClass: 'III', verificationStage: 'all' },
      { accuracyClass: 'IIII', verificationStage: 'all' }
    ],
    status: 'approved'
  },
  {
    testTypeId: 'T-B-ELEC',
    testName: 'Electronic Additional',
    oimlAnnexRef: 'B_electronic_additional',
    formulaRef: 'Manual',
    description: 'Additional tests for electronic instruments',
    mandatoryFor: [],
    status: 'approved'
  }
];

export async function seedTestTypes() {
  console.log('Seeding TestTypes...');
  const adminUser = await User.findOne({ email: 'admin@nawi.gov.in' });
  const adminId = adminUser ? adminUser._id : null;

  for (const type of initialTestTypes) {
    const data = { ...type, createdBy: adminId, approvedBy: adminId, approvedAt: new Date() };
    await TestType.findOneAndUpdate(
      { testTypeId: type.testTypeId },
      data,
      { upsert: true, new: true }
    );
  }
  console.log('TestTypes seeded successfully.');
}
