# BRIEFING — 2026-07-13T16:28:21+05:00

## Mission
Execute the implementation milestones defined in c:/Personal/Clients/forge/PROJECT.md (Milestones 2, 3, 4, and 5) following the Project Pattern and standard iteration loops.

## 🔒 My Identity
- Archetype: sub_orch
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:/Personal/Clients/forge/.agents/sub_orch_implementation
- Original parent: main agent
- Original parent conversation ID: c80fb628-24f2-4d79-a677-3ef7999aa2af

## 🔒 My Workflow
- **Pattern**: Project Pattern (Orchestrator Procedure: Iterate Explorer -> Worker -> Reviewer -> Challenger -> Forensic Auditor -> Gate)
- **Scope document**: c:/Personal/Clients/forge/PROJECT.md
1. **Decompose**: Decompose the implementation track milestones (M2: Core Rendering & Effects, M3: State & Shuffle, M4: Viewport & UI, M5: Integration) into targeted iteration loops.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: For each milestone, run Explorer -> Worker -> Reviewer -> Challenger -> Auditor loop.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (as a sub-orchestrator, report back to caller conversation)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  - Milestone 2: Core Rendering & Effects Pipeline [pending]
  - Milestone 3: State Management & Shuffle [pending]
  - Milestone 4: Viewport & UX/UI Polish [pending]
  - Milestone 5: E2E Integration and Adversarial Hardening [pending]
- **Current phase**: 1
- **Current focus**: Milestone 2: Core Rendering & Effects Pipeline

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- Forge constraints: Isolate RNG seed per Canvas 2D stage, no corruption, Spacebar God-Mode Shuffle respecting locks, reloading state restoration, viewport overlay, custom controls (eyedropper/color picker buttons), and shortcuts.
- Playwright/browser testing checks: use `npm run verify:final` for final verification.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: c80fb628-24f2-4d79-a677-3ef7999aa2af
- Updated: 2026-07-13T16:28:21+05:00

## Key Decisions Made
- Initializing the orchestrator structure and setting up state files.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Explorer 1 | teamwork_preview_explorer | Milestone 2 Analysis | completed | 84429022-6389-4207-84b3-308677fcb579 |
| Explorer 2 | teamwork_preview_explorer | Milestone 2 Analysis | completed | 632b03b6-1a30-4463-b005-2279a8d8a89b |
| Explorer 3 | teamwork_preview_explorer | Milestone 2 Analysis | completed | 21dcc28a-1fed-4661-b3ef-0e99d421b87f |
| Worker 1 (M2) | teamwork_preview_worker | Milestone 2 Implementation | completed | ad47f96a-6cbf-42c8-a794-9a92e10d926a |
| Reviewer 1 (M2) | teamwork_preview_reviewer | Milestone 2 Review | in-progress | 66a88e2d-761b-4b2d-a493-d54a89f170dc |
| Reviewer 2 (M2) | teamwork_preview_reviewer | Milestone 2 Review | in-progress | b82d953f-79d8-45b2-9ebf-1450578629e2 |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: [66a88e2d-761b-4b2d-a493-d54a89f170dc, b82d953f-79d8-45b2-9ebf-1450578629e2]
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-13
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:/Personal/Clients/forge/PROJECT.md — Global project tracker
- c:/Personal/Clients/forge/.agents/sub_orch_implementation/progress.md — Local implementation progress heartbeat
- c:/Personal/Clients/forge/.agents/sub_orch_implementation/BRIEFING.md — Persistent memory state
- c:/Personal/Clients/forge/.agents/sub_orch_implementation/ORIGINAL_REQUEST.md — Verbatim user instructions
