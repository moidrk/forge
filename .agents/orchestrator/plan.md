# Execution Plan: Forge Polish & QA

This plan outlines the dual-track execution for the comprehensive QA, bug-fix, performance, and UX/UI polish pass of the 'Forge' application.

## Topology
We will run two tracks in parallel:
1. **E2E Testing Track**: Spawn a sub-orchestrator to design, create, and verify a comprehensive E2E test suite based on the user's requirements (Tiers 1-4). Outputs `TEST_READY.md`.
2. **Implementation Track**: Spawn a sub-orchestrator to run the milestones sequentially (Milestone 2, 3, 4, then Milestone 5 to pass all E2E tests and perform adversarial coverage hardening).

```
Project Orchestrator (This Agent)
  ├── E2E Testing Track Orchestrator (sub_orch_e2e_testing)
  │     └── Decomposes and executes Test Infra & Tiers 1-4 cases
  │
  └── Implementation Track Orchestrator (sub_orch_implementation)
        ├── Milestone 2: Core Rendering & Effects Pipeline
        ├── Milestone 3: State Management & Shuffle
        ├── Milestone 4: Viewport & UX/UI Polish
        └── Milestone 5: E2E Integration & Adversarial Hardening (Tier 5)
```

## Steps & Schedule

### Phase 1: Planning and Setup (Current)
- [x] Analyze codebase, schema, and route files.
- [x] Create global `PROJECT.md` defining architecture, milestones, and interface contracts.
- [x] Write `plan.md` (this file).
- [ ] Initialize heartbeat and liveness timers.
- [ ] Spawn E2E Testing Track and Implementation Track subagents.

### Phase 2: Parallel Dual-Track Execution
- **E2E Testing Track**:
  - Task: Create `TEST_INFRA.md`, build test suite (~11 * N + max(5, N/2) cases, where N is the number of features, covering Tiers 1-4).
  - Verify: Run Playwright test suite, confirm format and output, write `TEST_READY.md`.
- **Implementation Track**:
  - **Milestone 2 (Core Rendering & Effects)**:
    - Target: Multiple image uploads, 4 effect layers, grid layout group rendering, and stage-specific RNG isolation.
    - Verification: Local tests and manual visual check.
  - **Milestone 3 (State Integrity & Shuffle)**:
    - Target: Delete/duplicate synchronization, JSON performance, Spacebar shuffle locking, and reload state recovery.
    - Verification: Local state assertion tests.
  - **Milestone 4 (Viewport & UX/UI Polish)**:
    - Target: Selection bounds pointer handling, pan/zoom, input shortcuts, color picker eyedropper, custom controls polish, and spacing hierarchy.
    - Verification: Playwright e2e/component tests.

### Phase 3: Integration and Hardening (Milestone 5)
- Once `TEST_READY.md` is published:
  - **Phase 1 (E2E Test Pass)**: Run full test suite (Tiers 1-4) against implementation, identify gaps, and iterate until 100% pass.
  - **Phase 2 (Adversarial Hardening)**: Spawn Challengers to analyze source code for gaps, generate adversarial tests (Tier 5), and fix until no gaps remain.

### Phase 4: Final Verification and Delivery
- Run `npm run verify:final`.
- Verify performance checkpoint (`npm run verify:perf` or agent-controlled browser).
- Update worklog in `docs/toolcraft/agent-worklog.md` with Decision Trail and high-level choices.
- Deliver results to the user.

## Integrity Verification Gating
- The E2E tests and implementation fixes will be audited by the Forensic Auditor (`teamwork_preview_auditor`).
- Any integrity violation (e.g. hardcoding values, fake overlays) will trigger a rollback.
