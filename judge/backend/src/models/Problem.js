const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true
  },
  expectedOutput: {
    type: String,
    required: true
  },
  isHidden: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  },
  weight: {
    type: Number,
    default: 1
  }
});

const languageTemplateSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    enum: ['python', 'java', 'cpp']
  },
  buggyCode: {
    type: String,
    required: true
  },
  fixedCode: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  errorType: {
    type: String,
    enum: ['syntax', 'logical', 'runtime', 'performance'],
    required: true
  },
  errorLocation: {
    line: Number,
    column: Number
  }
});

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Problem title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Problem description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  category: {
    type: String,
    required: true,
    enum: ['arrays', 'strings', 'sorting', 'searching', 'recursion', 'dp', 'trees', 'graphs', 'other']
  },
  tags: [{
    type: String,
    trim: true
  }],
  timeLimit: {
    type: Number,
    required: true,
    default: 5000, // in milliseconds
    min: 1000,
    max: 30000
  },
  memoryLimit: {
    type: Number,
    required: true,
    default: 128, // in MB
    min: 16,
    max: 512
  },
  testCases: [testCaseSchema],
  languages: [languageTemplateSchema],
  sampleInput: {
    type: String,
    required: true
  },
  sampleOutput: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  constraints: {
    type: String,
    required: true
  },
  inputFormat: {
    type: String,
    required: true
  },
  outputFormat: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 100,
    min: 10,
    max: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statistics: {
    totalSubmissions: {
      type: Number,
      default: 0
    },
    correctSubmissions: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      default: 0 // in milliseconds
    },
    successRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Virtual for success rate calculation
problemSchema.virtual('calculatedSuccessRate').get(function() {
  if (this.statistics.totalSubmissions === 0) return 0;
  return Math.round((this.statistics.correctSubmissions / this.statistics.totalSubmissions) * 100);
});

// Method to update statistics
problemSchema.methods.updateStatistics = async function(isCorrect, executionTime) {
  this.statistics.totalSubmissions += 1;
  
  if (isCorrect) {
    this.statistics.correctSubmissions += 1;
  }
  
  // Update average time
  const totalTime = this.statistics.averageTime * (this.statistics.totalSubmissions - 1) + executionTime;
  this.statistics.averageTime = Math.round(totalTime / this.statistics.totalSubmissions);
  
  // Update success rate
  this.statistics.successRate = this.calculatedSuccessRate;
  
  return this.save();
};

// Method to get test cases for execution
problemSchema.methods.getExecutionTestCases = function() {
  return this.testCases.filter(testCase => testCase.isHidden);
};

// Method to get sample test cases
problemSchema.methods.getSampleTestCases = function() {
  return this.testCases.filter(testCase => !testCase.isHidden);
};

// Method to get language template
problemSchema.methods.getLanguageTemplate = function(language) {
  return this.languages.find(lang => lang.language === language);
};

// Index for better query performance
problemSchema.index({ title: 1 });
problemSchema.index({ difficulty: 1 });
problemSchema.index({ level: 1 });
problemSchema.index({ category: 1 });
problemSchema.index({ tags: 1 });
problemSchema.index({ isActive: 1 });
problemSchema.index({ 'statistics.successRate': -1 });
problemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Problem', problemSchema);
