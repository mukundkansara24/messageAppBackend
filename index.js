import express from 'express';
import mongoose from 'mongoose';
import userRoute from './routes/userRoute.js';
import messageRoute from './routes/messageRoute.js';
import { checkForCookies } from './middlewares/authentication.js';
import cookieParser from 'cookie-parser';

const PORT = 8000;
// For connecting mongodb
mongoose.connect('mongodb://127.0.0.1:27017/messageApp')
    .then((e) => {
        console.log("MONGODB connected");
    })


const app = express();
app.use(express.json()); // For parsing JSON response
app.use(cookieParser()); // For parsing cookies

app.use('/api/user', userRoute);
app.use('/api', checkForCookies, messageRoute);


app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
})