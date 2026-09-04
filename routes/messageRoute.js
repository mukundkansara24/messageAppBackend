import { Router } from 'express';
import pool from '../mysql_connect.js';
import Message from '../models/message.js';
import { getIO } from '../utils/socket.js';

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

route.post('/sendMessage', async (req, res) => {
    const userData = req.user;
    const bodyData = req.body;
    try {
        // Check for idempotency via client_msg_id
        if (bodyData.client_msg_id) {
            const existingMessage = await Message.findOne({ client_msg_id: bodyData.client_msg_id });
            if (existingMessage) {
                return res.status(200).json({
                    success: true,
                    data: existingMessage
                });
            }
        }

        // Store Message in MONGODB
        const message = await Message.create({
            group_id: bodyData.group_id,
            sender_id: userData.id,
            sender_name: userData.username,
            message_text: bodyData.message_text,
            client_msg_id: bodyData.client_msg_id,
        });

        // update group time in MySQL
        await pool.execute('Update user_group set updatedAt = CURRENT_TIMESTAMP where id = ?', [bodyData.group_id]);

        const io = getIO();
        io.to(bodyData.group_id).emit('chat message', message);

        return res.status(201).json({
            success: true,
            data: message
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
});

route.get('/getMessage', async (req, res) => {
    const group_id = req.query.group_id;
    try {
        const message = await Message.find({ group_id });
        return res.send(message);
    }
    catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
})

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