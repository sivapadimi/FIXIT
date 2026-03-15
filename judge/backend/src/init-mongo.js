// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('fixit_db');

// Create admin user
db.createUser({
  user: 'fixit_admin',
  pwd: 'fixit123',
  roles: [
    {
      role: 'readWrite',
      db: 'fixit_db'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ 'statistics.problemsSolved': -1 });

db.problems.createIndex({ title: 1 });
db.problems.createIndex({ difficulty: 1 });
db.problems.createIndex({ level: 1 });
db.problems.createIndex({ category: 1 });
db.problems.createIndex({ isActive: 1 });
db.problems.createIndex({ 'statistics.successRate': -1 });

db.submissions.createIndex({ user: 1, problem: 1 });
db.submissions.createIndex({ user: 1, submittedAt: -1 });
db.submissions.createIndex({ problem: 1, submittedAt: -1 });
db.submissions.createIndex({ status: 1 });
db.submissions.createIndex({ isCorrect: 1 });
db.submissions.createIndex({ score: -1 });

db.events.createIndex({ status: 1 });
db.events.createIndex({ startTime: 1 });
db.events.createIndex({ endTime: 1 });
db.events.createIndex({ isActive: 1 });

print('Database initialized successfully');
