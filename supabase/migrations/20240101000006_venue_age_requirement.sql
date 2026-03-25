-- ============================================================
-- TourAligner — Add age_requirement to venues
-- Migration: 20240101000006
-- ============================================================

alter table public.venues
  add column age_requirement text
    check (age_requirement in ('all_ages', '18_plus', '21_plus'));

-- Set realistic defaults for the seeded venues
update public.venues set age_requirement = '21_plus'
  where slug in (
    'the-bowery-ballroom',
    'the-empty-bottle',
    'rickshaw-stop',
    'the-hi-dive',
    'neumos',
    'the-earl',
    'the-casbah',
    'doug-fir-lounge'
  );

update public.venues set age_requirement = '18_plus'
  where slug in ('emos-austin', 'middle-east-downstairs');
