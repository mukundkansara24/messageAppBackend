import bcrypt from 'bcrypt';
import 'dotenv/config';

const saltRounds = Number(process.env.SALT_ROUND) || 10;

async function encryptPassword(password) {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}

async function checkPassword(password, hash) {
    const result = await bcrypt.compare(password, hash);
    return result;
}
export { encryptPassword, checkPassword };