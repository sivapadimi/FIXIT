#!/usr/bin/env python3
"""
FixIt Platform - Critical Bug Fixes & New Features Implementation
Frontend Components for React-based platform
"""

import json
import re
from datetime import datetime, timedelta

# =============================================================================
# BUG FIX #1: Test Case Status Display - Frontend Component
# =============================================================================

frontend_test_case_component = '''
// TestCaseResults.jsx - Fixed test case state management
import React, { useState, useEffect } from 'react';
import { useProblemStore } from '../stores/problemStore';

const TestCaseResults = ({ problemId, testCases, submissionResult, isRunning }) => {
    const { testCaseResults, setTestCaseResults } = useProblemStore();
    
    // Initialize test case results as PENDING on component mount
    useEffect(() => {
        const initialResults = testCases.map((testCase, index) => ({
            id: index + 1,
            status: 'pending', // CRITICAL FIX: Initialize as pending, not failed
            input: testCase.input,
            expected: testCase.expected,
            actual: '',
            error: '',
            isHidden: testCase.hidden
        }));
        setTestCaseResults(problemId, initialResults);
    }, [problemId, testCases]);
    
    // Update results when submission completes
    useEffect(() => {
        if (submissionResult && submissionResult.testResults) {
            const updatedResults = submissionResult.testResults.map((result, index) => ({
                id: index + 1,
                status: result.isCorrect ? 'passed' : 'failed',
                input: result.input,
                expected: result.expected,
                actual: result.actualOutput,
                error: result.errorMessage,
                isHidden: testCases[index]?.hidden || false
            }));
            setTestCaseResults(problemId, updatedResults);
        }
    }, [submissionResult, problemId, testCases]);
    
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return '<span class="badge badge-pending">⏳ PENDING</span>';
            case 'running':
                return '<span class="badge badge-running">🔄 RUNNING</span>';
            case 'passed':
                return '<span class="badge badge-success">✓ PASSED</span>';
            case 'failed':
                return '<span class="badge badge-error">✗ FAILED</span>';
            default:
                return '<span class="badge badge-unknown">❓ UNKNOWN</span>';
        }
    };
    
    const visibleResults = testCaseResults[problemId]?.filter(result => !result.isHidden) || [];
    
    return (
        <div className="test-results">
            <h3 style="margin-bottom: 1rem; color: #f9fafb;">
                Test Cases {isRunning && <span className="loading-spinner"></span>}
            </h3>
            
            {visibleResults.map((result, index) => (
                <div key={result.id} className="test-case">
                    <div className="flex-between" style="margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; color: #f9fafb;">
                            Test Case {result.id}
                        </span>
                        {getStatusBadge(result.status)}
                    </div>
                    <div style="font-size: 0.875rem; color: #9ca3af; margin-bottom: 0.5rem;">
                        <strong>Input:</strong> {result.input}<br />
                        <strong>Expected:</strong> {result.expected}<br />
                        {result.actual && <><strong>Output:</strong> {result.actual}<br /></>}
                        {result.error && <><strong>Error:</strong> {result.error}</>}
                    </div>
                </div>
            ))}
            
            {/* Loading state */}
            {isRunning && (
                <div className="test-case">
                    <div className="flex-between" style="margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; color: #f9fafb;">
                            Running Tests...
                        </span>
                        {getStatusBadge('running')}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestCaseResults;
'''

# =============================================================================
# BUG FIX #1: Backend Judge Response Format
# =============================================================================

backend_judge_response = '''
// Updated judge response format with per-test-case breakdown
{
    "overallStatus": "ACCEPTED",
    "passedTests": 4,
    "totalTests": 5,
    "visiblePassed": 3,
    "visibleTotal": 3,
    "totalExecutionTime": 245.5,
    "finalScore": 85,
    "testResults": [
        {
            "testCaseId": 1,
            "input": "1",
            "expectedOutput": "1",
            "actualOutput": "1",
            "status": "ACCEPTED",
            "isCorrect": true,
            "isHidden": false,
            "executionTime": 45.2,
            "memoryUsed": 1024,
            "errorMessage": ""
        },
        {
            "testCaseId": 2,
            "input": "2", 
            "expectedOutput": "1",
            "actualOutput": "0",
            "status": "WRONG_ANSWER",
            "isCorrect": false,
            "isHidden": false,
            "executionTime": 48.1,
            "memoryUsed": 1024,
            "errorMessage": ""
        }
    ]
}
'''

# =============================================================================
# BUG FIX #1: Zustand Store for Test Case Results
# =============================================================================

problem_store = '''
// stores/problemStore.js - Zustand store for problem state
import { create } from 'zustand';

export const useProblemStore = create((set, get) => ({
    // Problem state
    problems: [],
    currentProblem: null,
    testCaseResults: {}, // problemId -> array of test results
    
    // Actions
    setProblems: (problems) => set({ problems }),
    setCurrentProblem: (problem) => set({ currentProblem: problem }),
    
    // Test case results management
    setTestCaseResults: (problemId, results) => {
        set((state) => ({
            testCaseResults: {
                ...state.testCaseResults,
                [problemId]: results
            }
        }));
    },
    
    updateTestCaseResult: (problemId, testCaseId, result) => {
        set((state) => {
            const currentResults = state.testCaseResults[problemId] || [];
            const updatedResults = currentResults.map(r => 
                r.id === testCaseId ? { ...r, ...result } : r
            );
            return {
                testCaseResults: {
                    ...state.testCaseResults,
                    [problemId]: updatedResults
                }
            };
        });
    },
    
    clearTestCaseResults: (problemId) => {
        set((state) => {
            const newResults = { ...state.testCaseResults };
            delete newResults[problemId];
            return { testCaseResults: newResults };
        });
    },
    
    // Reset all state
    reset: () => set({
        problems: [],
        currentProblem: null,
        testCaseResults: {}
    })
}));
'''

# =============================================================================
# FEATURE #2: Reset Button Component
# =============================================================================

reset_button_component = '''
// ResetButton.jsx - Reset code to original buggy version
import React, { useState, useRef } from 'react';
import { useProblemStore } from '../stores/problemStore';

const ResetButton = ({ problemId, currentCode, onReset }) => {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const { problems } = useProblemStore();
    
    const problem = problems.find(p => p.id === problemId);
    const originalCode = problem?.buggy_code?.python || ''; // Store original code
    
    const handleResetClick = () => {
        setShowConfirmDialog(true);
    };
    
    const handleConfirmReset = () => {
        if (onReset) {
            onReset(originalCode);
        }
        
        // Clear test case results
        const { clearTestCaseResults } = useProblemStore.getState();
        clearTestCaseResults(problemId);
        
        setShowConfirmDialog(false);
    };
    
    const handleCancelReset = () => {
        setShowConfirmDialog(false);
    };
    
    return (
        <>
            <button
                onClick={handleResetClick}
                className="btn btn-outline-warning"
                style={{
                    marginLeft: '0.5rem',
                    padding: '0.5rem 1rem',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                }}
                title="Reset to original buggy code"
            >
                🔄 Reset Code
            </button>
            
            {showConfirmDialog && (
                <div className="modal-overlay">
                    <div className="modal-dialog">
                        <div className="modal-header">
                            <h3>Reset Code</h3>
                        </div>
                        <div className="modal-body">
                            <p>Reset to original buggy code? Your changes will be lost.</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={handleCancelReset}
                                className="btn btn-secondary"
                                style={{ marginRight: '0.5rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReset}
                                className="btn btn-warning"
                            >
                                Reset Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ResetButton;
'''

# =============================================================================
# FEATURE #3: Timer Component
# =============================================================================

timer_component = '''
// Timer.jsx - Live timer counting up from problem start time
import React, { useState, useEffect, useRef } from 'react';

const Timer = ({ startTime, onTimeUpdate }) => {
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef(null);
    
    useEffect(() => {
        const startTimestamp = new Date(startTime).getTime();
        
        intervalRef.current = setInterval(() => {
            const now = new Date().getTime();
            const elapsedSeconds = Math.floor((now - startTimestamp) / 1000);
            setElapsed(elapsedSeconds);
            
            if (onTimeUpdate) {
                onTimeUpdate(elapsedSeconds);
            }
        }, 1000); // Update every second
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [startTime, onTimeUpdate]);
    
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    };
    
    const getTimeMultiplier = (seconds) => {
        if (seconds <= 300) return 1.5;      // 5 minutes
        if (seconds <= 600) return 1.2;      // 10 minutes
        if (seconds <= 1200) return 1.0;     // 20 minutes
        return 0.8;                          // After 20 minutes
    };
    
    const multiplier = getTimeMultiplier(elapsed);
    const multiplierColor = multiplier >= 1.2 ? '#10b981' : 
                          multiplier >= 1.0 ? '#f59e0b' : '#ef4444';
    
    return (
        <div className="timer-container" style={{
            background: '#1f2937',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Time Elapsed</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f9fafb' }}>
                        {formatTime(elapsed)}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Score Multiplier</span>
                    <div style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: 'bold', 
                        color: multiplierColor 
                    }}>
                        {multiplier}x
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timer;
'''

# =============================================================================
# FEATURE #3: Score Breakdown Modal
# =============================================================================

score_breakdown_modal = '''
// ScoreBreakdownModal.jsx - Shows detailed score calculation
import React from 'react';

const ScoreBreakdownModal = ({ isOpen, onClose, scoreData }) => {
    if (!isOpen || !scoreData) return null;
    
    const {
        baseScore,
        timeMultiplier,
        timeBonus,
        wrongAttempts,
        penaltyDeduction,
        finalScore,
        timeElapsed
    } = scoreData;
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-dialog score-breakdown" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>🏆 Score Breakdown</h3>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>
                <div className="modal-body">
                    <div className="score-item">
                        <span className="label">Base Score Earned:</span>
                        <span className="value positive">+{baseScore} points</span>
                    </div>
                    
                    <div className="score-item">
                        <span className="label">Time Elapsed:</span>
                        <span className="value">{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</span>
                    </div>
                    
                    <div className="score-item">
                        <span className="label">Time Multiplier:</span>
                        <span className={`value ${timeMultiplier >= 1.2 ? 'positive' : timeMultiplier >= 1.0 ? 'neutral' : 'negative'}`}>
                            {timeMultiplier}x
                        </span>
                    </div>
                    
                    <div className="score-item">
                        <span className="label">Time Bonus:</span>
                        <span className={`value ${timeBonus >= 0 ? 'positive' : 'negative'}`}>
                            {timeBonus >= 0 ? '+' : ''}{timeBonus} points
                        </span>
                    </div>
                    
                    <div className="score-item">
                        <span className="label">Wrong Attempts:</span>
                        <span className="value negative">-{wrongAttempts} attempts</span>
                    </div>
                    
                    <div className="score-item">
                        <span className="label">Penalty Deduction:</span>
                        <span className="value negative">-{penaltyDeduction} points</span>
                    </div>
                    
                    <div className="score-divider"></div>
                    
                    <div className="score-item total">
                        <span className="label">Final Score:</span>
                        <span className={`value ${finalScore > 0 ? 'positive' : 'neutral'}`}>
                            {finalScore} points
                        </span>
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-primary">
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScoreBreakdownModal;
'''

print("Frontend components created successfully!")
print("Files to create:")
print("1. components/TestCaseResults.jsx")
print("2. stores/problemStore.js") 
print("3. components/ResetButton.jsx")
print("4. components/Timer.jsx")
print("5. components/ScoreBreakdownModal.jsx")
