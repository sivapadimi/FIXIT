const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true,
    maxlength: [100, 'Event name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  startTime: {
    type: Date,
    required: [true, 'Event start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'Event end time is required']
  },
  duration: {
    type: Number, // in milliseconds
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'running', 'paused', 'completed'],
    default: 'upcoming'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currentLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  },
  levelDurations: {
    type: Map,
    of: Number, // duration in milliseconds for each level
    default: {
      1: 3600000, // 1 hour
      2: 3600000, // 1 hour
      3: 3600000  // 1 hour
    }
  },
  settings: {
    allowLateRegistration: {
      type: Boolean,
      default: false
    },
    showLeaderboard: {
      type: Boolean,
      default: true
    },
    allowSubmissionsAfterEnd: {
      type: Boolean,
      default: false
    },
    maxTeamSize: {
      type: Number,
      default: 3,
      min: 1,
      max: 5
    },
    maxSubmissionsPerProblem: {
      type: Number,
      default: 50,
      min: 1
    },
    penaltyPerWrongSubmission: {
      type: Number,
      default: 10,
      min: 0
    }
  },
  statistics: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    activeParticipants: {
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
    averageScore: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Virtual for time remaining
eventSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'completed') return 0;
  if (this.status === 'upcoming') return 0; // Don't show time remaining for events not started by admin
  
  const now = new Date();
  return Math.max(0, this.endTime - now);
});

// Virtual for progress percentage
eventSchema.virtual('progress').get(function() {
  if (this.status === 'upcoming') return 0; // No progress for events not started by admin
  if (this.status === 'completed') return 100;
  
  const now = new Date();
  const total = this.endTime - this.startTime;
  const elapsed = now - this.startTime;
  
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
});

// Method to start event
eventSchema.methods.startEvent = function() {
  this.status = 'running';
  this.startTime = new Date();
  this.endTime = new Date(this.startTime.getTime() + this.duration);
  return this.save();
};

// Method to pause event
eventSchema.methods.pauseEvent = function() {
  if (this.status === 'running') {
    this.status = 'paused';
  }
  return this.save();
};

// Method to resume event
eventSchema.methods.resumeEvent = function() {
  if (this.status === 'paused') {
    this.status = 'running';
  }
  return this.save();
};

// Method to complete event
eventSchema.methods.completeEvent = function() {
  this.status = 'completed';
  this.endTime = new Date();
  return this.save();
};

// Method to move to next level
eventSchema.methods.moveToNextLevel = function() {
  if (this.currentLevel < 3) {
    this.currentLevel += 1;
    
    // Adjust end time based on level duration
    const levelDuration = this.levelDurations.get(this.currentLevel.toString());
    this.endTime = new Date(Date.now() + levelDuration);
  }
  return this.save();
};

// Method to check if event is running
eventSchema.methods.isRunning = function() {
  // Event is only running if admin has manually started it and it hasn't ended
  return this.status === 'running' && new Date() <= this.endTime;
};

// Method to check if user can participate
eventSchema.methods.canParticipate = function() {
  if (!this.isActive) return false;
  if (this.status === 'completed') return false;
  if (this.status !== 'running') return false; // Only allow participation if admin has started the event
  
  return true;
};

// Method to update statistics
eventSchema.methods.updateStatistics = async function() {
  const User = mongoose.model('User');
  const Submission = mongoose.model('Submission');
  
  // Get participant statistics
  this.statistics.totalParticipants = await User.countDocuments({ role: 'team', isActive: true });
  this.statistics.activeParticipants = await User.countDocuments({ 
    role: 'team', 
    isActive: true,
    'statistics.totalSubmissions': { $gt: 0 }
  });
  
  // Get submission statistics
  const submissionStats = await Submission.aggregate([
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        correctSubmissions: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        averageScore: { $avg: '$score' }
      }
    }
  ]);
  
  if (submissionStats.length > 0) {
    this.statistics.totalSubmissions = submissionStats[0].totalSubmissions;
    this.statistics.correctSubmissions = submissionStats[0].correctSubmissions;
    this.statistics.averageScore = Math.round(submissionStats[0].averageScore);
  }
  
  return this.save();
};

// Index for better query performance
eventSchema.index({ status: 1 });
eventSchema.index({ startTime: 1 });
eventSchema.index({ endTime: 1 });
eventSchema.index({ isActive: 1 });

module.exports = mongoose.model('Event', eventSchema);
