const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();
const fs = require('fs');

//find out exactly where the image needs to go on 
const path = require('path');

// Set up multer for file uploads & filter in to correct subfolder based on category
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 1. Grab the category from the incoming form text fields
        let folderName = req.body.category || 'Others';
        
        // 2. Clean up special characters to match your folder structures exactly
        if (folderName === 'Yu-Gi-Oh!') {
            folderName = 'Yu-Gi-Oh';
        }

        // 3. Construct the absolute path target
        const targetDir = path.join(__dirname, 'public', 'images', folderName);

        // 4. Create the folder automatically if it's missing
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 5. Send the file straight to its sorted home
        cb(null, targetDir);
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
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/dashboard');
    }
};

// Middleware for registration form validation
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

// Middleware for password reset validation
const validateReset = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/forgot-password');
    }
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 characters long');
        return res.redirect('/forgot-password');
    }
    next();   // ← "you passed, go on through to the route"
};

// Middleware for login form validation
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
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
// -----------------------------------------------------------------------------

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// -------------------------------------------------------------------------------------------------------------
// Tan Boon Meng (25052694)
// User Registration
// Routes: GET /register, POST /register
// --------------------------------------------------------------------------------------------------------------

// GET /Register

app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

// POST /Register

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

// -------------------------------------------------------------------------------------------------------------
// Tan Boon Meng (25052694)
// User Login
// Routes: GET /login, POST /login, GET /forgot-password, POST /forgot-password
// --------------------------------------------------------------------------------------------------------------

// GET /login


app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// POST /login

app.post('/login', validateLogin, (req, res) => {
    const { email, password } = req.body;

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

// -------------------------------------------------------------------------------------------------------------
// Tan Boon Meng (25052694)
// Password Reset
// Routes: GET /forgot-password, POST /forgot-password
// --------------------------------------------------------------------------------------------------------------

// GET /forgot-password

app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        errors: req.flash('error')
    });
});


// POST /forgot-password
// Validation is handled by validateReset; this route just does the update.
app.post('/forgot-password', validateReset, (req, res) => {
    const { email, password } = req.body;

    const sql = 'UPDATE users SET password = SHA1(?) WHERE email = ?';
    connection.query(sql, [password, email], (err, result) => {
        if (err) {
            console.error('Error resetting password:', err);
            return res.status(500).send('Error resetting password');
        }

        if (result.affectedRows > 0) {
            req.flash('success', 'Password reset! Please log in with your new password.');
            res.redirect('/login');
        } else {
            req.flash('error', 'No account found with that email.');
            res.redirect('/forgot-password');
        }
    });
});


// -----------------------------------------------------------------------------
// Tan Boon Meng (25052694)
// Events Schedule
// -----------------------------------------------------------------------------

// GET /meetups
app.get('/meetups', checkAuthenticated, (req, res) => {
  
    const sql = `
        SELECT meetup_id, title, location, description,
               DATE_FORMAT(meetup_date, '%W, %d %b %Y') AS date_display,
               TIME_FORMAT(start_time, '%h:%i %p')      AS start_display,
               TIME_FORMAT(end_time, '%h:%i %p')        AS end_display
        FROM meetups
        WHERE meetup_date >= CURDATE()
        ORDER BY meetup_date ASC
    `;
    connection.query(sql, (err, meetups) => {
        if (err) {
            console.error('Error loading meetups:', err);
            return res.status(500).send('Database error');
        }
        res.render('meetups', { user: req.session.user, meetups: meetups });
    });
});


// POST /admin/delete-meetup/:id
app.post('/admin/delete-meetup/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const sql = 'DELETE FROM meetups WHERE meetup_id = ?';
    connection.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error deleting meetup:', err);
            return res.status(500).send('Error deleting meetup');
        }
        req.flash('success', 'Meetup deleted successfully!');
        res.redirect('/meetups');
    });
});


// -----------------------------------------------------------------------------
// STUDENT B  |  Owner: Ryan
// Adding New Information -- add a card to your collection
// Routes: GET /add-card, POST /add-card   (POST uses upload.single('image'))
// -----------------------------------------------------------------------------
// Display Add Card Page
app.get('/add-card', checkAuthenticated, (req, res) => {
    res.render('add-card', {
        user: req.session.user
    });
});


// Add Card
// 2. PROCESS ADD CARD FORM (POST)
// ==========================================
app.post('/add-card', checkAuthenticated, upload.single('image'), (req, res) => {
    const { 
        card_name, 
        genre_id, 
        condition_id, 
        category, 
        rarity, 
        estimated_value, 
        quantity, 
        remarks, 
        purchase_price 
    } = req.body;

    // Extract the logged-in user's ID from session
    const userId = req.session.user.id || req.session.user.user_id;

    if (!userId) {
        req.flash('error', 'Session invalid or expired. Please log in again.');
        return res.redirect('/login');
    }

    // Determine the dynamic relative path string for the database
    let dbImageValue = 'default.png'; 
    if (req.file) {
        let folderName = category || 'Others';
        if (folderName === 'Yu-Gi-Oh!') {
            folderName = 'Yu-Gi-Oh';
        }
        dbImageValue = `${folderName}/${req.file.originalname}`;
    }

    // SQL Query matching all 11 columns (including user_id)
    const query = `
        INSERT INTO cards (
            card_name, genre_id, condition_id, category, rarity, 
            estimated_value, quantity, remarks, purchase_price, image, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Map fallbacks for empty/optional form fields
    const values = [
        card_name, 
        genre_id, 
        condition_id, 
        category, 
        rarity, 
        estimated_value || 0.00, 
        quantity || 1, 
        remarks || null, 
        purchase_price || 0.00, 
        dbImageValue,
        userId 
    ];

    // Execute using your active 'connection' instance
    connection.query(query, values, (err, result) => {
        if (err) {
            console.error("Database Error details:", err);
            // Redirects back to the form with a clear warning instead of crashing
            req.flash('error', 'Failed to save card to database. Please try again.');
            return res.redirect('/add-card');
        }
        
        req.flash('success', 'Card added successfully!');
        res.redirect('/dashboard');
    });
});

// -----------------------------------------------------------------------------
// STUDENT C  |  Owner: Sammi
// Viewing and Displaying Information
// -----------------------------------------------------------------------------
// View logged-in user's collection
app.get('/dashboard', checkAuthenticated, (req, res) => {

    const userId = req.session.user.user_id;

    const cardSql = `
        SELECT cards.*,
               conditions.condition_name
        FROM cards
        LEFT JOIN conditions
        ON cards.condition_id = conditions.condition_id
        WHERE cards.user_id = ?
        ORDER BY date_added DESC
    `;

    const categorySql = `
        SELECT DISTINCT category
        FROM cards
        WHERE user_id = ?
        ORDER BY category
    `;

    const raritySql = `
        SELECT DISTINCT rarity
        FROM cards
        WHERE user_id = ?
        ORDER BY rarity
    `;

    connection.query(categorySql, [userId], (err, categories) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        connection.query(raritySql, [userId], (err, rarities) => {

            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
            }

            connection.query(cardSql, [userId], (err, cards) => {

                if (err) {
                    console.error(err);
                    return res.status(500).send("Database error");
                }

                res.render("dashboard", {
                    user: req.session.user,
                    cards: cards,
                    categories: categories,
                    rarities: rarities,
                    search: "",
                    categoryFilter: "",
                    rarityFilter: ""
                });

            });

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
//Owner: Sammi
// Collection Goals
// -----------------------------------------------------------------------------


// Display Edit Goal Page
app.get('/edit-goal/:id', checkAuthenticated, (req, res) => {

    const goalId = req.params.id;
    const userId = req.session.user.user_id;

    const sql = `
        SELECT *
        FROM goals
        WHERE goal_id = ?
        AND user_id = ?
    `;

    connection.query(sql, [goalId, userId], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        if (results.length === 0) {
            return res.status(404).send("Goal not found");
        }

        res.render("edit-goal", {
            user: req.session.user,
            goal: results[0]
        });

    });

});

app.post('/edit-goal/:id', checkAuthenticated, (req, res) => {

    const goalId = req.params.id;
    const userId = req.session.user.user_id;

    const {
        goal_name,
        description,
        target_cards,
        current_cards,
        status
    } = req.body;

    const sql = `
        UPDATE goals
        SET
            goal_name = ?,
            description = ?,
            target_cards = ?,
            current_cards = ?,
            status = ?
        WHERE goal_id = ?
        AND user_id = ?
    `;

    connection.query(
        sql,
        [
            goal_name,
            description,
            target_cards,
            current_cards,
            status,
            goalId,
            userId
        ],
        (err) => {

            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
            }

            res.redirect('/goals');
        }
    );

});


// Display Remove Goal Confirmation Page
app.get('/remove-goal/:id', checkAuthenticated, (req, res) => {

    const goalId = req.params.id;
    const userId = req.session.user.user_id;

    const sql = `
        SELECT *
        FROM goals
        WHERE goal_id = ?
        AND user_id = ?
    `;

    connection.query(sql, [goalId, userId], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        if (results.length === 0) {
            return res.status(404).send("Goal not found");
        }

        res.render("remove-goal", {
            user: req.session.user,
            goal: results[0]
        });

    });

});

// Delete Goal
app.post('/remove-goal/:id', checkAuthenticated, (req, res) => {

    const goalId = req.params.id;
    const userId = req.session.user.user_id;

    const sql = `
        DELETE FROM goals
        WHERE goal_id = ?
        AND user_id = ?
    `;

    connection.query(sql, [goalId, userId], (err) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        res.redirect('/goals');

    });

});


// ----------------------------------------------------------------------------
// STUDENT D  |  Owner: Ezann
// Editing Existing Information + Reviews & Ratings
// Routes: GET /edit-card/:id, POST /edit-card/:id
//         GET /meetup-reviews, GET /meetup/:id, POST /meetup/:id/reviews,
//         GET /edit-review/:id, POST /edit-review/:id, POST /delete-review/:id
// -----------------------------------------------------------------------------
 
// Show edit form pre-filled with the card's current data
app.get('/edit-card/:id', checkAuthenticated, (req, res) => {
 
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
            req.flash('error', 'Card not found or you do not have permission to edit it.');
            return res.redirect('/dashboard');
        }
 
        res.render('edit-card', {
            user: req.session.user,
            card: results[0],
            messages: req.flash('error')
        });
 
    });
 
});
 
// Process the edit form (image upload is optional -- keep the old image if none is chosen)
app.post('/edit-card/:id', checkAuthenticated, upload.single('image'), (req, res) => {
 
    const cardId = req.params.id;
    const userId = req.session.user.user_id;
 
    const {
        card_name,
        genre_id,
        condition_id,
        category,
        rarity,
        estimated_value,
        quantity,
        remarks,
        purchase_price,
        existing_image   // hidden field in the form holding the current image path
    } = req.body;
 
    // Work out the image value the same way add-card does
    let dbImageValue = existing_image || 'default.png';
    if (req.file) {
        let folderName = category || 'Others';
        if (folderName === 'Yu-Gi-Oh!') {
            folderName = 'Yu-Gi-Oh';
        }
        dbImageValue = `${folderName}/${req.file.originalname}`;
    }
 
    const sql = `
        UPDATE cards
        SET card_name = ?,
            genre_id = ?,
            condition_id = ?,
            category = ?,
            rarity = ?,
            estimated_value = ?,
            quantity = ?,
            remarks = ?,
            purchase_price = ?,
            image = ?
        WHERE card_id = ?
        AND user_id = ?
    `;
 
    const values = [
        card_name,
        genre_id,
        condition_id,
        category,
        rarity,
        estimated_value || 0.00,
        quantity || 1,
        remarks || null,
        purchase_price || 0.00,
        dbImageValue,
        cardId,
        userId
    ];
 
    connection.query(sql, values, (err, result) => {
 
        if (err) {
            console.error('Database Error details:', err);
            req.flash('error', 'Failed to update card. Please try again.');
            return res.redirect('/edit-card/' + cardId);
        }
 
        if (result.affectedRows === 0) {
            req.flash('error', 'Card not found or you do not have permission to edit it.');
            return res.redirect('/dashboard');
        }
 
        req.flash('success', 'Card updated successfully!');
        res.redirect('/card/' + cardId);
    });
 
});
 
// READ — list all meetups with a "Leave a Review" link (own hub page, doesn't touch meetups.ejs)
app.get('/meetup-reviews', checkAuthenticated, (req, res) => {
    const sql = `
        SELECT meetup_id, title, location,
               DATE_FORMAT(meetup_date, '%W, %d %b %Y') AS date_display
        FROM meetups
        ORDER BY meetup_date DESC
    `;
    connection.query(sql, (err, meetups) => {
        if (err) {
            console.error('Error loading meetups:', err);
            return res.status(500).send('Database error');
        }
        res.render('meetup-reviews', { user: req.session.user, meetups: meetups });
    });
});
 
// READ — view one meetup's details + all its reviews + the review form
app.get('/meetup/:id', checkAuthenticated, (req, res) => {
    const meetupId = req.params.id;
 
    const meetupSql = `
        SELECT meetup_id, title, location, description,
               DATE_FORMAT(meetup_date, '%W, %d %b %Y') AS date_display,
               TIME_FORMAT(start_time, '%h:%i %p')      AS start_display,
               TIME_FORMAT(end_time, '%h:%i %p')        AS end_display
        FROM meetups
        WHERE meetup_id = ?
    `;
    connection.query(meetupSql, [meetupId], (err, meetupResults) => {
        if (err) {
            console.error('Error loading meetup:', err);
            return res.status(500).send('Database error');
        }
        if (meetupResults.length === 0) {
            return res.status(404).send('Meetup not found');
        }
 
        const reviewsSql = `
            SELECT reviews.*, users.username
            FROM reviews
            JOIN users ON reviews.user_id = users.user_id
            WHERE reviews.meetup_id = ?
            ORDER BY reviews.created_at DESC
        `;
        connection.query(reviewsSql, [meetupId], (err, reviewResults) => {
            if (err) {
                console.error('Error loading reviews:', err);
                return res.status(500).send('Database error');
            }
 
            res.render('view-meetup', {
                user: req.session.user,
                meetup: meetupResults[0],
                reviews: reviewResults,
                messages: req.flash('error')
            });
        });
    });
});
 
// CREATE — submit a new review for a meetup (photo optional)
app.post('/meetup/:id/reviews', checkAuthenticated, upload.single('image'), (req, res) => {
    const meetupId = req.params.id;
    const userId = req.session.user.user_id;
    const { rating, comment } = req.body;
 
    if (!rating) {
        req.flash('error', 'Rating is required.');
        return res.redirect('/meetup/' + meetupId);
    }
 
    let dbImageValue = null;
    if (req.file) {
        dbImageValue = `Reviews/${req.file.originalname}`;
    }
 
    const sql = 'INSERT INTO reviews (user_id, meetup_id, rating, comment, image) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [userId, meetupId, rating, comment || null, dbImageValue], (err, result) => {
        if (err) {
            console.error('Error adding review:', err);
            return res.status(500).send('Error adding review');
        }
        req.flash('success', 'Review submitted!');
        res.redirect('/meetup/' + meetupId);
    });
});
 
// UPDATE — show edit form for a review the user owns
app.get('/edit-review/:id', checkAuthenticated, (req, res) => {
    const reviewId = req.params.id;
    const userId = req.session.user.user_id;
 
    const sql = 'SELECT * FROM reviews WHERE review_id = ? AND user_id = ?';
    connection.query(sql, [reviewId, userId], (err, results) => {
        if (err) {
            console.error('Error loading review:', err);
            return res.status(500).send('Database error');
        }
        if (results.length === 0) {
            req.flash('error', 'Review not found or you do not have permission to edit it.');
            return res.redirect('/meetup-reviews');
        }
        res.render('edit-review', { user: req.session.user, review: results[0] });
    });
});
 
// UPDATE — handle the edit submission (photo optional -- keep the old one if none is chosen)
app.post('/edit-review/:id', checkAuthenticated, upload.single('image'), (req, res) => {
    const reviewId = req.params.id;
    const userId = req.session.user.user_id;
    const { rating, comment, meetup_id, existing_image } = req.body;
 
    let dbImageValue = existing_image || null;
    if (req.file) {
        dbImageValue = `Reviews/${req.file.originalname}`;
    }
 
    const sql = 'UPDATE reviews SET rating = ?, comment = ?, image = ? WHERE review_id = ? AND user_id = ?';
    connection.query(sql, [rating, comment || null, dbImageValue, reviewId, userId], (err, result) => {
        if (err) {
            console.error('Error updating review:', err);
            return res.status(500).send('Error updating review');
        }
        req.flash('success', 'Review updated!');
        res.redirect('/meetup/' + meetup_id);
    });
});
 
// DELETE — remove a review the user owns
app.post('/delete-review/:id', checkAuthenticated, (req, res) => {
    const reviewId = req.params.id;
    const userId = req.session.user.user_id;
    const meetupId = req.body.meetup_id;
 
    const sql = 'DELETE FROM reviews WHERE review_id = ? AND user_id = ?';
    connection.query(sql, [reviewId, userId], (err, result) => {
        if (err) {
            console.error('Error deleting review:', err);
            return res.status(500).send('Error deleting review');
        }
        req.flash('success', 'Review deleted.');
        res.redirect('/meetup/' + meetupId);
    });
});

// -----------------------------------------------------------------------------
// STUDENT E  |  Owner: Rainie
// Removing Information + admin moderation
// Routes: POST /delete-card/:id
// -----------------------------------------------------------------------------
app.post('/delete-card/:id', checkAuthenticated, (req, res) => {

    const id = req.params.id;
    const sql = `
        DELETE FROM cards
        WHERE card_id = ?
        AND user_id = ?
    `;

    connection.query(sql, [id, req.session.user.user_id], (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Unable to delete card");}
        res.redirect('/dashboard');

    });
});

// Admin can delete any card
app.post('/admin/delete-card/:id',
    checkAuthenticated,
    checkAdmin,
    (req, res) => {

        const cardId = req.params.id;
        const userId = req.body.userId;

        const sql = `
            DELETE FROM cards
            WHERE card_id = ?
        `;

        connection.query(sql, [cardId], (err, result) => {

            if (err) {
                console.log(err);
                return res.send("Unable to delete card");
            }

            
            res.redirect('/admin/user/' + userId);

        });
});

// ==========================
// GOAL COLLECTION
// ==========================

app.get('/goals', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    const user_id = req.session.user.user_id;

    const sql = `
        SELECT *
        FROM goals
        WHERE user_id = ?
        ORDER BY date_created DESC
    `;

    connection.query(sql, [user_id], (err, results) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        res.render('goals', {
            goals: results,
            user: req.session.user
        });

    });

});

app.get('/add-goal', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('add-goal', {
        user: req.session.user
    });

});

app.post('/add-goal', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    const user_id = req.session.user.user_id;

    const {
        goal_name,
        description,
        target_cards
    } = req.body;

    const sql = `
        INSERT INTO goals
        (
            user_id,
            goal_name,
            description,
            target_cards,
            current_cards,
            status
        )
        VALUES (?, ?, ?, ?, 0, 'In Progress')
    `;

    connection.query(
        sql,
        [
            user_id,
            goal_name,
            description,
            target_cards
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Unable to create goal.");
            }

            res.redirect('/goals');

        }
    );

});

app.get('/goal/:id', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    const goal_id = req.params.id;

    const sql = `
        SELECT *
        FROM goals
        WHERE goal_id = ?
    `;

    connection.query(sql, [goal_id], (err, results) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (results.length === 0) {
            return res.send("Goal not found");
        }

        res.render('view-goal', {
            goal: results[0],
            user: req.session.user
        });

    });

});

// -----------------------------------------------------------------------------
// STUDENT F  |  Owner: Zhan Fung
// Searching, Filtering and Organising -- over the user's OWN collection
//
// -----------------------------------------------------------------------------
app.get('/search', checkAuthenticated, (req, res) => {

    const userId = req.session.user.user_id;

    const search = req.query.search || "";
    const category = req.query.category || "";
    const rarity = req.query.rarity || "";

    const categorySql = `
        SELECT DISTINCT category
        FROM cards
        WHERE user_id = ?
        ORDER BY category
    `;

    const raritySql = `
        SELECT DISTINCT rarity
        FROM cards
        WHERE user_id = ?
        ORDER BY rarity
    `;

    const sql = `
        SELECT cards.*,
               conditions.condition_name
        FROM cards
        LEFT JOIN conditions
        ON cards.condition_id = conditions.condition_id
        WHERE cards.user_id = ?
        AND cards.card_name LIKE ?
        AND cards.category LIKE ?
        AND cards.rarity LIKE ?
        ORDER BY date_added DESC
    `;

    connection.query(categorySql, [userId], (err, categories) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        connection.query(raritySql, [userId], (err, rarities) => {

            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
            }

            connection.query(
                sql,
                [
                    userId,
                    "%" + search + "%",
                    "%" + category + "%",
                    "%" + rarity + "%"
                ],
                (err, cards) => {

                    if (err) {
                        console.error(err);
                        return res.status(500).send("Database error");
                    }

                    res.render("dashboard", {
                        user: req.session.user,
                        cards: cards,
                        categories: categories,
                        rarities: rarities,
                        search: search,
                        categoryFilter: category,
                        rarityFilter: rarity
                    });

                }
            );

        });

    });

});

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

// View Edit Role Page
app.get('/admin/edit-role/:id', checkAuthenticated, checkAdmin, (req, res) => {

    const userId = req.params.id;

    const sql = `
        SELECT user_id, username, email, role
        FROM users
        WHERE user_id = ?
    `;

    connection.query(sql, [userId], (err, result) => {

        if (err) throw err;


        if (result.length === 0) {

            return res.send("User not found.");

        }


        res.render('admin-edit-role', {

            user: req.session.user,
            selectedUser: result[0]

        });


    });

});

// Update User Role
app.post('/admin/edit-role/:id', checkAuthenticated, checkAdmin, (req, res) => {

    const userId = req.params.id;
    const role = req.body.role;


    const sql = `
        UPDATE users
        SET role = ?
        WHERE user_id = ?
    `;


    connection.query(sql, [role, userId], (err, result) => {

        if (err) throw err;


        res.redirect('/admin-dashboard');

    });

});

// View All Cards (Admin)
app.get('/admin/all-cards', checkAuthenticated, checkAdmin, (req, res) => {

    const search = req.query.search || "";
    const category = req.query.category || "";
    const rarity = req.query.rarity || "";


    const sql = `
        SELECT cards.*,
               users.username,
               conditions.condition_name
        FROM cards
        LEFT JOIN users
        ON cards.user_id = users.user_id
        LEFT JOIN conditions
        ON cards.condition_id = conditions.condition_id
        WHERE cards.card_name LIKE ?
        AND cards.category LIKE ?
        AND cards.rarity LIKE ?
        ORDER BY cards.date_added DESC
    `;


    const categorySql = `
        SELECT DISTINCT category
        FROM cards
    `;


    const raritySql = `
        SELECT DISTINCT rarity
        FROM cards
    `;


    connection.query(sql,
    [
        `%${search}%`,
        `%${category}%`,
        `%${rarity}%`
    ],
    (err, cards) => {

        if (err) throw err;


        connection.query(categorySql, (err, categories) => {

            if (err) throw err;


            connection.query(raritySql, (err, rarities) => {

                if (err) throw err;


                res.render('admin-all-cards', {

                    user: req.session.user,
                    cards: cards,

                    categories: categories,
                    rarities: rarities,

                    search: search,
                    searchCategory: category,
                    searchRarity: rarity

                });


            });

        });


    });

});

// View Card Details (Admin)
app.get('/admin/card/:id', checkAuthenticated, checkAdmin, (req, res) => {

    const cardId = req.params.id;


    const sql = `
        SELECT cards.*,
               users.username,
               conditions.condition_name
        FROM cards
        LEFT JOIN users
        ON cards.user_id = users.user_id
        LEFT JOIN conditions
        ON cards.condition_id = conditions.condition_id
        WHERE cards.card_id = ?
    `;


    connection.query(sql, [cardId], (err, results) => {


        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }



        if (results.length === 0) {

            return res.status(404).send("Card not found");

        }



        res.render('admin-view-card', {

            user: req.session.user,
            card: results[0]

        });


    });


});
// -----------------------------------------------------------------------------

// =============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
