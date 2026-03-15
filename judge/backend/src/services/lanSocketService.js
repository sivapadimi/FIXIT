const logger = require('../utils/logger');

module.exports = (io) => {
  logger.info('LAN Socket.io service initialized');

  // Store connected clients
  const connectedClients = new Map();

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Handle client join
    socket.on('join', async (data) => {
      try {
        const { username, teamname, isAdmin } = data;
        
        // Store client info
        connectedClients.set(socket.id, {
          username,
          teamname,
          isAdmin,
          connectedAt: new Date()
        });

        // Join appropriate room
        if (isAdmin) {
          socket.join('admin');
        } else {
          socket.join(`team_${teamname}`);
        }

        // Add to connected teams in database
        if (socket.db) {
          await socket.db.run(`
            INSERT OR REPLACE INTO connected_teams (socket_id, team_name, username, connected_at, last_activity)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [socket.id, teamname, username]);
        }

        // Notify admin about new connection
        io.to('admin').emit('team-connected', {
          socketId: socket.id,
          username,
          teamname,
          connectedAt: new Date()
        });

        // Send updated connected teams list to admin
        if (socket.db) {
          const connectedTeams = await socket.db.all(`
            SELECT * FROM connected_teams 
            ORDER BY connected_at DESC
          `);
          io.to('admin').emit('connected-teams-updated', connectedTeams);
        }

      } catch (error) {
        logger.error(`Error handling join: ${error.message}`);
      }
    });

    // Handle submission
    socket.on('submission', (data) => {
      try {
        const { username, teamname, problemId, correct, score } = data;
        
        // Update leaderboard for all clients
        io.emit('leaderboard-updated', {
          username,
          teamname,
          problemId,
          correct,
          score,
          timestamp: new Date()
        });

        // Notify admin about submission
        io.to('admin').emit('new-submission', {
          username,
          teamname,
          problemId,
          correct,
          score,
          timestamp: new Date()
        });

      } catch (error) {
        logger.error(`Error handling submission: ${error.message}`);
      }
    });

    // Handle exam control (admin only)
    socket.on('exam-control', (data) => {
      try {
        const { action, problemId, resultsVisible } = data;
        
        // Broadcast exam status to all clients
        io.emit('exam-status-changed', {
          action,
          problemId,
          resultsVisible,
          timestamp: new Date()
        });

      } catch (error) {
        logger.error(`Error handling exam control: ${error.message}`);
      }
    });

    // Handle admin broadcast
    socket.on('admin-broadcast', (data) => {
      try {
        const { message, type } = data;
        
        // Broadcast to all clients
        io.emit('admin-message', {
          message,
          type,
          timestamp: new Date()
        });

      } catch (error) {
        logger.error(`Error handling admin broadcast: ${error.message}`);
      }
    });

    // Handle leaderboard reset (admin only)
    socket.on('reset-leaderboard', () => {
      try {
        // Notify all clients about leaderboard reset
        io.emit('leaderboard-reset', {
          timestamp: new Date()
        });

      } catch (error) {
        logger.error(`Error handling leaderboard reset: ${error.message}`);
      }
    });

    // Handle client activity update
    socket.on('activity', async (data) => {
      try {
        const { username, teamname } = data;
        
        // Update last activity in database
        if (socket.db) {
          await socket.db.run(`
            UPDATE connected_teams 
            SET last_activity = CURRENT_TIMESTAMP 
            WHERE socket_id = ?
          `, [socket.id]);
        }

      } catch (error) {
        logger.error(`Error updating activity: ${error.message}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        const client = connectedClients.get(socket.id);
        
        if (client) {
          logger.info(`Client disconnected: ${socket.id} (${client.username})`);

          // Remove from connected teams in database
          if (socket.db) {
            await socket.db.run('DELETE FROM connected_teams WHERE socket_id = ?', [socket.id]);
          }

          // Notify admin about disconnection
          io.to('admin').emit('team-disconnected', {
            socketId: socket.id,
            username: client.username,
            teamname: client.teamname,
            disconnectedAt: new Date()
          });

          // Send updated connected teams list to admin
          if (socket.db) {
            const connectedTeams = await socket.db.all(`
              SELECT * FROM connected_teams 
              ORDER BY connected_at DESC
            `);
            io.to('admin').emit('connected-teams-updated', connectedTeams);
          }

          // Remove from connected clients
          connectedClients.delete(socket.id);
        }

      } catch (error) {
        logger.error(`Error handling disconnect: ${error.message}`);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}: ${error.message}`);
    });
  });

  // Periodic cleanup of disconnected clients
  setInterval(async () => {
    try {
      // Remove inactive connections from database (older than 5 minutes)
      if (io.sockets.sockets && io.sockets.sockets.db) {
        await io.sockets.sockets.db.run(`
          DELETE FROM connected_teams 
          WHERE last_activity < datetime('now', '-5 minutes')
        `);
      }
    } catch (error) {
      logger.error(`Error during cleanup: ${error.message}`);
    }
  }, 60000); // Every minute

  return io;
};
