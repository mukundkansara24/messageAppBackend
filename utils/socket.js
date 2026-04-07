import { Server } from 'socket.io';

let io;

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"]
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