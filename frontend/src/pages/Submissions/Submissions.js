import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { submissionsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const Submissions = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [language, setLanguage] = useState('');
  const [problem, setProblem] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch submissions
  const { data: submissionsData, isLoading, error } = useQuery(
    ['submissions', { page, status, language, problem }],
    () => submissionsAPI.getSubmissions({ page, status, language, problem }),
    {
      keepPreviousData: true,
      select: (response) => response.data.data,
    }
  );

  const submissions = submissionsData?.submissions || [];
  const pagination = submissionsData?.pagination || {};

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    setPage(1);
  };

  const handleProblemChange = (e) => {
    setProblem(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setStatus('');
    setLanguage('');
    setProblem('');
    setPage(1);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'wrong_answer':
        return <XCircleIcon className="h-5 w-5 text-error-500" />;
      case 'time_limit_exceeded':
        return <ClockIcon className="h-5 w-5 text-warning-500" />;
      case 'memory_limit_exceeded':
        return <ClockIcon className="h-5 w-5 text-warning-500" />;
      case 'runtime_error':
      case 'compilation_error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-error-500" />;
      case 'pending':
      case 'running':
        return <ClockIcon className="h-5 w-5 text-gray-500 animate-pulse" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'accepted':
        return 'status-accepted';
      case 'wrong_answer':
        return 'status-wrong-answer';
      case 'time_limit_exceeded':
        return 'status-time-limit-exceeded';
      case 'memory_limit_exceeded':
        return 'status-memory-limit-exceeded';
      case 'runtime_error':
        return 'status-runtime-error';
      case 'compilation_error':
        return 'status-compilation-error';
      case 'pending':
        return 'status-pending';
      case 'running':
        return 'status-running';
      default:
        return 'status-pending';
    }
  };

  const getLanguageIcon = (lang) => {
    switch (lang) {
      case 'python':
        return '🐍';
      case 'java':
        return '☕';
      case 'cpp':
        return '⚙️';
      default:
        return '📝';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-400">Failed to load submissions. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Submissions</h1>
        <p className="text-gray-400 mt-2">
          View your submission history and results.
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
              <ChevronDownIcon
                className={`h-4 w-4 transform transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </button>

            {(status || language || problem) && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Clear filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={handleStatusChange}
                  className="input"
                >
                  <option value="">All statuses</option>
                  <option value="accepted">Accepted</option>
                  <option value="wrong_answer">Wrong Answer</option>
                  <option value="time_limit_exceeded">Time Limit Exceeded</option>
                  <option value="memory_limit_exceeded">Memory Limit Exceeded</option>
                  <option value="runtime_error">Runtime Error</option>
                  <option value="compilation_error">Compilation Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="input"
                >
                  <option value="">All languages</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Problem
                </label>
                <input
                  type="text"
                  value={problem}
                  onChange={handleProblemChange}
                  placeholder="Search by problem title..."
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-800 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <EyeIcon className="h-12 w-12 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-200 mb-2">
            No submissions found
          </h3>
          <p className="text-gray-400">
            {status || language || problem
              ? 'Try adjusting your search or filters.'
              : 'Start solving problems to see your submissions here.'}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Problem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(submission.status)}
                          <span className={`badge ${getStatusClass(submission.status)}`}>
                            {submission.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-200">
                          {submission.problem.title}
                        </div>
                        <div className="text-xs text-gray-400">
                          Level {submission.problem.level} • {submission.problem.difficulty}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span>{getLanguageIcon(submission.language)}</span>
                          <span className="text-sm text-gray-300 capitalize">
                            {submission.language}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-200">
                          {submission.score}
                        </div>
                        {submission.isCorrect && (
                          <div className="text-xs text-success-400">✓ Correct</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {formatDuration(submission.executionTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {formatTime(submission.submittedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            // Navigate to submission details
                            window.location.href = `/submissions/${submission._id}`;
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

export default Submissions;
