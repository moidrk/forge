# E2E Test Infra: Forge

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internals.
- Methodology: Category-Partition + BVA (Boundary Value Analysis) + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Media Upload & Management | ORIGINAL_REQUEST §R1, §R2 | 5 | 5 | ✓ |
| 2 | Layer Operations & Organization | ORIGINAL_REQUEST §R1, §R4 | 5 | 5 | ✓ |
| 3 | Effect Layers & Controls | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Grid Layout Engine | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 5 | God-Mode Shuffle | ORIGINAL_REQUEST §R1, §R2 | 5 | 5 | ✓ |
| 6 | Canvas Interactions & Export | ORIGINAL_REQUEST §R1, §R2 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Playwright (with HTML/DOM outputs and product canvas/observable snapshots)
- Command: `npx playwright test e2e/` (runs all E2E tests)
- Test case format: Playwright `.spec.ts` files under `e2e/`
- Directory layout: `e2e/` at project root

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Multi-Image Upload and Layer Reordering and Hiding | F1, F2, F4, F6 | Medium |
| 2 | Applying Effect Stack to Uploaded Image | F1, F2, F3, F6 | Medium |
| 3 | Grid Layout Creation and Rearrangement | F1, F4, F6 | High |
| 4 | God-Mode Shuffle with Locked and Unlocked Layers | F3, F4, F5, F6 | High |
| 5 | Interactive Canvas Layout Assembly and High-Res Export | F1, F2, F3, F4, F6 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total: 30 test cases)
- Tier 2: ≥5 per feature (Total: 30 test cases)
- Tier 3: Pairwise coverage of major feature interactions (Total: 6 test cases)
- Tier 4: Realistic application scenarios (Total: 5 test cases)
- **Total Minimum: 71 test cases**
