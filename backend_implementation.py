#!/usr/bin/env python3
"""
FixIt Platform - Backend Implementation for New Features
Updated judge system, scoring, and leaderboard APIs
"""

import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# =============================================================================
# FEATURE #3: Updated Scoring Logic - Backend
# =============================================================================

scoring_implementation = '''
// backend/routes/submissions.js - Updated submission handler with scoring
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const User = require('../models/User');

const calculateScore = (baseScore, startTime, submissionTime, wrongAttempts) => {
    // Calculate elapsed time in seconds
    const elapsedSeconds = Math.floor((submissionTime - startTime) / 1000);
    
    // Determine time multiplier
    let timeMultiplier;
    if (elapsedSeconds <= 300) {        // 5 minutes
        timeMultiplier = 1.5;
    } else if (elapsedSeconds <= 600) {   // 10 minutes
        timeMultiplier = 1.2;
    } else if (elapsedSeconds <= 1200) {  // 20 minutes
        timeMultiplier = 1.0;
    } else {                              // After 20 minutes
        timeMultiplier = 0.8;
    }
    
    // Calculate penalties (5 points per wrong attempt)
    const penaltyDeduction = wrongAttempts * 5;
    
    // Calculate final score
    const timeBonus = Math.floor(baseScore * (timeMultiplier - 1));
    const finalScore = Math.max(0, Math.floor((baseScore * timeMultiplier) - penaltyDeduction));
    
    return {
        baseScore,
        elapsedSeconds,
        timeMultiplier,
        timeBonus,
        wrongAttempts,
        penaltyDeduction,
        finalScore
    };
};

// Track problem start time
const trackProblemStart = async (req, res) => {
    try {
        const { problemId } = req.params;
        const userId = req.user.id;
        
        // Check if already tracking start time
        const redis = req.app.get('redis');
        const startTimeKey = `problem_start:${userId}:${problemId}`;
        
        const existingStartTime = await redis.get(startTimeKey);
        
        if (!existingStartTime) {
            // Set start time if not exists
            await redis.set(startTimeKey, Date.now(), 'EX', 86400); // 24 hours expiry
        }
        
        res.json({ startTime: existingStartTime || Date.now() });
    } catch (error) {
        console.error('Error tracking problem start:', error);
        res.status(500).json({ error: 'Failed to track problem start' });
    }
};

// Enhanced submission handler
const submitSolution = async (req, res) => {
    try {
        const { problemId, code, language, testResults } = req.body;
        const userId = req.user.id;
        
        // Get problem details
        const problem = await Problem.findOne({ problem_id: problemId });
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }
        
        // Get start time from Redis
        const redis = req.app.get('redis');
        const startTimeKey = `problem_start:${userId}:${problemId}`;
        const startTime = parseInt(await redis.get(startTimeKey)) || Date.now();
        
        // Count wrong attempts before this submission
        const wrongAttempts = await Submission.countDocuments({
            user_id: userId,
            problem_id: problemId,
            correct: false,
            submitted_at: { $gte: new Date(startTime) }
        });
        
        // Calculate base score from test results
        let baseScore = 0;
        if (testResults) {
            for (const bug of problem.bugs) {
                const bugResult = testResults.find(r => r.bugId === bug.bug_id);
                if (bugResult && bugResult.isCorrect) {
                    baseScore += bug.points;
                }
            }
        }
        
        // Calculate final score with time and penalties
        const submissionTime = Date.now();
        const scoreData = calculateScore(baseScore, startTime, submissionTime, wrongAttempts);
        
        // Determine if submission is correct
        const isCorrect = testResults && testResults.every(r => r.isCorrect);
        
        // Save submission
        const submission = new Submission({
            user_id: userId,
            problem_id: problemId,
            problem_title: problem.title,
            language,
            code,
            correct: isCorrect,
            score: scoreData.finalScore,
            base_score: scoreData.baseScore,
            time_multiplier: scoreData.timeMultiplier,
            time_bonus: scoreData.timeBonus,
            wrong_attempts: wrongAttempts,
            penalty_deduction: scoreData.penaltyDeduction,
            elapsed_seconds: scoreData.elapsedSeconds,
            start_time: new Date(startTime),
            submitted_at: new Date(submissionTime),
            test_results: testResults
        });
        
        await submission.save();
        
        // Clear start time if correct
        if (isCorrect) {
            await redis.del(startTimeKey);
        }
        
        // Emit leaderboard update
        req.app.get('io').emit('leaderboard_update', {
            userId,
            problemId,
            score: scoreData.finalScore,
            isCorrect
        });
        
        res.json({
            success: true,
            overallStatus: isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
            score: scoreData.finalScore,
            scoreBreakdown: scoreData,
            testResults,
            submission
        });
        
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Submission failed' });
    }
};

module.exports = {
    trackProblemStart,
    submitSolution,
    calculateScore
};
'''

# =============================================================================
# FEATURE #4: Real Leaderboard API - MongoDB Aggregation
# =============================================================================

leaderboard_api_mongodb = '''
// backend/routes/leaderboard.js - Real leaderboard with MongoDB aggregation
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const User = require('../models/User');

const getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await Submission.aggregate([
            // Stage 1: Group by user and get best submission per problem
            {
                $group: {
                    _id: {
                        user_id: '$user_id',
                        problem_id: '$problem_id'
                    },
                    bestScore: { $max: '$score' },
                    firstCorrectTime: {
                        $min: {
                            $cond: [
                                { $eq: ['$correct', true] },
                                '$elapsed_seconds',
                                null
                            ]
                        }
                    },
                    submissions: { $push: '$$ROOT' }
                }
            },
            
            // Stage 2: Group by user to aggregate across all problems
            {
                $group: {
                    _id: '$_id.user_id',
                    total_score: { $sum: '$bestScore' },
                    problems_solved: {
                        $sum: {
                            $cond: [
                                { $gt: ['$bestScore', 0] },
                                1,
                                0
                            ]
                        }
                    },
                    total_time_seconds: { $sum: '$firstCorrectTime' },
                    last_submission: { $max: '$submissions.submitted_at' },
                    submissions: { $push: '$$ROOT' }
                }
            },
            
            // Stage 3: Join with user collection
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            
            // Stage 4: Unwind user array
            {
                $unwind: '$user'
            },
            
            // Stage 5: Project final structure
            {
                $project: {
                    _id: 0,
                    user_id: '$_id',
                    username: '$user.username',
                    teamname: '$user.teamname',
                    total_score: 1,
                    problems_solved: 1,
                    total_time_seconds: 1,
                    last_submission: 1
                }
            },
            
            // Stage 6: Sort by score, problems solved, then time
            {
                $sort: {
                    total_score: -1,
                    problems_solved: -1,
                    total_time_seconds: 1
                }
            },
            
            // Stage 7: Limit to top 50
            {
                $limit: 50
            },
            
            // Stage 8: Add rank
            {
                $addFields: {
                    rank: { $add: [{ $indexOfArray: ['$_id', '$_id'] }, 1] }
                }
            }
        ]);
        
        // Get total participants count
        const totalParticipants = await User.countDocuments();
        
        res.json({
            leaderboard,
            last_updated: new Date().toISOString(),
            total_participants: totalParticipants
        });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

const getUserRank = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const userRank = await Submission.aggregate([
            // Get user's stats
            {
                $match: { user_id: mongoose.Types.ObjectId(userId) }
            },
            
            // Group by problem for best scores
            {
                $group: {
                    _id: '$problem_id',
                    bestScore: { $max: '$score' },
                    firstCorrectTime: {
                        $min: {
                            $cond: [
                                { $eq: ['$correct', true] },
                                '$elapsed_seconds',
                                null
                            ]
                        }
                    }
                }
            },
            
            // Group by user for totals
            {
                $group: {
                    _id: userId,
                    total_score: { $sum: '$bestScore' },
                    problems_solved: {
                        $sum: {
                            $cond: [
                                { $gt: ['$bestScore', 0] },
                                1,
                                0
                            ]
                        }
                    },
                    total_time_seconds: { $sum: '$firstCorrectTime' }
                }
            },
            
            // Get all users for ranking
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            
            { $unwind: '$user' },
            
            {
                $project: {
                    _id: 0,
                    user_id: '$_id',
                    username: '$user.username',
                    teamname: '$user.teamname',
                    total_score: 1,
                    problems_solved: 1,
                    total_time_seconds: 1
                }
            }
        ]);
        
        if (userRank.length === 0) {
            return res.json({ rank: null, stats: null });
        }
        
        // Get all users sorted to find rank
        const allUsers = await Submission.aggregate([
            // Same pipeline as above but without user filter
            ...[/* same aggregation stages as getLeaderboard */]
        ]);
        
        const userStats = userRank[0];
        const rank = allUsers.findIndex(u => u.user_id.toString() === userId) + 1;
        
        res.json({ rank, stats: userStats });
        
    } catch (error) {
        console.error('User rank error:', error);
        res.status(500).json({ error: 'Failed to get user rank' });
    }
};

module.exports = {
    getLeaderboard,
    getUserRank
};
'''

# =============================================================================
# FEATURE #4: SQLite Equivalent Queries
# =============================================================================

leaderboard_api_sqlite = '''
-- SQLite queries for leaderboard functionality

-- Get leaderboard data
WITH user_best_scores AS (
    SELECT 
        user_id,
        problem_id,
        MAX(score) as best_score,
        MIN(CASE WHEN correct = 1 THEN elapsed_seconds END) as first_correct_time
    FROM submissions 
    GROUP BY user_id, problem_id
),
user_stats AS (
    SELECT 
        user_id,
        SUM(best_score) as total_score,
        SUM(CASE WHEN best_score > 0 THEN 1 ELSE 0 END) as problems_solved,
        SUM(first_correct_time) as total_time_seconds,
        MAX(submitted_at) as last_submission
    FROM user_best_scores
    GROUP BY user_id
),
ranked_users AS (
    SELECT 
        u.id as user_id,
        u.username,
        u.teamname,
        COALESCE(us.total_score, 0) as total_score,
        COALESCE(us.problems_solved, 0) as problems_solved,
        COALESCE(us.total_time_seconds, 0) as total_time_seconds,
        us.last_submission,
        ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_score, 0) DESC, 
                                    COALESCE(us.problems_solved, 0) DESC, 
                                    COALESCE(us.total_time_seconds, 999999) ASC) as rank
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
)
SELECT 
    rank,
    username,
    teamname,
    total_score,
    problems_solved,
    total_time_seconds,
    last_submission
FROM ranked_users
ORDER BY rank
LIMIT 50;

-- Get specific user rank
WITH user_best_scores AS (
    SELECT 
        user_id,
        problem_id,
        MAX(score) as best_score,
        MIN(CASE WHEN correct = 1 THEN elapsed_seconds END) as first_correct_time
    FROM submissions 
    WHERE user_id = ?
    GROUP BY user_id, problem_id
),
user_stats AS (
    SELECT 
        user_id,
        SUM(best_score) as total_score,
        SUM(CASE WHEN best_score > 0 THEN 1 ELSE 0 END) as problems_solved,
        SUM(first_correct_time) as total_time_seconds
    FROM user_best_scores
    GROUP BY user_id
),
ranked_users AS (
    SELECT 
        u.id as user_id,
        u.username,
        u.teamname,
        COALESCE(us.total_score, 0) as total_score,
        COALESCE(us.problems_solved, 0) as problems_solved,
        COALESCE(us.total_time_seconds, 0) as total_time_seconds,
        ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_score, 0) DESC, 
                                    COALESCE(us.problems_solved, 0) DESC, 
                                    COALESCE(us.total_time_seconds, 999999) ASC) as rank
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
)
SELECT 
    rank,
    username,
    teamname,
    total_score,
    problems_solved,
    total_time_seconds
FROM ranked_users
WHERE user_id = ?;
'''

# =============================================================================
# FEATURE #4: Real-time Leaderboard React Component
# =============================================================================

leaderboard_component = '''
// components/Leaderboard.jsx - Real-time leaderboard with Socket.io
import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { io } from 'socket.io-client';

const Leaderboard = ({ limit = 50 }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [userRank, setUserRank] = useState(null);
    const socketRef = useRef(null);
    const { currentUser } = useAuthStore();
    
    // Initialize Socket.io connection
    useEffect(() => {
        socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
        
        // Listen for leaderboard updates
        socketRef.current.on('leaderboard_update', (data) => {
            console.log('Leaderboard update received:', data);
            fetchLeaderboard(); // Refresh leaderboard on updates
        });
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);
    
    // Fetch initial leaderboard data
    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/leaderboard');
            const data = await response.json();
            
            setLeaderboard(data.leaderboard || []);
            setLastUpdated(data.last_updated);
            setTotalParticipants(data.total_participants);
            
            // Find current user's rank
            if (currentUser) {
                const userEntry = data.leaderboard.find(entry => entry.user_id === currentUser.id);
                setUserRank(userEntry ? userEntry.rank : null);
            }
            
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchLeaderboard();
        
        // Auto-refresh every 30 seconds as fallback
        const interval = setInterval(fetchLeaderboard, 30000);
        return () => clearInterval(interval);
    }, [currentUser]);
    
    const getRankChange = (currentRank, previousRank) => {
        if (!previousRank) return null;
        if (currentRank < previousRank) {
            return <span style={{ color: '#10b981' }}>↑{previousRank - currentRank}</span>;
        } else if (currentRank > previousRank) {
            return <span style={{ color: '#ef4444' }}>↓{currentRank - previousRank}</span>;
        }
        return <span style={{ color: '#6b7280' }}>=</span>;
    };
    
    const formatTime = (seconds) => {
        if (!seconds) return '--';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };
    
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };
    
    if (loading) {
        return (
            <div className="leaderboard-container">
                <h2>🏆 Leaderboard</h2>
                <div className="loading-spinner">Loading leaderboard...</div>
            </div>
        );
    }
    
    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h2>🏆 Leaderboard</h2>
                <div className="leaderboard-info">
                    <span>Total Participants: {totalParticipants}</span>
                    <span>Last Updated: {lastUpdated ? formatDate(lastUpdated) : 'Never'}</span>
                </div>
            </div>
            
            {userRank && (
                <div className="user-rank-banner">
                    🎯 You are ranked <strong>#{userRank}</strong> overall
                </div>
            )}
            
            <div className="leaderboard-table">
                <div className="table-header">
                    <div className="col-rank">Rank</div>
                    <div className="col-team">Team/User</div>
                    <div className="col-score">Score</div>
                    <div className="col-solved">Solved</div>
                    <div className="col-time">Avg Time</div>
                    <div className="col-active">Last Active</div>
                </div>
                
                {leaderboard.map((entry, index) => {
                    const isCurrentUser = currentUser && entry.user_id === currentUser.id;
                    const avgTime = entry.problems_solved > 0 ? 
                        Math.floor(entry.total_time_seconds / entry.problems_solved) : 0;
                    
                    return (
                        <div 
                            key={entry.user_id} 
                            className={`table-row ${isCurrentUser ? 'current-user' : ''}`}
                        >
                            <div className="col-rank">
                                #{entry.rank}
                                {index > 0 && getRankChange(entry.rank, leaderboard[index - 1].rank)}
                            </div>
                            <div className="col-team">
                                <div className="team-name">{entry.teamname || entry.username}</div>
                                {entry.teamname && (
                                    <div className="user-name">{entry.username}</div>
                                )}
                            </div>
                            <div className="col-score">
                                <strong>{entry.total_score}</strong>
                            </div>
                            <div className="col-solved">{entry.problems_solved}</div>
                            <div className="col-time">{formatTime(avgTime)}</div>
                            <div className="col-active">
                                {formatDate(entry.last_submission)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Leaderboard;
'''

print("Backend implementations created successfully!")
print("Files to create/update:")
print("1. backend/routes/submissions.js (enhanced with scoring)")
print("2. backend/routes/leaderboard.js (MongoDB aggregation)")
print("3. backend/routes/leaderboard-sqlite.js (SQLite queries)")
print("4. components/Leaderboard.jsx (real-time component)")
