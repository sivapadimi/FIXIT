import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  UserIcon,
  AcademicCapIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PencilIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    bio: '',
    avatar: '',
  });
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: userData, isLoading } = useQuery(
    'user-profile',
    authAPI.getProfile,
    {
      select: (response) => response.data.data.user,
      onSuccess: (data) => {
        setProfile({
          bio: data.profile?.bio || '',
          avatar: data.profile?.avatar || '',
        });
      },
    }
  );

  // Update profile mutation
  const updateProfileMutation = useMutation(authAPI.updateProfile, {
    onSuccess: (response) => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries('user-profile');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(profile);
  };

  const handleCancel = () => {
    setProfile({
      bio: userData?.profile?.bio || '',
      avatar: userData?.profile?.avatar || '',
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const stats = userData?.statistics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Profile</h1>
        <p className="text-gray-400 mt-2">
          Manage your account information and view your statistics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-200">Profile</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="card-body space-y-4">
              {/* Avatar */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {userData?.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700">
                      <CameraIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-200">
                  {userData?.username}
                </h2>
                <p className="text-gray-400">{userData?.teamName}</p>
                <p className="text-sm text-gray-500">{userData?.college}</p>
              </div>

              {/* Bio */}
              {isEditing ? (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="input"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Bio</h4>
                  <p className="text-gray-400 text-sm">
                    {profile.bio || 'No bio added yet.'}
                  </p>
                </div>
              )}

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isLoading}
                    className="btn btn-primary flex-1"
                  >
                    {updateProfileMutation.isLoading ? (
                      <LoadingSpinner size="small" text="" />
                    ) : (
                      'Save'
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Stats */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-200">Statistics</h3>
              </div>
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-6 w-6 text-success-400" />
                    <div>
                      <p className="text-sm text-gray-400">Problems Solved</p>
                      <p className="text-xl font-bold text-gray-200">
                        {stats.problemsSolved || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-6 w-6 text-primary-400" />
                    <div>
                      <p className="text-sm text-gray-400">Total Submissions</p>
                      <p className="text-xl font-bold text-gray-200">
                        {stats.totalSubmissions || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <TrophyIcon className="h-6 w-6 text-warning-400" />
                    <div>
                      <p className="text-sm text-gray-400">Accuracy</p>
                      <p className="text-xl font-bold text-gray-200">
                        {stats.accuracy || 0}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-6 w-6 text-error-400" />
                    <div>
                      <p className="text-sm text-gray-400">Average Time</p>
                      <p className="text-xl font-bold text-gray-200">
                        {stats.averageTime || 0}ms
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-200">Performance</h3>
              </div>
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AcademicCapIcon className="h-6 w-6 text-info-400" />
                    <div>
                      <p className="text-sm text-gray-400">Current Level</p>
                      <p className="text-xl font-bold text-gray-200">
                        {stats.currentLevel || 1}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Correct Submissions</p>
                    <p className="text-xl font-bold text-success-400">
                      {stats.correctSubmissions || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Penalty Points</p>
                    <p className="text-xl font-bold text-error-400">
                      {stats.penaltyPoints || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Time</p>
                    <p className="text-xl font-bold text-gray-200">
                      {Math.round((stats.totalTime || 0) / 1000)}s
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          {userData?.teamMembers && userData.teamMembers.length > 0 && (
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-200">Team Members</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {userData.teamMembers.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-200">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      {index === 0 && (
                        <span className="badge badge-primary">Leader</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="card mt-6">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-200">Account Information</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Username</span>
                <span className="text-sm text-gray-200">{userData?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Email</span>
                <span className="text-sm text-gray-200">{userData?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Role</span>
                <span className="text-sm text-gray-200 capitalize">{userData?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Member Since</span>
                <span className="text-sm text-gray-200">
                  {new Date(userData?.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Last Login</span>
                <span className="text-sm text-gray-200">
                  {userData?.lastLogin
                    ? new Date(userData.lastLogin).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
