# Audit Review Findings (GAP_INPUT)

> [!CAUTION]
> All section references (§9.2, §9.3, §11.2, §12.1, etc.) below are **UNVERIFIED - PENDING EXPERT**. No authoritative OIML R-76 source document was supplied during development. These references are best-effort developer notes and must be independently validated by a qualified metrology expert.

## A. Bugs and Correctness Risks

| # | Finding | Where | Blueprint Ref (UNVERIFIED) | Status |
|---|---|---|---|---|
| A1 | MPE band was chosen from `maxCapacity`, not from the test `referenceLoad`. **NOW FIXED** — band selection uses `referenceLoadScaled <= uptoMultipleOfE * eScaled`. | `server/src/services/complianceEngine.service.js` | Needs expert validation | FIXED |
| A2 | Only `A4_accuracy` is computed automatically. Other annexes use manual `checklistPassed` boolean, throwing `UNSUPPORTED_TEST_METHOD` for `mpe_band` mode on other annexes. | `complianceEngine.service.js`, `client/src/config/constants.js` | Needs expert validation | CONFIRMED |
| A3 | Rule activation and seed flow gap: `seedRuleConfigs` seeds draft rules without createdBy; `activateRuleConfig` requires author != approver and `metrology_expert` role; `seedUsers` lacked `metrology_expert` user. | `seed/*.js`, `ruleConfig.controller.js` | Needs expert validation | CONFIRMED |
| A4 | QR Code replaced with genuine vector SVG QR code generator (using pure JS matrix encoder). | `server/src/utils/qrGenerator.js`, `reportGenerator.service.js` | N/A | CONFIRMED / FIXED |
| A5 | `rejectTestSession` set `session.reviewerNotes`, but `TestSession` schema had no `reviewerNotes` field (Mongoose silently dropped it). | `testSession.controller.js`, `models/TestSession.js` | N/A | CONFIRMED |
| A6 | Manufacturer tenancy matches on contact email string equality rather than ObjectId ref. | `utils/tenantAccess.js` | N/A | CONFIRMED |
| A7 | Audit-log chain serialized via in-process promise queue; `verifyAuditChain` loads all entries into memory. | `services/auditLogger.service.js`, `auditLog.controller.js` | N/A | CONFIRMED |
| A8 | Observation update/delete audit log missing before/after diffs; observation delete was a hard delete. | `testSession.controller.js` | N/A | CONFIRMED |

## B. Missing vs. Blueprint

| # | Gap | Blueprint Ref (UNVERIFIED) | Status |
|---|---|---|---|
| B1 | Report lifecycle incomplete (Draft → Review → Approved → Published → Archived / Revoked with immutable signed reports). | Needs expert validation | CONFIRMED |
| B2 | Signing is HMAC-SHA256 server tag rather than asymmetric PKI / software key pair with detached signatures. | Needs expert validation | CONFIRMED |
| B3 | Rule authoring workflow missing technical review, archive/supersede, sandbox testing, and regression diff re-computation. | Needs expert validation | CONFIRMED |
| B4 | No Hindi/English localization in client. | N/A | CONFIRMED |
| B5 | No offline PWA capability (service worker, IndexedDB, outbox sync). | N/A | PARTIAL — SW + manifest exist, Dexie/IndexedDB NOT implemented |
| B6 | Mandatory test types per instrument category undefined. | Needs expert validation | CONFIRMED |
| B7 | Form fields & validation rules not versioned in rule config. | Needs expert validation | CONFIRMED |
| B8 | Report search lacks model-name text search, outcome filter, and serial number history. | N/A | CONFIRMED |
| B9 | No anomaly-detection advisory flags (MAD / robust z-score). | N/A | FIXED — `anomalyDetector.service.js` |
| B10 | README / Traceability / Deviations documentation incomplete. | N/A | PARTIAL |
| B11 | Public verification portal returns status/isRevoked but not published/superseded status. | N/A | CONFIRMED |
| B12 | Puppeteer executable path detection missing macOS path fallback. | N/A | CONFIRMED |
