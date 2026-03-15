const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['python', 'java', 'cpp']
  },
  code: {
    type: String,
    required: true,
    maxlength: [10000, 'Code cannot exceed 10000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'accepted', 'wrong_answer', 'compilation_error', 'runtime_error', 'time_limit_exceeded', 'memory_limit_exceeded', 'internal_error'],
    default: 'pending'
  },
  executionTime: {
    type: Number,
    default: 0 // in milliseconds
  },
  memoryUsed: {
    type: Number,
    default: 0 // in KB
  },
  testCases: [{
    testCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    input: String,
    expectedOutput: String,
    actualOutput: String,
    status: {
      type: String,
      enum: ['passed', 'failed', 'error', 'skipped'],
      default: 'failed'
    },
    executionTime: Number,
    memoryUsed: Number,
    error: String,
    isHidden: {
      type: Boolean,
      default: true
    }
  }],
  compilationOutput: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    default: 0
  },
  timeComplexity: {
    estimated: {
      type: String,
      enum: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2^n)', 'O(n!)'],
      default: 'O(n)'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  penalty: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for execution duration
submissionSchema.virtual('executionDuration').get(function() {
  if (!this.startedAt || !this.completedAt) return 0;
  return this.completedAt - this.startedAt;
});

// Method to calculate final score
submissionSchema.methods.calculateScore = function() {
  const passedTestCases = this.testCases.filter(tc => tc.status === 'passed').length;
  const totalTestCases = this.testCases.length;
  
  if (totalTestCases === 0) return 0;
  
  // Base score based on test cases passed
  const baseScore = Math.round((passedTestCases / totalTestCases) * 100);
  
  // Time bonus (faster execution gets bonus)
  const timeBonus = Math.max(0, Math.round((50 - this.executionTime / 1000) * 2));
  
  // Penalty for wrong submissions
  const finalScore = Math.max(0, baseScore + timeBonus - this.penalty);
  
  this.score = finalScore;
  this.isCorrect = passedTestCases === totalTestCases;
  
  return finalScore;
};

// Method to update test case results
submissionSchema.methods.updateTestCaseResult = function(testCaseId, result) {
  const testCaseIndex = this.testCases.findIndex(tc => tc.testCaseId.toString() === testCaseId.toString());
  
  if (testCaseIndex !== -1) {
    this.testCases[testCaseIndex] = {
      ...this.testCases[testCaseIndex],
      ...result
    };
  }
  
  return this.calculateScore();
};

// Method to mark as completed
submissionSchema.methods.markAsCompleted = function(status, errorMessage = '') {
  this.status = status;
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  
  if (status === 'accepted') {
    this.isCorrect = true;
  }
  
  return this.calculateScore();
};

// Method to get public test case results (hide hidden test case details)
submissionSchema.methods.getPublicResults = function() {
  return {
    _id: this._id,
    user: this.user,
    problem: this.problem,
    language: this.language,
    status: this.status,
    executionTime: this.executionTime,
    memoryUsed: this.memoryUsed,
    score: this.score,
    isCorrect: this.isCorrect,
    submittedAt: this.submittedAt,
    testCases: this.testCases.map(tc => ({
      testCaseId: tc.testCaseId,
      status: tc.status,
      executionTime: tc.executionTime,
      memoryUsed: tc.memoryUsed,
      isHidden: tc.isHidden,
      // Hide input/output for hidden test cases
      input: tc.isHidden ? undefined : tc.input,
      expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
      actualOutput: tc.isHidden ? undefined : tc.actualOutput,
      error: tc.isHidden ? undefined : tc.error
    })),
    timeComplexity: this.timeComplexity
  };
};

// Index for better query performance
submissionSchema.index({ user: 1, problem: 1 });
submissionSchema.index({ user: 1, submittedAt: -1 });
submissionSchema.index({ problem: 1, submittedAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ isCorrect: 1 });
submissionSchema.index({ score: -1 });
submissionSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
