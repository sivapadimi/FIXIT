import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

const SpecialOptions = () => {
  const [settings, setSettings] = useState({});
  const [systemStats, setSystemStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('system');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes, notificationsRes] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/system-stats'),
        api.get('/admin/notifications')
      ]);
      
      setSettings(settingsRes.data.data);
      setSystemStats(statsRes.data.data);
      setNotifications(notificationsRes.data.data);
    } catch (error) {
      console.error('Error fetching system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      setActionLoading(true);
      await api.put('/admin/settings', { [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
      alert('Failed to update setting');
    } finally {
      setActionLoading(false);
    }
  };

  const sendGlobalNotification = async (title, message, type = 'info') => {
    try {
      setActionLoading(true);
      await api.post('/admin/notifications/global', { title, message, type });
      fetchSystemData();
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setActionLoading(false);
    }
  };

  const performSystemAction = async (action) => {
    try {
      setActionLoading(true);
      const response = await api.post(`/admin/system/${action}`);
      fetchSystemData();
      alert(response.data.message);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action}: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const exportData = async (type) => {
    try {
      const response = await api.get(`/admin/export/${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
    }
  };

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info'
  });

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
          <h1 className="text-2xl font-bold text-white">Special Admin Options</h1>
          <p className="text-gray-400 mt-1">Advanced system controls and configurations</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {['system', 'notifications', 'security', 'exports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <UserGroupIcon className="h-8 w-8 text-primary-400" />
                  <div>
                    <p className="text-sm text-gray-400">Active Users</p>
                    <p className="text-2xl font-bold text-white">{systemStats.activeUsers || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="h-8 w-8 text-success-400" />
                  <div>
                    <p className="text-sm text-gray-400">System Load</p>
                    <p className="text-2xl font-bold text-white">{systemStats.systemLoad || 0}%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-8 w-8 text-warning-400" />
                  <div>
                    <p className="text-sm text-gray-400">Uptime</p>
                    <p className="text-2xl font-bold text-white">{systemStats.uptime || '0h'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Settings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Exam Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Allow Late Registration</p>
                  <p className="text-sm text-gray-400">Users can join after exam starts</p>
                </div>
                <button
                  onClick={() => updateSetting('allowLateRegistration', !settings.allowLateRegistration)}
                  disabled={actionLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.allowLateRegistration ? 'bg-primary-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.allowLateRegistration ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Show Leaderboard</p>
                  <p className="text-sm text-gray-400">Display real-time rankings</p>
                </div>
                <button
                  onClick={() => updateSetting('showLeaderboard', !settings.showLeaderboard)}
                  disabled={actionLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.showLeaderboard ? 'bg-primary-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.showLeaderboard ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-400">Temporarily disable user access</p>
                </div>
                <button
                  onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
                  disabled={actionLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.maintenanceMode ? 'bg-error-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* System Actions */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">System Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => performSystemAction('clear-cache')}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-warning-600 text-white rounded-lg hover:bg-warning-700 disabled:opacity-50"
              >
                <RocketLaunchIcon className="h-5 w-5" />
                <span>Clear System Cache</span>
              </button>
              
              <button
                onClick={() => performSystemAction('reset-scores')}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50"
              >
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span>Reset All Scores</span>
              </button>
              
              <button
                onClick={() => performSystemAction('backup-database')}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Backup Database</span>
              </button>
              
              <button
                onClick={() => performSystemAction('restart-services')}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <CogIcon className="h-5 w-5" />
                <span>Restart Services</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Send Global Notification */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Send Global Notification</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter notification title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Enter notification message"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="success">Success</option>
                </select>
              </div>
              
              <button
                onClick={() => {
                  if (notificationForm.title && notificationForm.message) {
                    sendGlobalNotification(notificationForm.title, notificationForm.message, notificationForm.type);
                    setNotificationForm({ title: '', message: '', type: 'info' });
                  } else {
                    alert('Please fill in all fields');
                  }
                }}
                disabled={actionLoading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <BellIcon className="h-5 w-5" />
                <span>Send Notification</span>
              </button>
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Recent Notifications</h2>
            </div>
            <div className="divide-y divide-gray-700">
              {notifications.map((notification) => (
                <div key={notification._id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{notification.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      notification.type === 'error' ? 'bg-error-100 text-error-800' :
                      notification.type === 'warning' ? 'bg-warning-100 text-warning-800' :
                      notification.type === 'success' ? 'bg-success-100 text-success-800' :
                      'bg-info-100 text-info-800'
                    }`}>
                      {notification.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Enable Two-Factor Authentication</p>
                  <p className="text-sm text-gray-400">Require 2FA for all admin accounts</p>
                </div>
                <button
                  onClick={() => updateSetting('enable2FA', !settings.enable2FA)}
                  disabled={actionLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.enable2FA ? 'bg-primary-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.enable2FA ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Session Timeout</p>
                  <p className="text-sm text-gray-400">Auto-logout after inactivity</p>
                </div>
                <select
                  value={settings.sessionTimeout || 30}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">IP Whitelist</p>
                  <p className="text-sm text-gray-400">Restrict admin access to specific IPs</p>
                </div>
                <button
                  onClick={() => updateSetting('ipWhitelist', !settings.ipWhitelist)}
                  disabled={actionLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.ipWhitelist ? 'bg-primary-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.ipWhitelist ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Access Control</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => performSystemAction('lock-all-users')}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-warning-600 text-white rounded-lg hover:bg-warning-700 disabled:opacity-50"
              >
                <LockClosedIcon className="h-5 w-5" />
                <span>Lock All Users</span>
              </button>
              
              <button
                onClick={() => performSystemAction('unlock-all-users')}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
              >
                <LockOpenIcon className="h-5 w-5" />
                <span>Unlock All Users</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exports Tab */}
      {activeTab === 'exports' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Data Exports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => exportData('users')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Export Users</span>
              </button>
              
              <button
                onClick={() => exportData('submissions')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Export Submissions</span>
              </button>
              
              <button
                onClick={() => exportData('problems')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Export Problems</span>
              </button>
              
              <button
                onClick={() => exportData('events')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Export Events</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialOptions;
