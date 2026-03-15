import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { problemsAPI, submissionsAPI } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { Editor } from '@monaco-editor/react';
import {
  PlayIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const ProblemDetail = () => {
  const { id } = useParams();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const { user } = useAuthStore();
  const { subscribeToProblem, unsubscribeFromProblem } = useSocket();
  const queryClient = useQueryClient();

  // Fetch problem details
  const { data: problem, isLoading, error } = useQuery(
    ['problem', id],
    () => problemsAPI.getProblem(id),
    {
      enabled: !!id,
    }
  );

  // Fetch problem template
  const { data: template } = useQuery(
    ['problem-template', id, language],
    () => problemsAPI.getProblemTemplate(id, language),
    {
      enabled: !!id && !!language,
      onSuccess: (data) => {
        setCode(data.data.template.buggyCode);
      },
    }
  );

  // Submit solution mutation
  const submitMutation = useMutation(submissionsAPI.submitSolution, {
    onSuccess: (response) => {
      toast.success('Solution submitted successfully!');
      queryClient.invalidateQueries('user-stats');
      queryClient.invalidateQueries('submissions');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Submission failed');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Run code mutation
  const runMutation = useMutation(
    (submissionId) => submissionsAPI.runSubmission(submissionId),
    {
      onSuccess: (response) => {
        setTestResults(response.data.data);
        setIsRunning(false);
      },
      onError: (error) => {
        toast.error('Failed to run code');
        setIsRunning(false);
      },
    }
  );

  useEffect(() => {
    if (id) {
      subscribeToProblem(id);
    }
    return () => {
      if (id) {
        unsubscribeFromProblem(id);
      }
    };
  }, [id, subscribeToProblem, unsubscribeFromProblem]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code before submitting');
      return;
    }

    setIsSubmitting(true);
    submitMutation.mutate({
      problem: id,
      language,
      code,
    });
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error('Please write some code before running');
      return;
    }

    setIsRunning(true);
    setTestResults(null);

    // First submit to get submission ID, then run
    try {
      const response = await submissionsAPI.submitSolution({
        problem: id,
        language,
        code,
      });
      
      runMutation.mutate(response.data.data.submissionId);
    } catch (error) {
      toast.error('Failed to submit code for running');
      setIsRunning(false);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-error-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-400">Failed to load problem. Please try again.</p>
        <Link to="/problems" className="btn btn-primary mt-4">
          Back to Problems
        </Link>
      </div>
    );
  }

  const problemData = problem?.data?.problem;

  return (
    <div className="space-y-6">
      {/* Problem Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 mb-2">
                {problemData.title}
              </h1>
              <div className="flex items-center space-x-3">
                <span className={`badge badge-${problemData.difficulty}`}>
                  {problemData.difficulty.charAt(0).toUpperCase() + problemData.difficulty.slice(1)}
                </span>
                <span className="badge badge-gray">
                  Level {problemData.level}
                </span>
                <span className="badge badge-gray">
                  {problemData.category.charAt(0).toUpperCase() + problemData.category.slice(1)}
                </span>
                <div className="flex items-center text-sm text-gray-400">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {problemData.timeLimit}ms
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <CpuChipIcon className="h-4 w-4 mr-1" />
                  {problemData.memoryLimit}MB
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-400">
                {problemData.points}
              </div>
              <div className="text-sm text-gray-400">points</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Description */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-200">Problem Description</h3>
            </div>
            <div className="card-body">
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 whitespace-pre-wrap">
                  {problemData.description}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-200">Input Format</h3>
            </div>
            <div className="card-body">
              <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 overflow-x-auto">
                {problemData.inputFormat}
              </pre>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-200">Output Format</h3>
            </div>
            <div className="card-body">
              <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 overflow-x-auto">
                {problemData.outputFormat}
              </pre>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-200">Sample Test</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Input:</h4>
                <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 overflow-x-auto">
                  {problemData.sampleInput}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Output:</h4>
                <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 overflow-x-auto">
                  {problemData.sampleOutput}
                </pre>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-200">Constraints</h3>
            </div>
            <div className="card-body">
              <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 overflow-x-auto">
                {problemData.constraints}
              </pre>
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-200">Code Editor</h3>
                <div className="flex items-center space-x-2">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="editor-container">
                <div className="editor-header">
                  <div className="flex items-center space-x-2">
                    <span>{getLanguageIcon(language)}</span>
                    <span className="text-sm text-gray-300">
                      solution.{language === 'python' ? 'py' : language === 'java' ? 'java' : 'cpp'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleRun}
                      disabled={isRunning || isSubmitting}
                      className="btn btn-secondary btn-sm"
                    >
                      {isRunning ? (
                        <LoadingSpinner size="small" text="" />
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Run
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || isRunning}
                      className="btn btn-primary btn-sm"
                    >
                      {isSubmitting ? (
                        <LoadingSpinner size="small" text="" />
                      ) : (
                        <>
                          <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="editor-body" style={{ height: '400px' }}>
                  <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-200">Test Results</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {testResults.results.map((result, index) => (
                    <div
                      key={index}
                      className={`test-case test-case-${result.status}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(result.status)}
                          <span className="text-sm font-medium text-gray-300">
                            Test Case {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span>{result.executionTime}ms</span>
                          <span>{result.memoryUsed}KB</span>
                        </div>
                      </div>
                      {!result.isHidden && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Input:</span>
                            <pre className="mt-1 bg-gray-900 p-2 rounded text-gray-300">
                              {result.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-gray-400">Output:</span>
                            <pre className="mt-1 bg-gray-900 p-2 rounded text-gray-300">
                              {result.actualOutput}
                            </pre>
                          </div>
                        </div>
                      )}
                      {result.error && (
                        <div className="mt-2">
                          <span className="text-gray-400">Error:</span>
                          <pre className="mt-1 bg-error-900/20 p-2 rounded text-error-400">
                            {result.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                      <span className="font-medium">Summary:</span> {testResults.summary.passed} passed, 
                      {testResults.summary.failed} failed, {testResults.summary.error} errors
                    </div>
                    <div className="text-sm text-gray-300">
                      Success Rate: {Math.round((testResults.summary.passed / testResults.results.length) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemDetail;
