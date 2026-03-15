const express = require('express');
const router = express.Router();

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const leaderboard = await db.all(`
      SELECT * FROM leaderboard 
      ORDER BY score DESC, problems_solved DESC, last_submission ASC
    `);

    // Add rank numbers
    const leaderboardWithRank = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    res.json({
      success: true,
      leaderboard: leaderboardWithRank
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user rank
router.get('/rank/:username', async (req, res) => {
  try {
    const db = req.db;
    const username = req.params.username;
    
    const leaderboard = await db.all(`
      SELECT * FROM leaderboard 
      ORDER BY score DESC, problems_solved DESC, last_submission ASC
    `);

    const userIndex = leaderboard.findIndex(entry => entry.username === username);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found in leaderboard'
      });
    }

    res.json({
      success: true,
      rank: userIndex + 1,
      totalParticipants: leaderboard.length
    });
  } catch (error) {
    console.error('Get user rank error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
