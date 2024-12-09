import Database from 'better-sqlite3';

const db = new Database('profiles.db');

db.prepare(`
    CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_profile TEXT NOT NULL,
        improved_profile TEXT NOT NULL,
        improvement_rating INTEGER,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).run();

export default db;
