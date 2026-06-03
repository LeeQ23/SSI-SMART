console.log("Starting server.js...");
const express = require('express');
const http = require('http');
const cors = require('cors');
const config = require('./config');
const socketManager = require('./socketManager');
const settingsManager = require('./settingsManager');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketManager.init(server);

app.use(cors());
app.use(express.json());

// Load dynamic settings from database on startup
settingsManager.loadSettings();

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
