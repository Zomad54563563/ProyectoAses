const sqlite3 = require('sqlite3').verbose();
const db = require('../db/index');

class User {
    constructor(id, username, email) {
        this.id = id;
        this.username = username;
        this.email = email;
    }

    static create(username, email) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO users (username, email) VALUES (?, ?)';
            db.run(sql, [username, email], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(new User(this.lastID, username, email));
                }
            });
        });
    }

    static findById(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE id = ?';
            db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? new User(row.id, row.username, row.email) : null);
                }
            });
        });
    }

    static findAll() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users';
            db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => new User(row.id, row.username, row.email)));
                }
            });
        });
    }
}

module.exports = User;