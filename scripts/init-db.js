// scripts/init-db.js
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

class DatabaseInitializer {
    constructor() {
        this.db = new sqlite3.Database('./movie_lens.db');
        // UPDATE THIS PATH TO YOUR ACTUAL MOVIELENS DATASET LOCATION
        this.datasetPath = 'D:/new/ml-32m'; // Your actual path
    }

    async initialize() {
        try {
            console.log('Starting database initialization...');
            await this.createTables();
            await this.importData();
            await this.createIndexes();
            console.log('Database initialized successfully!');
        } catch (error) {
            console.error('Initialization failed:', error);
        } finally {
            this.db.close();
        }
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const schema = `
                CREATE TABLE IF NOT EXISTS movies (
                    movieId INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    genres TEXT
                );

                CREATE TABLE IF NOT EXISTS ratings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    movieId INTEGER NOT NULL,
                    rating REAL NOT NULL,
                    timestamp INTEGER NOT NULL,
                    FOREIGN KEY (movieId) REFERENCES movies(movieId)
                );

                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    movieId INTEGER NOT NULL,
                    tag TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    FOREIGN KEY (movieId) REFERENCES movies(movieId)
                );

                CREATE TABLE IF NOT EXISTS links (
                    movieId INTEGER PRIMARY KEY,
                    imdbId TEXT,
                    tmdbId TEXT,
                    FOREIGN KEY (movieId) REFERENCES movies(movieId)
                );
            `;

            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    console.log('Tables created successfully');
                    resolve();
                }
            });
        });
    }

    importData() {
        return Promise.all([
            this.importMovies(),
            this.importRatings(),
            this.importTags(),
            this.importLinks()
        ]);
    }

    importMovies() {
        return new Promise((resolve, reject) => {
            const moviesPath = path.join(this.datasetPath, 'movies.csv');
            console.log(`Importing movies from: ${moviesPath}`);
            
            if (!fs.existsSync(moviesPath)) {
                reject(new Error(`Movies file not found at: ${moviesPath}`));
                return;
            }

            const stmt = this.db.prepare('INSERT OR IGNORE INTO movies VALUES (?, ?, ?)');
            let count = 0;
            
            fs.createReadStream(moviesPath)
                .pipe(csv())
                .on('data', (row) => {
                    stmt.run([row.movieId, row.title, row.genres]);
                    count++;
                    if (count % 10000 === 0) console.log(`Imported ${count} movies`);
                })
                .on('end', () => {
                    stmt.finalize();
                    console.log(`Movies import completed. Total: ${count} movies`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    importRatings() {
        return new Promise((resolve, reject) => {
            const ratingsPath = path.join(this.datasetPath, 'ratings.csv');
            console.log(`Importing ratings from: ${ratingsPath}`);
            
            if (!fs.existsSync(ratingsPath)) {
                console.log('Ratings file not found, skipping...');
                resolve();
                return;
            }

            const stmt = this.db.prepare('INSERT INTO ratings (userId, movieId, rating, timestamp) VALUES (?, ?, ?, ?)');
            let count = 0;
            
            fs.createReadStream(ratingsPath)
                .pipe(csv())
                .on('data', (row) => {
                    stmt.run([row.userId, row.movieId, row.rating, row.timestamp]);
                    count++;
                    if (count % 100000 === 0) console.log(`Imported ${count} ratings`);
                })
                .on('end', () => {
                    stmt.finalize();
                    console.log(`Ratings import completed. Total: ${count} ratings`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    importTags() {
        return new Promise((resolve, reject) => {
            const tagsPath = path.join(this.datasetPath, 'tags.csv');
            console.log(`Importing tags from: ${tagsPath}`);
            
            if (!fs.existsSync(tagsPath)) {
                console.log('Tags file not found, skipping...');
                resolve();
                return;
            }

            const stmt = this.db.prepare('INSERT INTO tags (userId, movieId, tag, timestamp) VALUES (?, ?, ?, ?)');
            let count = 0;
            
            fs.createReadStream(tagsPath)
                .pipe(csv())
                .on('data', (row) => {
                    stmt.run([row.userId, row.movieId, row.tag, row.timestamp]);
                    count++;
                    if (count % 10000 === 0) console.log(`Imported ${count} tags`);
                })
                .on('end', () => {
                    stmt.finalize();
                    console.log(`Tags import completed. Total: ${count} tags`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    importLinks() {
        return new Promise((resolve, reject) => {
            const linksPath = path.join(this.datasetPath, 'links.csv');
            console.log(`Importing links from: ${linksPath}`);
            
            if (!fs.existsSync(linksPath)) {
                console.log('Links file not found, skipping...');
                resolve();
                return;
            }

            const stmt = this.db.prepare('INSERT OR IGNORE INTO links VALUES (?, ?, ?)');
            let count = 0;
            
            fs.createReadStream(linksPath)
                .pipe(csv())
                .on('data', (row) => {
                    stmt.run([row.movieId, row.imdbId, row.tmdbId]);
                    count++;
                    if (count % 10000 === 0) console.log(`Imported ${count} links`);
                })
                .on('end', () => {
                    stmt.finalize();
                    console.log(`Links import completed. Total: ${count} links`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    createIndexes() {
        return new Promise((resolve, reject) => {
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_ratings_userId ON ratings(userId)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_movieId ON ratings(movieId)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_timestamp ON ratings(timestamp)',
                'CREATE INDEX IF NOT EXISTS idx_tags_movieId ON tags(movieId)',
                'CREATE INDEX IF NOT EXISTS idx_tags_userId ON tags(userId)',
                'CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies(genres)',
                'CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title)'
            ];

            this.db.exec(indexes.join(';'), (err) => {
                if (err) {
                    console.error('Error creating indexes:', err);
                    reject(err);
                } else {
                    console.log('All indexes created successfully');
                    resolve();
                }
            });
        });
    }
}

// Run initialization
console.log('MovieLens Database Initialization Started...');
const initializer = new DatabaseInitializer();
initializer.initialize().catch(console.error);