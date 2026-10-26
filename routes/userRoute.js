import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import pool from '../mysql_connect.js';
import { checkPassword, encryptPassword } from '../utils/passwordEncryptDecrypt.js';
import { createTokenForUser, verifyTokenForUser } from '../utils/createVerifyToken.js';
import generateUniqueUsername from '../utils/generateUniqueUsername.js';

const Route = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Route.get('/all-users', async (req, res) => {
//     const [row, fields] = await pool.execute('Select * from users where email = 123');


//     console.log("row = ", row);
//     console.log("\nfields = ", fields);
// });

Route.post('/login', async (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;
    try {
        const [row] = await pool.execute('Select * from users where email = ?', [email]);
        if (row.length === 0) {
            return res.status(401).send({ message: "Incorrect email or password" });
        }
        if (!row[0].password && row[0].google_id) {
            return res.status(400).send({ message: "This account was registered with Google. Please sign in using Google." });
        }
        const passwordCheck = await checkPassword(password, row[0].password);
        if (passwordCheck === false) {
            return res.status(401).send({ message: "Incorrect email or password" });
        }
        // Here we are storing user information through token in cookies which we will further use for getting user information.
        const jwtToken = createTokenForUser(row[0]);
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,      // REQUIRED for cross-site cookies (requires HTTPS)
            sameSite: 'none',  // REQUIRED for cross-site cookies
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        return res.json(row);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }

})

Route.post('/signup', async (req, res) => {
    const { first_name, last_name, username, email, password } = req.body;
    console.log(req.body);
    try {
        const [emailExist] = await pool.execute('Select email from users where email = ?', [email]);
        if (emailExist.length > 0) {
            return res.status(409).send({ message: "Email already exists" });
        }
        const [usernameExist] = await pool.execute('Select username from users where username = ?', [username]);
        if (usernameExist.length > 0) {
            return res.status(409).send({ message: "Username already exists" });
        }
        const encryptedPassword = await encryptPassword(password);
        const [row] = await pool.execute('Insert into users(first_name, last_name, username, email, password) values(?, ?, ?, ?, ?)',
            [first_name, last_name, username, email, encryptedPassword]);

        return res.send({ status: "success", message: "User successfully Created" });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }

})

Route.post('/google-auth', async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).send({ message: "Credential token is required" });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).send({ message: "Invalid Google token" });
        }

        const { sub: google_id, email, given_name, family_name, name } = payload;
        const first_name = given_name || name || 'User';
        const last_name = family_name || '';

        // 1. Check if user exists with google_id
        let [existingUsers] = await pool.execute('SELECT * FROM users WHERE google_id = ?', [google_id]);
        let user;

        if (existingUsers.length > 0) {
            user = existingUsers[0];
        } else {
            // 2. Check if user exists with email (account linking)
            const [emailUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
            if (emailUsers.length > 0) {
                await pool.execute('UPDATE users SET google_id = ? WHERE id = ?', [google_id, emailUsers[0].id]);
                const [updatedUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [emailUsers[0].id]);
                user = updatedUser[0];
            } else {
                // 3. Create new user with generated unique username
                const uniqueUsername = await generateUniqueUsername(email);
                const [insertResult] = await pool.execute(
                    'INSERT INTO users (first_name, last_name, username, email, google_id) VALUES (?, ?, ?, ?, ?)',
                    [first_name, last_name, uniqueUsername, email, google_id]
                );
                const [newUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [insertResult.insertId]);
                user = newUser[0];
            }
        }

        const jwtToken = createTokenForUser(user);
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,      // REQUIRED for cross-site cookies (requires HTTPS)
            sameSite: 'none',  // REQUIRED for cross-site cookies
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.json([user]);
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Google authentication failed" });
    }
})

Route.get('/getUser', async (req, res) => {
    const token = req.cookies['token'];
    if (!token) {
        return res.status(401).send({ message: "You are not authorized" });
    }
    try {
        const userData = verifyTokenForUser(token);
        return res.send(userData);
    }
    catch (error) {
        console.log(error);
        return res.status(401).send({ message: "You are not authorized" });
    }
})

Route.post('/logout', async (req, res) => {
    res.clearCookie('token');
    res.send({ message: "success" })
})

// Store or update current user's ECDH public key in MySQL
Route.post('/public-key', async (req, res) => {
    const token = req.cookies['token'];
    if (!token) {
        return res.status(401).send({ message: "You are not authorized" });
    }
    try {
        const userData = verifyTokenForUser(token);
        const { publicKey } = req.body;
        if (!publicKey) {
            return res.status(400).send({ message: "Public key is required" });
        }

        const keyStr = typeof publicKey === 'string' ? publicKey : JSON.stringify(publicKey);
        await pool.execute('UPDATE users SET public_key = ? WHERE id = ?', [keyStr, userData.id]);

        return res.json({ success: true, message: "Public key updated" });
    } catch (error) {
        console.error('Error saving public key:', error);
        return res.status(500).send({ message: "Failed to save public key" });
    }
});

// Fetch a user's ECDH public key by userId
Route.get('/public-key', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).send({ message: "userId query parameter is required" });
    }
    try {
        const [rows] = await pool.execute('SELECT id, username, public_key FROM users WHERE id = ?', [userId]);
        if (!rows || rows.length === 0 || !rows[0].public_key) {
            return res.status(404).send({ message: "Public key not found for user" });
        }
        return res.json({ success: true, public_key: rows[0].public_key });
    } catch (error) {
        console.error('Error fetching public key:', error);
        return res.status(500).send({ message: "Failed to fetch public key" });
    }
});

// Fetch all public keys for other members in a group
Route.get('/group-public-keys', async (req, res) => {
    const token = req.cookies['token'];
    if (!token) {
        return res.status(401).send({ message: "You are not authorized" });
    }
    const { group_id } = req.query;
    if (!group_id) {
        return res.status(400).send({ message: "group_id query parameter is required" });
    }

    try {
        const userData = verifyTokenForUser(token);
        const [rows] = await pool.execute(
            'SELECT u.id, u.username, u.public_key FROM users u JOIN user_group_members ugm ON u.id = ugm.user_id WHERE ugm.group_id = ? AND u.id != ?',
            [group_id, userData.id]
        );

        const keysMap = {};
        for (const row of rows) {
            if (row.public_key) {
                try {
                    keysMap[row.id] = JSON.parse(row.public_key);
                } catch {
                    keysMap[row.id] = row.public_key;
                }
            }
        }

        return res.json({ success: true, keys: keysMap });
    } catch (error) {
        console.error('Error fetching group public keys:', error);
        return res.status(500).send({ message: "Failed to fetch group public keys" });
    }
});

export default Route;