const http = require('http');
const fs = require('fs');

const start = '2026-01-01T00:00';
const end = '2026-02-02T23:59';
const url = `http://localhost:5003/api/analytics?start=${start}&end=${end}`;

let log = `Requesting: ${url}\n`;

http.get(url, (res) => {
    let data = '';
    log += `Status Code: ${res.statusCode}\n`;

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        log += 'Response Body:\n';
        log += data + '\n';
        fs.writeFileSync('api_test_results.log', log);
        process.exit(0);
    });

}).on('error', (err) => {
    log += `Error: ${err.message}\n`;
    fs.writeFileSync('api_test_results.log', log);
    process.exit(1);
});
