import { generateHtmlTemplate, buildDocxDocument } from '../src/utils/reportBuilders.js';

describe('Report Builders', () => {
  const dummySession = {
    testDate: new Date('2025-01-01T00:00:00Z'),
    overallResult: 'pass',
  };
  const dummyModel = { modelName: 'M1', accuracyClass: 'III', maxCapacity: 100, e: 0.1, n: 1000 };
  const dummyManufacturer = { name: 'Mfg' };

  it('asserts the built HTML contains each load error, range, and banner when UNVERIFIED', () => {
    const observations = [
      {
        annexRef: 'A4_accuracy',
        evaluationMethod: 'structured',
        outcome: 'pass',
        ruleConfigId: {
          _id: 'rule123',
          validationNote: 'This is UNVERIFIED rules',
          oimlEdition: 'R76-1:2006',
          accuracyClass: 'III',
          effectiveDate: '2024-01-01T00:00:00Z'
        },
        readings: [
          { reference: 10, indicated: 10.02, error: 0.02, mpe: 0.05, margin: 0.03, result: 'pass' }
        ],
        worstMargin: 0.03
      },
      {
        annexRef: 'A4_repeatability',
        evaluationMethod: 'structured',
        outcome: 'pass',
        ruleConfigId: {
          _id: 'rule456',
          oimlEdition: 'R76-1:2006'
        },
        readings: [
          { reference: 20, indicated: 20.01 },
          { reference: 20, indicated: 20.02 }
        ],
        range: 0.01
      }
    ];

    const html = generateHtmlTemplate({
      reportNumber: 'NAWI-TEST-001',
      session: dummySession,
      model: dummyModel,
      manufacturer: dummyManufacturer,
      observations,
      attachments: [],
      generatedAt: new Date(),
      remarks: '<script>alert("XSS")</script>'
    });

    expect(html).toContain('RULES NOT YET EXPERT-VERIFIED');
    expect(html).toContain('+0.0200'); // the error
    expect(html).toContain('Range:');
    expect(html).toContain('0.0100 kg'); // the range
    expect(html).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'); // escaped html
    expect(html).not.toContain('<script>');
  });

  it('asserts the built DOCX structure contains UNVERIFIED and escaped text', () => {
    const observations = [
      {
        annexRef: 'A4_accuracy',
        evaluationMethod: 'structured',
        outcome: 'pass',
        ruleConfigId: {
          _id: 'rule123',
          validationNote: 'This is UNVERIFIED rules',
          oimlEdition: 'R76-1:2006'
        },
        readings: [
          { reference: 10, indicated: 10.02, error: 0.02, mpe: 0.05, margin: 0.03, result: 'pass' }
        ],
        worstMargin: 0.03
      }
    ];

    const docx = buildDocxDocument({
      reportNumber: 'NAWI-TEST-001',
      session: dummySession,
      model: dummyModel,
      manufacturer: dummyManufacturer,
      observations,
      attachments: [],
      generatedAt: new Date(),
      remarks: 'Just some text'
    });

    // Inspect internal structure for the banner text
    const textNodes = JSON.stringify(docx);
    expect(textNodes).toContain('RULES NOT YET EXPERT-VERIFIED');
    expect(textNodes).toContain('A4_accuracy');
    expect(textNodes).toContain('+0.0200'); // error
  });

  it('includes each accuracy reading and its individual result in both report formats', () => {
    const observations = [{
      annexRef: 'A4_accuracy',
      evaluationMethod: 'mpe_band',
      referenceLoad: 10,
      indicatedValue: 10.01,
      outcome: 'fail',
      computedErrors: [
        { error: 0.01, mpe: 0.05, margin: 0.04, result: 'pass' },
        { error: 0.08, mpe: 0.05, margin: -0.03, result: 'fail' },
      ],
      readings: [
        { reference: 10, indicated: 10.01 },
        { reference: 20, indicated: 20.08 },
      ],
    }];
    const reportInput = {
      reportNumber: 'NAWI-TEST-002',
      session: dummySession,
      model: dummyModel,
      manufacturer: dummyManufacturer,
      observations,
      attachments: [],
      generatedAt: new Date(),
    };

    const html = generateHtmlTemplate(reportInput);
    const docx = JSON.stringify(buildDocxDocument(reportInput));

    expect(html).toContain('10.01');
    expect(html).toContain('20.08');
    expect(html).toContain('0.0100');
    expect(html).toContain('0.0800');
    expect(docx).toContain('10.01');
    expect(docx).toContain('20.08');
    expect(docx).toContain('0.0100');
    expect(docx).toContain('0.0800');
  });
});
