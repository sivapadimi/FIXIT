import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PlayIcon,
  TrophyIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Start Exam',
      description: 'Begin a new exam session',
      icon: PlayIcon,
      color: 'bg-success-600 hover:bg-success-700',
      action: () => navigate('/admin/exam-control'),
      available: dashboardData?.currentEvent?.status === 'upcoming'
    },
    {
      title: 'View Scores',
      description: 'Monitor user performance',
      icon: TrophyIcon,
      color: 'bg-primary-600 hover:bg-primary-700',
      action: () => navigate('/admin/user-scores'),
      available: true
    },
    {
      title: 'Manage Users',
      description: 'View and manage participants',
      icon: UserGroupIcon,
      color: 'bg-warning-600 hover:bg-warning-700',
      action: () => navigate('/admin/users'),
      available: true
    },
    {
      title: 'System Settings',
      description: 'Configure system options',
      icon: ChartBarIcon,
      color: 'bg-gray-600 hover:bg-gray-700',
      action: () => navigate('/admin/special-options'),
      available: true
    }
  ];

  const getStatCardColor = (index) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
    ];
    return colors[index % colors.length];
  };

  const formatTime = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back, {user?.username}!</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Current Time</p>
          <p className="text-lg font-medium text-white">
            {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Current Event Status */}
      {dashboardData?.currentEvent && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 border border-primary-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Current Exam Session</h2>
              <p className="text-primary-200">{dashboardData.currentEvent.name}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                dashboardData.currentEvent.status === 'running' 
                  ? 'bg-success-100 text-success-800' 
                  : dashboardData.currentEvent.status === 'upcoming'
                  ? 'bg-warning-100 text-warning-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {dashboardData.currentEvent.status.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-8 w-8 text-white" />
                <div>
                  <p className="text-sm text-primary-200">Time Remaining</p>
                  <p className="text-xl font-bold text-white">
                    {formatTime(dashboardData.currentEvent.timeRemaining)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <UserGroupIcon className="h-8 w-8 text-white" />
                <div>
                  <p className="text-sm text-primary-200">Active Participants</p>
                  <p className="text-xl font-bold text-white">
                    {dashboardData.userStats?.team?.active || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="h-8 w-8 text-white" />
                <div>
                  <p className="text-sm text-primary-200">Total Submissions</p>
                  <p className="text-xl font-bold text-white">
                    {dashboardData.submissionStats?.correct || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${getStatCardColor(0)} rounded-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Total Users</p>
              <p className="text-3xl font-bold">
                {(dashboardData?.userStats?.team?.count || 0) + (dashboardData?.userStats?.admin?.count || 0)}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {dashboardData?.userStats?.team?.active || 0} active
              </p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-white/50" />
          </div>
        </div>

        <div className={`${getStatCardColor(1)} rounded-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Total Problems</p>
              <p className="text-3xl font-bold">{dashboardData?.problemStats?.total || 0}</p>
              <p className="text-white/60 text-sm mt-1">
                {dashboardData?.problemStats?.active || 0} active
              </p>
            </div>
            <DocumentTextIcon className="h-12 w-12 text-white/50" />
          </div>
        </div>

        <div className={`${getStatCardColor(2)} rounded-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Submissions</p>
              <p className="text-3xl font-bold">
                {Object.values(dashboardData?.submissionStats || {}).reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {dashboardData?.submissionStats?.correct || 0} correct
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-white/50" />
          </div>
        </div>

        <div className={`${getStatCardColor(3)} rounded-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Top Score</p>
              <p className="text-3xl font-bold">
                {dashboardData?.topUsers?.[0]?.score || 0}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {dashboardData?.topUsers?.[0]?.username || 'N/A'}
              </p>
            </div>
            <TrophyIcon className="h-12 w-12 text-white/50" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={!action.available}
              className={`p-4 rounded-lg text-white transition-all ${
                action.available 
                  ? `${action.color} transform hover:scale-105` 
                  : 'bg-gray-700 opacity-50 cursor-not-allowed'
              }`}
            >
              <action.icon className="h-8 w-8 mb-2 mx-auto" />
              <h3 className="font-semibold">{action.title}</h3>
              <p className="text-sm opacity-80 mt-1">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Submissions</h2>
            <button
              onClick={() => navigate('/admin/submissions')}
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData?.recentSubmissions?.slice(0, 5).map((submission) => (
                <div key={submission._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      submission.status === 'correct' ? 'bg-success-500' : 
                      submission.status === 'wrong' ? 'bg-error-500' : 
                      'bg-warning-500'
                    }`} />
                    <div>
                      <p className="text-white font-medium">{submission.user.username}</p>
                      <p className="text-gray-400 text-sm">{submission.problem.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      submission.status === 'correct' ? 'text-success-400' : 
                      submission.status === 'wrong' ? 'text-error-400' : 
                      'text-warning-400'
                    }`}>
                      {submission.status}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(submission.submittedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Top Performers</h2>
            <button
              onClick={() => navigate('/admin/user-scores')}
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData?.topUsers?.map((user, index) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 
                      'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.username}</p>
                      <p className="text-gray-400 text-sm">{user.teamName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{user.score}</p>
                    <p className="text-gray-500 text-sm">
                      {user.statistics.problemsSolved} solved
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">System Status</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-success-400" />
              <div>
                <p className="text-white font-medium">Database</p>
                <p className="text-gray-400 text-sm">Connected and healthy</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-success-400" />
              <div>
                <p className="text-white font-medium">Code Executor</p>
                <p className="text-gray-400 text-sm">Operational</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-success-400" />
              <div>
                <p className="text-white font-medium">Socket Service</p>
                <p className="text-gray-400 text-sm">Real-time active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
