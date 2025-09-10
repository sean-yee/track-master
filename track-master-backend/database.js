const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create or open the database
const dbPath = path.resolve(__dirname, "leaderboard.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Could not connect to database:", err.message);
    } else {
        console.log("✅ Connected to SQLite database");
    }
});

// Create leaderboard table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            album TEXT NOT NULL,
            player TEXT NOT NULL,
            time INTEGER NOT NULL
        )
    `);
});

module.exports = db;
