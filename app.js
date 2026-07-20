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

// Step 1 - GET /Register

app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

// Step 3 - POST /Register

app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password } = req.body;

    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, SHA1(?))';
    connection.query(sql, [username, email, password], (err, result) => {
        if (err) {
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

// Step 4a GET /login


app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// Step 4c POST /login

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Error logging in:', err);
            return res.status(500).send('Error logging in');
        }

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');

            if (req.session.user.role === 'admin') {
                res.redirect('/admin-dashboard');
            } else {
                res.redirect('/dashboard');
            }
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});



// -----------------------------------------------------------------------------
// STUDENT B  |  Owner: Ryan
// Adding New Information -- add a card to your collection
// Routes: GET /add-card, POST /add-card   (POST uses upload.single('image'))
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT C  |  Owner: Sammi
// Viewing and Displaying Information
// -----------------------------------------------------------------------------
// View logged-in user's collection
app.get('/dashboard', checkAuthenticated, (req, res) => {

    const userId = req.session.user.user_id;

    const sql = `
        SELECT cards.*,
               conditions.condition_name
        FROM cards
        LEFT JOIN conditions
        ON cards.condition_id = conditions.condition_id
        WHERE cards.user_id = ?
        ORDER BY date_added DESC
    `;

    connection.query(sql, [userId], (err, cards) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        res.render('dashboard', {
            user: req.session.user,
            cards: cards
        });
    });

});


// View one card
app.get('/card/:id', checkAuthenticated, (req, res) => {

    const cardId = req.params.id;
    const userId = req.session.user.user_id;

    const sql = `
        SELECT cards.*,
               conditions.condition_name
        FROM cards
        LEFT JOIN conditions
        ON cards.condition_id = conditions.condition_id
        WHERE cards.card_id = ?
        AND cards.user_id = ?
    `;

    connection.query(sql, [cardId, userId], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        if (results.length === 0) {
            return res.status(404).send('Card not found');
        }

        res.render('view-card', {
            user: req.session.user,
            card: results[0]
        });

    });

});

// -----------------------------------------------------------------------------
// STUDENT D  |  Owner: Ezann
// Editing Existing Information
// Routes: GET /edit-card/:id, POST /edit-card/:id
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT E  |  Owner: Rainie
// Removing Information + admin moderation
// Routes: POST /delete-card/:id
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT F  |  Owner: Zhan Fung
// Searching, Filtering and Organising -- over the user's OWN collection
//
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Admin Dashboard
// View Admin Dashboard
app.get('/admin-dashboard', checkAuthenticated, checkAdmin, (req, res) => {

    // Total users
    const totalUsersSql = "SELECT COUNT(*) AS totalUsers FROM users WHERE is_active = 1";

    // Total cards
    const totalCardsSql = "SELECT COUNT(*) AS totalCards FROM cards";

    // All registered users
    const usersSql = `
        SELECT user_id, username, email, role, date_joined
        FROM users
        WHERE is_active = 1
        ORDER BY username
    `;

    connection.query(totalUsersSql, (err, userCount) => {
        if (err) throw err;

        connection.query(totalCardsSql, (err, cardCount) => {
            if (err) throw err;

            connection.query(usersSql, (err, users) => {
                if (err) throw err;

                res.render('admin-dashboard', {
                    user: req.session.user,
                    totalUsers: userCount[0].totalUsers,
                    totalCards: cardCount[0].totalCards,
                    users: users
                });
            });
        });
    });

});


// View one user's collection
app.get('/admin/user/:id', checkAuthenticated, checkAdmin, (req, res) => {

    const userId = req.params.id;

    const userSql = `
        SELECT user_id, username, email
        FROM users
        WHERE user_id = ?
    `;

    const cardsSql = `
        SELECT cards.*,
               conditions.condition_name
        FROM cards
        LEFT JOIN conditions
        ON cards.condition_id = conditions.condition_id
        WHERE cards.user_id = ?
        ORDER BY date_added DESC
    `;

    connection.query(userSql, [userId], (err, userResult) => {
        if (err) throw err;

        if (userResult.length === 0) {
            return res.send("User not found.");
        }

        connection.query(cardsSql, [userId], (err, cards) => {
            if (err) throw err;

            res.render('admin-view-collection', {
                user: req.session.user,
                selectedUser: userResult[0],
                cards: cards
            });

        });

    });

});
// -----------------------------------------------------------------------------

// =============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
