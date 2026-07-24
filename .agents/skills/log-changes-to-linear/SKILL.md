---
name: log-changes-to-linear
description: Cross-check recent commits on the current tour-aligner branch against open Linear issues for the TourAligner team (key TOU), comment on clearly overlapping issues, and append every processed commit to the team's Engineering Log document. Use after creating one or more commits, before reporting committed work complete, or when asked to log, document, or reconcile recent repository changes in Linear.
---

# Log changes to Linear

Record committed repository work in Linear. Route each commit as follows:

- Comment on every open issue it clearly overlaps.
- Add every commit to the team-level Engineering Log, including commits that also receive issue comments.

Use Linear document ID `93ca8881-0f9e-4f6a-9776-f14812bc0266` as the append-only ledger and checkpoint. Fetch it directly with `mcp__linear__get_document`; do not search by title because the title may change.

## 1. Determine the commit range

If the user supplied a commit, revision, or range such as `HEAD~3..HEAD`, use it directly.

Otherwise:

1. Fetch the Engineering Log with `mcp__linear__get_document`.
2. Find the newest commit SHA referenced in its reverse-chronological dated entries. Entries begin with a short SHA in backticks.
3. Run `git log <sha>..HEAD --oneline --no-merges` on the current branch.
4. If the document contains no SHA, ask the user for a range. Do not guess a history depth.

Exclude merge commits. Exclude commits already referenced anywhere in the Engineering Log, even when the requested range overlaps them. Treat an empty resulting range as success and make no Linear writes.

## 2. Gather commit context

For each remaining commit:

1. Run `git show --stat --oneline <sha>` to inspect the files and size.
2. Inspect the full diff with `git show <sha>` when it is only a few hundred lines.
3. For a large diff, use the message, stat, and targeted file diffs rather than loading the entire patch.

Summarize intent and behavior, not raw diff details.

## 3. Match open issues

Use `mcp__linear__list_issues` with team `TOU` and `includeArchived: false`, following pagination until all candidates are collected. Exclude completed and canceled issues from the returned results. Resolve candidates with `mcp__linear__get_issue` when more detail is needed. Match in descending confidence:

1. The commit message explicitly names an identifier such as `TOU-6`.
2. The current branch equals an issue's `gitBranchName`.
3. The commit's stated intent and touched files clearly match an issue's title or description.

Allow multiple matches. Prefer no match over a weak thematic match. Do not attach unrelated work to an issue.

## 4. Comment on matched issues

Optionally inspect prior process comments with `mcp__linear__list_comments` to match their tone. For each matched issue, call `mcp__linear__save_comment` with `issueId` set to the issue identifier.

Write a concise comment containing:

- The short SHA and one-line commit title as the heading.
- What changed and why.
- Operational details a teammate needs, such as whether a migration was only created or also pushed, whether the change is UI-only, and any required follow-up.

Do not dump the diff. Do not change issue status, priority, assignee, or other issue fields.

## 5. Update the Engineering Log

Construct the complete updated document content and call `mcp__linear__save_document` with the document ID and `content`. Preserve the existing `Process` section at the top verbatim. Only add entries within the dated ledger.

Add entries beneath today's `## YYYY-MM-DD` heading. Create the heading when absent and place newer dates above older dates. When processing multiple commits, preserve their reverse-chronological order.

For a commit with matched issues, add one line:

```markdown
**`<short-sha>`** — <commit title> → commented on [<ISSUE-ID>](<issue URL>)
```

Use multiple arrow-links when it matched multiple issues.

For a commit with no match, add:

```markdown
**`<short-sha>`** — <commit title>

<One to three sentences describing what changed, why, and the principal files or areas touched.>
```

Before saving, verify that the reconstructed content still contains the Process section and all prior dated entries. Make one document update after issue comments succeed. If any issue comment fails, report the partial write and do not claim that commit was fully logged.

## 6. Report the result

Report:

- The number of commits processed.
- Which commits received issue comments and on which issues.
- Which commits were logged without an issue match.
- Any partial failures or commits skipped as already logged.

Keep the report brief. Do not present a transcript of tool calls.
