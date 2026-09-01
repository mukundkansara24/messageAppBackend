import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import userRoute from './routes/userRoute.js';
import messageRoute from './routes/messageRoute.js';
import checkForCookies from './middlewares/authentication.js';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocket } from './utils/socket.js';

const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:mongopassword@localhost:27017/';

// For connecting mongodb
mongoose.connect(MONGO_URI)
    .then((e) => {
        console.log("MONGODB connected");
    })


const app = express();
const httpServer = createServer(app);

await initializeSocket(httpServer);

const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json()); // For parsing JSON response
app.use(cookieParser()); // For parsing cookies

app.use('/api/user', userRoute);
app.use('/api', checkForCookies, messageRoute); // MessageRoute will only access if you are authenticated using cookie.


httpServer.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
})