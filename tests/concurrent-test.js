import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: 5,  // Fewer VUs for large data tests
    duration: '3m',
    thresholds: {
        http_req_duration: ['p(95)<3000'], // Longer threshold for large data
    },
};

const BASE_URL = 'http://localhost:3000/api';

export default function () {
    // Test endpoints that return larger datasets
    const largeQueries = [
        '/movies?limit=200',
        '/movies?limit=100&genre=Comedy',
        '/genres/Drama/movies?limit=150',
        '/movies/search?q=a&limit=100',
        '/statistics'
    ];

    const query = largeQueries[Math.floor(Math.random() * largeQueries.length)];
    const res = http.get(`${BASE_URL}${query}`, { timeout: '45s' });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has substantial data': (r) => {
            const data = r.json();
            return (data.data && data.data.length > 50) || data.total_movies !== undefined;
        },
        'response under 3s': (r) => r.timings.duration < 3000,
    });
}