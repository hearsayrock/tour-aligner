---
name: log-changes-to-linear
description: Cross-check recent commits on this branch against open Linear (TourAligner, team key TOU) issues, post a summary comment on any issue a commit overlaps, and append an entry to the team's "Engineering Log" document for everything else. Run this after making one or more commits, or when asked to log/document recent work in Linear.
argument-hint: [commit-range]
allowed-tools: Bash(git log:*), Bash(git show:*), Bash(git diff:*), Bash(git rev-parse:*)
---

# Log changes to Linear

Keeps Linear as a record of what actually happened in the repo, including
work that doesn't map to a tracked issue. Two destinations, chosen per
commit:

- **Overlaps an open issue** → post a comment on that issue summarizing the
  commit.
- **Doesn't overlap anything tracked** → append an entry to the team-level
  "Engineering Log" document (id `93ca8881-0f9e-4f6a-9776-f14812bc0266`,
  team TourAligner — fetch it with `get_document` rather than searching by
  title, in case it gets renamed).

Every commit gets *at least* a one-line pointer in the Engineering Log
(even the ones that also got an issue comment) — that doc is the
single append-only ledger this skill uses for checkpointing, so it must
stay complete.

## 1. Determine the commit range

If `$ARGUMENTS` was given (e.g. `HEAD~3..HEAD` or a specific SHA range),
use it directly.

Otherwise, checkpoint off the Engineering Log:
1. `get_document` on `93ca8881-0f9e-4f6a-9776-f14812bc0266` and find the
   most recent commit SHA mentioned in it (the entries are in
   reverse-chronological order under `## <date>` headers, short SHA in
   backticks at the start of each line).
2. Run `git log <that-sha>..HEAD --oneline` on the current branch to get
   everything since.
3. If no SHA can be found in the doc (first run, or doc was cleared), ask
   the user for a range instead of guessing — don't silently pick an
   arbitrary depth.

Skip merge commits and skip anything already referenced in the doc (belt
and suspenders in case the range overlaps).

## 2. For each commit, gather context

`git show --stat <sha>` for the file list, `git show <sha>` for the full
diff if it's small (a few hundred lines), otherwise just the stat plus the
commit message — don't dump huge diffs into context, summarize from the
stat and file names plus the commit message.

## 3. Decide whether it overlaps a tracked issue

Check, in order of confidence:
1. **Explicit reference** — commit message contains an issue identifier
   like `TOU-6`.
2. **Branch match** — the current branch name matches an issue's
   `gitBranchName` field (`list_issues` / `get_issue`).
3. **Clear scope match** — the files touched or the commit's stated intent
   clearly falls within an open issue's title/description (e.g. a commit
   editing `confirm_contact_booking` and the calendar-linkage schema
   matches an issue literally about auto-creating events). Don't force a
   match — a loose thematic connection isn't enough. When genuinely
   unsure, prefer "no match" over guessing; false positives pollute an
   issue's thread more than a missed comment costs.

A commit can match more than one issue. A commit can also match none.

## 4. Post issue comments

For each matched issue, `save_comment` with `issueId` set to the issue
identifier. Comment body: short-SHA + one-line commit title as a heading,
then what actually changed and why (not a diff dump), then anything a
teammate picking this up would want to know (migrations pushed? UI only?
follow-up needed?). Match the tone/format of existing comments on that
issue if there are any from this same process.

Don't change issue status as part of this skill — that's a judgment call
for whoever's actually driving the work, not something to infer from a
commit alone.

## 5. Update the Engineering Log

`save_document` with `id: 93ca8881-0f9e-4f6a-9776-f14812bc0266`, appending
under today's `## YYYY-MM-DD` header (create the header if today doesn't
have one yet; put new dates above older ones, newest first).

Entry format:

- Commit that matched issue(s): one line —
  `**\`<short-sha>\`** — <commit title> → commented on [<ISSUE-ID>](<issue url>)`
  (multiple issues: multiple arrow-links).
- Commit that matched nothing: full entry —
  `**\`<short-sha>\`** — <commit title>` followed by 1-3 sentences on what
  changed, why, and files touched.

Preserve the doc's existing "Process" section at the top verbatim — only
add to the dated entries below it.

## 6. Report back

Summarize to the user: how many commits processed, which got issue
comments (and where), which went to the log-only. Keep it short — a few
lines, not a transcript of every tool call.

## Note on Codex

This skill only runs inside Claude Code. If Matt's using Codex, he needs
an equivalent on his end — the Engineering Log doc's own "Process" section
is written to be the tool-agnostic spec both should follow, so point him
there rather than at this file.
