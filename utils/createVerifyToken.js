import jwt from 'jsonwebtoken';
import 'dotenv/config'

const secret = process.env.JWT_SECRET_KEY;

function createTokenForUser(user) {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
    };
    const token = jwt.sign(payload, secret);
    return token;
}

function verifyTokenForUser(token) {
    const payload = jwt.verify(token, secret);
    return payload;
}

export { createTokenForUser, verifyTokenForUser };