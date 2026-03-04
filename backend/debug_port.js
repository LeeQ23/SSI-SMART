const net = require('net');
const port = 5003;
const server = net.createServer();

server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is currently in use (Server is likely running).`);
    } else {
        console.log(`Port ${port} error: ${err.code}`);
    }
});

server.once('listening', () => {
    console.log(`Port ${port} was free. (Server was NOT running). I have claimed it temporarily.`);
    server.close();
});

server.listen(port);
