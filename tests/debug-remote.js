// tests/debug-remote.js
import http from 'k6/http';

export const options = {
    vus: 1,
    duration: '10s',
};

const BASE_URL = 'https://shantelle-unartistic-elias.ngrok-free.dev/api';

export default function () {
    const endpoints = [
        '/movies?page=1&limit=20',
        '/health',
        '/genres'
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = `${BASE_URL}${endpoint}`;

    console.log(`Testing: ${url}`);
    
    const res = http.get(url, { timeout: '30s' });
    
    console.log(`Response status: ${res.status}`);
    console.log(`Response error: ${res.error}`);
    console.log(`Response body length: ${res.body.length}`);
    console.log(`Response timings: ${JSON.stringify(res.timings)}`);
    console.log('---');
}