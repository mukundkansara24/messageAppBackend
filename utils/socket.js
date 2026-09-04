import { Server } from 'socket.io';
import 'dotenv/config';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';


const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let io;

async function initializeSocket(server) {

    const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ["http://localhost:5173", "http://localhost:3000"];


    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {

        console.log('New User connected', socket.id);

        socket.on('disconnect', () => {
            console.log('A user disconnected', socket.id);
        });

        socket.on('join room', (room) => {
            socket.join(String(room));
        });
    });

    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();

    try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log("Redis adapter connected");
    }
    catch (error) {
        console.error("Redis connection failed, running in single-server mode. Retrying automatically...", error);
    }
}

function getIO() {
    if (!io) {
        throw new Error('SocketIO is not initialized');
    }
    else {
        return io;
    }
}

export { initializeSocket, getIO };