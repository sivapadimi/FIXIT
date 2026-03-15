const express = require('express');
const router = express.Router();

// Get connected teams
router.get('/connected-teams', async (req, res) => {
  try {
    const db = req.db;
    const connectedTeams = await db.all(`
      SELECT * FROM connected_teams 
      ORDER BY connected_at DESC
    `);

    res.json({
      success: true,
      connectedTeams
    });
  } catch (error) {
    console.error('Get connected teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update exam status
router.post('/exam-status', async (req, res) => {
  try {
    const db = req.db;
    const { global_exam_active, current_problem, results_visible } = req.body;

    await db.run(`
      UPDATE exam_status 
      SET global_exam_active = ?, current_problem = ?, results_visible = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [global_exam_active, current_problem, results_visible]);

    res.json({
      success: true,
      message: 'Exam status updated successfully'
    });
  } catch (error) {
    console.error('Update exam status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all submissions
router.get('/submissions', async (req, res) => {
  try {
    const db = req.db;
    const submissions = await db.all(`
      SELECT * FROM submissions 
      ORDER BY timestamp DESC
    `);

    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset leaderboard
router.post('/reset-leaderboard', async (req, res) => {
  try {
    const db = req.db;

    // Reset users scores
    await db.run('UPDATE users SET score = 0, problems_solved = 0');
    
    // Reset leaderboard
    await db.run('UPDATE leaderboard SET score = 0, problems_solved = 0');
    
    // Clear submissions
    await db.run('DELETE FROM submissions');

    res.json({
      success: true,
      message: 'Leaderboard reset successfully'
    });
  } catch (error) {
    console.error('Reset leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Broadcast message (would be handled by Socket.io in real implementation)
router.post('/broadcast', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // In a real implementation, this would emit via Socket.io
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Message broadcast successfully'
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get competition statistics
router.get('/stats', async (req, res) => {
  try {
    const db = req.db;

    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE');
    const totalSubmissions = await db.get('SELECT COUNT(*) as count FROM submissions');
    const correctSubmissions = await db.get('SELECT COUNT(*) as count FROM submissions WHERE correct = TRUE');
    const connectedTeams = await db.get('SELECT COUNT(*) as count FROM connected_teams');

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers.count,
        totalSubmissions: totalSubmissions.count,
        correctSubmissions: correctSubmissions.count,
        connectedTeams: connectedTeams.count,
        successRate: totalSubmissions.count > 0 ? 
          Math.round((correctSubmissions.count / totalSubmissions.count) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
