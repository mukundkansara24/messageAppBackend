import pool from '../mysql_connect.js';

/**
 * Generates a unique username based on a given base string (e.g. email or full name).
 * Checks MySQL database for availability and appends random digits if collisions occur.
 *
 * @param {string} baseString - Base name or email (e.g. 'john.doe@gmail.com')
 * @returns {Promise<string>} A unique username verified against the users table
 */
async function generateUniqueUsername(baseString) {
    if (!baseString) {
        baseString = 'user';
    }

    // If an email address is passed, extract the local part before '@'
    let base = baseString.includes('@') ? baseString.split('@')[0] : baseString;

    // Sanitize: convert to lowercase and keep only alphanumeric characters, underscores, and dots
    base = base.toLowerCase().replace(/[^a-z0-9_.]/g, '');

    // Fallback if sanitized string is empty
    if (!base) {
        base = 'user';
    }

    // Check if the clean base username is available
    let candidate = base;
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [candidate]);
    if (existing.length === 0) {
        return candidate;
    }

    // If already taken, loop and append 4-digit random numbers until an available one is found
    while (true) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        candidate = `${base}${randomSuffix}`;
        const [rows] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [candidate]);
        if (rows.length === 0) {
            return candidate;
        }
    }
}

export default generateUniqueUsername;
