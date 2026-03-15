const express = require('express');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const User = require('../models/User');
const { protect, isEventRunning, submissionRateLimit } = require('../middleware/auth');
const { validateSubmission, validateMongoId, validatePagination } = require('../middleware/validation');
const codeExecutor = require('../services/codeExecutor');
const logger = require('../utils/logger');

const router = express.Router();

// @route   POST /api/submissions
// @desc    Submit a solution
// @access  Private
router.post('/', protect, isEventRunning, submissionRateLimit, validateSubmission, async (req, res) => {
  try {
    const { problem, language, code } = req.body;
    
    // Get problem details
    const problemDoc = await Problem.findById(problem);
    if (!problemDoc) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Create submission record
    const submission = await Submission.create({
      user: req.user._id,
      problem,
      language,
      code,
      status: 'pending',
      startedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Start async execution
    processSubmission(submission._id, problemDoc, req.user);

    res.status(202).json({
      success: true,
      message: 'Submission received and is being processed',
      data: {
        submissionId: submission._id,
        status: 'pending'
      }
    });

  } catch (error) {
    logger.error(`Submit error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error processing submission'
    });
  }
});

// @route   GET /api/submissions
// @desc    Get user's submissions
// @access  Private
router.get('/', protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = { user: req.user._id };

    if (req.query.problem) {
      filter.problem = req.query.problem;
    }

    if (req.query.language) {
      filter.language = req.query.language;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Get submissions
    const submissions = await Submission.find(filter)
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
    logger.error(`Get submissions error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching submissions'
    });
  }
});

// @route   GET /api/submissions/:id
// @desc    Get submission details
// @access  Private
router.get('/:id', protect, validateMongoId('id'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('problem', 'title difficulty level')
      .populate('user', 'username teamName');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user can access this submission
    if (req.user.role !== 'admin' && submission.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this submission'
      });
    }

    res.json({
      success: true,
      data: { submission: submission.getPublicResults() }
    });

  } catch (error) {
    logger.error(`Get submission error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching submission'
    });
  }
});

// @route   POST /api/submissions/:id/run
// @desc    Run code against sample test cases (for testing)
// @access  Private
router.post('/:id/run', protect, validateMongoId('id'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user can access this submission
    if (req.user.role !== 'admin' && submission.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this submission'
      });
    }

    const problem = await Problem.findById(submission.problem);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Run against sample test cases only
    const sampleTestCases = problem.getSampleTestCases();
    const results = [];

    for (const testCase of sampleTestCases) {
      try {
        const result = await codeExecutor.executeCode(
          submission.language,
          submission.code,
          testCase.input,
          problem.timeLimit,
          problem.memoryLimit
        );

        results.push({
          testCaseId: testCase._id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.output,
          status: result.output === testCase.expectedOutput ? 'passed' : 'failed',
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          error: result.error,
          isHidden: false
        });

      } catch (error) {
        results.push({
          testCaseId: testCase._id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          status: 'error',
          executionTime: 0,
          memoryUsed: 0,
          error: error.message,
          isHidden: false
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.status === 'passed').length,
          failed: results.filter(r => r.status === 'failed').length,
          error: results.filter(r => r.status === 'error').length
        }
      }
    });

  } catch (error) {
    logger.error(`Run submission error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error running submission'
    });
  }
});

// Async function to process submission
async function processSubmission(submissionId, problem, user) {
  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) return;

    // Update status to running
    submission.status = 'running';
    await submission.save();

    const testCases = problem.getExecutionTestCases();
    const results = [];
    let totalExecutionTime = 0;
    let allPassed = true;

    for (const testCase of testCases) {
      try {
        const result = await codeExecutor.executeCode(
          submission.language,
          submission.code,
          testCase.input,
          problem.timeLimit,
          problem.memoryLimit
        );

        const passed = result.output === testCase.expectedOutput;
        if (!passed) allPassed = false;

        totalExecutionTime += result.executionTime;

        results.push({
          testCaseId: testCase._id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.output,
          status: passed ? 'passed' : 'failed',
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          error: result.error,
          isHidden: testCase.isHidden
        });

      } catch (error) {
        allPassed = false;
        results.push({
          testCaseId: testCase._id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          status: 'error',
          executionTime: 0,
          memoryUsed: 0,
          error: error.message,
          isHidden: testCase.isHidden
        });
      }
    }

    // Calculate time complexity
    const executionTimes = results.map(r => r.executionTime).filter(t => t > 0);
    const timeComplexity = await codeExecutor.estimateTimeComplexity(executionTimes);

    // Update submission with results
    submission.testCases = results;
    submission.executionTime = totalExecutionTime;
    submission.timeComplexity = timeComplexity;
    submission.markAsCompleted(allPassed ? 'accepted' : 'wrong_answer');
    await submission.save();

    // Update problem statistics
    await problem.updateStatistics(allPassed, totalExecutionTime);

    // Update user statistics
    if (allPassed) {
      user.statistics.problemsSolved += 1;
      user.statistics.correctSubmissions += 1;
    }
    user.statistics.totalSubmissions += 1;
    user.statistics.totalTime += totalExecutionTime;
    
    if (!allPassed) {
      user.statistics.penaltyPoints += 1;
    }

    await user.save();

    // Emit real-time update
    const socketService = require('../services/socketService');
    socketService.emitSubmissionUpdate(submission);

    logger.info(`Submission processed: ${submissionId} - Status: ${submission.status}`);

  } catch (error) {
    logger.error(`Process submission error: ${error.message}`);
    
    // Mark submission as failed
    const submission = await Submission.findById(submissionId);
    if (submission) {
      submission.markAsCompleted('internal_error', error.message);
      await submission.save();
    }
  }
}

module.exports = router;
