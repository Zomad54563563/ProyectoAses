const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Use the same database file location as server.js (inside src)
const dbPath = path.join(__dirname, "database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error BD:", err);
  else console.log("📌 Base de datos conectada:", dbPath);
});

module.exports = db;
