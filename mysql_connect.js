import { connect } from 'mongoose';
import mysql from 'mysql2/promise';

// For connecting mysql
let connection = undefined;
try {
    connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'mukund',
        database: 'messageapp'
    });
}
catch (e) {
    console.log('Error in connecting mysql', e);
}

if (connection) {
    console.log('MySQL successfully Connected');
}

export default connection;