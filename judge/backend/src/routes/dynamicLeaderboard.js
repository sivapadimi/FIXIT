const express = require('express');
const router = express.Router();
const ScoreCalculator = require('../services/scoreCalculator');
const db = require('../config/database'); // Adjust based on your DB setup

const scoreCalculator = new ScoreCalculator();

/**
 * POST /api/leaderboard/submit-solution
 * Submit a solution and calculate score
 */
router.post('/submit-solution', async (req, res) => {
    try {
        const {
            team_id,
            problem_id,
            code,
            language,
            test_results,
            execution_time_ms,
            submission_time
        } = req.body;

        // Validate required fields
        if (!team_id || !problem_id || !code || !language || !test_results) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Get problem details
        const problem = await db.get(
            'SELECT * FROM problems WHERE problem_id = ?',
            [problem_id]
        );

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        // Calculate score
        const scoreData = scoreCalculator.calculateScore({
            passedCases: test_results.passed_cases,
            totalCases: test_results.total_cases,
            executionTimeMs: execution_time_ms || 0,
            submissionTime: submission_time || new Date(),
            language
        }, problem);

        // Check if this is the best submission for this team/problem
        const bestSubmission = await db.get(
            'SELECT MAX(final_score) as best_score FROM submissions WHERE team_id = ? AND problem_id = ?',
            [team_id, problem_id]
        );

        const isBestSubmission = !bestSubmission.best_score || 
            scoreData.finalScore > bestSubmission.best_score;

        // Insert submission
        const result = await db.run(`
            INSERT INTO submissions (
                team_id, problem_id, code, language,
                passed_cases, total_cases, accuracy,
                submission_time, execution_time_ms,
                base_score, time_penalty, final_score,
                is_correct, is_best_submission
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            team_id, problem_id, code, language,
            test_results.passed_cases, test_results.total_cases, scoreData.accuracy,
            new Date().toISOString(), execution_time_ms || 0,
            scoreData.baseScore, scoreData.timePenalty, scoreData.finalScore,
            scoreData.isCorrect, isBestSubmission
        ]);

        // Update other submissions to mark this as best
        if (isBestSubmission) {
            await db.run(`
                UPDATE submissions 
                SET is_best_submission = FALSE 
                WHERE team_id = ? AND problem_id = ? AND submission_id != ?
            `, [team_id, problem_id, result.lastID]);
        }

        // Emit real-time update (if using Socket.io)
        req.app.get('io')?.emit('new-submission', {
            team_id,
            problem_id,
            score: scoreData.finalScore,
            is_correct: scoreData.isCorrect,
            timestamp: new Date()
        });

        res.json({
            success: true,
            submission_id: result.lastID,
            score: scoreData,
            is_best_submission: isBestSubmission
        });

    } catch (error) {
        console.error('Submit solution error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * GET /api/leaderboard
 * Get current leaderboard rankings
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        // Get leaderboard data with team information
        const leaderboard = await db.all(`
            SELECT 
                l.team_id,
                t.team_name,
                t.members,
                l.total_score,
                l.problems_solved,
                l.total_time_seconds,
                l.last_submission_time,
                RANK() OVER (ORDER BY l.total_score DESC, l.total_time_seconds ASC) as rank
            FROM leaderboard l
            JOIN teams t ON l.team_id = t.team_id
            ORDER BY l.total_score DESC, l.total_time_seconds ASC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        // Get total count for pagination
        const totalCount = await db.get('SELECT COUNT(*) as count FROM leaderboard');

        res.json({
            success: true,
            leaderboard,
            pagination: {
                total: totalCount.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: (parseInt(offset) + parseInt(limit)) < totalCount.count
            }
        });

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * GET /api/leaderboard/team/:team_id
 * Get detailed team score breakdown
 */
router.get('/team/:team_id', async (req, res) => {
    try {
        const { team_id } = req.params;

        // Get team information
        const team = await db.get(
            'SELECT * FROM teams WHERE team_id = ?',
            [team_id]
        );

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        // Get team's leaderboard position
        const leaderboardPosition = await db.get(`
            SELECT 
                total_score,
                problems_solved,
                total_time_seconds,
                RANK() OVER (ORDER BY total_score DESC, total_time_seconds ASC) as rank
            FROM leaderboard 
            WHERE team_id = ?
        `, [team_id]);

        // Get all submissions for this team
        const submissions = await db.all(`
            SELECT 
                s.*,
                p.title as problem_title,
                p.max_score as problem_max_score,
                p.difficulty
            FROM submissions s
            JOIN problems p ON s.problem_id = p.problem_id
            WHERE s.team_id = ?
            ORDER BY s.submission_time DESC
        `, [team_id]);

        // Get problem attempts summary
        const problemAttempts = await db.all(`
            SELECT 
                pa.*,
                p.title as problem_title,
                p.max_score
            FROM problem_attempts pa
            JOIN problems p ON pa.problem_id = p.problem_id
            WHERE pa.team_id = ?
            ORDER BY pa.best_score DESC
        `, [team_id]);

        // Calculate team statistics
        const teamStats = scoreCalculator.calculateTeamScore(submissions);

        res.json({
            success: true,
            team: {
                ...team,
                members: JSON.parse(team.members)
            },
            leaderboard_position: leaderboardPosition,
            statistics: teamStats,
            submissions: submissions.map(sub => ({
                ...sub,
                score_breakdown: scoreCalculator.calculateScore(sub, {
                    max_score: sub.problem_max_score,
                    difficulty: sub.difficulty
                })
            })),
            problem_attempts: problemAttempts
        });

    } catch (error) {
        console.error('Get team score error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * GET /api/leaderboard/stats
 * Get competition statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // Get overall statistics
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT s.team_id) as total_teams,
                COUNT(*) as total_submissions,
                COUNT(DISTINCT s.problem_id) as problems_attempted,
                AVG(s.accuracy) as average_accuracy,
                MAX(s.final_score) as highest_score,
                COUNT(CASE WHEN s.is_correct = TRUE THEN 1 END) as correct_submissions
            FROM submissions s
        `);

        // Get problem statistics
        const problemStats = await db.all(`
            SELECT 
                p.problem_id,
                p.title,
                p.max_score,
                p.difficulty,
                COUNT(DISTINCT s.team_id) as teams_attempted,
                COUNT(s.submission_id) as total_submissions,
                COUNT(CASE WHEN s.is_correct = TRUE THEN 1 END) as correct_submissions,
                AVG(s.accuracy) as average_accuracy,
                MAX(s.final_score) as highest_score
            FROM problems p
            LEFT JOIN submissions s ON p.problem_id = s.problem_id
            GROUP BY p.problem_id
            ORDER BY p.problem_id
        `);

        // Get recent activity
        const recentActivity = await db.all(`
            SELECT 
                ce.*,
                t.team_name
            FROM competition_events ce
            JOIN teams t ON ce.team_id = t.team_id
            ORDER BY ce.timestamp DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            overall_stats: {
                ...stats,
                average_accuracy: Math.round((stats.average_accuracy || 0) * 100) / 100,
                success_rate: stats.total_submissions > 0 ? 
                    Math.round((stats.correct_submissions / stats.total_submissions) * 100) / 100 : 0
            },
            problem_stats: problemStats.map(stat => ({
                ...stat,
                average_accuracy: Math.round((stat.average_accuracy || 0) * 100) / 100,
                success_rate: stat.total_submissions > 0 ? 
                    Math.round((stat.correct_submissions / stat.total_submissions) * 100) / 100 : 0
            })),
            recent_activity: recentActivity
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * POST /api/leaderboard/recalculate
 * Recalculate all leaderboard scores (admin only)
 */
router.post('/recalculate', async (req, res) => {
    try {
        // This is an admin operation - you might want to add authentication
        
        // Get all submissions
        const submissions = await db.all(`
            SELECT s.*, p.max_score, p.difficulty
            FROM submissions s
            JOIN problems p ON s.problem_id = p.problem_id
        `);

        // Recalculate scores for all submissions
        for (const submission of submissions) {
            const scoreData = scoreCalculator.calculateScore(submission, {
                max_score: submission.max_score,
                difficulty: submission.difficulty
            });

            await db.run(`
                UPDATE submissions 
                SET 
                    accuracy = ?,
                    base_score = ?,
                    time_penalty = ?,
                    final_score = ?,
                    is_correct = ?
                WHERE submission_id = ?
            `, [
                scoreData.accuracy,
                scoreData.baseScore,
                scoreData.timePenalty,
                scoreData.finalScore,
                scoreData.isCorrect,
                submission.submission_id
            ]);
        }

        // Update leaderboard table
        await db.run(`
            DELETE FROM leaderboard
        `);

        await db.run(`
            INSERT INTO leaderboard (team_id, total_score, problems_solved, total_time_seconds)
            SELECT 
                team_id,
                SUM(final_score),
                COUNT(DISTINCT CASE WHEN is_correct = TRUE THEN problem_id END),
                SUM(execution_time_ms / 1000)
            FROM submissions
            GROUP BY team_id
        `);

        res.json({
            success: true,
            message: 'Leaderboard recalculated successfully',
            submissions_processed: submissions.length
        });

    } catch (error) {
        console.error('Recalculate error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
