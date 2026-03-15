#!/usr/bin/env python3
"""
Render Deployment Script for FixIT Platform
Optimized for Render Python environment
"""

import os
import sys
import sqlite3
import json
import socketserver
from http.server import SimpleHTTPRequestHandler
import urllib.parse
import re
from datetime import datetime

# Database setup
def init_database():
    """Initialize SQLite database for users and submissions"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            teamname TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # Create submissions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            problem_id INTEGER,
            problem_title TEXT NOT NULL,
            correct BOOLEAN DEFAULT FALSE,
            language TEXT,
            code TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create competitive_submissions table for admin leaderboard
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS competitive_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            teamname TEXT NOT NULL,
            problem_id INTEGER,
            problem_title TEXT NOT NULL,
            passed_test_cases INTEGER NOT NULL,
            total_test_cases INTEGER NOT NULL,
            score INTEGER NOT NULL,
            time_taken INTEGER NOT NULL,
            submitted_at TIMESTAMP NOT NULL,
            language TEXT
        )
    ''')
    
    # Create submission_entries table for admin leaderboard
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS submission_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            team_name TEXT NOT NULL,
            problem_name TEXT NOT NULL,
            passed_test_cases INTEGER NOT NULL,
            total_test_cases INTEGER NOT NULL,
            time_taken INTEGER NOT NULL,
            score INTEGER NOT NULL,
            submitted_at TIMESTAMP NOT NULL
        )
    ''')
    
    # Create exam_status table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exam_status (
            id INTEGER PRIMARY KEY DEFAULT 1,
            global_exam_active BOOLEAN DEFAULT FALSE,
            problem_id INTEGER,
            results_visible BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create login_details table for team authentication
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_name TEXT NOT NULL,
            team_code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create problem_status table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS problem_status (
            problem_id INTEGER PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'inactive',
            results_visible BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# Sample data
SAMPLE_DATA = {
    "problems": [
        {
            "id": "1",
            "title": "Count Set Bits",
            "description": "Given an integer N, count the number of set bits (1s) in its binary representation.",
            "difficulty": "easy",
            "points": 100,
            "time_limit": 900,
            "starter_code": {
                "python": "# Write your solution here\ndef count_set_bits(n):\n    # TODO: Implement this function\n    pass\n\n# Test your function\nif __name__ == '__main__':\n    n = int(input())\n    print(count_set_bits(n))",
                "java": "// Write your solution here\npublic class CountSetBits {\n    public static int countSetBits(int n) {\n        // TODO: Implement this method\n        return 0;\n    }\n    \n    public static void main(String[] args) {\n        // Test your function\n        System.out.println(countSetBits(5));\n    }\n}",
                "cpp": "// Write your solution here\n#include <iostream>\nusing namespace std;\n\nint countSetBits(int n) {\n    // TODO: Implement this function\n    return 0;\n}\n\nint main() {\n    // Test your function\n    cout << countSetBits(5) << endl;\n    return 0;\n}"
            },
            "test_cases": [
                {
                    "input": "5",
                    "expected_output": "2",
                    "description": "Binary of 5 is 101, which has 2 set bits"
                },
                {
                    "input": "7",
                    "expected_output": "3", 
                    "description": "Binary of 7 is 111, which has 3 set bits"
                },
                {
                    "input": "0",
                    "expected_output": "0",
                    "description": "Binary of 0 is 0, which has 0 set bits"
                },
                {
                    "input": "15",
                    "expected_output": "4",
                    "description": "Binary of 15 is 1111, which has 4 set bits"
                },
                {
                    "input": "32",
                    "expected_output": "1",
                    "description": "Binary of 32 is 100000, which has 1 set bit"
                }
            ]
        },
        {
            "id": "2",
            "title": "Chat Spam Pattern Detector",
            "description": "In an online messaging platform, users send messages continuously in chat rooms. Sometimes users repeatedly send the same message, which is considered spam. Your task is to debug the given program so that it correctly detects when a message appears three or more consecutive times. If spam is detected, print \"Spam detected: <message>\", otherwise print \"No spam detected\".",
            "difficulty": "medium",
            "points": 250,
            "time_limit": 1500,
            "starter_code": {
                "python": "# Write your solution here\ndef detect_spam(messages):\n    # TODO: Implement this function\n    pass\n\n# Test your function\nif __name__ == '__main__':\n    messages = [\"hello\", \"world\", \"hello\", \"hello\", \"world\"]\n    print(detect_spam(messages))",
                "java": "// Write your solution here\npublic class SpamDetector {\n    public static String detectSpam(String[] messages) {\n        // TODO: Implement this method\n        return \"No spam detected\";\n    }\n    \n    public static void main(String[] args) {\n        // Test your function\n        String[] messages = {\"hello\", \"world\", \"hello\", \"world\"};\n        System.out.println(detectSpam(messages));\n    }\n}",
                "cpp": "// Write your solution here\n#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nstring detectSpam(vector<string> messages) {\n    // TODO: Implement this function\n    return \"No spam detected\";\n}\n\nint main() {\n    // Test your function\n    vector<string> messages = {\"hello\", \"world\", \"hello\", \"world\"};\n    cout << detectSpam(messages) << endl;\n    return 0;\n}"
            },
            "test_cases": [
                {
                    "input": "[\"hello\", \"world\", \"hello\", \"world\"]",
                    "expected_output": "No spam detected",
                    "description": "No message appears 3 times consecutively"
                },
                {
                    "input": "[\"hello\", \"hello\", \"hello\"]",
                    "expected_output": "Spam detected: hello",
                    "description": "Message 'hello' appears 3 times consecutively"
                },
                {
                    "input": "[\"test\", \"test\", \"test\", \"test\", \"test\"]",
                    "expected_output": "Spam detected: test",
                    "description": "Message 'test' appears 5 times consecutively"
                },
                {
                    "input": "[\"hi\", \"there\", \"hi\", \"there\"]",
                    "expected_output": "No spam detected",
                    "description": "No message appears 3 times consecutively"
                }
            ]
        },
        {
            "id": "3",
            "title": "Problem 3: Undo/Redo Text Editor (Linked Stack Debugging)",
            "description": "You are building a simple text editor that supports operations like **WRITE, UNDO, REDO, and SHOW**.\nThe editor maintains history using **two stacks (Undo Stack and Redo Stack)** to track changes made to the text.\n\nYour task is to debug the given implementation and fix all issues so that:\n\n1. **WRITE operation** adds text to current content\n2. **UNDO operation** removes the last WRITE operation\n3. **REDO operation** re-applies the last undone WRITE operation\n4. **SHOW operation** displays the current text content\n\nThe editor should maintain proper stack synchronization and handle edge cases correctly.",
            "difficulty": "hard",
            "points": 350,
            "time_limit": 2100,
            "starter_code": {
                "python": "# Write your solution here\nclass TextEditor:\n    def __init__(self):\n        self.undo_stack = []\n        self.redo_stack = []\n        self.current_text = \"\"\n    \n    def write(self, text):\n        # TODO: Implement this method\n        pass\n    \n    def undo(self):\n        # TODO: Implement this method\n        pass\n    \n    def redo(self):\n        # TODO: Implement this method\n        pass\n    \n    def show(self):\n        # TODO: Implement this method\n        pass\n\n# Test your function\nif __name__ == '__main__':\n    editor = TextEditor()\n    editor.write(\"Hello\")\n    editor.write(\" World\")\n    editor.show()  # Should show \"Hello World\"\n    editor.undo()  # Should remove \" World\"\n    editor.show()  # Should show \"Hello\"\n    editor.redo()  # Should re-add \" World\"\n    editor.show()  # Should show \"Hello World\"",
                "java": "// Write your solution here\npublic class TextEditor {\n    private Stack<String> undoStack;\n    private Stack<String> redoStack;\n    private String currentText = \"\";\n    \n    public TextEditor() {\n        undoStack = new Stack<>();\n        redoStack = new Stack<>();\n    }\n    \n    public void write(String text) {\n        // TODO: Implement this method\n    }\n    \n    public void undo() {\n        // TODO: Implement this method\n    }\n    \n    public void redo() {\n        // TODO: Implement this method\n    }\n    \n    public void show() {\n        // TODO: Implement this method\n    }\n}",
                "cpp": "// Write your solution here\n#include <iostream>\n#include <stack>\n#include <string>\nusing namespace std;\n\nclass TextEditor {\n    stack<string> undoStack;\n    stack<string> redoStack;\n    string currentText = \"\";\n    \npublic:\n    void write(string text) {\n        // TODO: Implement this method\n    }\n    \n    void undo() {\n        // TODO: Implement this method\n    }\n    \n    void redo() {\n        // TODO: Implement this method\n    }\n    \n    void show() {\n        // TODO: Implement this method\n    }\n};\n\nint main() {\n    TextEditor editor;\n    editor.write(\"Hello\");\n    editor.write(\" World\");\n    editor.show();  // Should show \"Hello World\"\n    editor.undo();  // Should remove \" World\"\n    editor.show();  // Should show \"Hello\"\n    editor.redo();  // Should re-add \" World\"\n    editor.show();  // Should show \"Hello World\"\n    return 0;\n}"
            },
            "test_cases": [
                {
                    "input": "[\"Hello\", \"World\"]",
                    "expected_output": "Hello World",
                    "description": "Basic write operation"
                },
                {
                    "input": "[\"Hello\", \"World\", \"!\"]",
                    "expected_output": "Hello World!",
                    "description": "Multiple write operations"
                },
                {
                    "input": "[\"Hello\", \"World\", \"!\"], \"undo\"",
                    "expected_output": "Hello World",
                    "description": "Undo last write operation"
                },
                {
                    "input": "[\"Hello\", \"World\", \"!\"], \"undo\", \"redo\"",
                    "expected_output": "Hello World!",
                    "description": "Undo then redo operations"
                }
            ]
        }
    ]
}

# HTML Template (simplified for Render)
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FixIT - Debugging Competition Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #111827; color: #f9fafb; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .card { background: #1f2937; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; }
        .btn { background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
        .btn:hover { background: #2563eb; }
        .grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .problem-card { border: 1px solid #374151; }
        .problem-card:hover { border-color: #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <header style="text-align: center; margin-bottom: 3rem;">
            <h1 style="font-size: 3rem; font-weight: 700; background: linear-gradient(135deg, #3b82f6, #1e40af); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;">
                FixIT! 🐛
            </h1>
            <p style="font-size: 1.25rem; color: #9ca3af; margin-bottom: 0.5rem;">
                Professional Debugging Competition Platform
            </p>
            <div style="background: #065f46; color: #10b981; padding: 0.5rem 1rem; border-radius: 0.5rem; display: inline-block; margin-bottom: 1rem;">
                🚀 Production Ready - Render Deployed
            </div>
        </header>

        <main>
            <div class="grid">
                <!-- Problem 1 -->
                <div class="card problem-card">
                    <h3 style="color: #f9fafb; margin-bottom: 1rem;">
                        <span style="color: #3b82f6;">Problem 1:</span> Count Set Bits
                    </h3>
                    <p style="color: #d1d5db; margin-bottom: 1rem;">
                        Given an integer N, count the number of set bits (1s) in its binary representation.
                    </p>
                    <div style="color: #9ca3af; font-size: 0.875rem;">
                        <strong>Difficulty:</strong> Easy | 
                        <strong>Points:</strong> 100 | 
                        <strong>Time Limit:</strong> 15 minutes
                    </div>
                    <a href="/problem/1" class="btn" style="display: inline-block; margin-top: 1rem;">
                        Start Solving →
                    </a>
                </div>

                <!-- Problem 2 -->
                <div class="card problem-card">
                    <h3 style="color: #f9fafb; margin-bottom: 1rem;">
                        <span style="color: #3b82f6;">Problem 2:</span> Chat Spam Pattern Detector
                    </h3>
                    <p style="color: #d1d5db; margin-bottom: 1rem;">
                        Debug a message spam detection system that identifies repeated consecutive messages.
                    </p>
                    <div style="color: #9ca3af; font-size: 0.875rem;">
                        <strong>Difficulty:</strong> Medium | 
                        <strong>Points:</strong> 250 | 
                        <strong>Time Limit:</strong> 25 minutes
                    </div>
                    <a href="/problem/2" class="btn" style="display: inline-block; margin-top: 1rem;">
                        Start Solving →
                    </a>
                </div>

                <!-- Problem 3 -->
                <div class="card problem-card">
                    <h3 style="color: #f9fafb; margin-bottom: 1rem;">
                        <span style="color: #3b82f6;">Problem 3:</span> Undo/Redo Text Editor
                    </h3>
                    <p style="color: #d1d5db; margin-bottom: 1rem;">
                        Debug a text editor with undo/redo functionality using linked stacks.
                    </p>
                    <div style="color: #9ca3af; font-size: 0.875rem;">
                        <strong>Difficulty:</strong> Hard | 
                        <strong>Points:</strong> 350 | 
                        <strong>Time Limit:</strong> 35 minutes
                    </div>
                    <a href="/problem/3" class="btn" style="display: inline-block; margin-top: 1rem;">
                        Start Solving →
                    </a>
                </div>
            </div>

            <!-- Admin Panel Access -->
            <div class="card" style="margin-top: 2rem;">
                <h3 style="color: #f9fafb; margin-bottom: 1rem;">
                    🔐 Admin Panel
                </h3>
                <p style="color: #d1d5db; margin-bottom: 1rem;">
                    Access competition management, leaderboard, and team controls.
                </p>
                <a href="/admin" class="btn" style="background: #059669;">
                    Access Admin Panel →
                </a>
            </div>
        </main>

        <footer style="text-align: center; margin-top: 3rem; padding: 2rem; border-top: 1px solid #374151; color: #6b7280;">
            <p style="font-size: 0.875rem;">
                © 2024 FixIT Platform - Professional Debugging Competition System
            </p>
        </footer>
    </div>
</body>
</html>
"""

class FixItHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode('utf-8'))
        elif self.path == '/api/problems':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(SAMPLE_DATA['problems']).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')

    def do_POST(self):
        if self.path == '/api/submit':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            response_data = {
                'success': True,
                'message': 'Submission received successfully',
                'problem_id': data.get('problem_id'),
                'timestamp': datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

def main():
    """Main function for Render deployment"""
    port = int(os.environ.get('PORT', 8000))
    
    print(f"🚀 Starting FixIT Platform on Render...")
    print(f"🌐 Server running on port {port}")
    print(f"📊 Database initialized and ready")
    print(f"🎯 Production deployment active")
    
    with socketserver.TCPServer(("", port), handler_class=FixItHandler) as httpd:
        print(f"✅ Server successfully started and listening")
        httpd.serve_forever()

if __name__ == "__main__":
    main()
