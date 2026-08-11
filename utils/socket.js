import { Server } from 'socket.io';
import 'dotenv/config';

let io;

function initializeSocket(server) {

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
            socket.join(room);
        })
    });
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