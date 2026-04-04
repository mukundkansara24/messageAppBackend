import { Router } from 'express';
import connection from '../mysql_connect.js';

const route = Router();

route.get('/listGroup', async (req, res) => {
    const userData = req.user;
    try {
        const [row] = await connection.execute('SELECT g.id, g.name FROM user_group g JOIN user_group_members ugm ON g.id = ugm.group_id WHERE ugm.user_id = ?;', [userData.id]);
        res.send(row);
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: "Something went wrong" });
    }
})

route.post('/addPrivateGroup', async (req, res) => {
    const userData = req.user;
    const data = req.body;

    try {
        const [groupExisted] = await connection.execute('SELECT ugm.group_id FROM user_group_members ugm JOIN user_group g ON g.id = ugm.group_id WHERE ugm.user_id IN(?, ?) AND g.type = ? GROUP BY ugm.group_id HAVING COUNT(DISTINCT ugm.user_id) = 2;', [userData.id, data.id, 'private']);

        if (groupExisted.length > 0) {
            return res.send(groupExisted);
        }
        const [newGroup] = await connection.execute('Insert into user_group values();');
        // console.log(newGroup);
        const rowId = newGroup.insertId;
        const [userAdd1] = await connection.execute('Insert into user_group_members(user_id, group_id) values(?, ?);', [userData.id, rowId]);
        const [userAdd2] = await connection.execute('Insert into user_group_members(user_id, group_id) values(?, ?);', [data.id, rowId]);

        return res.send({ group_id: rowId });
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: "Something went wrong" });
    }
})

route.get('/findUsernameInPrivateGroup', async (req, res) => {
    const userData = req.user;
    const rowId = req.body.group_id;
    try {
        const [row] = await connection.execute('SELECT u.username FROM user_group_members ugm JOIN users u ON u.id = ugm.user_id WHERE ugm.group_id = ? AND ugm.user_id != ?;', [rowId, userData.id]);
        res.send(row);
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: "Something went wrong" });
    }
});

route.post('/sendMessage', async (req, res) => {
    const userData = req.user;
    const bodyData = req.body;
    try {
        
    }
    catch(error) {

    }
});

export default route;