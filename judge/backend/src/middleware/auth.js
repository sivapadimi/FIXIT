const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated.'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      logger.error(`JWT verification failed: ${jwtError.message}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized.`
      });
    }
    next();
  };
};

// Check if user can access the resource
const canAccess = (resourceOwnerField = 'user') => {
  return (req, res, next) => {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Users can only access their own resources
    const resourceOwnerId = req.params.id || req.body[resourceOwnerField];
    
    if (req.user._id.toString() !== resourceOwnerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Check if event is running (for submissions)
const isEventRunning = async (req, res, next) => {
  try {
    const Event = require('../models/Event');
    const event = await Event.findOne({ status: 'running', isActive: true });

    if (!event) {
      return res.status(403).json({
        success: false,
        message: 'No active event running.'
      });
    }

    req.event = event;
    next();
  } catch (error) {
    logger.error(`Event check error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error checking event status.'
    });
  }
};

// Rate limiting for submissions
const submissionRateLimit = async (req, res, next) => {
  try {
    const Submission = require('../models/Submission');
    const user = req.user;
    const problemId = req.body.problem || req.params.problemId;

    // Count submissions in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentSubmissions = await Submission.countDocuments({
      user: user._id,
      submittedAt: { $gte: oneMinuteAgo }
    });

    // Allow max 5 submissions per minute
    if (recentSubmissions >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many submissions. Please wait before submitting again.'
      });
    }

    // Check max submissions per problem
    const totalSubmissions = await Submission.countDocuments({
      user: user._id,
      problem: problemId
    });

    const Event = require('../models/Event');
    const event = await Event.findOne({ status: 'running', isActive: true });
    
    if (event && totalSubmissions >= event.settings.maxSubmissionsPerProblem) {
      return res.status(429).json({
        success: false,
        message: `Maximum submissions (${event.settings.maxSubmissionsPerProblem}) reached for this problem.`
      });
    }

    next();
  } catch (error) {
    logger.error(`Submission rate limit error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error checking submission limits.'
    });
  }
};

module.exports = {
  protect,
  authorize,
  canAccess,
  isEventRunning,
  submissionRateLimit
};
