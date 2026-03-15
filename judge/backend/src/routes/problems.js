const express = require('express');
const Problem = require('../models/Problem');
const { protect, authorize, isEventRunning } = require('../middleware/auth');
const { validateProblem, validateMongoId, validatePagination } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/problems
// @desc    Get all problems (filtered by user role and event status)
// @access  Private
router.get('/', protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = { isActive: true };

    // If user is not admin, only show problems for current level
    if (req.user.role !== 'admin') {
      // Get current event level
      const Event = require('../models/Event');
      const event = await Event.findOne({ status: 'running', isActive: true });
      
      if (event) {
        filter.level = event.currentLevel;
      } else {
        // If no event is running, don't show any problems
        return res.json({
          success: true,
          data: {
            problems: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          }
        });
      }
    }

    // Additional filters
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tags };
    }

    // Search by title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    // Get problems
    const problems = await Problem.find(filter)
      .select('-testCases -languages.fixedCode -languages.buggyCode')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Problem.countDocuments(filter);

    res.json({
      success: true,
      data: {
        problems,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error(`Get problems error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching problems'
    });
  }
});

// @route   GET /api/problems/:id
// @desc    Get problem by ID
// @access  Private
router.get('/:id', protect, validateMongoId('id'), async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check if user has access to this problem
    if (req.user.role !== 'admin') {
      const Event = require('../models/Event');
      const event = await Event.findOne({ status: 'running', isActive: true });
      
      if (!event || problem.level !== event.currentLevel) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this problem'
        });
      }
    }

    // Prepare response based on user role
    let problemData = problem.toObject();
    
    if (req.user.role !== 'admin') {
      // Hide sensitive data for regular users
      problemData.testCases = problem.getSampleTestCases();
      problemData.languages = problem.languages.map(lang => ({
        language: lang.language,
        explanation: lang.explanation,
        errorType: lang.errorType,
        errorLocation: lang.errorLocation
      }));
    }

    res.json({
      success: true,
      data: { problem: problemData }
    });
  } catch (error) {
    logger.error(`Get problem error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching problem'
    });
  }
});

// @route   POST /api/problems
// @desc    Create a new problem
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), validateProblem, async (req, res) => {
  try {
    const problemData = {
      ...req.body,
      createdBy: req.user._id
    };

    const problem = await Problem.create(problemData);

    logger.info(`New problem created: ${problem.title} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Problem created successfully',
      data: { problem }
    });
  } catch (error) {
    logger.error(`Create problem error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating problem'
    });
  }
});

// @route   PUT /api/problems/:id
// @desc    Update a problem
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), validateMongoId('id'), async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    const updatedProblem = await Problem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    logger.info(`Problem updated: ${updatedProblem.title} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Problem updated successfully',
      data: { problem: updatedProblem }
    });
  } catch (error) {
    logger.error(`Update problem error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating problem'
    });
  }
});

// @route   DELETE /api/problems/:id
// @desc    Delete a problem
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), validateMongoId('id'), async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Soft delete by setting isActive to false
    problem.isActive = false;
    await problem.save();

    logger.info(`Problem deleted: ${problem.title} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Problem deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete problem error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deleting problem'
    });
  }
});

// @route   GET /api/problems/:id/template/:language
// @desc    Get language template for a problem
// @access  Private
router.get('/:id/template/:language', protect, validateMongoId('id'), async (req, res) => {
  try {
    const { language } = req.params;

    if (!['python', 'java', 'cpp'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language'
      });
    }

    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check access
    if (req.user.role !== 'admin') {
      const Event = require('../models/Event');
      const event = await Event.findOne({ status: 'running', isActive: true });
      
      if (!event || problem.level !== event.currentLevel) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this problem'
        });
      }
    }

    const template = problem.getLanguageTemplate(language);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found for this language'
      });
    }

    // Return buggy code for users to fix
    res.json({
      success: true,
      data: {
        template: {
          language: template.language,
          buggyCode: template.buggyCode,
          explanation: template.explanation,
          errorType: template.errorType,
          errorLocation: template.errorLocation
        }
      }
    });
  } catch (error) {
    logger.error(`Get template error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching template'
    });
  }
});

// @route   GET /api/problems/status
// @desc    Get global problem status for current event
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    // Get current event
    const Event = require('../models/Event');
    const event = await Event.findOne({ status: 'running', isActive: true });
    
    if (!event) {
      return res.json({
        success: true,
        data: {
          eventActive: false,
          problems: []
        }
      });
    }

    // Get all problems for current level
    const problems = await Problem.find({ 
      level: event.currentLevel,
      isActive: true 
    }).select('_id title difficulty level points');

    // For each problem, check if it has been started/completed globally
    const Submission = require('../models/Submission');
    const problemsWithStatus = await Promise.all(
      problems.map(async (problem) => {
        const submissions = await Submission.find({ 
          problem: problem._id,
          status: { $in: ['accepted', 'wrong_answer', 'compilation_error', 'runtime_error', 'time_limit_exceeded', 'memory_limit_exceeded'] }
        });

        const hasAcceptedSubmission = submissions.some(sub => sub.status === 'accepted');
        const hasAnySubmission = submissions.length > 0;

        return {
          ...problem.toObject(),
          status: hasAcceptedSubmission ? 'completed' : hasAnySubmission ? 'started' : 'not_started',
          totalSubmissions: submissions.length
        };
      })
    );

    res.json({
      success: true,
      data: {
        eventActive: true,
        currentLevel: event.currentLevel,
        problems: problemsWithStatus
      }
    });

  } catch (error) {
    logger.error(`Get problem status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching problem status'
    });
  }
});

// @route   GET /api/problems/meta/categories
// @desc    Get all problem categories
// @access  Private
router.get('/meta/categories', protect, async (req, res) => {
  try {
    const categories = await Problem.distinct('category', { isActive: true });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    logger.error(`Get categories error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories'
    });
  }
});

// @route   GET /api/problems/tags
// @desc    Get all problem tags
// @access  Private
router.get('/meta/tags', protect, async (req, res) => {
  try {
    const tags = await Problem.distinct('tags', { isActive: true });

    res.json({
      success: true,
      data: { tags }
    });
  } catch (error) {
    logger.error(`Get tags error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tags'
    });
  }
});

module.exports = router;
