# Paste this into Gemini

```text
You are implementing Halaa Guest Check-in in the existing Halaa repository.

Read docs/implementation/hilton-guest-checkin/README.md and PROGRESS.md first.
Then read the relevant sections of 01-PRODUCT-AND-DESIGN.md,
02-TECHNICAL-CONTRACT.md, 03-IMPLEMENTATION-STEPS.md, and
04-VALIDATION-AND-DEPLOYMENT.md.

Implement ONLY the first incomplete task in 03-IMPLEMENTATION-STEPS.md.
If I explicitly name a task, implement that task only after confirming its
prerequisites are complete. Finish its acceptance checks before moving on.

Non-negotiable rules:
1. Build a separate Next.js + Express app under halaa-checkin/.
2. Match the existing Halaa frontend tokens, colors, fonts, and component
   styling. Follow the documented CSS-over-JS precedence. Do not redesign it
   as a Hilton-branded blue/gold app or introduce a new design system.
3. Preserve unrelated changes. Start with git status --short. Never reset,
   stash, revert, or reformat another task's files. Do not run root npm install.
4. Follow the API, field names, response shapes, permissions, and state
   transitions exactly. Do not create a second source of attendance truth.
5. Do not import Halaa business providers/models/auth into this mini app.
   Copy only the documented presentation resources with source provenance.
6. Backend authorization and atomic database writes are mandatory. Frontend
   button disabling alone does not prevent duplicate admissions.
7. No fake successful APIs, hardcoded dashboard totals, localStorage database,
   in-memory production sessions, TODO implementations, or skipped checks
   reported as passing. Fixtures are allowed only in tests and explicit demo seed.
8. Use existing, supported package versions as a starting point; validate
   compatibility, pin the mini app's dependencies, and commit its lockfile.
   Do not upgrade the parent Halaa apps.
9. Run the task's commands, fix failures, and record actual evidence.
   If an external prerequisite is unavailable, identify it precisely and mark
   that check blocked. Do not imply a live rollout or device test happened.
10. Do not deploy, alter DNS, send messages, or touch production data as part
    of an implementation session. Prepare reviewable deployment artifacts.

Keep files focused: routes delegate to services, services own business rules,
repositories own queries, and shared schemas own request validation.
Avoid new abstractions that are unnecessary for the current task.

At the end, update PROGRESS.md with:
- task ID and complete/partial/blocked status;
- files changed;
- exact test commands and results;
- any contract decisions or unresolved defects;
- next task and the files it should read.

Your final response must state what is complete, what was verified, and what
remains. Do not proceed automatically into the next task in the same session.
```

## Continuing after a context reset

```text
Continue Halaa Guest Check-in. Read its README.md and PROGRESS.md under
docs/implementation/hilton-guest-checkin/. Implement the next incomplete task
from 03-IMPLEMENTATION-STEPS.md using the same rules in GEMINI_START_HERE.md.
Do not repeat completed tasks. Verify the relevant files and existing tests
before assuming a previous session's implementation is correct.
```

## Requesting a final review

```text
Review the completed mini app against every acceptance criterion in
docs/implementation/hilton-guest-checkin/04-VALIDATION-AND-DEPLOYMENT.md.
Use real requests, the test database, production builds, generated PDFs,
and browser screenshots. Pay particular attention to concurrent check-in,
event permissions, Arabic layout, stale/offline states, export authorization,
and isolation from the existing Halaa deployment. Fix confirmed defects within
the mini app. Record pass/fail/blocked evidence. Do not claim live deployment
or physical camera verification without performing it. Update PROGRESS.md.
```
