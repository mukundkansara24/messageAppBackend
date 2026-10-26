import express from 'express';
import { Router } from 'express';
import pool from '../mysql_connect.js';
import Message from '../models/message.js';
import { getIO } from '../utils/socket.js';
import { decodeHeader, decodeChatMessagePayload, encodeAckPacket, encodeChatMessagePacket } from '../utils/binaryProtocol.js';

const route = Router();

// This is for listing all senders.
route.get('/listGroup', async (req, res) => {
    const userData = req.user;
    try {
        const [row] = await pool.execute('SELECT g.id, g.name, g.updatedAt FROM user_group g JOIN user_group_members ugm ON g.id = ugm.group_id WHERE ugm.user_id = ?;', [userData.id]);
        return res.send(row);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
})

route.post('/addPrivateGroup', async (req, res) => {
    const userData = req.user;
    const data = req.body;

    try {
        const [groupExisted] = await pool.execute('SELECT ugm.group_id FROM user_group_members ugm JOIN user_group g ON g.id = ugm.group_id WHERE ugm.user_id IN(?, ?) AND g.type = ? GROUP BY ugm.group_id HAVING COUNT(DISTINCT ugm.user_id) = 2;', [userData.id, data.id, 'private']);

        if (groupExisted.length > 0) {
            return res.send(groupExisted);
        }
        const [newGroup] = await pool.execute('Insert into user_group values();');
        // console.log(newGroup);
        const rowId = newGroup.insertId; // I will get primary id of row
        const [userAdd1] = await pool.execute('Insert into user_group_members(user_id, group_id) values(?, ?);', [userData.id, rowId]);
        const [userAdd2] = await pool.execute('Insert into user_group_members(user_id, group_id) values(?, ?);', [data.id, rowId]);

        return res.send([{ group_id: rowId }]);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
})

route.get('/findUsernameInPrivateGroup', async (req, res) => {
    const userData = req.user;
    const rowId = req.query.group_id;
    try {
        const [row] = await pool.execute('SELECT u.username FROM user_group_members ugm JOIN users u ON u.id = ugm.user_id WHERE ugm.group_id = ? AND ugm.user_id != ?;', [rowId, userData.id]);
        return res.send(row);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
});

route.post('/sendMessage', express.raw({ type: 'application/octet-stream', limit: '2mb' }), async (req, res) => {
    const userData = req.user;
    const buffer = req.body;

    if (!Buffer.isBuffer(buffer) || buffer.length < 10) {
        return res.status(400).send({ message: "Invalid binary message packet" });
    }

    try {
        const header = decodeHeader(buffer.subarray(0, 10));
        const payload = decodeChatMessagePayload(buffer.subarray(10));

        // Check for idempotency via client_msg_id
        if (payload.clientMsgId) {
            const existingMessage = await Message.findOne({ client_msg_id: payload.clientMsgId });
            if (existingMessage) {
                const io = getIO();
                io.to(String(header.groupId)).emit('chat message', buffer);
                const ackPacket = encodeAckPacket({
                    groupId: header.groupId,
                    clientMsgId: payload.clientMsgId,
                    status: 0,
                    serverMsgId: String(existingMessage._id),
                });
                res.setHeader('Content-Type', 'application/octet-stream');
                return res.status(200).send(ackPacket);
            }
        }

        // Store Message in MONGODB
        const message = await Message.create({
            group_id: String(header.groupId),
            sender_id: String(userData.id),
            sender_name: userData.username,
            ciphertext: payload.ciphertext.toString('base64'),
            iv: payload.iv.toString('base64'),
            is_encrypted: true,
            client_msg_id: payload.clientMsgId,
        });

        // update group time in MySQL
        await pool.execute('Update user_group set updatedAt = CURRENT_TIMESTAMP where id = ?', [header.groupId]);

        const io = getIO();
        io.to(String(header.groupId)).emit('chat message', buffer);

        const ackPacket = encodeAckPacket({
            groupId: header.groupId,
            clientMsgId: payload.clientMsgId,
            status: 0,
            serverMsgId: String(message._id),
        });
        res.setHeader('Content-Type', 'application/octet-stream');
        return res.status(201).send(ackPacket);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
});

route.get('/getMessage', async (req, res) => {
    const group_id = req.query.group_id;
    if (!group_id) {
        return res.status(400).send({ message: "group_id query parameter is required" });
    }

    try {
        const messages = await Message.find({ group_id }).sort({ createdAt: 1 });
        const packets = [];

        for (const m of messages) {
            if (m.ciphertext && m.iv) {
                const ivBuf = Buffer.from(m.iv, 'base64');
                const cipherBuf = Buffer.from(m.ciphertext, 'base64');
                const packet = encodeChatMessagePacket({
                    groupId: Number(m.group_id),
                    senderId: Number(m.sender_id),
                    iv: ivBuf,
                    clientMsgId: m.client_msg_id || String(m._id),
                    ciphertext: cipherBuf,
                });
                packets.push(packet);
            }
        }

        const fullBuffer = packets.length > 0 ? Buffer.concat(packets) : Buffer.alloc(0);
        res.setHeader('Content-Type', 'application/octet-stream');
        return res.send(fullBuffer);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
});

// This is use for searching username by giving input from search
route.get('/listUser', async (req, res) => {
    const nameEntered = req.query?.name;
    try {
        if(!nameEntered) {
            return res.status(400).send({message: "Please enter username"});
        }
        const [row] = await pool.execute("Select id, username from users where username LIKE CONCAT(?, '%')", [nameEntered]);
        return res.send(row);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
})

export default route;