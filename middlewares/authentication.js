import { verifyTokenForUser } from "../utils/createVerifyToken.js";

function checkForCookies(req, res, next) {
    const token = req.cookies['token'];
    if (!token) {
        return res.status(401).send({ message: "You are not authorized" });
    }
    try {
        const userData = verifyTokenForUser(token);
        req.user = userData;
    }
    catch (error) {
        console.log(error);
        return res.status(401).send({ message: "You are not authorized" });
    }
    return next();
}

export { checkForCookies };