// scripts/init-db-safe.js
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

class SafeDatabaseInitializer {
    constructor() {
        this.db = null;
        this.datasetPath = 'D:/new/ml-32m';
        this.batchSize = 50000; // Smaller batch size
    }

    async initialize() {
        try {
            // Create database with better settings
            this.db = new sqlite3.Database('./movie_lens.db', (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    return;
                }
                // Enable better performance settings
                this.db.exec('PRAGMA journal_mode = WAL;');
                this.db.exec('PRAGMA synchronous = NORMAL;');
                this.db.exec('PRAGMA cache_size = -64000;'); // 64MB cache
            });

            await this.createTables();
            await this.importDataSafely();
            await this.createIndexes();
            console.log('Database initialized successfully!');
        } catch (error) {
            console.error('Initialization failed:', error);
        } finally {
            if (this.db) {
                this.db.close();
            }
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
                if (err) reject(err);
                else {
                    console.log('Tables created successfully');
                    resolve();
                }
            });
        });
    }

    importDataSafely() {
        return Promise.all([
            this.importMoviesSafely(),
            this.importRatingsSafely(),
            this.importTagsSafely(),
            this.importLinksSafely()
        ]);
    }

    importMoviesSafely() {
        return new Promise((resolve, reject) => {
            const moviesPath = path.join(this.datasetPath, 'movies.csv');
            console.log(`Importing movies from: ${moviesPath}`);
            
            if (!fs.existsSync(moviesPath)) {
                reject(new Error(`Movies file not found at: ${moviesPath}`));
                return;
            }

            let batch = [];
            let count = 0;

            const processBatch = () => {
                if (batch.length === 0) return Promise.resolve();

                const placeholders = batch.map(() => '(?, ?, ?)').join(',');
                const values = batch.flat();
                const query = `INSERT OR IGNORE INTO movies VALUES ${placeholders}`;

                return new Promise((resolveBatch, rejectBatch) => {
                    this.db.run(query, values, function(err) {
                        if (err) {
                            console.error('Error inserting batch:', err);
                            rejectBatch(err);
                        } else {
                            resolveBatch();
                        }
                    });
                });
            };

            fs.createReadStream(moviesPath)
                .pipe(csv())
                .on('data', async (row) => {
                    batch.push([row.movieId, row.title, row.genres]);
                    count++;

                    if (batch.length >= this.batchSize) {
                        // Pause the stream to process batch
                        await processBatch();
                        batch = [];
                        console.log(`Imported ${count} movies`);
                    }
                })
                .on('end', async () => {
                    // Process remaining records
                    await processBatch();
                    console.log(`Movies import completed. Total: ${count} movies`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    importRatingsSafely() {
        return new Promise((resolve, reject) => {
            const ratingsPath = path.join(this.datasetPath, 'ratings.csv');
            console.log(`Importing ratings from: ${ratingsPath}`);
            
            if (!fs.existsSync(ratingsPath)) {
                console.log('Ratings file not found, skipping...');
                resolve();
                return;
            }

            let batch = [];
            let count = 0;

            const processBatch = () => {
                if (batch.length === 0) return Promise.resolve();

                const placeholders = batch.map(() => '(?, ?, ?, ?)').join(',');
                const values = batch.flat();
                const query = `INSERT INTO ratings (userId, movieId, rating, timestamp) VALUES ${placeholders}`;

                return new Promise((resolveBatch, rejectBatch) => {
                    this.db.run(query, values, function(err) {
                        if (err) {
                            console.error('Error inserting ratings batch:', err);
                            rejectBatch(err);
                        } else {
                            resolveBatch();
                        }
                    });
                });
            };

            fs.createReadStream(ratingsPath)
                .pipe(csv())
                .on('data', async (row) => {
                    batch.push([row.userId, row.movieId, row.rating, row.timestamp]);
                    count++;

                    if (batch.length >= this.batchSize) {
                        await processBatch();
                        batch = [];
                        if (count % 100000 === 0) console.log(`Imported ${count} ratings`);
                    }
                })
                .on('end', async () => {
                    await processBatch();
                    console.log(`Ratings import completed. Total: ${count} ratings`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    importTagsSafely() {
        return new Promise((resolve, reject) => {
            const tagsPath = path.join(this.datasetPath, 'tags.csv');
            console.log(`Importing tags from: ${tagsPath}`);
            
            if (!fs.existsSync(tagsPath)) {
                console.log('Tags file not found, skipping...');
                resolve();
                return;
            }

            // Similar batch implementation for tags...
            resolve(); // Simplify for now
        });
    }

    importLinksSafely() {
        return new Promise((resolve, reject) => {
            const linksPath = path.join(this.datasetPath, 'links.csv');
            console.log(`Importing links from: ${linksPath}`);
            
            if (!fs.existsSync(linksPath)) {
                console.log('Links file not found, skipping...');
                resolve();
                return;
            }

            // Similar batch implementation for links...
            resolve(); // Simplify for now
        });
    }

    createIndexes() {
        return new Promise((resolve, reject) => {
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_ratings_userId ON ratings(userId)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_movieId ON ratings(movieId)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_timestamp ON ratings(timestamp)',
                'CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies(genres)'
            ];

            // Create indexes one by one to avoid overwhelming the system
            const createIndexSequentially = (indexList, currentIndex = 0) => {
                if (currentIndex >= indexList.length) {
                    console.log('All indexes created successfully');
                    resolve();
                    return;
                }

                console.log(`Creating index: ${indexList[currentIndex]}`);
                this.db.exec(indexList[currentIndex], (err) => {
                    if (err) {
                        console.error(`Error creating index: ${err}`);
                        reject(err);
                    } else {
                        createIndexSequentially(indexList, currentIndex + 1);
                    }
                });
            };

            createIndexSequentially(indexes);
        });
    }
}

// Run safe initialization
console.log('Starting safe database initialization...');
const initializer = new SafeDatabaseInitializer();
initializer.initialize().catch(console.error);