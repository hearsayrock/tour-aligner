-- ============================================================
-- TourAligner — Seed Utah Venues
-- Migration: 20240101000008
-- ============================================================

insert into public.venues
  (name, slug, location_city, location_state, location_address, capacity, description, website_url, booking_email)
values

  -- ── Salt Lake City: Arenas & Amphitheaters ──────────────────

  (
    'Delta Center',
    'delta-center',
    'Salt Lake City', 'UT',
    '301 W South Temple',
    20000,
    'Utah''s premier indoor arena and home of the NBA''s Utah Jazz. Hosts major national and international touring acts across all genres. Renovated in 2017 and seats up to 20,000 for concerts.',
    'https://www.saltlakecityarena.com',
    null
  ),
  (
    'Utah First Credit Union Amphitheatre',
    'utah-first-credit-union-amphitheatre',
    'West Valley City', 'UT',
    '5150 Upper Ridge Rd',
    20000,
    'Utah''s largest outdoor concert venue, operated by Live Nation. Features 7,000 reserved seats and a 13,000-person lawn. Hosts the biggest names in touring music every summer.',
    'https://www.utahfirstamp.com',
    null
  ),
  (
    'Maverik Center',
    'maverik-center',
    'West Valley City', 'UT',
    '3200 S Decker Lake Dr',
    12600,
    'Multi-purpose indoor arena in the Salt Lake Valley hosting major concerts, sporting events, and family shows. One of the region''s top stops for mid-to-large touring acts.',
    'https://maverikcenter.com',
    null
  ),
  (
    'The Great Saltair',
    'the-great-saltair',
    'Magna', 'UT',
    '12408 W Saltair Dr',
    7000,
    'A historic lakeside concert hall and outdoor amphitheater on the shores of the Great Salt Lake. One of Utah''s oldest entertainment landmarks, combining 4,000-capacity indoor space with a 7,000-person outdoor lawn.',
    'https://thesaltair.com',
    null
  ),
  (
    'Rice-Eccles Stadium',
    'rice-eccles-stadium',
    'Salt Lake City', 'UT',
    '451 S 1400 E',
    45000,
    'University of Utah''s football stadium on the east bench of Salt Lake City. Hosts occasional stadium-scale concerts for major touring artists.',
    'https://stadium.utah.edu',
    null
  ),

  -- ── Salt Lake City: Concert Halls & Theaters ────────────────

  (
    'Maurice Abravanel Hall',
    'maurice-abravanel-hall',
    'Salt Lake City', 'UT',
    '123 W South Temple',
    2811,
    'World-class concert hall and home of the Utah Symphony since 1979. Internationally recognized for its exceptional acoustics, making it one of the finest concert halls in North America.',
    'https://www.saltlakecountyarts.org',
    null
  ),
  (
    'Eccles Theater',
    'eccles-theater-salt-lake',
    'Salt Lake City', 'UT',
    '131 S Main St',
    2468,
    'Downtown Salt Lake City''s premier performing arts venue, opened in 2016. Features a 2,468-seat main stage and a 150-seat black box theater hosting touring Broadway, concerts, dance, and comedy.',
    'https://live-at-the-eccles.com',
    null
  ),
  (
    'Capitol Theatre',
    'capitol-theatre-salt-lake',
    'Salt Lake City', 'UT',
    '50 W 200 S',
    1876,
    'A downtown Salt Lake City landmark since 1913, home of Ballet West, Utah Opera, and Broadway Across America. One of the state''s most storied and beautiful performing arts venues.',
    'https://www.saltlakecountyarts.org',
    null
  ),
  (
    'Kingsbury Hall',
    'kingsbury-hall',
    'Salt Lake City', 'UT',
    '1395 E Presidents Cir',
    1992,
    'Historic University of Utah performing arts center built in 1930. Hosts an eclectic mix of concerts, dance performances, comedy, and lectures on the U of U campus.',
    'https://kingsburyhall.utah.edu',
    null
  ),
  (
    'Libby Gardner Concert Hall',
    'libby-gardner-concert-hall',
    'Salt Lake City', 'UT',
    '1375 E Presidents Cir',
    680,
    'University of Utah''s intimate chamber concert hall, home to classical, jazz, and faculty recital performances. Part of the David P. Gardner Hall complex.',
    'https://music.utah.edu',
    null
  ),

  -- ── Salt Lake City: Mid-Size Concert Venues ─────────────────

  (
    'The Union Event Center',
    'the-union-event-center',
    'Salt Lake City', 'UT',
    '235 N 500 W',
    3500,
    'A flexible event and concert space in downtown Salt Lake City hosting national touring acts, corporate events, and community gatherings. One of the valley''s go-to mid-size rooms.',
    'https://www.theunioneventcenter.com',
    null
  ),
  (
    'The Complex SLC',
    'the-complex-slc',
    'Salt Lake City', 'UT',
    '536 W 100 S',
    2600,
    'A multi-venue downtown complex with five distinct indoor and outdoor spaces: Rockwell (2,500 cap), The Grand (850), Vertigo (425), The Vibe (200), and The Lot (outdoor). Has hosted Billie Eilish, Travis Scott, and Slayer.',
    'https://thecomplexslc.com',
    null
  ),
  (
    'The Depot',
    'the-depot-slc',
    'Salt Lake City', 'UT',
    '13 N 400 W',
    1200,
    'A premier mid-size national touring venue housed in the historic Union Pacific train depot building. Four stories of music, bars, and event space. One of Salt Lake City''s best live music rooms since 2006.',
    'https://www.depotslc.com',
    null
  ),
  (
    'Sky SLC',
    'sky-slc',
    'Salt Lake City', 'UT',
    '149 Pierpont Ave',
    1500,
    'A 15,000 sq ft open-air rooftop venue in downtown SLC featuring a retractable glass roof, state-of-the-art sound and lighting, and 20 VIP suites. A stunning and flexible concert and event space.',
    'https://skyslc.com',
    null
  ),
  (
    'Metro Music Hall',
    'metro-music-hall',
    'Salt Lake City', 'UT',
    '615 W 100 S',
    700,
    'A 21+ mid-size concert and open-format event space in downtown Salt Lake City. Known for strong local and regional bookings alongside national touring artists.',
    'https://metromusichall.com',
    null
  ),
  (
    'Soundwell',
    'soundwell',
    'Salt Lake City', 'UT',
    '149 W 200 S',
    600,
    'An intimate, premium-sound concert venue in downtown Salt Lake City, opened in 2018. Full bar, eclectic programming spanning indie, electronic, jazz, and beyond. Known for its exceptional acoustics.',
    'https://soundwellslc.com',
    null
  ),
  (
    'Commonwealth Room',
    'commonwealth-room',
    'South Salt Lake', 'UT',
    '195 W 2100 S',
    650,
    'A 21+ live music venue with raised viewing platforms, a large dance floor, and top-tier sound and lighting. Sister venue to The State Room. Part of the State Room Presents family. Opened 2018.',
    'https://www.thestateroompresents.com/the-commonwealth-room',
    null
  ),
  (
    'The State Room',
    'the-state-room',
    'Salt Lake City', 'UT',
    '638 S State St',
    299,
    'Salt Lake City''s acclaimed intimate 21+ listening room with raked theater seating and a dance floor. A cornerstone of quality live music in Utah, booking nationally recognized musicians alongside local favorites.',
    'https://www.thestateroompresents.com',
    null
  ),

  -- ── Salt Lake City: Small & Indie Venues ────────────────────

  (
    'The Urban Lounge',
    'the-urban-lounge',
    'Salt Lake City', 'UT',
    '241 S 500 E',
    400,
    'Salt Lake City''s beloved 21+ indie and alternative bar venue since 2001. Eclectic programming from emerging local bands to national touring artists. A true cultural institution in the SLC music scene.',
    'https://theurbanloungeslc.com',
    null
  ),
  (
    'Kilby Court',
    'kilby-court',
    'Salt Lake City', 'UT',
    '748 S Kilby Ct',
    200,
    'Salt Lake City''s longest-running all-ages venue, established in 1999. A legendary DIY garage-style space that has launched countless careers and remains a springboard for emerging regional and national artists.',
    'https://kilbycourt.com',
    null
  ),
  (
    'Aces High Saloon',
    'aces-high-saloon',
    'Salt Lake City', 'UT',
    '1588 US-89',
    200,
    'Salt Lake City''s home for heavy metal, punk rock, and outlaw country. A 21+ bar with a full stage, pool table, and outdoor patio. The go-to destination for harder sounds in the SLC area.',
    'https://aceshighsaloon.com',
    null
  ),

  -- ── Salt Lake City: Outdoor & Unique Venues ─────────────────

  (
    'Red Butte Garden Amphitheatre',
    'red-butte-garden-amphitheatre',
    'Salt Lake City', 'UT',
    '2188 Red Butte Canyon Rd',
    3000,
    'A beloved outdoor garden amphitheater nestled in the foothills east of the University of Utah campus. Hosts an acclaimed summer concert series with national and international acts. BYOB and picnic-friendly.',
    'https://redbuttegarden.org',
    null
  ),
  (
    'The Gallivan Center',
    'the-gallivan-center',
    'Salt Lake City', 'UT',
    '239 S Main St',
    10000,
    'Downtown Salt Lake City''s outdoor amphitheater and public plaza. Home of the legendary Twilight Concert Series featuring national touring headliners for just $10 a ticket. Also hosts festivals and free community events.',
    'https://thegallivancenter.com',
    null
  ),
  (
    'Sandy Amphitheatre',
    'sandy-amphitheatre',
    'Sandy', 'UT',
    '1245 E 9400 S',
    2700,
    'A premier outdoor summer amphitheater (May–September) in Sandy with 2,000 reserved seats and a 700-person lawn area overlooking the Salt Lake Valley. Programs a mix of national touring acts.',
    'https://www.sandyamp.com',
    null
  ),

  -- ── Salt Lake City: Piano Bars ───────────────────────────────

  (
    'Tavernacle Social Club',
    'tavernacle-social-club',
    'Salt Lake City', 'UT',
    '50 W Broadway',
    null,
    'Downtown Salt Lake City''s original dueling piano bar since 2002. Two grand pianos, all-request format with nightly shows Wednesday through Saturday. A high-energy staple of Salt Lake City nightlife.',
    'https://tavernacle.com',
    null
  ),
  (
    'Keys on Main',
    'keys-on-main',
    'Salt Lake City', 'UT',
    '242 S Main St',
    null,
    'An all-request dueling piano show and cocktail bar in the heart of downtown Salt Lake City. Shows run Thursday through Saturday. High-energy, crowd-driven entertainment for all ages (some nights 21+).',
    'https://keysonmain.com',
    null
  ),

  -- ── Provo / Utah Valley ──────────────────────────────────────

  (
    'Velour Live Music Gallery',
    'velour-live-music-gallery',
    'Provo', 'UT',
    '135 N University Ave',
    300,
    'Provo''s legendary all-ages indie music venue. A cultural hub for Utah County''s music scene, featuring eclectic programming from local emerging artists to national touring acts, plus open mics and songwriter nights.',
    'https://velourlive.com',
    null
  ),
  (
    'Covey Center for the Arts',
    'covey-center-for-the-arts',
    'Provo', 'UT',
    '425 W Center St',
    670,
    'Provo''s premier performing arts center featuring a 670-seat main stage and a 100-seat black box theater. Programs 20–30 concerts and shows per season spanning music, dance, and theater.',
    'https://coveycenter.org',
    null
  ),
  (
    'SCERA Shell Outdoor Theatre',
    'scera-shell-outdoor-theatre',
    'Orem', 'UT',
    '600 S 400 E',
    3500,
    'A beloved outdoor summer amphitheater established in 1933 in Orem. Hosts musicals, live concerts, and outdoor movies in a family-friendly setting. One of Utah''s most cherished warm-weather entertainment traditions.',
    'https://scera.org',
    null
  ),
  (
    'Noorda Center for the Performing Arts',
    'noorda-center-for-the-performing-arts',
    'Orem', 'UT',
    '800 W University Pkwy',
    null,
    'Utah Valley University''s modern performing arts center featuring multiple performance spaces. Hosts concerts, dance productions, theater, and community events on the UVU campus.',
    'https://www.uvu.edu/thenoorda',
    null
  ),

  -- ── Ogden ───────────────────────────────────────────────────

  (
    'Peery''s Egyptian Theater',
    'peerys-egyptian-theater',
    'Ogden', 'UT',
    '2415 Washington Blvd',
    800,
    'A stunning historic 1924 movie palace fully restored in 1997. Now Ogden''s premiere multi-use performing arts venue for concerts, theater, dance, and film. One of Utah''s most architecturally distinctive stages.',
    'https://ogdenpet.com',
    null
  ),
  (
    'Ogden Amphitheater',
    'ogden-amphitheater',
    'Ogden', 'UT',
    '343 E 25th St',
    2000,
    'A downtown outdoor amphitheater in the heart of Ogden''s Historic 25th Street entertainment district. Home of the summer Ogden Twilight Concert Series featuring nationally touring artists at affordable prices.',
    null,
    null
  ),

  -- ── Park City ────────────────────────────────────────────────

  (
    'Snow Park Outdoor Amphitheater',
    'snow-park-outdoor-amphitheater',
    'Park City', 'UT',
    '2250 Deer Valley Dr S',
    4500,
    'A premiere outdoor hillside amphitheater at Deer Valley Resort with stunning mountain views. Home of the Deer Valley Music Festival and Utah Symphony summer concerts. One of the most scenic concert settings in the country.',
    'https://www.deervalleyamphitheater.com',
    null
  ),
  (
    'Egyptian Theatre Park City',
    'egyptian-theatre-park-city',
    'Park City', 'UT',
    '328 Main St',
    310,
    'Park City''s historic performing arts theater on the famous Historic Main Street. Hosts concerts, comedy, drama, and dance year-round, and serves as a key venue for the Sundance Film Festival each January.',
    'https://parkcityshows.com',
    null
  ),

  -- ── Logan ────────────────────────────────────────────────────

  (
    'Ellen Eccles Theatre',
    'ellen-eccles-theatre',
    'Logan', 'UT',
    '43 S Main St',
    1100,
    'A beautifully restored historic theater managed by the Cache Valley Center for the Arts in downtown Logan. Hosts concerts, theater, ballet, and comedy — the cultural heart of Cache Valley.',
    'https://cachearts.org',
    null
  ),

  -- ── Cedar City / Southern Utah ───────────────────────────────

  (
    'America First Event Center',
    'america-first-event-center',
    'Cedar City', 'UT',
    '351 W University Blvd',
    5300,
    'Southern Utah University''s multi-purpose arena in Cedar City. With 5,300 seats, it''s the largest indoor concert venue in southern Utah, hosting concerts across all genres alongside SUU Thunderbirds athletics.',
    null,
    null
  ),
  (
    'Heritage Center Theater',
    'heritage-center-theater',
    'Cedar City', 'UT',
    '105 N 100 E',
    1000,
    'A downtown Cedar City performing arts venue hosting concerts, theater, and community events. A cornerstone of the arts in Iron County and gateway to the Utah Shakespeare Festival scene.',
    null,
    null
  ),

  -- ── St. George / Southwestern Utah ──────────────────────────

  (
    'Tuacahn Amphitheatre',
    'tuacahn-amphitheatre',
    'Ivins', 'UT',
    '1100 Tuacahn Dr',
    2500,
    'A breathtaking outdoor amphitheater carved into 1,500-foot red rock cliffs at Padre Canyon near St. George. Hosts Broadway-scale productions from May through October alongside concerts, with indoor winter performances at an adjacent facility. One of the most visually spectacular stages in the United States.',
    'https://tuacahn.org',
    null
  );
