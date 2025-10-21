// scripts/init-db-minimal.js
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

class MinimalDatabaseInitializer {
    constructor() {
        this.datasetPath = 'D:/new/ml-32m';
    }

    async initialize() {
        try {
            // Just create movies table first (smallest dataset)
            await this.createMoviesOnly();
            console.log('Minimal database created with movies only');
        } catch (error) {
            console.error('Minimal initialization failed:', error);
        }
    }

    async createMoviesOnly() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database('./movie_lens_minimal.db');
            
            db.serialize(() => {
                // Create only movies table
                db.run(`CREATE TABLE IF NOT EXISTS movies (
                    movieId INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    genres TEXT
                )`);
                
                const moviesPath = path.join(this.datasetPath, 'movies.csv');
                const stmt = db.prepare('INSERT OR IGNORE INTO movies VALUES (?, ?, ?)');
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
                        db.close();
                        resolve();
                    })
                    .on('error', (err) => {
                        db.close();
                        reject(err);
                    });
            });
        });
    }
}

new MinimalDatabaseInitializer().initialize();