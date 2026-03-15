const express = require('express');
const User = require('../models/User');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');
const { validateEvent, validateMongoId, validatePagination } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require admin role
router.use(protect, authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      }
    ]);

    // Get problem statistics
    const problemStats = await Problem.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          byDifficulty: {
            $push: {
              difficulty: '$difficulty',
              count: 1
            }
          },
          byLevel: {
            $push: {
              level: '$level',
              count: 1
            }
          }
        }
      }
    ]);

    // Get submission statistics
    const submissionStats = await Submission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent submissions
    const recentSubmissions = await Submission.find()
      .populate('user', 'username teamName')
      .populate('problem', 'title')
      .sort({ submittedAt: -1 })
      .limit(10);

    // Get current event
    const currentEvent = await Event.findOne({ 
      status: { $in: ['running', 'upcoming'] },
      isActive: true 
    }).sort({ startTime: 1 });

    // Get leaderboard top 5
    const topUsers = await User.aggregate([
      {
        $match: {
          role: 'team',
          isActive: true,
          'statistics.totalSubmissions': { $gt: 0 }
        }
      },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$statistics.problemsSolved', 100] },
              { $multiply: ['$statistics.penaltyPoints', -10] }
            ]
          }
        }
      },
      {
        $sort: { score: -1, 'statistics.totalTime': 1 }
      },
      { $limit: 5 },
      {
        $project: {
          username: 1,
          teamName: 1,
          college: 1,
          'statistics.problemsSolved': 1,
          'statistics.totalSubmissions': 1,
          score: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        userStats: userStats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, active: stat.active };
          return acc;
        }, {}),
        problemStats: problemStats[0] || {
          total: 0,
          active: 0,
          byDifficulty: [],
          byLevel: []
        },
        submissionStats: submissionStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        recentSubmissions,
        currentEvent,
        topUsers
      }
    });

  } catch (error) {
    logger.error(`Admin dashboard error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { teamName: { $regex: req.query.search, $options: 'i' } },
        { college: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error(`Admin get users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/users/:id', validateMongoId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['isActive', 'role', 'teamName', 'college', 'profile'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    logger.info(`User updated by admin: ${updatedUser.username} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    logger.error(`Admin update user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// @route   GET /api/admin/users/:id/details
// @desc    Get detailed user information
// @access  Private (Admin only)
router.get('/users/:id/details', validateMongoId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('submissions', 'problem status score submittedAt')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's submissions with problem details
    const submissions = await Submission.find({ user: req.params.id })
      .populate('problem', 'title difficulty')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: {
        ...user,
        submissions
      }
    });
  } catch (error) {
    logger.error(`Admin get user details error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user details'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete/deactivate user
// @access  Private (Admin only)
router.delete('/users/:id', validateMongoId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete by deactivating
    user.isActive = false;
    await user.save();

    logger.info(`User deactivated by admin: ${user.username} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    logger.error(`Admin delete user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating user'
    });
  }
});

// @route   GET /api/admin/submissions
// @desc    Get all submissions
// @access  Private (Admin only)
router.get('/submissions', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.language) {
      filter.language = req.query.language;
    }
    
    if (req.query.user) {
      filter.user = req.query.user;
    }
    
    if (req.query.problem) {
      filter.problem = req.query.problem;
    }

    // Get submissions
    const submissions = await Submission.find(filter)
      .populate('user', 'username teamName')
      .populate('problem', 'title difficulty level')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Submission.countDocuments(filter);

    res.json({
      success: true,
      data: {
        submissions: submissions.map(sub => sub.getPublicResults()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error(`Admin get submissions error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching submissions'
    });
  }
});

// Event management routes
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { events }
    });

  } catch (error) {
    logger.error(`Admin get events error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching events'
    });
  }
});

router.post('/events', validateEvent, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id
    };

    const event = await Event.create(eventData);

    logger.info(`New event created: ${event.name} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event }
    });

  } catch (error) {
    logger.error(`Admin create event error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating event'
    });
  }
});

router.put('/events/:id/start', validateMongoId('id'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.startEvent();

    logger.info(`Event started: ${event.name} by ${req.user.username}`);

    // Emit event update
    const socketService = require('../services/socketService');
    socketService.emitEventUpdate(event);

    res.json({
      success: true,
      message: 'Event started successfully',
      data: { event }
    });

  } catch (error) {
    logger.error(`Admin start event error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error starting event'
    });
  }
});

router.put('/events/:id/pause', validateMongoId('id'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.pauseEvent();

    logger.info(`Event paused: ${event.name} by ${req.user.username}`);

    // Emit event update
    const socketService = require('../services/socketService');
    socketService.emitEventUpdate(event);

    res.json({
      success: true,
      message: 'Event paused successfully',
      data: { event }
    });

  } catch (error) {
    logger.error(`Admin pause event error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error pausing event'
    });
  }
});

router.put('/events/:id/complete', validateMongoId('id'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.completeEvent();

    logger.info(`Event completed: ${event.name} by ${req.user.username}`);

    // Emit event update
    const socketService = require('../services/socketService');
    socketService.emitEventUpdate(event);

    res.json({
      success: true,
      message: 'Event completed successfully',
      data: { event }
    });

  } catch (error) {
    logger.error(`Admin complete event error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error completing event'
    });
  }
});

// @route   GET /api/admin/settings
// @desc    Get admin settings
// @access  Private (Admin only)
router.get('/settings', async (req, res) => {
  try {
    // Return default settings (in production, these would be stored in database)
    const settings = {
      allowLateRegistration: false,
      showLeaderboard: true,
      maintenanceMode: false,
      enable2FA: false,
      sessionTimeout: 30,
      ipWhitelist: false,
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error(`Admin get settings error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching settings'
    });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update admin settings
// @access  Private (Admin only)
router.put('/settings', async (req, res) => {
  try {
    // In production, these would be stored in database
    logger.info(`Settings updated by admin: ${req.user.username}`, req.body);
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    logger.error(`Admin update settings error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating settings'
    });
  }
});

// @route   GET /api/admin/system-stats
// @desc    Get system statistics
// @access  Private (Admin only)
router.get('/system-stats', async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ 
      isActive: true,
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const stats = {
      activeUsers,
      systemLoad: Math.floor(Math.random() * 100), // Mock data
      uptime: '48h 32m', // Mock data
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Admin system stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching system stats'
    });
  }
});

// @route   GET /api/admin/notifications
// @desc    Get recent notifications
// @access  Private (Admin only)
router.get('/notifications', async (req, res) => {
  try {
    // Mock notifications data
    const notifications = [
      {
        _id: '1',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur at 2:00 AM',
        type: 'warning',
        createdAt: new Date()
      },
      {
        _id: '2',
        title: 'New Feature',
        message: 'Code execution sandbox has been updated',
        type: 'info',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    logger.error(`Admin notifications error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notifications'
    });
  }
});

// @route   POST /api/admin/notifications/global
// @desc    Send global notification
// @access  Private (Admin only)
router.post('/notifications/global', async (req, res) => {
  try {
    const { title, message, type } = req.body;
    
    // Emit notification via socket
    const socketService = require('../services/socketService');
    socketService.emitGlobalNotification({ title, message, type });

    logger.info(`Global notification sent by ${req.user.username}: ${title}`);

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    logger.error(`Admin send notification error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error sending notification'
    });
  }
});

// @route   POST /api/admin/system/:action
// @desc    Perform system actions
// @access  Private (Admin only)
router.post('/system/:action', async (req, res) => {
  try {
    const { action } = req.params;
    
    switch (action) {
      case 'clear-cache':
        // Clear cache logic here
        logger.info(`Cache cleared by admin: ${req.user.username}`);
        break;
      case 'reset-scores':
        // Reset scores logic here
        await User.updateMany({}, { 
          $set: { 
            'statistics.problemsSolved': 0,
            'statistics.totalSubmissions': 0,
            'statistics.correctSubmissions': 0,
            'statistics.totalTime': 0,
            'statistics.penaltyPoints': 0
          }
        });
        logger.info(`Scores reset by admin: ${req.user.username}`);
        break;
      case 'backup-database':
        // Backup logic here
        logger.info(`Database backup initiated by admin: ${req.user.username}`);
        break;
      case 'restart-services':
        // Restart services logic here
        logger.info(`Services restart initiated by admin: ${req.user.username}`);
        break;
      case 'lock-all-users':
        await User.updateMany({}, { $set: { isActive: false } });
        logger.info(`All users locked by admin: ${req.user.username}`);
        break;
      case 'unlock-all-users':
        await User.updateMany({}, { $set: { isActive: true } });
        logger.info(`All users unlocked by admin: ${req.user.username}`);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    res.json({
      success: true,
      message: `${action} completed successfully`
    });
  } catch (error) {
    logger.error(`Admin system action error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error performing system action'
    });
  }
});

// @route   GET /api/admin/export/:type
// @desc    Export data
// @access  Private (Admin only)
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let data;
    let filename;

    switch (type) {
      case 'users':
        data = await User.find().select('-password').lean();
        filename = 'users';
        break;
      case 'submissions':
        data = await Submission.find()
          .populate('user', 'username')
          .populate('problem', 'title')
          .lean();
        filename = 'submissions';
        break;
      case 'problems':
        data = await Problem.find().lean();
        filename = 'problems';
        break;
      case 'events':
        data = await Event.find().lean();
        filename = 'events';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    // Convert to CSV (simplified)
    const csv = convertToCSV(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error(`Admin export error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error exporting data'
    });
  }
});

// Helper function to convert JSON to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      // Handle nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return `"${value}"`;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

module.exports = router;
