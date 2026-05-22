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
