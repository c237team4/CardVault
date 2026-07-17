const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'c237-loosee-mysql.mysql.database.azure.com',
    user: 'c237_015',
    password: 'c237015@2026!',
    database: 'c237_015_team4',
    ssl: {
    rejectUnauthorized: true // Or false if you don't have the CA certificate
    }
  });

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

//TO DO: Insert code for Session Middleware below
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
// Note: req.session.user may be undefined (logged out), so check that FIRST --
// reading .role off undefined would crash the server instead of redirecting.
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/dashboard');
    }
};

// Middleware for form validation
// 'role' is deliberately NOT accepted from the form -- if it were, anyone could
// register themselves as an admin. The database defaults role to 'user'.
const validateRegistration = (req, res, next) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// =============================================================================
// ROUTES
//
// Each member owns ONE section below. Add your routes inside your own block
// so we are not all editing the same lines -- that is what causes merge
// conflicts. Do not reformat someone else's section.
//
// Put your name on your block at the first team meeting.
// =============================================================================


// -----------------------------------------------------------------------------
// SHARED  |  Owner: whole team
// Landing page and logout. Agreed together, changed together.
// -----------------------------------------------------------------------------

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// -----------------------------------------------------------------------------
// STUDENT A  |  Owner: Tan Boon Meng (25052694)
// User Registration, Login and Access Control
// Routes: GET /register, POST /register, GET /login, POST /login
// -----------------------------------------------------------------------------

// Show the registration form.
// formData is whatever the user typed last time it failed validation, so the
// form can be re-filled instead of making them type everything again.
app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

// Handle the registration form.
// validateRegistration runs first -- if it redirects, this function never runs.
app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password } = req.body;

    // SHA1(?) hashes the password inside MySQL, so the plain password is never
    // stored. role is not in this query -- the table defaults it to 'user'.
    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, SHA1(?))';

    connection.query(sql, [username, email, password], (err, result) => {
        if (err) {
            // email is UNIQUE in the database. If it is already taken, MySQL
            // rejects the INSERT with ER_DUP_ENTRY instead of creating a
            // second account that login could not tell apart.
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'That email is already registered. Try logging in.');
                req.flash('formData', req.body);
                return res.redirect('/register');
            }
            console.error('Error registering user:', err);
            return res.status(500).send('Error registering user');
        }

        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

// Show the login form.
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// Handle the login form.
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    // Hash what was typed and compare it against the stored hash. We never
    // decrypt the stored password -- SHA1 is one-way, so instead we hash the
    // attempt the same way and check the two hashes match.
    //
    // The ? placeholders matter: mysql2 escapes the values, so a password like
    //  ' OR '1'='1
    // is treated as text to compare, not as SQL to run (SQL injection).
    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';

    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Error logging in:', err);
            return res.status(500).send('Error logging in');
        }

        if (results.length > 0) {
            // An admin can disable an account (is_active = 0) instead of
            // deleting it, since deleting would cascade and destroy that
            // person's whole collection. The credentials are correct here,
            // so we can safely say why they are being turned away.
            if (results[0].is_active === 0) {
                req.flash('error', 'Your account has been deactivated. Please contact an admin.');
                return res.redirect('/login');
            }

            // Store the user on the session. Every later request carries a
            // session cookie, which is how checkAuthenticated knows who this
            // is without asking them to log in again on every page.
            req.session.user = results[0];
            req.flash('success', 'Login successful!');

            // Send each role to the page that is useful to them.
            if (req.session.user.role === 'admin') {
                res.redirect('/admin-dashboard');
            } else {
                res.redirect('/dashboard');
            }
        } else {
            // Deliberately vague: saying "wrong password" would confirm the
            // email exists, which helps someone guessing accounts.
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});




// -----------------------------------------------------------------------------
// STUDENT B  |  Owner: TODO
// Adding New Information -- add a card to your collection
// Routes: GET /add-card, POST /add-card   (POST uses upload.single('image'))
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT C  |  Owner: TODO
// Viewing and Displaying Information
// Routes: GET /dashboard, GET /view-collection, GET /card/:id
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT D  |  Owner: TODO
// Editing Existing Information
// Routes: GET /edit-card/:id, POST /edit-card/:id
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT E  |  Owner: TODO
// Removing Information + admin moderation
// Routes: POST /delete-card/:id, GET /admin-dashboard
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT F  |  Owner: TODO
// Searching, Filtering and Organising -- over the user's OWN collection
//
// A collector with 300 cards needs to find one. This is what makes "know what
// you own" usable rather than just a long list.
//
// Routes: GET /view-collection  (search by card_name, filter by genre /
//         category / condition, sort by value / name / condition / date added)
//
// Work with Student C -- C renders the collection, F makes it searchable, so
// the two of you share /view-collection. Agree who owns the route.
//
// Three filters, and they are NOT the same kind:
//
//   genre_id      exact match:  AND c.genre_id = ?
//   condition_id  exact match:  AND c.condition_id = ?
//                 Both are ids from the admin-curated lists, so exact is right.
//
//   category      free text, so LIKE:  AND c.category LIKE ?   with '%term%'
//                 The collation is utf8mb4_general_ci -- case and accent
//                 insensitive -- so 'Pokemon'/'pokemon'/'POKEMON'/'Pokémon'
//                 all match '%pokemon%'. Verified. It will NOT match
//                 abbreviations ('PKMN') or typos. That is accepted.
//
//                 Tip: to build the category dropdown, read back what this user
//                 has actually typed:
//                     SELECT DISTINCT category FROM cards WHERE user_id = ?
//                 -- their own vocabulary, so it is self-consistent.
//
// DO NOT filter on cards.rarity -- free text with no shared vocabulary across
// genres ('Holo Rare' vs 'Rookie'). Rarity is display only.
//
// Sort by condition using conditions.condition_rank (1 = best) -- sorting on
// condition_name would put Excellent before Mint, alphabetically.
// -----------------------------------------------------------------------------




// =============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
