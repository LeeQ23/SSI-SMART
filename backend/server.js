console.log("Starting server.js...");
const express = require('express');
const http = require('http');
const cors = require('cors');
const config = require('./config');
const socketManager = require('./socketManager');
const settingsManager = require('./settingsManager');
const rateLimit = require('express-rate-limit');
const { syncAllMachineStates } = require('./stateManager');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketManager.init(server);

// Let frontend run on 3000 or same origin
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://YOUR_SERVER_IP:3000'] }));
app.use(express.json());

// Load dynamic settings and state from database on startup
settingsManager.loadSettings();
syncAllMachineStates();

// Rate limiting for auth and hardware endpoints
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000 // Increased from 1000 to allow 500ms PZEM intervals
});
app.use('/api/login', limiter);
app.use('/api/signal', limiter);
app.use('/api/machine-status', limiter);

// Import Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const machineRoutes = require('./routes/machines');
const sessionRoutes = require('./routes/sessions');
const downtimeRoutes = require('./routes/downtimes');
const inspectionRoutes = require('./routes/inspections');
const shiftRoutes = require('./routes/shifts');
const settingsRoutes = require('./routes/settings');

// Use Routes
app.use('/api', authRoutes); // /api/login, /api/users, /api/seed
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
// Note: /api/history is grouped under analyticsRoutes in the new structure
app.use('/api/machines', machineRoutes); 
// Note: /api/signal and /api/machine-status were moved to /api (see below for legacy support)
app.use('/api/session', sessionRoutes);
app.use('/api/downtime', downtimeRoutes);
// downtimeRoutes also handles /api/downtimes via GET /
app.get('/api/downtimes', (req, res, next) => {
    // Redirect logic to /api/downtime
    req.url = '/';
    downtimeRoutes(req, res, next);
});
app.use('/api/inspections', inspectionRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/settings', settingsRoutes);

// --- Legacy Route Bindings (To prevent breaking firmware) ---
app.post('/api/signal', (req, res, next) => {
    req.url = '/signal';
    machineRoutes(req, res, next);
});
app.post('/api/machine-status', (req, res, next) => {
    req.url = '/machine-status';
    machineRoutes(req, res, next);
});
app.post('/api/current', (req, res, next) => {
    req.url = '/machine-status';
    machineRoutes(req, res, next);
});
app.post('/api/usr-gateway', (req, res, next) => {
    req.url = '/usr-gateway';
    machineRoutes(req, res, next);
});
app.get('/api/history', (req, res, next) => {
    req.url = '/history';
    analyticsRoutes(req, res, next);
});

// Initialize Background Jobs
const { initCronJobs } = require('./jobs/shiftHistoryJob');
const { initMachineWatcher } = require('./jobs/machineWatcherJob');

initCronJobs();
initMachineWatcher();

// Start Server
const PORT = config.PORT;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
