# Booking and membership integration checks

These tests execute the synchronization migration and rollback in an isolated
PostgreSQL instance using PGlite. They never access a linked Supabase project.

Install the test runtime outside the repository, then pass its module path:

```powershell
$bookingTestRuntime = Join-Path $env:TEMP 'tour-aligner-booking-sync-tests'
npm install --prefix $bookingTestRuntime @electric-sql/pglite --no-audit --no-fund
node supabase/tests/booking-membership-sync.mjs (Join-Path $bookingTestRuntime 'node_modules/@electric-sql/pglite/dist/index.js')
```

Coverage includes preexisting membership backfill, idempotent acceptance, Inbox
confirmation, artist invite/removal RPCs, reciprocal cancellation, rescheduling,
capacity and availability failures, public lineup privacy, conversation and event
deletion, and rollback. The fixture models the relevant pre-migration tables;
it does not verify the entire historical migration chain or concurrent sessions.
