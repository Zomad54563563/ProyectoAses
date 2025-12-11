class IndexController {
    constructor(db) {
        this.db = db;
    }

    async createUser(req, res) {
        const { name, email } = req.body;
        try {
            const result = await this.db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
            res.status(201).json({ id: result.lastID, name, email });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }

    async getUsers(req, res) {
        try {
            const users = await this.db.all('SELECT * FROM users');
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve users' });
        }
    }
}

export default IndexController;