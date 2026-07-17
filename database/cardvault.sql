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
-- Dropped in reverse dependency order: cards points at users and at the three
-- reference tables, so cards has to go first or the foreign keys block it.
--
-- 'products' is left over from the SupermarketApp class exercise.
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS rarities;
DROP TABLE IF EXISTS conditions;


-- =============================================================================
-- REFERENCE TABLES  --  maintained by the admin
--
-- Why these exist:
--   If category/rarity/condition were free text, users would type 'Pokemon',
--   'pokemon', 'Pokémon' and 'PKMN' -- and then "show me all my Pokemon cards"
--   would miss most of them. Filtering is only reliable when the values are
--   controlled.
--
--   So the admin curates these lists, and users pick from a dropdown. The
--   admin's job is what makes the user's search and filter work.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categories  --  what franchise/sport a card belongs to
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    category_id     INT AUTO_INCREMENT PRIMARY KEY,
    category_name   VARCHAR(50) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- rarities  --  how rare the card is
-- -----------------------------------------------------------------------------
CREATE TABLE rarities (
    rarity_id       INT AUTO_INCREMENT PRIMARY KEY,
    rarity_name     VARCHAR(50) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- conditions  --  the physical state of the card
--
-- condition_rank is the important column. Condition is an ORDER, not just a
-- label: Mint is better than Near Mint is better than Excellent. Sorting on
-- condition_name would give alphabetical nonsense (Excellent before Mint).
--
-- With a rank, "show me everything Near Mint or better" becomes
--     WHERE condition_rank <= 2
-- which is the shortlist of cards worth paying to have professionally graded.
-- That is CardVault's pre-grading filter.
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
--   category_id / rarity_id / condition_id
--     Foreign keys to the admin-curated lists rather than free text, so
--     filtering and grouping actually work.
--
--   ON DELETE CASCADE on user_id
--     Delete a user and their cards go too. Without this, deleting a user
--     would leave orphan cards pointing at a user_id that no longer exists.
--
--   ON DELETE RESTRICT on the reference tables (this is the default)
--     MySQL refuses to delete a category that cards still use. The admin must
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
    category_id     INT NOT NULL,
    rarity_id       INT NOT NULL,
    condition_id    INT NOT NULL,
    purchase_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- what they paid
    estimated_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- what it is worth now
    quantity        INT NOT NULL DEFAULT 1,
    remarks         VARCHAR(255) DEFAULT NULL,
    image           VARCHAR(255) DEFAULT NULL,
    date_added      DATE NOT NULL DEFAULT (CURRENT_DATE),

    FOREIGN KEY (user_id)      REFERENCES users (user_id)           ON DELETE CASCADE,
    FOREIGN KEY (category_id)  REFERENCES categories (category_id),
    FOREIGN KEY (rarity_id)    REFERENCES rarities (rarity_id),
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

-- Starting reference lists. The admin can add to these in the app -- they are
-- seeded only so the app is usable on first run.
INSERT INTO categories (category_name) VALUES
    ('Pokemon'), ('One Piece'), ('NBA'), ('Football'), ('Yu-Gi-Oh');

INSERT INTO rarities (rarity_name) VALUES
    ('Common'), ('Uncommon'), ('Rare'), ('Holo Rare'), ('Ultra Rare'), ('Secret Rare');

-- Ranked best to worst. Lower rank = better condition.
INSERT INTO conditions (condition_name, condition_rank) VALUES
    ('Mint', 1),
    ('Near Mint', 2),
    ('Excellent', 3),
    ('Good', 4),
    ('Played', 5),
    ('Poor', 6);
