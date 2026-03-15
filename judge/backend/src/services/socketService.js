const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(io) {
    this.io = io;

    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (token) => {
        try {
          const jwt = require('jsonwebtoken');
          const User = require('../models/User');
          
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id);
          
          if (user) {
            socket.userId = user._id.toString();
            socket.userRole = user.role;
            this.connectedUsers.set(socket.userId, socket.id);
            
            socket.emit('authenticated', {
              success: true,
              user: {
                id: user._id,
                username: user.username,
                role: user.role
              }
            });
            
            logger.info(`User authenticated: ${user.username} (${socket.id})`);
          } else {
            socket.emit('authentication_error', { message: 'Invalid user' });
          }
        } catch (error) {
          logger.error(`Socket authentication error: ${error.message}`);
          socket.emit('authentication_error', { message: 'Authentication failed' });
        }
      });

      // Handle leaderboard subscription
      socket.on('subscribe_leaderboard', () => {
        socket.join('leaderboard');
        logger.info(`User ${socket.id} subscribed to leaderboard`);
      });

      // Handle leaderboard unsubscription
      socket.on('unsubscribe_leaderboard', () => {
        socket.leave('leaderboard');
        logger.info(`User ${socket.id} unsubscribed from leaderboard`);
      });

      // Handle problem subscription
      socket.on('subscribe_problem', (problemId) => {
        socket.join(`problem_${problemId}`);
        logger.info(`User ${socket.id} subscribed to problem ${problemId}`);
      });

      // Handle problem unsubscription
      socket.on('unsubscribe_problem', (problemId) => {
        socket.leave(`problem_${problemId}`);
        logger.info(`User ${socket.id} unsubscribed from problem ${problemId}`);
      });

      // Handle event subscription
      socket.on('subscribe_event', () => {
        socket.join('event');
        logger.info(`User ${socket.id} subscribed to event updates`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
        logger.info(`User disconnected: ${socket.id}`);
      });
    });
  }

  // Emit submission update to specific user
  emitSubmissionUpdate(submission) {
    if (this.io) {
      // Send to the submission owner
      this.io.to(submission.user.toString()).emit('submission_update', {
        submissionId: submission._id,
        status: submission.status,
        score: submission.score,
        isCorrect: submission.isCorrect,
        executionTime: submission.executionTime,
        testCases: submission.testCases.map(tc => ({
          testCaseId: tc.testCaseId,
          status: tc.status,
          isHidden: tc.isHidden
        }))
      });

      // Send to problem subscribers (for admins)
      this.io.to(`problem_${submission.problem}`).emit('problem_submission', {
        problemId: submission.problem,
        submissionId: submission._id,
        userId: submission.user,
        status: submission.status,
        language: submission.language
      });
    }
  }

  // Emit leaderboard update
  emitLeaderboardUpdate(leaderboard) {
    if (this.io) {
      this.io.to('leaderboard').emit('leaderboard_update', leaderboard);
    }
  }

  // Emit event update
  emitEventUpdate(event) {
    if (this.io) {
      this.io.to('event').emit('event_update', {
        id: event._id,
        status: event.status,
        currentLevel: event.currentLevel,
        timeRemaining: event.timeRemaining,
        progress: event.progress
      });
    }
  }

  // Emit new problem notification
  emitNewProblem(problem) {
    if (this.io) {
      this.io.emit('new_problem', {
        id: problem._id,
        title: problem.title,
        difficulty: problem.difficulty,
        level: problem.level,
        category: problem.category
      });
    }
  }

  // Emit notification to specific user
  emitNotification(userId, notification) {
    if (this.io) {
      const socketId = this.connectedUsers.get(userId.toString());
      if (socketId) {
        this.io.to(socketId).emit('notification', notification);
      }
    }
  }

  // Emit notification to all users
  emitBroadcastNotification(notification) {
    if (this.io) {
      this.io.emit('broadcast_notification', notification);
    }
  }

  // Emit global notification (alias for broadcast)
  emitGlobalNotification(notification) {
    if (this.io) {
      this.io.emit('global_notification', notification);
      logger.info(`Global notification sent: ${notification.title}`);
    }
  }

  // Emit notification to admins only
  emitAdminNotification(notification) {
    if (this.io) {
      // Get all connected admin users
      const adminSockets = [];
      this.connectedUsers.forEach((socketId, userId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && socket.userRole === 'admin') {
          adminSockets.push(socketId);
        }
      });

      adminSockets.forEach(socketId => {
        this.io.to(socketId).emit('admin_notification', notification);
      });
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected admins count
  getConnectedAdminsCount() {
    let count = 0;
    this.connectedUsers.forEach((socketId, userId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.userRole === 'admin') {
        count++;
      }
    });
    return count;
  }
}

// Create singleton instance
const socketService = new SocketService();

// Initialize function for app.js
const socketHandler = (io) => {
  socketService.initialize(io);
  return socketService;
};

module.exports = socketService;
module.exports.socketHandler = socketHandler;
