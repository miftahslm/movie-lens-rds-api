// tests/single-user-stability.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,           // Just 1 user to avoid ngrok limits
    duration: '10m',  // 10 minutes to test stability
};

const BASE_URL = 'https://shantelle-unartistic-elias.ngrok-free.dev/api';

export default function () {
    const endpoints = [
        '/health',
        '/movies?page=1&limit=5',
        '/genres'
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = `${BASE_URL}${endpoint}`;

    console.log(`Request: ${url}`);
    
    const res = http.get(url, { timeout: '30s' });
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response received': (r) => r.body && r.body.length > 0,
    });

    // Longer delay to avoid rate limiting
    sleep(10); // 10 seconds between requests
}