const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
require('dotenv').config();

const logger = require('./utils/logger');
const lanSocketHandler = require('./services/lanSocketService');
const lanDatabase = require('./services/lanDatabase');

// Import LAN routes
const authRoutes = require('./routes/lanAuth');
const problemRoutes = require('./routes/lanProblems');
const submissionRoutes = require('./routes/lanSubmissions');
const leaderboardRoutes = require('./routes/lanLeaderboard');
const adminRoutes = require('./routes/lanAdmin');

const app = express();
const server = http.createServer(app);

// Get local IP address
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('192.168.') || 
            net.address.startsWith('10.') || 
            net.address.startsWith('172.')) {
          return net.address;
        }
      }
    }
  }
  return 'localhost';
}

// Socket.IO setup for LAN
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize SQLite database
let db;
async function initializeDatabase() {
  try {
    db = await open({
      filename: './competition.db',
      driver: sqlite3.Database
    });
    
    await lanDatabase.createTables(db);
    await lanDatabase.seedDefaultData(db);
    
    logger.info('SQLite database initialized for LAN mode');
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
    process.exit(1);
  }
}

// Security middleware (relaxed for LAN)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: "*",
  credentials: true
}));

// Rate limiting (relaxed for LAN)
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for LAN
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make database available to routes and sockets
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Pass database to socket.io
io.use((socket, next) => {
  socket.db = db;
  next();
});

// Socket.IO handler
lanSocketHandler(io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

// Start server in LAN mode
async function startLANServer() {
  await initializeDatabase();
  
  const localIP = getLocalIP();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🌐 Server running in LAN mode');
    console.log('=====================================');
    console.log(`📡 Access from other laptops:`);
    console.log(`   http://${localIP}:${PORT}`);
    console.log(`🏠 Local access:`);
    console.log(`   http://localhost:${PORT}`);
    console.log('=====================================\n');
    logger.info(`LAN Server started on ${localIP}:${PORT}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (db) db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    if (db) db.close();
    process.exit(0);
  });
});

startLANServer().catch(console.error);

module.exports = { app, server, io };
