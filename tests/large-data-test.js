import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: 10,
    duration: '5m',
    thresholds: {
        http_req_duration: ['p(95)<5000'],
    },
};

const BASE_URL = 'http://localhost:3000/api';

export default function () {
    const largeQueries = [
        '/movies?limit=500',
        '/movies?genre=Drama&limit=300',
        '/movies/top/rated?limit=200',
    ];

    const query = largeQueries[Math.floor(Math.random() * largeQueries.length)];
    const res = http.get(`${BASE_URL}${query}`);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has substantial data': (r) => {
            const data = r.json();
            return data.data && data.data.length > 100;
        },
        'response under 5s': (r) => r.timings.duration < 5000,
    });
}