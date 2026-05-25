# AGENTS.md

This file contains repo-specific instructions for automated coding agents working in `tour-aligner`.

## Branch workflow

- Do all new development from `staging` unless the user explicitly says otherwise.
- Start new work by updating `staging`; do not create sub-branches or feature branches unless the user explicitly requests one.
- Do not use `main` as the base for new work unless the task is specifically a production hotfix or the user requests it.

## Verification

- When code changes are made, run the relevant project checks before reporting completion.
- For this repo, the default checks are:
  ```powershell
  npm run lint
  npx tsc --noEmit
  ```
- Do not skip `npm run lint` just because unrelated lint errors are expected.
- If `npm run lint` fails, report that it failed and include the exact blocking files/errors.
- A scoped lint command may be run in addition to full lint to verify touched files, but it is not a replacement for `npm run lint`.
- Do not describe verification as passing unless the actual command exited successfully.
- If full lint is blocked by unrelated baseline errors, say so explicitly and distinguish:
  - Full-repo check result.
  - Touched-file check result.
  - TypeScript check result.

## Mobile and API readiness

- Treat Supabase as the durable multi-client backend contract. Web, Android, iOS, and future clients should be able to rely on the same Auth, RLS, Storage policies, Realtime subscriptions, and SQL RPCs where practical.
- Do not put new core business rules only in Next.js Server Actions, React components, middleware, or route handlers. Server Actions may orchestrate UI concerns such as cache revalidation and redirects, but durable authorization and workflow state transitions should live in RLS, SQL functions, triggers, or Edge Functions.
- For important mutations that mobile clients will likely need, prefer one of these patterns:
  - Direct table writes only when RLS fully enforces ownership and valid state.
  - SQL RPCs for multi-step workflow transitions, permission-sensitive operations, or changes that must remain atomic.
  - Edge Functions or server routes only when the operation requires secret keys, third-party service credentials, webhooks, or privileged server-side integration.
- When adding or changing a Server Action that performs a product workflow, note whether it is a thin wrapper around Supabase or whether it contains web-only business logic. If it contains web-only business logic, either move that logic into Supabase or document why it is intentionally web-only.
- Never trust client-selected active identity values, cookies, local storage, request payloads, or mobile app state for authorization. Always verify ownership against Supabase data inside RLS, RPCs, or server-side code.
- Keep managed identity concepts portable. If a user can act as a band or venue, APIs should accept the intended band or venue id and verify that the authenticated user owns it; do not depend on web cookies as the only source of identity selection.
- Avoid using the Supabase service role key in browser or mobile code. Service role usage must stay server-side only and should be isolated to the smallest possible function or route.
- Storage policies must be mobile-safe. New buckets or upload paths should enforce ownership by bucket/path policy, signed upload URL, or server-side mediation; avoid broad authenticated write/update/delete policies for user-generated files.
- Public read models should be explicit. If mobile or public clients need discovery data, prefer RLS-safe tables/views/RPCs that expose only intended fields instead of relying on broad table access.
- Realtime subscriptions should be backed by RLS-safe tables and predictable channel semantics. Do not rely on web-only refresh behavior as the only way users see inbox, event, or backstage updates.
- After schema or RPC changes that affect application code, update `src/types/database.ts` or clearly report that generated Supabase types are stale.
- When adding mobile-relevant workflows, include enough documentation in `README.md`, `docs/`, or migration comments for another client to call the same backend behavior without reverse-engineering the web UI.

## Supabase migrations

- Before any schema change or Supabase migration work, verify the linked project ref:
  ```powershell
  Get-Content supabase\.temp\project-ref
  ```
- The linked project ref must be the staging project, `zdfmylywoewtncrnqvod`.
- If `supabase/.temp/project-ref` is missing or is not `zdfmylywoewtncrnqvod`, stop and tell the developer before creating migrations, editing schema SQL, or running Supabase database commands.
- Always create new Supabase migrations with the CLI:
  ```powershell
  npx supabase migration new <descriptive_name>
  ```
- Unless the developer explicitly specifies otherwise, create a matching rollback SQL file for every new migration in `supabase/rollback/` using the same timestamp and descriptive name as the CLI-created migration:
  ```text
  supabase/migrations/<timestamp>_<descriptive_name>.sql
  supabase/rollback/<timestamp>_<descriptive_name>_rollback.sql
  ```
- Rollback files must contain the inverse SQL needed to undo the migration, or a clear SQL comment explaining why the migration is not safely reversible.
- Never hand-create migration filenames in `supabase/migrations`.
- Never duplicate a migration timestamp.
- There must be exactly one migration file per timestamp in `supabase/migrations`.
- Do not copy an existing migration file and keep its timestamp.
- Do not rename timestamps on migrations that may already exist in remote migration history.

## Before pushing database changes

- Check for duplicate migration timestamps before running `npx supabase db push`.
- In PowerShell, agents can verify duplicates with:
  ```powershell
  Get-ChildItem supabase\migrations -File |
    ForEach-Object { ($_.BaseName -split '_')[0] } |
    Group-Object |
    Where-Object { $_.Count -gt 1 }
  ```
- If any duplicate timestamps are found, stop and fix that first.

## Rollback files

- Do not place rollback scripts in `supabase/migrations`.
- Store rollback SQL in `supabase/rollback/`.
- Only forward migrations belong in `supabase/migrations`.
- Rollback files are manual recovery scripts, not forward migrations, and must not be applied through the normal migration chain unless the developer explicitly requests a new forward migration that reverts a previous change.

## Live database safety

- Do not run `npx supabase db push --include-all` blindly against live databases.
- If remote migration history is out of sync, inspect first and prefer `npx supabase migration repair <timestamp> --status applied` when the schema change already exists remotely.
- Treat `supabase/.temp/project-ref` as the source of truth for the linked Supabase project.

## Current repo note

- Legacy duplicate-timestamp files were moved out of active migrations into `supabase/legacy-migrations/`.
- Agents must not move files from `supabase/legacy-migrations/` back into `supabase/migrations` unless explicitly instructed.
