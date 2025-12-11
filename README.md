# My Web SQLite App

This project is a web application that utilizes SQLite for database management. It is built using Node.js and Express, providing a simple interface for user-related operations.

## Project Structure

```
my-web-sqlite-app
├── src
│   ├── server.js            # Entry point of the application
│   ├── controllers          # Contains controllers for handling requests
│   │   └── index.js
│   ├── routes               # Defines application routes
│   │   └── index.js
│   ├── db                  # Database connection and migrations
│   │   ├── index.js
│   │   └── migrations
│   │       └── init.sql    # SQL commands for initial database schema
│   ├── models               # Data models for the application
│   │   └── user.js
│   └── public               # Static files for the web application
│       ├── index.html
│       ├── css
│       │   └── styles.css
│       └── js
│           └── main.js
├── package.json             # npm configuration file
├── .env                     # Environment variables
├── .gitignore               # Files to ignore by Git
└── README.md                # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd my-web-sqlite-app
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Set up the environment variables in the `.env` file.

## Usage

1. Run the application:
   ```
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000` to access the application.

## Database

The application uses SQLite for data storage. The initial database schema can be found in `src/db/migrations/init.sql`. Make sure to run the migration to set up the database before using the application.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.