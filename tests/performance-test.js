import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTimes = new Trend('response_times');
const requestsCounter = new Counter('total_requests');

export const options = {
    stages: [
     { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 200 },  // Ramp up to 200 users  
        { duration: '3m', target: 500 },  // Ramp up to 500 users (longer ramp)
        { duration: '3m', target: 750 },  // Extended duration for heavy load
        { duration: '3m', target: 1000},  // More time at peak
        { duration: '2m', target: 300},   // Gradual ramp down
        { duration: '1m', target: 0 }
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
        errors: ['rate<0.02'],             // Error rate < 2%
        http_reqs: ['count>1000'],         // Minimum 1000 requests
    },
};

const BASE_URL = 'http://localhost:3000/api';

export default function () {
    // Movies-only endpoints for testing
    const endpoints = [
        '/movies?page=1&limit=20'
    ];

    const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = `${BASE_URL}${randomEndpoint}`;

    const params = {
        tags: { name: randomEndpoint },
        timeout: '30s' // Increased timeout for larger queries
    };

    const res = http.get(url, params);
    
    requestsCounter.add(1);
    responseTimes.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 2s': (r) => r.timings.duration < 2000,
        'has data': (r) => {
            const data = r.json();
            return data.data !== undefined || data.movieId !== undefined || data.status === 'healthy';
        },
    });

    sleep(0.5); // Shorter sleep for more frequent requests
}