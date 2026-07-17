-- =============================================================================
-- CardVault - Demo Data
--
-- Optional. Run AFTER cardvault.sql.
--
-- Why this is a separate file:
--   cardvault.sql is the schema plus the minimum seed the app needs to run
--   (the admin account, the genres and conditions lists). This file is sample
--   collections, so the team can build and demo against realistic data. Keep
--   them apart so the schema can be rebuilt without dragging fake cards along.
--
-- Demo logins (all passwords are 'demo123'):
--   ryan@demo.sg   heavy Pokemon collector, 8 cards
--   mei@demo.sg    sports collector, 6 cards
--   jun@demo.sg    casual, mixed, 4 cards
--   (admin@cardvault.sg / admin123 comes from cardvault.sql)
--
-- Prices are loosely based on the Straits Times and CNA reporting on the
-- Singapore trading card market, so the numbers look believable in a demo.
-- =============================================================================


-- Clear any previous demo runs. Deleting the users cascades to their cards,
-- so the cards do not need deleting separately -- that is the ON DELETE
-- CASCADE on cards.user_id doing its job.
DELETE FROM users WHERE email IN ('ryan@demo.sg', 'mei@demo.sg', 'jun@demo.sg');


-- -----------------------------------------------------------------------------
-- Demo collectors
--
-- SHA1() hashes the password the same way the register route does, so these
-- accounts log in through the normal login form.
-- -----------------------------------------------------------------------------
INSERT INTO users (username, email, password, role) VALUES
    ('Ryan',  'ryan@demo.sg', SHA1('demo123'), 'user'),
    ('Mei',   'mei@demo.sg',  SHA1('demo123'), 'user'),
    ('Jun',   'jun@demo.sg',  SHA1('demo123'), 'user');


-- -----------------------------------------------------------------------------
-- Look up the ids we need, rather than hardcoding 1/2/3.
--
-- AUTO_INCREMENT values depend on how many times the schema has been rebuilt,
-- so hardcoded ids break the moment someone re-runs cardvault.sql. Looking
-- them up by name always works.
-- -----------------------------------------------------------------------------
SET @ryan = (SELECT user_id FROM users WHERE email = 'ryan@demo.sg');
SET @mei  = (SELECT user_id FROM users WHERE email = 'mei@demo.sg');
SET @jun  = (SELECT user_id FROM users WHERE email = 'jun@demo.sg');

SET @tcg    = (SELECT genre_id FROM genres WHERE genre_name = 'Trading Card Games');
SET @sport  = (SELECT genre_id FROM genres WHERE genre_name = 'Sport Cards');
SET @others = (SELECT genre_id FROM genres WHERE genre_name = 'Others');

SET @mint      = (SELECT condition_id FROM conditions WHERE condition_name = 'Mint');
SET @nearmint  = (SELECT condition_id FROM conditions WHERE condition_name = 'Near Mint');
SET @excellent = (SELECT condition_id FROM conditions WHERE condition_name = 'Excellent');
SET @good      = (SELECT condition_id FROM conditions WHERE condition_name = 'Good');
SET @played    = (SELECT condition_id FROM conditions WHERE condition_name = 'Played');


-- -----------------------------------------------------------------------------
-- Ryan  --  Pokemon-heavy collector
--
-- Note the deliberate spelling drift: 'Pokemon', 'pokemon', 'Pokémon'. This is
-- what a real user does, and it is there on purpose so Student F can prove the
-- LIKE filter still catches all of them (the collation is case and accent
-- insensitive). Do not "tidy" these.
-- -----------------------------------------------------------------------------
INSERT INTO cards (user_id, card_name, genre_id, category, condition_id, rarity, purchase_price, estimated_value, quantity, remarks, date_added) VALUES
    (@ryan, 'Charizard Base Set 1999', @tcg, 'Pokemon',  @nearmint,  'Holo Rare',    3500.00,  6500.00, 1, 'The one that started it all. Not selling.', '2026-01-14'),
    (@ryan, 'Gengar Mysterious Mountains', @tcg, 'Pokemon', @mint,   'Holo Rare',    9000.00, 17500.00, 1, 'First edition Japanese. Bought at Kyo Cards Con.', '2026-05-02'),
    (@ryan, 'Umbreon VMAX Alt Art', @tcg, 'pokemon',      @mint,     'Secret Rare',   800.00,  1400.00, 1, 'Moonbreon. Worth grading.', '2026-03-21'),
    (@ryan, 'Pikachu VMAX', @tcg, 'Pokemon',              @mint,     'Ultra Rare',    200.00,   450.00, 3, 'Pulled 3 from the same box.', '2026-02-08'),
    (@ryan, 'Mewtwo GX', @tcg, 'Pokémon',                 @excellent,'Rare',           80.00,   120.00, 2, 'Corners are soft on one copy.', '2026-02-08'),
    (@ryan, 'Luffy Leader Parallel', @tcg, 'One Piece',   @mint,     'Secret Rare',   300.00,   700.00, 1, NULL, '2026-04-11'),
    (@ryan, 'Blue-Eyes White Dragon LOB', @tcg, 'Yu-Gi-Oh', @nearmint,'Ultra Rare',   150.00,   260.00, 1, 'Childhood card, kept in a sleeve since 2003.', '2026-01-30'),
    (@ryan, 'Zoro Parallel', @tcg, 'One Piece',           @excellent,'Super Rare',     60.00,    95.00, 2, NULL, '2026-06-19');


-- -----------------------------------------------------------------------------
-- Mei  --  sports collector
--
-- Note the rarity vocabulary here: 'Rookie', 'Autograph', 'Base'. Completely
-- different from Ryan's 'Holo Rare' / 'Secret Rare'. This is exactly why
-- rarity is free text and not a shared lookup table.
-- -----------------------------------------------------------------------------
INSERT INTO cards (user_id, card_name, genre_id, category, condition_id, rarity, purchase_price, estimated_value, quantity, remarks, date_added) VALUES
    (@mei, 'Kobe Bryant Rookie 1997', @sport, 'NBA',      @mint,     'Rookie',       120.00,   400.00, 1, 'Found in storage. Might be worth grading.', '2026-02-02'),
    (@mei, 'LeBron James Rookie 2003', @sport, 'NBA',     @nearmint, 'Rookie',      2000.00,  3500.00, 1, NULL, '2026-03-15'),
    (@mei, 'Messi Signed 2022', @sport, 'Football',       @nearmint, 'Autograph',    900.00,  1500.00, 1, 'World Cup year. Certificate in the folder.', '2026-04-27'),
    (@mei, 'Shawal Anuar', @sport, 'Football',            @mint,     'Base',          15.00,    20.00, 5, 'FAS x Playback Asia set. Bought 5 to share.', '2026-06-05'),
    (@mei, 'Ilhan Fandi', @sport, 'football',             @mint,     'Base',          15.00,    20.00, 3, 'Same set as Shawal.', '2026-06-05'),
    (@mei, 'Verstappen 2021 Champion', @sport, 'Formula 1', @excellent, 'Base',       40.00,    55.00, 1, NULL, '2026-05-30');


-- -----------------------------------------------------------------------------
-- Jun  --  casual, mixed. Small collection, low value.
--
-- Deliberately unremarkable: a demo where everyone has a $17,000 Gengar is not
-- a realistic test. Jun is here so the dashboard is exercised with a modest
-- collection, and so 'Others' and NULL rarity get used.
-- -----------------------------------------------------------------------------
INSERT INTO cards (user_id, card_name, genre_id, category, condition_id, rarity, purchase_price, estimated_value, quantity, remarks, date_added) VALUES
    (@jun, 'Convention Promo Sleeve', @others, 'Misc',    @good,     NULL,             5.00,     5.00, 10, 'Freebies from CAPS at Leisure Park.', '2026-05-03'),
    (@jun, 'Digimon Agumon Starter', @tcg, 'Digimon',     @nearmint, 'Common',        12.00,    12.00,  1, NULL, '2026-06-22'),
    (@jun, 'Charizard Base Set 1999', @tcg, 'Pokemon',    @played,   'Holo Rare',    200.00,   350.00,  1, 'Played with it as a kid. Heavy edge wear.', '2026-01-09'),
    (@jun, 'Random Football Sticker', @sport, 'Football', @good,     NULL,             2.00,     2.00,  4, NULL, '2026-07-01');
