/**
 * FixIt Score Calculation Service
 * Handles dynamic scoring with accuracy, time penalties, and bonuses
 */

class ScoreCalculator {
    constructor() {
        // Scoring configuration
        this.config = {
            // Time penalty per minute over time limit
            timePenaltyPerMinute: 2,
            // Bonus for perfect accuracy
            perfectAccuracyBonus: 10,
            // Penalty for wrong submissions
            wrongSubmissionPenalty: 5,
            // Minimum score for any attempt
            minimumScore: 0,
            // Maximum possible score multiplier
            maxScoreMultiplier: 1.0
        };
    }

    /**
     * Calculate accuracy based on test case results
     * @param {number} passedCases - Number of passed test cases
     * @param {number} totalCases - Total number of test cases
     * @returns {number} Accuracy percentage (0-1)
     */
    calculateAccuracy(passedCases, totalCases) {
        if (totalCases === 0) return 0;
        return Math.min(passedCases / totalCases, 1.0);
    }

    /**
     * Calculate time penalty based on execution time
     * @param {number} executionTimeMs - Execution time in milliseconds
     * @param {number} timeLimitMinutes - Time limit in minutes
     * @param {number} submissionTimeMinutes - Time taken to submit (optional)
     * @returns {number} Time penalty points
     */
    calculateTimePenalty(executionTimeMs, timeLimitMinutes, submissionTimeMinutes = 0) {
        const executionTimeMinutes = executionTimeMs / 60000; // Convert to minutes
        
        let penalty = 0;
        
        // Penalty for slow execution (over 1 second)
        if (executionTimeMs > 1000) {
            penalty += Math.floor(executionTimeMs / 1000) * 0.5;
        }
        
        // Penalty for taking too long to submit
        if (submissionTimeMinutes > timeLimitMinutes) {
            const overtimeMinutes = submissionTimeMinutes - timeLimitMinutes;
            penalty += overtimeMinutes * this.config.timePenaltyPerMinute;
        }
        
        return Math.round(penalty);
    }

    /**
     * Calculate final score for a submission
     * @param {Object} submission - Submission data
     * @param {Object} problem - Problem data
     * @returns {Object} Score breakdown
     */
    calculateScore(submission, problem) {
        const {
            passedCases,
            totalCases,
            executionTimeMs,
            submissionTime,
            language
        } = submission;
        
        const {
            maxScore = 100,
            timeLimitMinutes = 30,
            difficulty = 'easy'
        } = problem;
        
        // 1. Calculate accuracy
        const accuracy = this.calculateAccuracy(passedCases, totalCases);
        
        // 2. Calculate base score
        let baseScore = Math.round(maxScore * accuracy);
        
        // 3. Apply difficulty multiplier
        const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
        baseScore = Math.round(baseScore * difficultyMultiplier);
        
        // 4. Calculate time penalty
        const submissionTimeMinutes = this.calculateSubmissionTime(submissionTime);
        const timePenalty = this.calculateTimePenalty(
            executionTimeMs, 
            timeLimitMinutes, 
            submissionTimeMinutes
        );
        
        // 5. Apply bonuses and penalties
        let bonus = 0;
        let penalty = timePenalty;
        
        // Perfect accuracy bonus
        if (accuracy === 1.0) {
            bonus += this.config.perfectAccuracyBonus;
        }
        
        // Language-specific bonuses
        bonus += this.getLanguageBonus(language);
        
        // 6. Calculate final score
        let finalScore = baseScore + bonus - penalty;
        finalScore = Math.max(finalScore, this.config.minimumScore);
        
        return {
            accuracy: Math.round(accuracy * 100) / 100, // Round to 2 decimal places
            baseScore,
            timePenalty,
            bonus,
            finalScore,
            isCorrect: accuracy === 1.0,
            breakdown: {
                maxScore,
                accuracyPercent: Math.round(accuracy * 100),
                difficultyMultiplier,
                timePenaltyBreakdown: {
                    executionPenalty: executionTimeMs > 1000 ? Math.floor(executionTimeMs / 1000) * 0.5 : 0,
                    submissionPenalty: submissionTimeMinutes > timeLimitMinutes ? 
                        (submissionTimeMinutes - timeLimitMinutes) * this.config.timePenaltyPerMinute : 0
                },
                bonuses: {
                    perfectAccuracy: accuracy === 1.0 ? this.config.perfectAccuracyBonus : 0,
                    language: this.getLanguageBonus(language)
                }
            }
        };
    }

    /**
     * Get difficulty multiplier for score calculation
     * @param {string} difficulty - Problem difficulty
     * @returns {number} Multiplier value
     */
    getDifficultyMultiplier(difficulty) {
        const multipliers = {
            'easy': 1.0,
            'medium': 1.2,
            'hard': 1.5
        };
        return multipliers[difficulty] || 1.0;
    }

    /**
     * Get language-specific bonus
     * @param {string} language - Programming language
     * @returns {number} Bonus points
     */
    getLanguageBonus(language) {
        const bonuses = {
            'python': 0,    // Baseline
            'java': 2,      // Slight bonus for verbosity
            'cpp': 3        // Bonus for complexity
        };
        return bonuses[language] || 0;
    }

    /**
     * Calculate submission time in minutes
     * @param {Date|string} submissionTime - Submission timestamp
     * @returns {number} Time in minutes
     */
    calculateSubmissionTime(submissionTime) {
        if (!submissionTime) return 0;
        
        const submissionDate = new Date(submissionTime);
        const now = new Date();
        const diffMs = now - submissionDate;
        return diffMs / 60000; // Convert to minutes
    }

    /**
     * Calculate team's total score and ranking metrics
     * @param {Array} submissions - Team's submissions
     * @returns {Object} Team scoring summary
     */
    calculateTeamScore(submissions) {
        const totalScore = submissions.reduce((sum, sub) => sum + (sub.finalScore || 0), 0);
        const problemsSolved = submissions.filter(sub => sub.isCorrect).length;
        const totalTime = submissions.reduce((sum, sub) => sum + (sub.executionTimeMs || 0), 0);
        const averageAccuracy = submissions.length > 0 ? 
            submissions.reduce((sum, sub) => sum + (sub.accuracy || 0), 0) / submissions.length : 0;

        return {
            totalScore,
            problemsSolved,
            totalTimeMs: totalTime,
            totalTimeMinutes: Math.round(totalTime / 60000 * 100) / 100,
            averageAccuracy: Math.round(averageAccuracy * 100) / 100,
            submissionCount: submissions.length,
            bestSubmission: submissions.reduce((best, sub) => 
                (sub.finalScore || 0) > (best.finalScore || 0) ? sub : best, {}
            )
        };
    }

    /**
     * Generate leaderboard ranking
     * @param {Array} teams - Array of team data with scores
     * @returns {Array} Ranked teams
     */
    generateLeaderboard(teams) {
        return teams
            .map(team => ({
                ...team,
                rank: 0 // Will be calculated below
            }))
            .sort((a, b) => {
                // Primary sort: Total score (descending)
                if (b.totalScore !== a.totalScore) {
                    return b.totalScore - a.totalScore;
                }
                
                // Secondary sort: Problems solved (descending)
                if (b.problemsSolved !== a.problemsSolved) {
                    return b.problemsSolved - a.problemsSolved;
                }
                
                // Tertiary sort: Total time (ascending - less time is better)
                return a.totalTimeSeconds - b.totalTimeSeconds;
            })
            .map((team, index) => ({
                ...team,
                rank: index + 1
            }));
    }

    /**
     * Validate score calculation
     * @param {Object} submission - Submission data
     * @param {Object} problem - Problem data
     * @returns {boolean} True if calculation is valid
     */
    validateScore(submission, problem) {
        const score = this.calculateScore(submission, problem);
        
        // Check bounds
        if (score.finalScore < this.config.minimumScore) return false;
        if (score.finalScore > problem.maxScore * this.config.maxScoreMultiplier * 1.5) return false;
        
        // Check accuracy bounds
        if (score.accuracy < 0 || score.accuracy > 1) return false;
        
        return true;
    }
}

module.exports = ScoreCalculator;
