# Audit Review Findings (GAP_INPUT)

## A. Bugs and Correctness Risks

| # | Finding | Where | Blueprint Ref | Status |
|---|---|---|---|---|
| A1 | MPE band chosen from `maxCapacity`, not from the test `referenceLoad`. `sortedBands.find(b => maxCapacityScaled <= b.uptoMultipleOfE * e)`. Permissible error under OIML R-76 depends on the applied load in multiples of e. | `server/src/services/complianceEngine.service.js` | §9.2, §9.3, R-01 | CONFIRMED |
| A2 | Only `A4_accuracy` is computed automatically. Other annexes use manual `checklistPassed` boolean, throwing `UNSUPPORTED_TEST_METHOD` for `mpe_band` mode on other annexes. | `complianceEngine.service.js`, `client/src/config/constants.js` | FR-03, FR-05, FR-06, §9.1 | CONFIRMED |
| A3 | Rule activation and seed flow gap: `seedRuleConfigs` seeds draft rules without createdBy; `activateRuleConfig` requires author != approver and `metrology_expert` role; `seedUsers` lacked `metrology_expert` user. | `seed/*.js`, `ruleConfig.controller.js` | FR-15, §7.3 | CONFIRMED |
| A4 | QR Code replaced with genuine vector SVG QR code generator (using pure JS matrix encoder). | `server/src/utils/qrGenerator.js`, `reportGenerator.service.js` | §10, §12.4 | CONFIRMED / FIXED |
| A5 | `rejectTestSession` set `session.reviewerNotes`, but `TestSession` schema had no `reviewerNotes` field (Mongoose silently dropped it). | `testSession.controller.js`, `models/TestSession.js` | §8.1 | CONFIRMED |
| A6 | Manufacturer tenancy matches on contact email string equality rather than ObjectId ref. | `utils/tenantAccess.js` | §11.1, R-03 | CONFIRMED |
| A7 | Audit-log chain serialized via in-process promise queue; `verifyAuditChain` loads all entries into memory. | `services/auditLogger.service.js`, `auditLog.controller.js` | §11.2 | CONFIRMED |
| A8 | Observation update/delete audit log missing before/after diffs; observation delete was a hard delete. | `testSession.controller.js` | §2.1, §11.2 | CONFIRMED |

## B. Missing vs. Blueprint

| # | Gap | Blueprint Ref | Status |
|---|---|---|---|
| B1 | Report lifecycle incomplete (Draft -> Review -> Approved -> Published -> Archived / Revoked with immutable signed reports). | §8.2, §10 | CONFIRMED |
| B2 | Signing is HMAC-SHA256 server tag rather than asymmetric PKI / software key pair with detached signatures. | FR-10, §11.2 | CONFIRMED |
| B3 | Rule authoring workflow missing technical review, archive/supersede, sandbox testing, and regression diff re-computation. | §12.1, §16, FR-15 | CONFIRMED |
| B4 | No Hindi/English localization in client. | §14 | CONFIRMED |
| B5 | No offline PWA capability (service worker, IndexedDB, outbox sync). | §12.3 | CONFIRMED |
| B6 | Mandatory test types per instrument category undefined. | §9.3 | CONFIRMED |
| B7 | Form fields & validation rules not versioned in rule config. | §9.1, FR-04 | CONFIRMED |
| B8 | Report search lacks model-name text search, outcome filter, and serial number history. | FR-11, FR-12 | CONFIRMED |
| B9 | No anomaly-detection advisory flags (MAD / robust z-score). | §12.5 | CONFIRMED |
| B10 | README / Traceability / Deviations documentation incomplete. | Appendix B | CONFIRMED |
| B11 | Public verification portal returns status/isRevoked but not published/superseded status. | §12.4 | CONFIRMED |
| B12 | Puppeteer executable path detection missing macOS path fallback. | §6.5 | CONFIRMED |
