-- ============================================================
-- TourAligner — Genre Seed Data
-- Migration: 20240101000003
-- ============================================================

insert into public.genres (name, slug) values
  ('Alternative',       'alternative'),
  ('Ambient',           'ambient'),
  ('Blues',             'blues'),
  ('Classical',         'classical'),
  ('Country',           'country'),
  ('DJ / Electronic',   'dj-electronic'),
  ('Experimental',      'experimental'),
  ('Folk',              'folk'),
  ('Funk',              'funk'),
  ('Gospel',            'gospel'),
  ('Hip-Hop / Rap',     'hip-hop-rap'),
  ('Indie',             'indie'),
  ('Jazz',              'jazz'),
  ('Latin',             'latin'),
  ('Metal',             'metal'),
  ('Pop',               'pop'),
  ('Punk',              'punk'),
  ('R&B / Soul',        'rnb-soul'),
  ('Reggae',            'reggae'),
  ('Rock',              'rock'),
  ('Singer-Songwriter', 'singer-songwriter'),
  ('Worship',           'worship'),
  ('World',             'world')
on conflict (slug) do nothing;
