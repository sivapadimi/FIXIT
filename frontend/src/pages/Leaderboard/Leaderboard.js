import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { leaderboardAPI } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  TrophyIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const Leaderboard = () => {
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { user } = useAuthStore();
  const { subscribeToLeaderboard, unsubscribeFromLeaderboard } = useSocket();

  // Fetch leaderboard
  const { data: leaderboardData, isLoading, refetch } = useQuery(
    ['leaderboard', page],
    () => leaderboardAPI.getLeaderboard({ page, limit: 50 }),
    {
      keepPreviousData: true,
      refetchInterval: autoRefresh ? 10000 : false, // Auto-refresh every 10 seconds
      select: (response) => response.data.data,
    }
  );

  // Fetch leaderboard stats
  const { data: stats } = useQuery(
    'leaderboard-stats',
    leaderboardAPI.getLeaderboardStats,
    {
      select: (response) => response.data.data,
    }
  );

  useEffect(() => {
    if (autoRefresh) {
      subscribeToLeaderboard();
    }
    return () => {
      unsubscribeFromLeaderboard();
    };
  }, [autoRefresh, subscribeToLeaderboard, unsubscribeFromLeaderboard]);

  const handleRefresh = () => {
    refetch();
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getRankClass = (rank, isCurrentUser) => {
    if (isCurrentUser) return 'leaderboard-row-current-user';
    if (rank === 1) return 'leaderboard-rank-1';
    if (rank === 2) return 'leaderboard-rank-2';
    if (rank === 3) return 'leaderboard-rank-3';
    return '';
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const leaderboard = leaderboardData?.leaderboard || [];
  const pagination = leaderboardData?.pagination || {};
  const currentUserRank = leaderboardData?.currentUserRank;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Leaderboard</h1>
          <p className="text-gray-400 mt-2">
            Real-time rankings of all participants
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-secondary'}`}
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </button>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary btn-sm"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Participants</p>
                  <p className="text-2xl font-bold text-gray-100">
                    {stats.overview.totalParticipants}
                  </p>
                </div>
                <UserIcon className="h-8 w-8 text-primary-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Active Participants</p>
                  <p className="text-2xl font-bold text-gray-100">
                    {stats.overview.activeParticipants}
                  </p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-success-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Submissions</p>
                  <p className="text-2xl font-bold text-gray-100">
                    {stats.overview.totalSubmissions}
                  </p>
                </div>
                <TrophyIcon className="h-8 w-8 text-warning-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-100">
                    {stats.overview.correctSubmissions > 0
                      ? Math.round((stats.overview.correctSubmissions / stats.overview.totalSubmissions) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="text-2xl">📊</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current User Rank */}
      {currentUserRank && (
        <div className="card bg-primary-900/20 border-primary-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-300">Your Rank</p>
                <p className="text-2xl font-bold text-primary-400">
                  #{currentUserRank.rank}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-primary-300">Your Score</p>
                <p className="text-2xl font-bold text-primary-400">
                  {currentUserRank.score}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-200">Rankings</h3>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <TrophyIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No participants yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      College
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Solved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {leaderboard.map((participant) => (
                    <tr
                      key={participant.id}
                      className={`leaderboard-row ${getRankClass(
                        participant.rank,
                        participant.isCurrentUser
                      )}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(participant.rank)}
                          <span className="ml-2 text-lg font-bold text-gray-100">
                            #{participant.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-200">
                            {participant.username}
                          </div>
                          <div className="text-sm text-gray-400">
                            {participant.teamName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {participant.college}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-200">
                          {participant.statistics.problemsSolved}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {participant.statistics.accuracy}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-300">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatTime(participant.statistics.totalTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-primary-400">
                          {participant.score}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1 rounded ${
                  pageNum === page
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
