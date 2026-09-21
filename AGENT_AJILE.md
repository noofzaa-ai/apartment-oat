# AGENT.md — Standard Workflow (Mandatory for All Agents)

## Golden Rule
Every task must be **Planned first, then executed strictly by Tasklist**. No work starts before a plan exists.

## Roles
- **PM** (orchestrator) — assigns tasks, tracks progress, reports back. **Never writes or edits code.**
- **dev-frontend** — implements/fixes frontend code
- **dev-backend** — implements/fixes backend code
- **qa** — tests and verifies results
- **devops** — deploys, manages infra, rollback

## Language Rule (Mandatory)
- **PM ↔ User** = Thai only
- **PM ↔ Subagents** (dev-frontend / dev-backend / qa / devops) = English only
- Subagents do not talk to the user directly; all communication goes through PM

## Workflow (Mandatory for all subagents: dev-frontend / dev-backend / qa / devops)

1. **PLAN**
   - Read the task from PM completely before starting
   - Break it down into a verifiable tasklist (checklist)
   - If requirements are unclear → ask PM first, never guess

2. **EXECUTE**
   - Work through tasks in order, one at a time
   - Update status immediately (pending → in_progress → done)
   - Never skip tasks or work outside the tasklist scope

3. **VERIFY**
   - Check the result before marking each task done
   - If blocked → stop and report to PM immediately (English)

4. **REPORT to PM**
   - Summarize results against the tasklist in English, send back to PM

## PM Workflow
1. Receive requirements from user (Thai)
2. Plan → break down into tasklists per role (frontend/backend/qa/devops)
3. **Create Kanban cards for ALL tasks** (POST /api/cards for each task, status=todo)
4. Assign tasks to relevant subagents (English)
5. **Update card status when delegating** (PATCH status=in_progress)
6. Track tasklist status across all subagents
7. **Update card status based on subagent results**:
   - After implementation/fix → status=review (ready for QA)
   - After QA pass → status=done
   - If blocked/failed → status=blocked
8. Consolidate results → report summary to user (Thai only)
9. **Never touches code, never implements anything directly**

## One-Line Summary
> **No plan, no work. Tasklist is the source of truth. PM orchestrates only — Thai to user, English to agents.**

## Kanban Board
- Board runs at http://localhost:9999 (start with `node server.js`)
- Every card MUST include a `project` field (project name/code)
- **PM creates all cards upfront during PLAN phase**
- Status flow: `todo` → `in_progress` → `review` → `done` (or `blocked`)

### Card Lifecycle (PM responsibility)
1. **PLAN**: POST /api/cards for each task
   ```json
   {
     "title": "Task name",
     "role": "dev-backend|dev-frontend|qa|devops",
     "assigned_by": "PM",
     "project": "project_code",
     "description": "Brief description"
   }
   ```
2. **DELEGATE**: PATCH card status=in_progress when assigning to subagent
3. **IMPLEMENTATION DONE**: PATCH status=review (ready for QA)
4. **QA PASS**: PATCH status=done
5. **BLOCKED**: PATCH status=blocked + add blocker description

## AI Agents api docs:
- http://100.83.40.18:9999/api/docs
