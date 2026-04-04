import { Router } from 'express';
import connection from '../mysql_connect.js';
import { checkPassword, encryptPassword } from '../utils/passwordEncryptDecrypt.js';
import { createTokenForUser } from '../utils/createVerifyToken.js';
const Route = Router();

Route.get('/all-users', async (req, res) => {
    const [row, fields] = await connection.execute('Select * from users where email = 123');


    console.log("row = ", row);
    console.log("\nfields = ", fields);
});

Route.post('/login', async (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;
    try {
        const [row, fields] = await connection.execute('Select * from users where email = ?', [email]);
        if (row.length === 0) {
            return res.status(401).send({ message: "Incorrect email or password" });
        }
        const passwordCheck = await checkPassword(password, row[0].password);
        if (passwordCheck === false) {
            return res.status(401).send({ message: "Incorrect email or password" });
        }
        const jwtToken = createTokenForUser(row[0]);
        res.cookie('token', jwtToken);
        return res.json(row);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }

})

Route.post('/signup', async (req, res) => {
    const { first_name, last_name, username, email, password } = req.body;
    try {
        const [emailExist] = await connection.execute('Select email from users where email = ?', [email]);
        if (emailExist.length > 0) {
            return res.status(409).send({ message: "Email already exists" });
        }
        const [usernameExist] = await connection.execute('Select username from users where username = ?', [username]);
        if (usernameExist.length > 0) {
            return res.status(409).send({ message: "Username already exists" });
        }
        const encryptedPassword = await encryptPassword(password);
        const [row] = await connection.execute('Insert into users(first_name, last_name, username, email, password) values(?, ?, ?, ?, ?)',
            [first_name, last_name, username, email, encryptedPassword]);

        return res.json(row);
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }

})

export default Route;