import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI, problemsAPI, leaderboardAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  CodeBracketIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuthStore();

  // Fetch user statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    'user-stats',
    authAPI.getStats,
    {
      select: (response) => response.data.data.statistics,
    }
  );

  // Fetch recent problems
  const { data: problems, isLoading: problemsLoading } = useQuery(
    'recent-problems',
    () => problemsAPI.getProblems({ limit: 5 }),
    {
      select: (response) => response.data.data.problems,
    }
  );

  // Fetch top leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery(
    'top-leaderboard',
    () => leaderboardAPI.getTopUsers(5),
    {
      select: (response) => response.data.data.topUsers,
    }
  );

  const isLoading = statsLoading || problemsLoading || leaderboardLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color = 'primary' }) => (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-100">{value}</p>
          </div>
          <div className={`p-3 rounded-lg bg-${color}-900/20`}>
            <Icon className={`h-6 w-6 text-${color}-400`} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">
          Welcome back, {user?.username}! 👋
        </h1>
        <p className="text-gray-400 mt-2">
          Here's what's happening with your debugging journey.
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Problems Solved"
          value={stats?.problemsSolved || 0}
          icon={CheckCircleIcon}
          color="success"
        />
        <StatCard
          title="Total Submissions"
          value={stats?.totalSubmissions || 0}
          icon={CodeBracketIcon}
          color="primary"
        />
        <StatCard
          title="Accuracy"
          value={`${stats?.accuracy || 0}%`}
          icon={TrophyIcon}
          color="warning"
        />
        <StatCard
          title="Average Time"
          value={`${stats?.averageTime || 0}ms`}
          icon={ClockIcon}
          color="error"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Problems */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-200">Recent Problems</h3>
              <Link
                to="/problems"
                className="text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="card-body">
            {problems?.length === 0 ? (
              <div className="text-center py-8">
                <CodeBracketIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No problems available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {problems?.map((problem) => (
                  <div key={problem._id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex-1">
                      <Link
                        to={`/problems/${problem._id}`}
                        className="text-gray-200 font-medium hover:text-primary-400 transition-colors"
                      >
                        {problem.title}
                      </Link>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`badge badge-${problem.difficulty}`}>
                          {problem.difficulty}
                        </span>
                        <span className="text-xs text-gray-400">
                          Level {problem.level}
                        </span>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Leaderboard */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-200">Top Performers</h3>
              <Link
                to="/leaderboard"
                className="text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="card-body">
            {leaderboard?.length === 0 ? (
              <div className="text-center py-8">
                <TrophyIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard?.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? 'bg-yellow-900/20 border border-yellow-800' :
                      index === 1 ? 'bg-gray-600/20 border border-gray-400' :
                      index === 2 ? 'bg-orange-900/20 border border-orange-600' :
                      'bg-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <span className={`text-lg font-bold ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-gray-300' :
                          index === 2 ? 'text-orange-400' :
                          'text-gray-400'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-200 font-medium">
                          {participant.username}
                        </p>
                        <p className="text-xs text-gray-400">
                          {participant.teamName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-200 font-bold">
                        {participant.statistics.problemsSolved}
                      </p>
                      <p className="text-xs text-gray-400">solved</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-200">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/problems"
              className="flex items-center justify-center p-4 bg-primary-900/20 border border-primary-800 rounded-lg hover:bg-primary-900/30 transition-colors group"
            >
              <CodeBracketIcon className="h-8 w-8 text-primary-400 group-hover:text-primary-300 mr-3" />
              <div className="text-left">
                <p className="text-gray-200 font-medium">Solve Problems</p>
                <p className="text-xs text-gray-400">Start debugging</p>
              </div>
            </Link>

            <Link
              to="/submissions"
              className="flex items-center justify-center p-4 bg-success-900/20 border border-success-800 rounded-lg hover:bg-success-900/30 transition-colors group"
            >
              <FireIcon className="h-8 w-8 text-success-400 group-hover:text-success-300 mr-3" />
              <div className="text-left">
                <p className="text-gray-200 font-medium">View Submissions</p>
                <p className="text-xs text-gray-400">Check your progress</p>
              </div>
            </Link>

            <Link
              to="/leaderboard"
              className="flex items-center justify-center p-4 bg-warning-900/20 border border-warning-800 rounded-lg hover:bg-warning-900/30 transition-colors group"
            >
              <TrophyIcon className="h-8 w-8 text-warning-400 group-hover:text-warning-300 mr-3" />
              <div className="text-left">
                <p className="text-gray-200 font-medium">Leaderboard</p>
                <p className="text-xs text-gray-400">See rankings</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
