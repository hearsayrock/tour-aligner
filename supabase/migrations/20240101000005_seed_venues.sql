-- ============================================================
-- TourAligner — Seed Venues
-- Migration: 20240101000005
-- ============================================================

insert into public.venues
  (name, slug, location_city, location_state, location_address, capacity, description, website_url, instagram_url, booking_email)
values
  (
    'The Bowery Ballroom',
    'the-bowery-ballroom',
    'New York', 'NY',
    '6 Delancey St',
    575,
    'One of NYC''s premier mid-size music venues, housed in a restored 1920s ballroom in the Lower East Side. Known for its excellent acoustics and intimate feel.',
    'https://www.boweryballroom.com',
    'https://instagram.com/boweryballroom',
    'booking@boweryballroom.com'
  ),
  (
    'The Empty Bottle',
    'the-empty-bottle',
    'Chicago', 'IL',
    '1035 N Western Ave',
    400,
    'A beloved Chicago institution since 1992. The Empty Bottle has hosted everyone from Wilco to Arcade Fire in its early days. A cornerstone of the city''s indie and experimental scene.',
    'https://www.emptybottle.com',
    'https://instagram.com/theemptybottle',
    'booking@emptybottle.com'
  ),
  (
    'Rickshaw Stop',
    'rickshaw-stop',
    'San Francisco', 'CA',
    '155 Fell St',
    250,
    'A funky Civic Center venue with a rotating cast of local and touring artists. Two floors, a full bar, and one of the best sound systems in SF.',
    'https://www.rickshawstop.com',
    'https://instagram.com/rickshawstop',
    'booking@rickshawstop.com'
  ),
  (
    'The Hi-Dive',
    'the-hi-dive',
    'Denver', 'CO',
    '7 S Broadway',
    300,
    'South Broadway''s anchor venue for indie rock, punk, and everything in between. Small but mighty, with a loyal Denver following and a stage that''s launched careers.',
    'https://www.hi-dive.com',
    'https://instagram.com/hidivedenver',
    'booking@hi-dive.com'
  ),
  (
    'Neumos',
    'neumos',
    'Seattle', 'WA',
    '925 E Pike St',
    650,
    'Capitol Hill''s flagship rock venue. Neumos has been a cornerstone of Seattle''s music scene since 2003, hosting national touring acts and local favorites on the same stage.',
    'https://www.neumos.com',
    'https://instagram.com/neumos',
    'booking@neumos.com'
  ),
  (
    'Emo''s Austin',
    'emos-austin',
    'Austin', 'TX',
    '2015 E Riverside Dr',
    530,
    'Austin''s legendary punk and alternative venue, reborn on Riverside. Emo''s has been a rite of passage for touring bands since the early 90s.',
    'https://www.emosaustin.com',
    'https://instagram.com/emosaustin',
    'booking@emosaustin.com'
  ),
  (
    'The Earl',
    'the-earl',
    'Atlanta', 'GA',
    '488 Flat Shoals Ave SE',
    400,
    'East Atlanta''s neighborhood rock bar and live music venue. The Earl keeps it unpretentious — good food, stiff drinks, and bands that actually rock.',
    'https://www.badearl.com',
    'https://instagram.com/theearlatl',
    'booking@badearl.com'
  ),
  (
    'Middle East Downstairs',
    'middle-east-downstairs',
    'Cambridge', 'MA',
    '480 Massachusetts Ave',
    575,
    'A Cambridge institution since 1987. The Middle East has hosted some of the most important moments in Boston-area music history and continues to be the region''s best mid-size room.',
    'https://www.mideastoffers.com',
    'https://instagram.com/middleeastclub',
    'booking@mideastoffers.com'
  ),
  (
    'The Casbah',
    'the-casbah',
    'San Diego', 'CA',
    '2501 Kettner Blvd',
    200,
    'San Diego''s most storied rock club. The Casbah is where The Black Keys, Nirvana, and White Stripes all played before they were famous. Small room, massive history.',
    'https://www.casbahmusic.com',
    'https://instagram.com/casbahmusic',
    'booking@casbahmusic.com'
  ),
  (
    'Doug Fir Lounge',
    'doug-fir-lounge',
    'Portland', 'OR',
    '830 E Burnside St',
    315,
    'Part boutique hotel, part legendary music venue. Doug Fir''s warm wood interior and late-night kitchen make it one of Portland''s most beloved spots for touring acts.',
    'https://www.dougfirlounge.com',
    'https://instagram.com/dougfirlounge',
    'booking@dougfirlounge.com'
  );

-- Assign genres to venues
-- First grab genre IDs by slug, then insert
with genre_ids as (
  select id, slug from public.genres
),
venue_ids as (
  select id, slug from public.venues
)
insert into public.venue_genres (venue_id, genre_id)
select v.id, g.id
from (values
  -- Bowery Ballroom: Indie Rock, Rock, Folk
  ('the-bowery-ballroom', 'indie-rock'),
  ('the-bowery-ballroom', 'rock'),
  ('the-bowery-ballroom', 'folk'),
  -- Empty Bottle: Indie Rock, Experimental, Jazz
  ('the-empty-bottle', 'indie-rock'),
  ('the-empty-bottle', 'experimental'),
  ('the-empty-bottle', 'jazz'),
  -- Rickshaw Stop: Indie Rock, Electronic, Pop
  ('rickshaw-stop', 'indie-rock'),
  ('rickshaw-stop', 'electronic'),
  ('rickshaw-stop', 'pop'),
  -- Hi-Dive: Rock, Punk, Indie Rock
  ('the-hi-dive', 'rock'),
  ('the-hi-dive', 'punk'),
  ('the-hi-dive', 'indie-rock'),
  -- Neumos: Rock, Indie Rock, Metal
  ('neumos', 'rock'),
  ('neumos', 'indie-rock'),
  ('neumos', 'metal'),
  -- Emo's: Punk, Rock, Metal
  ('emos-austin', 'punk'),
  ('emos-austin', 'rock'),
  ('emos-austin', 'metal'),
  -- The Earl: Rock, Punk, Country
  ('the-earl', 'rock'),
  ('the-earl', 'punk'),
  ('the-earl', 'country'),
  -- Middle East: Indie Rock, Rock, Hip-Hop
  ('middle-east-downstairs', 'indie-rock'),
  ('middle-east-downstairs', 'rock'),
  ('middle-east-downstairs', 'hip-hop'),
  -- Casbah: Rock, Indie Rock, Punk
  ('the-casbah', 'rock'),
  ('the-casbah', 'indie-rock'),
  ('the-casbah', 'punk'),
  -- Doug Fir: Indie Rock, Folk, Electronic
  ('doug-fir-lounge', 'indie-rock'),
  ('doug-fir-lounge', 'folk'),
  ('doug-fir-lounge', 'electronic')
) as pairs(venue_slug, genre_slug)
join venue_ids v on v.slug = pairs.venue_slug
join genre_ids g on g.slug = pairs.genre_slug;
