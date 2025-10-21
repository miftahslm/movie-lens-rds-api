// scripts/import-large-data.js
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class LargeDataImporter {
    constructor() {
        this.db = new sqlite3.Database('./movie_lens.db');
        this.datasetPath = 'D:/new/ml-32m'; // Your actual path
        this.batchSize = 100000; // Process ratings in batches of 100k
    }

    async importLargeRatings() {
        const ratingsPath = path.join(this.datasetPath, 'ratings.csv');
        
        if (!fs.existsSync(ratingsPath)) {
            console.log('Ratings file not found at:', ratingsPath);
            return;
        }

        console.log('Starting large ratings import... This may take several minutes.');
        
        const fileStream = fs.createReadStream(ratingsPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let batch = [];
        let lineCount = 0;
        let isHeader = true;

        for await (const line of rl) {
            if (isHeader) {
                isHeader = false;
                continue; // Skip header
            }

            const [userId, movieId, rating, timestamp] = line.split(',');
            batch.push([userId, movieId, rating, timestamp]);
            lineCount++;

            if (batch.length >= this.batchSize) {
                await this.insertBatch(batch, 'ratings');
                batch = [];
                console.log(`Processed ${lineCount} ratings...`);
            }
        }

        // Insert remaining records
        if (batch.length > 0) {
            await this.insertBatch(batch, 'ratings');
        }

        console.log(`Ratings import completed. Total: ${lineCount} records`);
    }

    insertBatch(batch, table) {
        return new Promise((resolve, reject) => {
            const placeholders = batch.map(() => '(?, ?, ?, ?)').join(',');
            const values = batch.flat();
            
            let query;
            if (table === 'ratings') {
                query = `INSERT INTO ratings (userId, movieId, rating, timestamp) VALUES ${placeholders}`;
            }

            this.db.run(query, values, function(err) {
                if (err) {
                    console.error('Error inserting batch:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

// Run the importer
console.log('Starting large data import...');
const importer = new LargeDataImporter();
importer.importLargeRatings().catch(console.error);