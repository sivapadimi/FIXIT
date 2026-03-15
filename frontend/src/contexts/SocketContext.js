import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Initialize socket connection
      const socketInstance = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: `Bearer ${token}`,
        },
        transports: ['websocket', 'polling'],
      });

      // Connection events
      socketInstance.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        
        // Authenticate with token
        socketInstance.emit('authenticate', token);
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
      });

      // Authentication events
      socketInstance.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
      });

      socketInstance.on('authentication_error', (error) => {
        console.error('Socket authentication error:', error);
        toast.error('Authentication failed');
      });

      // Submission updates
      socketInstance.on('submission_update', (data) => {
        console.log('Submission update:', data);
        
        if (data.status === 'accepted') {
          toast.success(`Solution accepted! Score: ${data.score}`);
        } else if (data.status === 'wrong_answer') {
          toast.error('Solution incorrect. Try again!');
        } else if (data.status === 'runtime_error') {
          toast.error('Runtime error occurred');
        } else if (data.status === 'time_limit_exceeded') {
          toast.error('Time limit exceeded');
        } else if (data.status === 'compilation_error') {
          toast.error('Compilation error');
        }
      });

      // Leaderboard updates
      socketInstance.on('leaderboard_update', (data) => {
        console.log('Leaderboard updated:', data);
        // This will be handled by the leaderboard component
      });

      // Event updates
      socketInstance.on('event_update', (data) => {
        console.log('Event updated:', data);
        
        if (data.status === 'running') {
          toast.success('Event has started!');
        } else if (data.status === 'paused') {
          toast.warning('Event has been paused');
        } else if (data.status === 'completed') {
          toast.info('Event has completed');
        }
      });

      // New problem notifications
      socketInstance.on('new_problem', (data) => {
        console.log('New problem:', data);
        toast.success(`New problem available: ${data.title}`);
      });

      // Notifications
      socketInstance.on('notification', (data) => {
        console.log('Notification:', data);
        toast(data.message, {
          icon: data.type === 'success' ? '✅' : 
                data.type === 'error' ? '❌' : 
                data.type === 'warning' ? '⚠️' : 'ℹ️',
        });
      });

      // Broadcast notifications
      socketInstance.on('broadcast_notification', (data) => {
        console.log('Broadcast notification:', data);
        toast(data.message, {
          duration: 6000,
          icon: '📢',
        });
      });

      // Admin notifications
      socketInstance.on('admin_notification', (data) => {
        console.log('Admin notification:', data);
        toast(data.message, {
          duration: 5000,
          icon: '👨‍💼',
        });
      });

      setSocket(socketInstance);

      // Cleanup on unmount
      return () => {
        socketInstance.disconnect();
        setSocket(null);
        setConnected(false);
      };
    } else {
      // Disconnect if not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, token]);

  // Socket methods
  const subscribeToLeaderboard = () => {
    if (socket && connected) {
      socket.emit('subscribe_leaderboard');
    }
  };

  const unsubscribeFromLeaderboard = () => {
    if (socket && connected) {
      socket.emit('unsubscribe_leaderboard');
    }
  };

  const subscribeToProblem = (problemId) => {
    if (socket && connected) {
      socket.emit('subscribe_problem', problemId);
    }
  };

  const unsubscribeFromProblem = (problemId) => {
    if (socket && connected) {
      socket.emit('unsubscribe_problem', problemId);
    }
  };

  const subscribeToEvent = () => {
    if (socket && connected) {
      socket.emit('subscribe_event');
    }
  };

  const unsubscribeFromEvent = () => {
    if (socket && connected) {
      socket.emit('unsubscribe_event');
    }
  };

  const value = {
    socket,
    connected,
    subscribeToLeaderboard,
    unsubscribeFromLeaderboard,
    subscribeToProblem,
    unsubscribeFromProblem,
    subscribeToEvent,
    unsubscribeFromEvent,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
