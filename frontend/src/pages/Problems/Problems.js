import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { problemsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const Problems = () => {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch problems
  const { data: problemsData, isLoading, error } = useQuery(
    ['problems', { search, difficulty, category, page }],
    () => problemsAPI.getProblems({ search, difficulty, category, page }),
    {
      keepPreviousData: true,
      select: (response) => response.data.data,
    }
  );

  // Fetch categories
  const { data: categoriesData } = useQuery(
    'problem-categories',
    problemsAPI.getCategories,
    {
      select: (response) => response.data.data.categories,
    }
  );

  const problems = problemsData?.problems || [];
  const pagination = problemsData?.pagination || {};

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDifficultyChange = (e) => {
    setDifficulty(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setDifficulty('');
    setCategory('');
    setPage(1);
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy':
        return 'difficulty-easy';
      case 'medium':
        return 'difficulty-medium';
      case 'hard':
        return 'difficulty-hard';
      default:
        return 'difficulty-easy';
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-400">Failed to load problems. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Problems</h1>
        <p className="text-gray-400 mt-2">
          Practice your debugging skills with these challenges.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search problems..."
              className="input pl-10"
            />
          </div>

          {/* Filters Toggle */}
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

            {(search || difficulty || category) && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={handleDifficultyChange}
                  className="input"
                >
                  <option value="">All difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="input"
                >
                  <option value="">All categories</option>
                  {categoriesData?.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Problems List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-800 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-200 mb-2">
            No problems found
          </h3>
          <p className="text-gray-400">
            {search || difficulty || category
              ? 'Try adjusting your search or filters.'
              : 'No problems are available at the moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {problems.map((problem) => (
            <div key={problem._id} className="card hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      to={`/problems/${problem._id}`}
                      className="text-xl font-semibold text-gray-200 hover:text-primary-400 transition-colors"
                    >
                      {problem.title}
                    </Link>
                    
                    <p className="text-gray-400 mt-2 line-clamp-2">
                      {problem.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <span className={`badge ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                      </span>
                      
                      <span className="badge badge-gray">
                        Level {problem.level}
                      </span>
                      
                      <span className="badge badge-gray">
                        {problem.category.charAt(0).toUpperCase() + problem.category.slice(1)}
                      </span>

                      <div className="flex items-center text-sm text-gray-400">
                        <span>{problem.statistics?.successRate || 0}% success rate</span>
                        <span className="mx-2">•</span>
                        <span>{problem.statistics?.totalSubmissions || 0} submissions</span>
                      </div>
                    </div>

                    {problem.tags && problem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {problem.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-primary-400">
                      {problem.points}
                    </div>
                    <div className="text-sm text-gray-400">points</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
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
      )}
    </div>
  );
};

export default Problems;
