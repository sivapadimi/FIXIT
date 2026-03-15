const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('teamName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Team name must be between 2 and 50 characters')
    .if(body('role').equals('team')),
  
  body('college')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('College name must be between 2 and 100 characters'),
  
  body('teamMembers')
    .isArray({ min: 1, max: 5 })
    .withMessage('Team must have between 1 and 5 members')
    .if(body('role').equals('team')),
  
  body('teamMembers.*.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Team member name must be between 2 and 50 characters')
    .if(body('role').equals('team')),
  
  body('teamMembers.*.email')
    .isEmail()
    .withMessage('Please provide a valid email for team member')
    .if(body('role').equals('team')),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Problem validation
const validateProblem = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20 and 5000 characters'),
  
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  
  body('level')
    .isInt({ min: 1, max: 3 })
    .withMessage('Level must be 1, 2, or 3'),
  
  body('category')
    .isIn(['arrays', 'strings', 'sorting', 'searching', 'recursion', 'dp', 'trees', 'graphs', 'other'])
    .withMessage('Invalid category'),
  
  body('timeLimit')
    .isInt({ min: 1000, max: 30000 })
    .withMessage('Time limit must be between 1000ms and 30000ms'),
  
  body('memoryLimit')
    .isInt({ min: 16, max: 512 })
    .withMessage('Memory limit must be between 16MB and 512MB'),
  
  body('sampleInput')
    .notEmpty()
    .withMessage('Sample input is required'),
  
  body('sampleOutput')
    .notEmpty()
    .withMessage('Sample output is required'),
  
  body('explanation')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Explanation must be between 10 and 2000 characters'),
  
  body('constraints')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Constraints must be between 5 and 1000 characters'),
  
  body('inputFormat')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Input format must be between 5 and 500 characters'),
  
  body('outputFormat')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Output format must be between 5 and 500 characters'),
  
  body('testCases')
    .isArray({ min: 1 })
    .withMessage('At least one test case is required'),
  
  body('testCases.*.input')
    .notEmpty()
    .withMessage('Test case input is required'),
  
  body('testCases.*.expectedOutput')
    .notEmpty()
    .withMessage('Test case expected output is required'),
  
  body('languages')
    .isArray({ min: 1 })
    .withMessage('At least one language template is required'),
  
  body('languages.*.language')
    .isIn(['python', 'java', 'cpp'])
    .withMessage('Language must be python, java, or cpp'),
  
  body('languages.*.buggyCode')
    .notEmpty()
    .withMessage('Buggy code is required'),
  
  body('languages.*.fixedCode')
    .notEmpty()
    .withMessage('Fixed code is required'),
  
  body('languages.*.explanation')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Language explanation must be between 10 and 1000 characters'),
  
  body('languages.*.errorType')
    .isIn(['syntax', 'logical', 'runtime', 'performance'])
    .withMessage('Error type must be syntax, logical, runtime, or performance'),
  
  handleValidationErrors
];

// Submission validation
const validateSubmission = [
  body('problem')
    .isMongoId()
    .withMessage('Invalid problem ID'),
  
  body('language')
    .isIn(['python', 'java', 'cpp'])
    .withMessage('Language must be python, java, or cpp'),
  
  body('code')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Code must be between 1 and 10000 characters'),
  
  handleValidationErrors
];

// MongoDB ID validation
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Event validation
const validateEvent = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Event name must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  
  body('endTime')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('duration')
    .isInt({ min: 60000 }) // at least 1 minute
    .withMessage('Duration must be at least 60000 milliseconds'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateProblem,
  validateSubmission,
  validateMongoId,
  validatePagination,
  validateEvent,
  handleValidationErrors
};
