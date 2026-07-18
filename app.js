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

app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
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




// -----------------------------------------------------------------------------
// STUDENT D  |  Owner: Ezann
// Editing Existing Information
// Routes: GET /edit-card/:id, POST /edit-card/:id
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT E  |  Owner: Rainie
// Removing Information + admin moderation
// Routes: POST /delete-card/:id, GET /admin-dashboard
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// STUDENT F  |  Owner: Zhan Fung
// Searching, Filtering and Organising -- over the user's OWN collection
//
// -----------------------------------------------------------------------------




// =============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
