-- =============================================================================
-- CardVault - Database Schema
-- C237 Software Application Development, CA2
--
-- Target users: active hobbyists and collectors (20s-40s) who need a
-- structured way to manage a collection they are emotionally attached to.
--
-- Run this whole file to build the database from scratch.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Clean up
--
-- Dropped in reverse dependency order: cards points at users, genres and
-- conditions, so cards has to go first or the foreign keys block it.
--
-- 'products' is left over from the SupermarketApp class exercise.
-- 'categories' and 'rarities' were earlier designs -- both are now free text
-- on the cards table. See the notes there.
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS rarities;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS conditions;


-- =============================================================================
-- REFERENCE TABLES  --  maintained by the admin
--
-- A field gets a reference table when it is (a) filtered on, and (b) drawn
-- from a fixed shared vocabulary that everybody agrees on. genre and condition
-- are both. category and rarity are not -- see the cards table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- genres  --  the broad kind of card
--
-- A small, stable vocabulary that applies to every collector. 'Others' is the
-- catch-all so nobody is ever blocked from adding a card.
-- -----------------------------------------------------------------------------
CREATE TABLE genres (
    genre_id        INT AUTO_INCREMENT PRIMARY KEY,
    genre_name      VARCHAR(50) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- conditions  --  the physical state of the card
--
-- Condition is universal across every genre. A card's surface, edges, corners
-- and centering exist whether it is a Pokemon card or a basketball card, which
-- is why the professional graders (PSA, BGS, CGC) use the same 1-10 scale for
-- all of them. So one shared list is correct here.
--
-- condition_rank is the important column. Condition is an ORDER, not just a
-- label: Mint is better than Near Mint is better than Excellent. Sorting on
-- condition_name would give alphabetical nonsense (Excellent before Mint).
-- Sort with:  ORDER BY condition_rank ASC
-- -----------------------------------------------------------------------------
CREATE TABLE conditions (
    condition_id    INT AUTO_INCREMENT PRIMARY KEY,
    condition_name  VARCHAR(50) NOT NULL UNIQUE,
    condition_rank  INT NOT NULL              -- 1 = best. Lower is better.
);


-- =============================================================================
-- users  --  owner: Student A (Tan Boon Meng)
-- =============================================================================
--
-- Design decisions:
--
--   email UNIQUE
--     Login runs  SELECT ... WHERE email = ? AND password = SHA1(?)
--     Two rows with the same email would make that lookup ambiguous. The
--     database enforces the rule, so a duplicate cannot be created even if
--     the application check is bypassed.
--
--   username NOT unique
--     Two hobbyists can both be called 'Ryan'. Email is the identity here,
--     username is only a display name.
--
--   password VARCHAR(255), storing a SHA1 hash
--     SHA1() returns 40 characters. Passwords are hashed on the way in and
--     compared as hashes on the way out, so the database never holds a
--     readable password.
--
--   role DEFAULT 'user'
--     The registration form does not accept a role -- if it did, anyone could
--     register themselves as an admin. Admins are seeded below.
--
--   is_active
--     Lets an admin disable an account without deleting it (deleting would
--     cascade and destroy that person's whole collection). Login checks this.
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,                  -- SHA1 hash
    role        VARCHAR(10)  NOT NULL DEFAULT 'user',   -- 'user' or 'admin'
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,        -- 1 = active, 0 = disabled
    date_joined DATE         NOT NULL DEFAULT (CURRENT_DATE)
);


-- =============================================================================
-- cards  --  owner: Students B / C / D / E / F
-- =============================================================================
--
-- Design decisions:
--
--   purchase_price AND estimated_value
--     Two different numbers, both needed. purchase_price is what the collector
--     actually paid; estimated_value is what it is worth now. Storing both is
--     what lets the dashboard answer "what did I pay, and what is it worth
--     now" -- with only one of them, that question is unanswerable.
--
--   genre_id / condition_id
--     Foreign keys to the admin-curated lists. Controlled values, so filtering
--     and sorting on them are exact.
--
--   category is FREE TEXT, on purpose
--     'Pokemon', 'NBA', 'One Piece'. A fixed list would block a collector whose
--     franchise is not listed, and new franchises appear constantly. Free text
--     means nobody is ever blocked.
--
--     It is still filterable, because the database collation is
--     utf8mb4_general_ci -- case AND accent insensitive. Verified:
--         'Pokemon'  LIKE '%pokemon%'  -> matches
--         'POKEMON'  LIKE '%pokemon%'  -> matches
--         'Pokémon'  LIKE '%pokemon%'  -> matches
--         'Japanese Pokemon' LIKE '%pokemon%' -> matches
--     What it does NOT match: abbreviations ('PKMN'), typos ('Pokmon') and
--     synonyms ('Soccer' vs 'Football'). Accepted -- a collector is mostly
--     consistent with their own vocabulary inside their own collection.
--
--   rarity is FREE TEXT, display only
--     No shared vocabulary across genres: Pokemon says 'Holo Rare';
--     basketball says 'Rookie'/'Autograph'/'Patch'. Unlike category, rarity is
--     not filtered on at all -- it is shown on the card and nothing more.
--
--   ON DELETE CASCADE on user_id
--     Delete a user and their cards go too. Without this, deleting a user
--     would leave orphan cards pointing at a user_id that no longer exists.
--
--   ON DELETE RESTRICT on the reference tables (this is the default)
--     MySQL refuses to delete a genre that cards still use. The admin must
--     reassign or remove those cards first -- the database will not let the
--     admin silently break existing records.
--
--   quantity
--     Collectors genuinely hold duplicates of the same card.
-- -----------------------------------------------------------------------------

CREATE TABLE cards (
    card_id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    card_name       VARCHAR(100) NOT NULL,
    genre_id        INT NOT NULL,
    category        VARCHAR(50) NOT NULL,                  -- free text, filtered with LIKE
    condition_id    INT NOT NULL,
    rarity          VARCHAR(50) DEFAULT NULL,              -- free text, display only
    purchase_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- what they paid
    estimated_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- what it is worth now
    quantity        INT NOT NULL DEFAULT 1,
    remarks         VARCHAR(255) DEFAULT NULL,
    image           VARCHAR(255) DEFAULT NULL,
    date_added      DATE NOT NULL DEFAULT (CURRENT_DATE),

    FOREIGN KEY (user_id)      REFERENCES users (user_id)          ON DELETE CASCADE,
    FOREIGN KEY (genre_id)     REFERENCES genres (genre_id),
    FOREIGN KEY (condition_id) REFERENCES conditions (condition_id)
);


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- One admin so the admin role can be demonstrated. Regular accounts are
-- created through /register, which always defaults role to 'user'.
--
-- SHA1() here hashes the password exactly the way the register route does, so
-- this account logs in through the normal login form.
INSERT INTO users (username, email, password, role) VALUES
    ('admin', 'admin@cardvault.sg', SHA1('admin123'), 'admin');

INSERT INTO genres (genre_name) VALUES
    ('Trading Card Games'),
    ('Sport Cards'),
    ('Others');

-- Ranked best to worst. Lower rank = better condition.
INSERT INTO conditions (condition_name, condition_rank) VALUES
    ('Mint', 1),
    ('Near Mint', 2),
    ('Excellent', 3),
    ('Good', 4),
    ('Played', 5),
    ('Poor', 6);

-- =============================================================================
-- meetups  --  owner: meetup team (Ryan, Zhan Fung, Boon Meng)
--
-- Monthly community meetups posted by the admin. Members view the schedule;
-- the app only schedules and informs -- the actual card-sharing happens in
-- person at the event.
--   Admin: create / edit / delete.   Members: view only.
-- =============================================================================

DROP TABLE IF EXISTS meetups;
CREATE TABLE meetups (
    meetup_id   INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,      -- "Orchard Card Meetup"
    location    VARCHAR(150) NOT NULL,      -- "The Heeren (B1-01, 260 Orchard Rd)"
    meetup_date DATE NOT NULL,
    start_time  TIME,                        -- when it opens
    end_time    TIME,                        -- when it closes
    description VARCHAR(255),               -- theme / what to bring
    created_at  DATE NOT NULL DEFAULT (CURRENT_DATE)
);

INSERT INTO meetups (title, location, meetup_date, start_time, end_time, description) VALUES
    ('Orchard Card Meetup', 'The Heeren (B1-01, 260 Orchard Rd)', '2026-08-02', '11:00:00', '21:00:00', 'Monthly trade & showcase. Bring your binders.'),
    ('Kallang Collectors Day', 'Leisure Park Kallang (Level 1 Atrium)', '2026-08-23', '11:00:00', '21:00:00', 'Trading card focus. Graded slabs welcome.'),
    ('Raffles Place Card Exchange', 'Raffles Place (MRT B1)', '2026-09-13', '10:00:00', '20:00:00', 'City-centre meetup for all collectors.'),
    ('*SCAPE Collectors Gathering', '*SCAPE (Level 5, Treetop)', '2026-10-11', '11:00:00', '21:00:00', 'Our biggest meetup yet - all genres.');


-- =============================================================================
-- wishlist  --  cards a user wants but doesn't own yet
-- =============================================================================
--
-- Design decisions:
--
--   category is FREE TEXT, same reasoning as cards.category
--     'Pokemon', 'NBA', etc. No fixed vocabulary, so no franchise is ever
--     blocked. Kept consistent with how cards.category works.
--
--   No genre_id, condition_id, rarity, quantity, or estimated_value
--     Those describe a card you physically hold. A wishlist entry is just
--     "the card I want" -- condition and quantity don't apply until it's
--     actually bought and moved into the cards table.
--
--   target_price is NULLABLE
--     Not every wishlist entry has a price ceiling in mind yet ("the grail,
--     one day" with no real budget is a valid entry).
--
--   notes, nullable free text
--     e.g. grading requirements, edition preferences -- same role as
--     cards.remarks.
--
--   ON DELETE CASCADE on user_id
--     Same reasoning as cards: delete a user, their wishlist goes with them.
--     No orphaned rows left pointing at a user_id that no longer exists.
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS wishlist;

CREATE TABLE wishlist (
    wishlist_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    card_name     VARCHAR(100) NOT NULL,
    category      VARCHAR(50) NOT NULL,
    target_price  DECIMAL(10,2) DEFAULT NULL,
    notes         VARCHAR(255) DEFAULT NULL,
    date_added    DATE NOT NULL DEFAULT (CURRENT_DATE),

    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);
