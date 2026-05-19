# AGENTS.md

This file contains repo-specific instructions for automated coding agents working in `tour-aligner`.

## Branch workflow

- Do all new development from `staging` unless the user explicitly says otherwise.
- Start new work by updating `staging`; do not create sub-branches or feature branches unless the user explicitly requests one.
- Do not use `main` as the base for new work unless the task is specifically a production hotfix or the user requests it.

## Supabase migrations

- Always create new Supabase migrations with the CLI:
  ```powershell
  npx supabase migration new <descriptive_name>
  ```
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

## Live database safety

- Do not run `npx supabase db push --include-all` blindly against live databases.
- If remote migration history is out of sync, inspect first and prefer `npx supabase migration repair <timestamp> --status applied` when the schema change already exists remotely.
- Treat `supabase/.temp/project-ref` as the source of truth for the linked Supabase project.

## Current repo note

- Legacy duplicate-timestamp files were moved out of active migrations into `supabase/legacy-migrations/`.
- Agents must not move files from `supabase/legacy-migrations/` back into `supabase/migrations` unless explicitly instructed.
