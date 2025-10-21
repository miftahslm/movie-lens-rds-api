// scripts/add-optimization-indexes.js
const sqlite3 = require('sqlite3').verbose();

class IndexOptimizer {
    constructor() {
        this.db = new sqlite3.Database('./movie_lens_minimal.db');
    }

    async addPerformanceIndexes() {
        try {
            console.log('Adding performance optimization indexes...');
            
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_movies_title_search ON movies(title)',
                'CREATE INDEX IF NOT EXISTS idx_movies_genres_search ON movies(genres)',
                'CREATE INDEX IF NOT EXISTS idx_movies_composite ON movies(movieId, title)',
                'CREATE INDEX IF NOT EXISTS idx_movies_title_pattern ON movies(title)',
                'CREATE INDEX IF NOT EXISTS idx_movies_genres_pattern ON movies(genres)'
            ];

            for (const indexSql of indexes) {
                await this.createIndex(indexSql);
            }
            
            console.log('✅ All performance indexes added successfully!');
            
        } catch (error) {
            console.error('Index creation failed:', error);
        } finally {
            this.db.close();
        }
    }

    createIndex(indexSql) {
        return new Promise((resolve, reject) => {
            console.log(`Creating index: ${indexSql}`);
            this.db.run(indexSql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

new IndexOptimizer().addPerformanceIndexes();