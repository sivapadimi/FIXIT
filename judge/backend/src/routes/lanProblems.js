const express = require('express');
const router = express.Router();

// Get all problems
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const problems = await db.all('SELECT * FROM problems ORDER BY id ASC');
    
    res.json({
      success: true,
      problems
    });
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get specific problem
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const problemId = req.params.id;
    
    const problem = await db.get('SELECT * FROM problems WHERE id = ?', [problemId]);
    
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    res.json({
      success: true,
      problem
    });
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get exam status
router.get('/exam/status', async (req, res) => {
  try {
    const db = req.db;
    const status = await db.get('SELECT * FROM exam_status WHERE id = 1');
    
    if (!status) {
      return res.json({
        success: true,
        status: {
          global_exam_active: false,
          current_problem: null,
          results_visible: false
        }
      });
    }

    res.json({
      success: true,
      status: {
        global_exam_active: Boolean(status.global_exam_active),
        current_problem: status.current_problem,
        results_visible: Boolean(status.results_visible)
      }
    });
  } catch (error) {
    console.error('Get exam status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
