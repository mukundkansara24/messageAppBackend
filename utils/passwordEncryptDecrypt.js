import bcrypt from 'bcrypt';
const saltRounds = 10;

async function encryptPassword(password) {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}

async function checkPassword(password, hash) {
    const result = await bcrypt.compare(password, hash);
    return result;
}
export { encryptPassword, checkPassword };