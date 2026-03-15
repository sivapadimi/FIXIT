const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'team'],
    default: 'team'
  },
  teamName: {
    type: String,
    required: function() {
      return this.role === 'team';
    },
    trim: true
  },
  teamMembers: [{
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  }],
  college: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profile: {
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    }
  },
  statistics: {
    problemsSolved: {
      type: Number,
      default: 0
    },
    totalSubmissions: {
      type: Number,
      default: 0
    },
    correctSubmissions: {
      type: Number,
      default: 0
    },
    totalTime: {
      type: Number,
      default: 0 // in milliseconds
    },
    penaltyPoints: {
      type: Number,
      default: 0
    },
    currentLevel: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Calculate score
userSchema.methods.calculateScore = function() {
  const baseScore = this.statistics.problemsSolved * 100;
  const timeBonus = Math.max(0, 50 - Math.floor(this.statistics.totalTime / 60000)); // 1 point per minute saved, max 50
  const penalty = this.statistics.penaltyPoints * 10;
  
  return Math.max(0, baseScore + timeBonus - penalty);
};

// Get user statistics
userSchema.methods.getStatistics = function() {
  return {
    problemsSolved: this.statistics.problemsSolved,
    totalSubmissions: this.statistics.totalSubmissions,
    correctSubmissions: this.statistics.correctSubmissions,
    accuracy: this.statistics.totalSubmissions > 0 
      ? Math.round((this.statistics.correctSubmissions / this.statistics.totalSubmissions) * 100) 
      : 0,
    totalTime: this.statistics.totalTime,
    averageTime: this.statistics.correctSubmissions > 0 
      ? Math.round(this.statistics.totalTime / this.statistics.correctSubmissions) 
      : 0,
    penaltyPoints: this.statistics.penaltyPoints,
    currentLevel: this.statistics.currentLevel,
    score: this.calculateScore()
  };
};

// Index for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'statistics.problemsSolved': -1 });
userSchema.index({ 'statistics.score': -1 });

module.exports = mongoose.model('User', userSchema);
