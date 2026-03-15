import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { io } from 'socket.io-client';
import { formatTime, formatScore } from '../utils/formatters';

const DynamicLeaderboard = ({ realTime = true, pollInterval = 5000 }) => {
    const [socket, setSocket] = useState(null);
    const [liveUpdates, setLiveUpdates] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);

    // API endpoints
    const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

    // Fetch leaderboard data
    const { 
        data: leaderboardData, 
        isLoading, 
        error, 
        refetch 
    } = useQuery(
        'leaderboard',
        async () => {
            const response = await fetch(`${API_BASE}/api/leaderboard`);
            if (!response.ok) throw new Error('Failed to fetch leaderboard');
            return response.json();
        },
        {
            refetchInterval: realTime ? pollInterval : false,
            refetchIntervalInBackground: true,
        }
    );

    // Fetch team details when team is selected
    const { data: teamDetails } = useQuery(
        ['teamDetails', selectedTeam],
        async () => {
            if (!selectedTeam) return null;
            const response = await fetch(`${API_BASE}/api/leaderboard/team/${selectedTeam}`);
            if (!response.ok) throw new Error('Failed to fetch team details');
            return response.json();
        },
        {
            enabled: !!selectedTeam,
        }
    );

    // Initialize WebSocket for real-time updates
    useEffect(() => {
        if (realTime) {
            const newSocket = io(API_BASE);
            
            newSocket.on('connect', () => {
                console.log('Connected to leaderboard updates');
            });

            newSocket.on('new-submission', (data) => {
                setLiveUpdates(prev => [data, ...prev.slice(0, 9)]);
                refetch(); // Refresh leaderboard
            });

            newSocket.on('leaderboard-update', (data) => {
                refetch();
            });

            setSocket(newSocket);

            return () => newSocket.close();
        }
    }, [realTime, API_BASE, refetch]);

    const handleTeamClick = (teamId) => {
        setSelectedTeam(selectedTeam === teamId ? null : teamId);
    };

    const getRankColor = (rank) => {
        if (rank === 1) return 'text-yellow-500 font-bold';
        if (rank === 2) return 'text-gray-400 font-bold';
        if (rank === 3) return 'text-orange-600 font-bold';
        return 'text-gray-600';
    };

    const getRankBadge = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return rank;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-500 p-4">
                <p>Error loading leaderboard: {error.message}</p>
                <button 
                    onClick={() => refetch()}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    const leaderboard = leaderboardData?.leaderboard || [];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">🏆 Live Leaderboard</h2>
                <div className="flex items-center space-x-4">
                    {realTime && (
                        <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                            <span className="text-sm text-gray-600">Live</span>
                        </div>
                    )}
                    <button 
                        onClick={() => refetch()}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Live Updates */}
            {realTime && liveUpdates.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">Recent Activity</h3>
                    <div className="space-y-1">
                        {liveUpdates.slice(0, 3).map((update, index) => (
                            <div key={index} className="text-xs text-green-700">
                                {update.is_correct ? '✅' : '❌'} Team {update.team_id} scored {update.score} points
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Leaderboard Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Team</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Solved</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Score</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((team) => (
                            <React.Fragment key={team.team_id}>
                                <tr 
                                    className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                                        selectedTeam === team.team_id ? 'bg-blue-50' : ''
                                    }`}
                                    onClick={() => handleTeamClick(team.team_id)}
                                >
                                    <td className="py-3 px-4">
                                        <span className={getRankColor(team.rank)}>
                                            {getRankBadge(team.rank)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div>
                                            <div className="font-semibold text-gray-800">{team.team_name}</div>
                                            <div className="text-sm text-gray-500">
                                                {JSON.parse(team.members || '[]').join(', ')}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                            {team.problems_solved}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="font-bold text-green-600">
                                            {formatScore(team.total_score)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center text-gray-600">
                                        {formatTime(team.total_time_seconds)}
                                    </td>
                                </tr>
                                
                                {/* Team Details Expansion */}
                                {selectedTeam === team.team_id && teamDetails && (
                                    <tr>
                                        <td colSpan="5" className="bg-gray-50 p-4">
                                            <TeamDetails teamDetails={teamDetails} />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {leaderboard.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏁</div>
                    <p>No submissions yet. Start solving problems to see the leaderboard!</p>
                </div>
            )}

            {/* Pagination */}
            {leaderboardData?.pagination?.has_more && (
                <div className="mt-4 text-center">
                    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
};

// Team Details Component
const TeamDetails = ({ teamDetails }) => {
    const { team, statistics, submissions, problem_attempts } = teamDetails;

    return (
        <div className="space-y-4">
            {/* Team Overview */}
            <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.totalScore}</div>
                    <div className="text-sm text-gray-600">Total Score</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.problemsSolved}</div>
                    <div className="text-sm text-gray-600">Problems Solved</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.averageAccuracy}%</div>
                    <div className="text-sm text-gray-600">Avg Accuracy</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{statistics.submissionCount}</div>
                    <div className="text-sm text-gray-600">Total Submissions</div>
                </div>
            </div>

            {/* Recent Submissions */}
            <div>
                <h4 className="font-semibold text-gray-700 mb-2">Recent Submissions</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {submissions.slice(0, 5).map((submission) => (
                        <div key={submission.submission_id} className="flex justify-between items-center p-2 bg-white rounded border">
                            <div>
                                <span className="font-medium">{submission.problem_title}</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                    submission.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {submission.is_correct ? 'Correct' : 'Incorrect'}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold">{submission.final_score} pts</div>
                                <div className="text-xs text-gray-500">
                                    {new Date(submission.submission_time).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Utility functions
const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
};

const formatScore = (score) => {
    return score.toLocaleString();
};

export default DynamicLeaderboard;
