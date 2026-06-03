const fs = require('fs');
console.log("Hello from debug_syntax.js");
try {
    fs.writeFileSync('debug_minimal.log', 'Hello World\n');
} catch (e) { console.error(e); }
try {
    require('./server.js');
    fs.appendFileSync('debug_minimal.log', 'Server Required Sucesfully\n');
} catch (e) {
    fs.appendFileSync('debug_minimal.log', 'ERROR: ' + e.message + '\n' + e.stack);
}
setTimeout(() => { }, 5000);
