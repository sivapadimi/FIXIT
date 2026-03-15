-- FixIt Leaderboard Database Schema
-- SQLite-compatible schema for dynamic scoring system

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    team_id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT UNIQUE NOT NULL,
    members TEXT, -- JSON array of member names
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Problems Table
CREATE TABLE IF NOT EXISTS problems (
    problem_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    max_score INTEGER DEFAULT 100,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
    time_limit_minutes INTEGER DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
    submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    language TEXT CHECK(language IN ('python', 'java', 'cpp')),
    
    -- Test case results
    passed_cases INTEGER DEFAULT 0,
    total_cases INTEGER DEFAULT 10,
    accuracy REAL DEFAULT 0.0,
    
    -- Timing
    submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER DEFAULT 0,
    
    -- Scoring
    base_score INTEGER DEFAULT 0,
    time_penalty INTEGER DEFAULT 0,
    final_score INTEGER DEFAULT 0,
    
    -- Status
    is_correct BOOLEAN DEFAULT FALSE,
    is_best_submission BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (team_id) REFERENCES teams(team_id),
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id)
);

-- Leaderboard Table (Aggregated data)
CREATE TABLE IF NOT EXISTS leaderboard (
    team_id INTEGER PRIMARY KEY,
    total_score INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    last_submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    rank_position INTEGER DEFAULT 0,
    
    FOREIGN KEY (team_id) REFERENCES teams(team_id)
);

-- Problem Attempts Table (Track multiple attempts)
CREATE TABLE IF NOT EXISTS problem_attempts (
    attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    best_score INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 1,
    
    FOREIGN KEY (team_id) REFERENCES teams(team_id),
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id),
    UNIQUE(team_id, problem_id)
);

-- Competition Events Table (For real-time updates)
CREATE TABLE IF NOT EXISTS competition_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT CHECK(event_type IN ('submission', 'leaderboard_update', 'problem_solved')),
    team_id INTEGER,
    problem_id INTEGER,
    score INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT -- JSON for additional event data
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_team_problem ON submissions(team_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_time ON submissions(submission_time DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(total_score DESC, total_time_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON competition_events(timestamp DESC);

-- Triggers for automatic leaderboard updates
CREATE TRIGGER IF NOT EXISTS update_leaderboard_after_submission
AFTER INSERT ON submissions
BEGIN
    -- Update or insert team in leaderboard
    INSERT OR REPLACE INTO leaderboard (
        team_id,
        total_score,
        problems_solved,
        total_time_seconds,
        last_submission_time
    )
    SELECT 
        NEW.team_id,
        COALESCE(SUM(final_score), 0),
        COUNT(DISTINCT CASE WHEN is_correct = TRUE THEN problem_id END),
        COALESCE(SUM(execution_time_ms / 1000), 0),
        MAX(submission_time)
    FROM submissions 
    WHERE team_id = NEW.team_id;
    
    -- Update problem attempts
    INSERT OR REPLACE INTO problem_attempts (
        team_id,
        problem_id,
        attempt_number,
        best_score,
        total_attempts
    )
    SELECT 
        NEW.team_id,
        NEW.problem_id,
        COALESCE(MAX(attempt_number), 0) + 1,
        COALESCE(MAX(final_score), 0),
        COUNT(*)
    FROM submissions 
    WHERE team_id = NEW.team_id AND problem_id = NEW.problem_id;
    
    -- Log competition event
    INSERT INTO competition_events (
        event_type,
        team_id,
        problem_id,
        score,
        data
    ) VALUES (
        'submission',
        NEW.team_id,
        NEW.problem_id,
        NEW.final_score,
        json_object('submission_id', NEW.submission_id, 'accuracy', NEW.accuracy)
    );
END;

-- Sample Data Insertion
INSERT OR IGNORE INTO teams (team_name, members) VALUES 
    ('CodeWarriors', '["Alice", "Bob", "Charlie"]'),
    ('BugBusters', '["David", "Eve", "Frank"]'),
    ('DebugMasters', '["Grace", "Henry", "Ivy"]'),
    ('SyntaxSolvers', '["Jack", "Kate", "Leo"]');

INSERT OR IGNORE INTO problems (title, max_score, difficulty, time_limit_minutes) VALUES 
    ('Count Set Bits', 100, 'easy', 30),
    ('Memory Leak Fix', 150, 'medium', 45),
    ('Race Condition', 200, 'hard', 60),
    ('Array Bounds', 120, 'easy', 25),
    ('Pointer Fix', 180, 'medium', 50);
