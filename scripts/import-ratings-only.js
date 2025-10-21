// scripts/import-ratings-only.js
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

class RatingsImporter {
    constructor() {
        this.datasetPath = 'D:/new/ml-32m';
        this.batchSize = 50000;
        this.db = null;
    }

    async importRatings() {
        try {
            // Connect to your existing minimal database
            this.db = new sqlite3.Database('./movie_lens_minimal.db');
            
            console.log('Starting ratings import...');
            await this.importRatingsBatch();
            
            console.log('Creating indexes for ratings...');
            await this.createRatingsIndexes();
            
            console.log('Ratings import completed successfully!');
        } catch (error) {
            console.error('Ratings import failed:', error);
        } finally {
            if (this.db) this.db.close();
        }
    }

    importRatingsBatch() {
        return new Promise((resolve, reject) => {
            const ratingsPath = path.join(this.datasetPath, 'ratings.csv');
            console.log(`Importing ratings from: ${ratingsPath}`);
            
            if (!fs.existsSync(ratingsPath)) {
                reject(new Error(`Ratings file not found at: ${ratingsPath}`));
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

    createRatingsIndexes() {
        return new Promise((resolve, reject) => {
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_ratings_userId ON ratings(userId)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_movieId ON ratings(movieId)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating)',
                'CREATE INDEX IF NOT EXISTS idx_ratings_timestamp ON ratings(timestamp)'
            ];

            const createIndexSequentially = (indexList, currentIndex = 0) => {
                if (currentIndex >= indexList.length) {
                    console.log('All ratings indexes created successfully');
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

console.log('Starting ratings import...');
new RatingsImporter().importRatings().catch(console.error);