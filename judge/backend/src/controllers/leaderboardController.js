/**
 * Complete Leaderboard Controller Implementation
 * Integrates score calculation, database operations, and real-time updates
 */

const ScoreCalculator = require('../services/scoreCalculator');
const RealtimeService = require('../services/realtimeService');

class LeaderboardController {
    constructor(db, realtimeService) {
        this.db = db;
        this.scoreCalculator = new ScoreCalculator();
        this.realtimeService = realtimeService;
    }

    /**
     * Submit solution and update leaderboard
     */
    async submitSolution(req, res) {
        try {
            const {
                team_id,
                problem_id,
                code,
                language,
                test_results,
                execution_time_ms = 0
            } = req.body;

            // Validate input
            if (!team_id || !problem_id || !code || !language || !test_results) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Get problem details
            const problem = await this.db.get(
                'SELECT * FROM problems WHERE problem_id = ?',
                [problem_id]
            );

            if (!problem) {
                return res.status(404).json({
                    success: false,
                    message: 'Problem not found'
                });
            }

            // Get team details
            const team = await this.db.get(
                'SELECT * FROM teams WHERE team_id = ?',
                [team_id]
            );

            if (!team) {
                return res.status(404).json({
                    success: false,
                    message: 'Team not found'
                });
            }

            // Calculate score
            const scoreData = this.scoreCalculator.calculateScore({
                passedCases: test_results.passed_cases,
                totalCases: test_results.total_cases,
                executionTimeMs: execution_time_ms,
                submissionTime: new Date(),
                language
            }, problem);

            // Check if this is the best submission
            const bestSubmission = await this.db.get(
                'SELECT MAX(final_score) as best_score FROM submissions WHERE team_id = ? AND problem_id = ?',
                [team_id, problem_id]
            );

            const isBestSubmission = !bestSubmission.best_score || 
                scoreData.finalScore > bestSubmission.best_score;

            // Insert submission
            const submissionResult = await this.db.run(`
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
                new Date().toISOString(), execution_time_ms,
                scoreData.baseScore, scoreData.timePenalty, scoreData.finalScore,
                scoreData.isCorrect, isBestSubmission
            ]);

            // Update other submissions if this is the best
            if (isBestSubmission) {
                await this.db.run(`
                    UPDATE submissions 
                    SET is_best_submission = FALSE 
                    WHERE team_id = ? AND problem_id = ? AND submission_id != ?
                `, [team_id, problem_id, submissionResult.lastID]);
            }

            // Update leaderboard
            await this.updateTeamLeaderboard(team_id);

            // Get updated leaderboard position
            const leaderboardPosition = await this.getTeamRank(team_id);

            // Prepare submission data for broadcast
            const submissionData = {
                submission_id: submissionResult.lastID,
                team_id,
                team_name: team.team_name,
                problem_id,
                problem_title: problem.title,
                score: scoreData.finalScore,
                is_correct: scoreData.isCorrect,
                accuracy: scoreData.accuracy,
                execution_time_ms,
                rank: leaderboardPosition,
                timestamp: new Date()
            };

            // Broadcast real-time update
            if (this.realtimeService) {
                await this.realtimeService.broadcastNewSubmission(submissionData);
            }

            // Log competition event
            await this.logCompetitionEvent('submission', {
                team_id,
                problem_id,
                score: scoreData.finalScore,
                is_correct: scoreData.isCorrect,
                submission_id: submissionResult.lastID
            });

            res.json({
                success: true,
                submission_id: submissionResult.lastID,
                score: scoreData,
                leaderboard_position: leaderboardPosition,
                is_best_submission: isBestSubmission,
                message: scoreData.isCorrect ? '🎉 Correct solution!' : '❌ Incorrect solution'
            });

        } catch (error) {
            console.error('Submit solution error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get current leaderboard
     */
    async getLeaderboard(req, res) {
        try {
            const { limit = 50, offset = 0, team_id } = req.query;

            let query = `
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
            `;

            const params = [];

            if (team_id) {
                query += ' WHERE l.team_id = ?';
                params.push(team_id);
            }

            query += ' ORDER BY l.total_score DESC, l.total_time_seconds ASC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const leaderboard = await this.db.all(query, params);

            // Get total count
            const totalCount = await this.db.get(
                'SELECT COUNT(*) as count FROM leaderboard'
            );

            res.json({
                success: true,
                leaderboard: leaderboard.map(team => ({
                    ...team,
                    members: JSON.parse(team.members || '[]')
                })),
                pagination: {
                    total: totalCount.count,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + parseInt(limit)) < totalCount.count
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Get leaderboard error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get detailed team information
     */
    async getTeamDetails(req, res) {
        try {
            const { team_id } = req.params;

            // Get team basic info
            const team = await this.db.get(
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
            const leaderboardPosition = await this.db.get(`
                SELECT 
                    total_score,
                    problems_solved,
                    total_time_seconds,
                    RANK() OVER (ORDER BY total_score DESC, total_time_seconds ASC) as rank
                FROM leaderboard 
                WHERE team_id = ?
            `, [team_id]);

            // Get all submissions with problem details
            const submissions = await this.db.all(`
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

            // Calculate team statistics
            const teamStats = this.scoreCalculator.calculateTeamScore(submissions);

            // Get problem attempts summary
            const problemAttempts = await this.db.all(`
                SELECT 
                    pa.*,
                    p.title as problem_title,
                    p.max_score,
                    p.difficulty
                FROM problem_attempts pa
                JOIN problems p ON pa.problem_id = p.problem_id
                WHERE pa.team_id = ?
                ORDER BY pa.best_score DESC
            `, [team_id]);

            res.json({
                success: true,
                team: {
                    ...team,
                    members: JSON.parse(team.members || '[]')
                },
                leaderboard_position: leaderboardPosition,
                statistics: teamStats,
                submissions: submissions.map(sub => ({
                    ...sub,
                    score_breakdown: this.scoreCalculator.calculateScore(sub, {
                        max_score: sub.problem_max_score,
                        difficulty: sub.difficulty
                    })
                })),
                problem_attempts: problemAttempts
            });

        } catch (error) {
            console.error('Get team details error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Update team leaderboard position
     */
    async updateTeamLeaderboard(teamId) {
        try {
            // Calculate team's aggregated stats
            const teamStats = await this.db.get(`
                SELECT 
                    team_id,
                    SUM(final_score) as total_score,
                    COUNT(DISTINCT CASE WHEN is_correct = TRUE THEN problem_id END) as problems_solved,
                    SUM(execution_time_ms / 1000) as total_time_seconds,
                    MAX(submission_time) as last_submission_time
                FROM submissions
                WHERE team_id = ?
                GROUP BY team_id
            `, [teamId]);

            if (teamStats) {
                // Update leaderboard
                await this.db.run(`
                    INSERT OR REPLACE INTO leaderboard (
                        team_id, total_score, problems_solved, total_time_seconds, last_submission_time
                    ) VALUES (?, ?, ?, ?, ?)
                `, [
                    teamId,
                    teamStats.total_score,
                    teamStats.problems_solved,
                    teamStats.total_time_seconds,
                    teamStats.last_submission_time
                ]);
            }

        } catch (error) {
            console.error('Update leaderboard error:', error);
        }
    }

    /**
     * Get team's current rank
     */
    async getTeamRank(teamId) {
        try {
            const result = await this.db.get(`
                SELECT RANK() OVER (ORDER BY total_score DESC, total_time_seconds ASC) as rank
                FROM leaderboard 
                WHERE team_id = ?
            `, [teamId]);

            return result?.rank || null;
        } catch (error) {
            console.error('Get team rank error:', error);
            return null;
        }
    }

    /**
     * Log competition events
     */
    async logCompetitionEvent(eventType, data) {
        try {
            await this.db.run(`
                INSERT INTO competition_events (event_type, team_id, problem_id, score, data)
                VALUES (?, ?, ?, ?, ?)
            `, [
                eventType,
                data.team_id || null,
                data.problem_id || null,
                data.score || null,
                JSON.stringify(data)
            ]);
        } catch (error) {
            console.error('Log event error:', error);
        }
    }

    /**
     * Get competition statistics
     */
    async getCompetitionStats(req, res) {
        try {
            // Overall statistics
            const overallStats = await this.db.get(`
                SELECT 
                    COUNT(DISTINCT s.team_id) as total_teams,
                    COUNT(*) as total_submissions,
                    COUNT(DISTINCT s.problem_id) as problems_attempted,
                    AVG(s.accuracy) as average_accuracy,
                    MAX(s.final_score) as highest_score,
                    COUNT(CASE WHEN s.is_correct = TRUE THEN 1 END) as correct_submissions
                FROM submissions s
            `);

            // Problem statistics
            const problemStats = await this.db.all(`
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

            // Recent activity
            const recentActivity = await this.db.all(`
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
                    ...overallStats,
                    average_accuracy: Math.round((overallStats.average_accuracy || 0) * 100) / 100,
                    success_rate: overallStats.total_submissions > 0 ? 
                        Math.round((overallStats.correct_submissions / overallStats.total_submissions) * 100) / 100 : 0
                },
                problem_stats: problemStats.map(stat => ({
                    ...stat,
                    average_accuracy: Math.round((stat.average_accuracy || 0) * 100) / 100,
                    success_rate: stat.total_submissions > 0 ? 
                        Math.round((stat.correct_submissions / stat.total_submissions) * 100) / 100 : 0
                })),
                recent_activity: recentActivity,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Get competition stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = LeaderboardController;
