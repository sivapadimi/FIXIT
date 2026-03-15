import React, { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import axios from 'axios'

// Components
const Navbar = ({ user, onLogout }) => (
  <nav style={{
    background: '#1f2937',
    padding: '1rem 2rem',
    borderBottom: '1px solid #374151',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
      FixIt
    </div>
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
      <Link to="/problems" style={{ color: '#9ca3af', textDecoration: 'none' }}>Problems</Link>
      <Link to="/leaderboard" style={{ color: '#9ca3af', textDecoration: 'none' }}>Leaderboard</Link>
      {user ? (
        <>
          <span style={{ color: '#f9fafb' }}>👤 {user.username}</span>
          <button 
            onClick={onLogout}
            style={{
              background: '#374151',
              color: '#e5e7eb',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <Link 
          to="/login"
          style={{
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem'
          }}
        >
          Login
        </Link>
      )}
    </div>
  </nav>
)

const ProblemCard = ({ problem, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      background: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: '1rem'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.borderColor = '#4b5563'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.borderColor = '#374151'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f9fafb', marginBottom: '0.5rem' }}>
          {problem.title}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{
            background: problem.difficulty === 'easy' ? '#065f46' : problem.difficulty === 'medium' ? '#92400e' : '#991b1b',
            color: problem.difficulty === 'easy' ? '#6ee7b7' : problem.difficulty === 'medium' ? '#fbbf24' : '#f87171',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {problem.difficulty.toUpperCase()}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>{problem.points}</div>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>points</div>
      </div>
    </div>
    <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>{problem.description}</p>
    <button style={{
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      cursor: 'pointer'
    }}>
      🐛 Solve Now
    </button>
  </div>
)

const ProblemsPage = () => {
  const [problems, setProblems] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    axios.get('/api/problems')
      .then(response => {
        setProblems(response.data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching problems:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading problems...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#f9fafb' }}>Debugging Problems</h1>
      {problems.map(problem => (
        <ProblemCard 
          key={problem.id} 
          problem={problem} 
          onClick={() => window.location.href = `/problem/${problem.id}`}
        />
      ))}
    </div>
  )
}

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = React.useState('')
  const [teamName, setTeamName] = React.useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username && teamName) {
      onLogin({ username, team_name: teamName })
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)'
    }}>
      <div style={{
        background: '#1f2937',
        padding: '2rem',
        borderRadius: '1rem',
        width: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#f9fafb' }}>FixIt</h1>
        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Login to start debugging</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '0.5rem',
                color: '#f9fafb',
                marginBottom: '0.5rem'
              }}
            />
            <input
              type="text"
              placeholder="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '0.5rem',
                color: '#f9fafb'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = React.useState([])

  React.useEffect(() => {
    axios.get('/api/leaderboard')
      .then(response => {
        setLeaderboard(response.data)
      })
      .catch(error => {
        console.error('Error fetching leaderboard:', error)
      })
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#f9fafb' }}>Leaderboard</h1>
      <div style={{
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '0.75rem',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#374151' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f9fafb' }}>Rank</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f9fafb' }}>Team</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f9fafb' }}>Solved</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f9fafb' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #374151' }}>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    fontWeight: '700',
                    color: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : index === 2 ? '#fb923c' : '#9ca3af'
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''} #{index + 1}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#f9fafb' }}>{entry.team}</div>
                    <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{entry.user}</div>
                  </div>
                </td>
                <td style={{ padding: '0.75rem', fontWeight: '600' }}>{entry.solved || 0}</td>
                <td style={{ padding: '0.75rem', fontWeight: '700', color: '#3b82f6' }}>{entry.score || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const HomePage = () => (
  <div style={{ 
    textAlign: 'center', 
    padding: '4rem 2rem',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)',
    minHeight: '100vh'
  }}>
    <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>
      <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        FixIt
      </span>
    </h1>
    <p style={{ fontSize: '1.25rem', color: '#9ca3af', marginBottom: '2rem' }}>
      Debugging Competition Platform
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '1rem' }}>🐛</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f9fafb', marginBottom: '0.5rem' }}>Debug Bugs</h3>
        <p style={{ color: '#9ca3af' }}>Find and fix bugs in real code</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: '#10b981', marginBottom: '1rem' }}>💻</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f9fafb', marginBottom: '0.5rem' }}>Multi-Language</h3>
        <p style={{ color: '#9ca3af' }}>Python, Java, C++ support</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '1rem' }}>🏆</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f9fafb', marginBottom: '0.5rem' }}>Compete</h3>
        <p style={{ color: '#9ca3af' }}>Real-time leaderboard</p>
      </div>
    </div>
    <button 
      onClick={() => window.location.href = '/problems'}
      style={{
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        padding: '1rem 2rem',
        borderRadius: '0.5rem',
        fontSize: '1.2rem',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.background = '#3b82f6'
      }}
    >
      🚀 Start Debugging
    </button>
  </div>
)

function App() {
  const [user, setUser] = React.useState(null)
  const [currentPage, setCurrentPage] = React.useState('home')

  const handleLogin = (userData) => {
    setUser(userData)
    setCurrentPage('problems')
    localStorage.setItem('fixit-user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    setCurrentPage('home')
    localStorage.removeItem('fixit-user')
  }

  React.useEffect(() => {
    const savedUser = localStorage.getItem('fixit-user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      setCurrentPage('problems')
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#111827' }}>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </div>
  )
}

export default App
