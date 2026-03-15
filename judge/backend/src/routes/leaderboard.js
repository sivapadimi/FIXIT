const express = require('express');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/leaderboard
// @desc    Get leaderboard
// @access  Private
router.get('/', protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get current event
    const event = await Event.findOne({ status: 'running', isActive: true });
    
    // Build aggregation pipeline
    const pipeline = [
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
              {
                $max: [
                  0,
                  {
                    $subtract: [
                      50,
                      { $floor: { $divide: ['$statistics.totalTime', 60000] } }
                    ]
                  }
                ]
              },
              { $multiply: ['$statistics.penaltyPoints', -10] }
            ]
          }
        }
      },
      {
        $sort: { score: -1, 'statistics.totalTime': 1 }
      },
      {
        $project: {
          username: 1,
          teamName: 1,
          college: 1,
          'statistics.problemsSolved': 1,
          'statistics.totalSubmissions': 1,
          'statistics.correctSubmissions': 1,
          'statistics.totalTime': 1,
          'statistics.penaltyPoints': 1,
          'statistics.currentLevel': 1,
          score: 1,
          rank: { $add: ['$rank', 1] }
        }
      }
    ];

    // Add rank calculation
    pipeline.unshift(
      {
        $setWindowFields: {
          sortBy: { score: -1, 'statistics.totalTime': 1 },
          output: {
            rank: {
              $documentNumber: {}
            }
          }
        }
      }
    );

    // Execute aggregation with pagination
    const [leaderboard] = await User.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ]);

    // Get total count
    const totalCount = await User.countDocuments({
      role: 'team',
      isActive: true,
      'statistics.totalSubmissions': { $gt: 0 }
    });

    // Get current user's rank
    let currentUserRank = null;
    if (req.user.role === 'team') {
      const [currentUserData] = await User.aggregate([
        {
          $match: {
            _id: req.user._id,
            role: 'team',
            isActive: true
          }
        },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: ['$statistics.problemsSolved', 100] },
                {
                  $max: [
                    0,
                    {
                      $subtract: [
                        50,
                        { $floor: { $divide: ['$statistics.totalTime', 60000] } }
                      ]
                    }
                  ]
                },
                { $multiply: ['$statistics.penaltyPoints', -10] }
              ]
            }
          }
        },
        {
          $setWindowFields: {
            sortBy: { score: -1, 'statistics.totalTime': 1 },
            output: {
              rank: {
                $documentNumber: {}
              }
            }
          }
        },
        {
          $project: {
            rank: { $add: ['$rank', 1] },
            score: 1
          }
        }
      ]);

      if (currentUserData.length > 0) {
        currentUserRank = currentUserData[0];
      }
    }

    // Format leaderboard data
    const formattedLeaderboard = leaderboard.map((user, index) => ({
      rank: user.rank,
      username: user.username,
      teamName: user.teamName,
      college: user.college,
      statistics: {
        problemsSolved: user.statistics.problemsSolved,
        totalSubmissions: user.statistics.totalSubmissions,
        correctSubmissions: user.statistics.correctSubmissions,
        totalTime: user.statistics.totalTime,
        penaltyPoints: user.statistics.penaltyPoints,
        currentLevel: user.statistics.currentLevel
      },
      score: user.score,
      isCurrentUser: req.user.role === 'team' && user._id.toString() === req.user._id.toString()
    }));

    res.json({
      success: true,
      data: {
        leaderboard: formattedLeaderboard,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        currentUserRank,
        event: event ? {
          id: event._id,
          name: event.name,
          status: event.status,
          currentLevel: event.currentLevel,
          timeRemaining: event.timeRemaining,
          progress: event.progress
        } : null
      }
    });

  } catch (error) {
    logger.error(`Get leaderboard error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leaderboard'
    });
  }
});

// @route   GET /api/leaderboard/stats
// @desc    Get leaderboard statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $match: {
          role: 'team',
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: 1 },
          activeParticipants: {
            $sum: { $cond: [{ $gt: ['$statistics.totalSubmissions', 0] }, 1, 0] }
          },
          totalSubmissions: { $sum: '$statistics.totalSubmissions' },
          totalCorrectSubmissions: { $sum: '$statistics.correctSubmissions' },
          totalProblemsSolved: { $sum: '$statistics.problemsSolved' },
          averageScore: { $avg: { $add: [
            { $multiply: ['$statistics.problemsSolved', 100] },
            { $multiply: ['$statistics.penaltyPoints', -10] }
          ]} }
        }
      }
    ]);

    const submissionStats = await Submission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const languageStats = await Submission.aggregate([
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      }
    ]);

    const levelStats = await User.aggregate([
      {
        $match: {
          role: 'team',
          isActive: true
        }
      },
      {
        $group: {
          _id: '$statistics.currentLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalParticipants: 0,
          activeParticipants: 0,
          totalSubmissions: 0,
          totalCorrectSubmissions: 0,
          totalProblemsSolved: 0,
          averageScore: 0
        },
        submissionStats: submissionStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        languageStats: languageStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        levelStats: levelStats.reduce((acc, stat) => {
          acc[`level_${stat._id}`] = stat.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    logger.error(`Get leaderboard stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leaderboard statistics'
    });
  }
});

// @route   GET /api/leaderboard/top/:count
// @desc    Get top N participants
// @access  Private
router.get('/top/:count', protect, async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 10, 100);

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
              {
                $max: [
                  0,
                  {
                    $subtract: [
                      50,
                      { $floor: { $divide: ['$statistics.totalTime', 60000] } }
                    ]
                  }
                ]
              },
              { $multiply: ['$statistics.penaltyPoints', -10] }
            ]
          }
        }
      },
      {
        $setWindowFields: {
          sortBy: { score: -1, 'statistics.totalTime': 1 },
          output: {
            rank: {
              $documentNumber: {}
            }
          }
        }
      },
      {
        $limit: count
      },
      {
        $project: {
          rank: { $add: ['$rank', 1] },
          username: 1,
          teamName: 1,
          college: 1,
          'statistics.problemsSolved': 1,
          'statistics.totalSubmissions': 1,
          'statistics.totalTime': 1,
          score: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        topUsers
      }
    });

  } catch (error) {
    logger.error(`Get top users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching top users'
    });
  }
});

module.exports = router;
