import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_NAME || 'messageapp',
    port: Number(process.env.MYSQL_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});


// Immediately Invoked Function Expression (IIFE)
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL successfully connected');
        connection.release();
    } catch (error) {
        console.error('Error connecting to MySQL:', error.message);
    }
})();

export default pool;