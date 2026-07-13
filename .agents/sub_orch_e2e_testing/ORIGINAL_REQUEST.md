## 2026-07-13T11:29:35Z
You are a worker agent. Your task is to implement a comprehensive, requirement-driven, opaque-box E2E test suite under `e2e/app.spec.ts` for the 'Forge' app.

## Context
- Read the test plan: `c:/Personal/Clients/forge/.agents/sub_orch_e2e_testing/plan.md`
- Read the test infrastructure plan: `c:/Personal/Clients/forge/.agents/sub_orch_e2e_testing/TEST_INFRA.md`
- The E2E tests must be written in `e2e/app.spec.ts` (replace or fix the existing stubs and syntax errors).
- All tests must be opaque-box, interacting with the real DOM/HTML and asserting output changes using helpers like `expectToolcraftProductObservableToChange` and other public UI markers. Do not import internals of the app or mock internal state.

## Test Matrix to Implement
You must implement the 71 test cases across 4 tiers as detailed in `TEST_INFRA.md`:
- Tier 1: 30 Feature Coverage tests (5 per feature for F1-F6).
- Tier 2: 30 Boundary & Corner tests (5 per feature for F1-F6).
- Tier 3: 6 Cross-Feature combination tests.
- Tier 4: 5 Real-World Scenario tests.

## Running & Verification
1. Run the test command `npm run test:browser` or `npx playwright test` to run the suite.
2. Note any failures and why they occur. Report the run results and which tests passed or failed.
3. Make sure not to break existing Playwright tests in other files.

## MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please report back when done with the test file paths and test execution logs/verdict.
