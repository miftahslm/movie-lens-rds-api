// scripts/check-total.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./movie_lens_minimal.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('Checking database totals...');
    
    // Check movies count
    db.get('SELECT COUNT(*) as total_movies FROM movies', (err, row) => {
        if (err) {
            console.error('Error:', err.message);
        } else {
            console.log(`🎬 Total Movies: ${row.total_movies.toLocaleString()}`);
        }
    });
    
    // Check other tables too
    db.get('SELECT COUNT(*) as total_ratings FROM ratings', (err, row) => {
        if (err) {
            console.log('Ratings table not available');
        } else {
            console.log(`⭐ Total Ratings: ${row.total_ratings.toLocaleString()}`);
        }
    });
    
    db.get('SELECT COUNT(*) as total_tags FROM tags', (err, row) => {
        if (err) {
            console.log('Tags table not available');
        } else {
            console.log(`🏷️ Total Tags: ${row.total_tags.toLocaleString()}`);
        }
        
        // Close database after all queries
        setTimeout(() => db.close(), 100);
    });
});