-- =============================================================================
-- CardVault - Database Schema
-- C237 Software Application Development, CA2
--
-- Run this file to create the database from scratch.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Clean up
--
-- 'products' is left over from the SupermarketApp class exercise. Nothing in
-- CardVault refers to it, so it is dropped to avoid confusion.
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;


-- -----------------------------------------------------------------------------
-- users  --  owner: Student A (Tan Boon Meng)
--
-- Every CardVault user. A card belongs to a user, so this table has to exist
-- before the cards table can reference it.
--
-- Design decisions:
--
--   email is UNIQUE
--     Login runs  SELECT ... WHERE email = ? AND password = SHA1(?)
--     If two rows shared an email, that query could return two users and we
--     would not know which one is logging in. UNIQUE makes the database
--     enforce the rule, so a duplicate registration fails even if the
--     application-level check is somehow bypassed.
--
--   password is VARCHAR(255) storing a SHA1 hash, not plain text
--     SHA1() always produces 40 characters, so 255 is generous. Passwords are
--     never stored as typed -- we hash on the way in, and compare hashes on
--     the way out, so the database never holds a readable password.
--
--   role is VARCHAR(10) defaulting to 'user'
--     Two roles: 'user' and 'admin'. DEFAULT 'user' means a new account can
--     never accidentally be created as an admin if the field is missing.
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,           -- SHA1 hash, never plain text
    role        VARCHAR(10)  NOT NULL DEFAULT 'user'   -- 'user' or 'admin'
);


-- -----------------------------------------------------------------------------
-- Seed data
--
-- One admin account so the admin role can be demonstrated without having to
-- edit the database by hand. Regular accounts are created through /register.
--
-- SHA1() hashes the password here exactly the same way the register route
-- does, so this seeded account logs in through the normal login form.
-- -----------------------------------------------------------------------------

INSERT INTO users (username, email, password, role) VALUES
    ('admin', 'admin@cardvault.sg', SHA1('admin123'), 'admin');


-- =============================================================================
-- TODO (team): cards table
--
-- Needs to be designed together, since Students B/C/D/E/F all read and write
-- it. It will need at minimum:
--   - a user_id column referencing users(id), so each card has an owner
--   - the condition metrics (surface, edges, corners, centering)
--   - purchase price, and a flag for 'available for trade'
-- =============================================================================
