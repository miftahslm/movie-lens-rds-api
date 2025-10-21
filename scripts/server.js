// // server.js
// const express = require('express');
// const sqlite3 = require('sqlite3').verbose();
// const cors = require('cors');
// const helmet = require('helmet');
// const compression = require('compression');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(helmet());
// app.use(compression());
// app.use(cors());
// app.use(express.json());

// // Database connection - read-only mode
// const db = new sqlite3.Database('./movie_lens.db', sqlite3.OPEN_READONLY, (err) => {
//     if (err) {
//         console.error('Error opening database:', err.message);
//     } else {
//         console.log('Connected to read-only SQLite database.');
//     }
// });

// // Query optimization helper
// const paginate = (page = 1, limit = 50) => {
//     const offset = (page - 1) * limit;
//     return { limit, offset };
// };

// // API Routes

// // 1. Get movies with pagination and filtering
// app.get('/api/movies', (req, res) => {
//     const { page = 1, limit = 50, genre, search } = req.query;
//     const { limit: queryLimit, offset } = paginate(parseInt(page), parseInt(limit));
    
//     let query = 'SELECT * FROM movies WHERE 1=1';
//     let params = [];

//     if (genre) {
//         query += ' AND genres LIKE ?';
//         params.push(`%${genre}%`);
//     }

//     if (search) {
//         query += ' AND title LIKE ?';
//         params.push(`%${search}%`);
//     }

//     query += ' LIMIT ? OFFSET ?';
//     params.push(queryLimit, offset);

//     db.all(query, params, (err, rows) => {
//         if (err) {
//             res.status(500).json({ error: err.message });
//             return;
//         }
//         res.json({
//             data: rows,
//             pagination: {
//                 page: parseInt(page),
//                 limit: queryLimit,
//                 total: rows.length
//             }
//         });
//     });
// });


// app.get('/api/movies/:id', (req, res) => {
//     const movieId = req.params.id;
    
//     // Simplified query without ratings join
//     const query = `
//         SELECT m.*, l.imdbId, l.tmdbId
//         FROM movies m
//         LEFT JOIN links l ON m.movieId = l.movieId
//         WHERE m.movieId = ?
//     `;

//     db.get(query, [movieId], (err, row) => {
//         if (err) {
//             res.status(500).json({ error: err.message });
//             return;
//         }
//         if (!row) {
//             res.status(404).json({ error: 'Movie not found' });
//             return;
//         }
//         res.json(row);
//     });
// });

// // 2. Get movie by ID
// // app.get('/api/movies/:id', (req, res) => {
// //     const movieId = req.params.id;
    
// //     const query = `
// //         SELECT m.*, l.imdbId, l.tmdbId,
// //                AVG(r.rating) as avg_rating,
// //                COUNT(r.rating) as rating_count
// //         FROM movies m
// //         LEFT JOIN links l ON m.movieId = l.movieId
// //         LEFT JOIN ratings r ON m.movieId = r.movieId
// //         WHERE m.movieId = ?
// //         GROUP BY m.movieId
// //     `;

// //     db.get(query, [movieId], (err, row) => {
// //         if (err) {
// //             res.status(500).json({ error: err.message });
// //             return;
// //         }
// //         if (!row) {
// //             res.status(404).json({ error: 'Movie not found' });
// //             return;
// //         }
// //         res.json(row);
// //     });
// // });

// // 3. Get ratings for a movie
// // app.get('/api/movies/:id/ratings', (req, res) => {
// //     const { page = 1, limit = 50 } = req.query;
// //     const { limit: queryLimit, offset } = paginate(parseInt(page), parseInt(limit));
    
// //     const query = `
// //         SELECT userId, rating, timestamp 
// //         FROM ratings 
// //         WHERE movieId = ? 
// //         ORDER BY timestamp DESC 
// //         LIMIT ? OFFSET ?
// //     `;

// //     db.all(query, [req.params.id, queryLimit, offset], (err, rows) => {
// //         if (err) {
// //             res.status(500).json({ error: err.message });
// //             return;
// //         }
// //         res.json({
// //             data: rows,
// //             pagination: {
// //                 page: parseInt(page),
// //                 limit: queryLimit,
// //                 total: rows.length
// //             }
// //         });
// //     });
// // });

// // 4. Get top rated movies
// // app.get('/api/movies/top/rated', (req, res) => {
// //     const { page = 1, limit = 50, min_ratings = 100 } = req.query;
// //     const { limit: queryLimit, offset } = paginate(parseInt(page), parseInt(limit));
    
// //     const query = `
// //         SELECT m.movieId, m.title, m.genres,
// //                AVG(r.rating) as avg_rating,
// //                COUNT(r.rating) as rating_count
// //         FROM movies m
// //         JOIN ratings r ON m.movieId = r.movieId
// //         GROUP BY m.movieId
// //         HAVING rating_count >= ?
// //         ORDER BY avg_rating DESC
// //         LIMIT ? OFFSET ?
// //     `;

// //     db.all(query, [min_ratings, queryLimit, offset], (err, rows) => {
// //         if (err) {
// //             res.status(500).json({ error: err.message });
// //             return;
// //         }
// //         res.json({
// //             data: rows,
// //             pagination: {
// //                 page: parseInt(page),
// //                 limit: queryLimit,
// //                 total: rows.length
// //             }
// //         });
// //     });
// // });

// // 5. Get movies by genre
// // app.get('/api/genres/:genre/movies', (req, res) => {
// //     const { page = 1, limit = 50 } = req.query;
// //     const { limit: queryLimit, offset } = paginate(parseInt(page), parseInt(limit));
    
// //     const query = `
// //         SELECT movieId, title, genres
// //         FROM movies
// //         WHERE genres LIKE ?
// //         LIMIT ? OFFSET ?
// //     `;

// //     db.all(query, [`%${req.params.genre}%`, queryLimit, offset], (err, rows) => {
// //         if (err) {
// //             res.status(500).json({ error: err.message });
// //             return;
// //         }
// //         res.json({
// //             data: rows,
// //             pagination: {
// //                 page: parseInt(page),
// //                 limit: queryLimit,
// //                 total: rows.length
// //             }
// //         });
// //     });
// // });

// // 6. Get user ratings
// // app.get('/api/users/:userId/ratings', (req, res) => {
// //     const { page = 1, limit = 50 } = req.query;
// //     const { limit: queryLimit, offset } = paginate(parseInt(page), parseInt(limit));
    
// //     const query = `
// //         SELECT r.rating, r.timestamp, m.title, m.genres
// //         FROM ratings r
// //         JOIN movies m ON r.movieId = m.movieId
// //         WHERE r.userId = ?
// //         ORDER BY r.timestamp DESC
// //         LIMIT ? OFFSET ?
// //     `;

// //     db.all(query, [req.params.userId, queryLimit, offset], (err, rows) => {
// //         if (err) {
// //             res.status(500).json({ error: err.message });
// //             return;
// //         }
// //         res.json({
// //             data: rows,
// //             pagination: {
// //                 page: parseInt(page),
// //                 limit: queryLimit,
// //                 total: rows.length
// //             }
// //         });
// //     });
// // });

// // Health check endpoint
// // app.get('/api/health', (req, res) => {
// //     db.get('SELECT COUNT(*) as count FROM movies', (err, row) => {
// //         if (err) {
// //             res.status(500).json({ status: 'error', error: err.message });
// //             return;
// //         }
// //         res.json({ 
// //             status: 'healthy', 
// //             total_movies: row.count,
// //             timestamp: new Date().toISOString()
// //         });
// //     });
// // });

// // Security: Explicitly block non-GET methods
// app.use('/api/', (req, res, next) => {
//     if (req.method !== 'GET') {
//         res.status(405).json({ error: 'Method not allowed. Read-only API' });
//         return;
//     }
//     next();
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ error: 'Something went wrong!' });
// });

// // 404 handler
// app.use((req, res) => {
//     res.status(404).json({ error: 'Endpoint not found' });
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// process.on('SIGINT', () => {
//     db.close((err) => {
//         if (err) {
//             console.error(err.message);
//         }
//         console.log('Database connection closed.');
//         process.exit(0);
//     });
// });