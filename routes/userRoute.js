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
export default Route;