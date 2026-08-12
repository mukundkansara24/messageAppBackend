import { Router } from 'express';
import pool from '../mysql_connect.js';
import { checkPassword, encryptPassword } from '../utils/passwordEncryptDecrypt.js';
import { createTokenForUser, verifyTokenForUser } from '../utils/createVerifyToken.js';
const Route = Router();

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