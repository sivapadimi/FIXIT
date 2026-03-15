import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const ExamControl = () => {
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({});
  const { user } = useAuthStore();

  useEffect(() => {
    fetchEventData();
  }, []);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const [eventsRes, dashboardRes] = await Promise.all([
        api.get('/admin/events'),
        api.get('/admin/dashboard')
      ]);
      
      setEvents(eventsRes.data.data.events);
      setCurrentEvent(dashboardRes.data.data.currentEvent);
      setStats(dashboardRes.data.data);
    } catch (error) {
      console.error('Error fetching exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventAction = async (eventId, action) => {
    try {
      setActionLoading(true);
      const response = await api.put(`/admin/events/${eventId}/${action}`);
      
      // Update local state
      if (action === 'start') {
        setCurrentEvent(response.data.data.event);
      } else {
        setCurrentEvent(prev => ({ ...prev, ...response.data.data.event }));
      }
      
      // Update events list
      setEvents(prev => prev.map(event => 
        event._id === eventId ? response.data.data.event : event
      ));
      
      // Refresh stats
      fetchEventData();
    } catch (error) {
      console.error(`Error ${action}ing event:`, error);
      alert(`Failed to ${action} event: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-success-100 text-success-800 border-success-200';
      case 'upcoming': return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'paused': return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return PlayIcon;
      case 'upcoming': return ClockIcon;
      case 'paused': return PauseIcon;
      case 'completed': return CheckCircleIcon;
      default: return ClockIcon;
    }
  };

  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
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
          <h1 className="text-2xl font-bold text-white">Exam Control Center</h1>
          <p className="text-gray-400 mt-1">Manage and monitor exam sessions</p>
        </div>
      </div>

      {/* Current Event Status */}
      {currentEvent && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Current Exam Session</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentEvent.status)}`}>
              {currentEvent.status.toUpperCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <UserGroupIcon className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="text-sm text-gray-400">Participants</p>
                  <p className="text-2xl font-bold text-white">{stats.userStats?.team?.count || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <ChartBarIcon className="h-8 w-8 text-success-400" />
                <div>
                  <p className="text-sm text-gray-400">Submissions</p>
                  <p className="text-2xl font-bold text-white">{stats.submissionStats?.correct || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-8 w-8 text-warning-400" />
                <div>
                  <p className="text-sm text-gray-400">Time Remaining</p>
                  <p className="text-2xl font-bold text-white">
                    {formatTime(currentEvent.timeRemaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3">
            {currentEvent.status === 'upcoming' && (
              <button
                onClick={() => handleEventAction(currentEvent._id, 'start')}
                disabled={actionLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="h-5 w-5" />
                <span>Start Exam</span>
              </button>
            )}
            
            {currentEvent.status === 'running' && (
              <>
                <button
                  onClick={() => handleEventAction(currentEvent._id, 'pause')}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-warning-600 text-white rounded-lg hover:bg-warning-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PauseIcon className="h-5 w-5" />
                  <span>Pause Exam</span>
                </button>
                
                <button
                  onClick={() => handleEventAction(currentEvent._id, 'complete')}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <StopIcon className="h-5 w-5" />
                  <span>End Exam</span>
                </button>
              </>
            )}
            
            {currentEvent.status === 'paused' && (
              <button
                onClick={() => handleEventAction(currentEvent._id, 'resume')}
                disabled={actionLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="h-5 w-5" />
                <span>Resume Exam</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* All Events List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Exam Sessions</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {events.map((event) => {
                const StatusIcon = getStatusIcon(event.status);
                return (
                  <tr key={event._id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{event.name}</div>
                        <div className="text-sm text-gray-400">{event.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatTime(event.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {event.statistics?.totalParticipants || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {event.status === 'upcoming' && (
                          <button
                            onClick={() => handleEventAction(event._id, 'start')}
                            disabled={actionLoading}
                            className="text-success-400 hover:text-success-300 disabled:opacity-50"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                        )}
                        {event.status === 'running' && (
                          <>
                            <button
                              onClick={() => handleEventAction(event._id, 'pause')}
                              disabled={actionLoading}
                              className="text-warning-400 hover:text-warning-300 disabled:opacity-50"
                            >
                              <PauseIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEventAction(event._id, 'complete')}
                              disabled={actionLoading}
                              className="text-error-400 hover:text-error-300 disabled:opacity-50"
                            >
                              <StopIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {event.status === 'paused' && (
                          <button
                            onClick={() => handleEventAction(event._id, 'resume')}
                            disabled={actionLoading}
                            className="text-success-400 hover:text-success-300 disabled:opacity-50"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {events.length === 0 && (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No exam sessions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamControl;
