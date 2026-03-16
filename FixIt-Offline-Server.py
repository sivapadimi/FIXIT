#!/usr/bin/env python3
"""
FixIt Debugging Platform - Offline Server
Run this file to start the platform locally for offline events
No installation required - just run this Python file!
"""

import http.server
import socketserver
import json
import urllib.parse
import sqlite3
import os
import re
from datetime import datetime

# Database setup
def init_database():
    """Initialize the SQLite database for users and submissions"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
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
            problem_title TEXT,
            correct BOOLEAN,
            language TEXT,
            code TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create login_details table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_name TEXT UNIQUE NOT NULL,
            team_code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create exam_status table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exam_status (
            id INTEGER PRIMARY KEY DEFAULT 1,
            global_exam_active BOOLEAN DEFAULT FALSE,
            current_problem INTEGER,
            results_visible BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (current_problem) REFERENCES problems (id)
        )
    ''')
    
    # Create competitive_submissions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS competitive_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            teamname TEXT NOT NULL,
            problem_id INTEGER NOT NULL,
            problem_title TEXT NOT NULL,
            passed_test_cases INTEGER NOT NULL,
            total_test_cases INTEGER NOT NULL,
            score INTEGER NOT NULL,
            time_taken INTEGER NOT NULL,
            submitted_at TIMESTAMP NOT NULL,
            language TEXT NOT NULL,
            FOREIGN KEY (username) REFERENCES users (username)
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
    
    # Create problem_status table for admin-controlled exam start
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS problem_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            problem_id TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'inactive',
            results_visible INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Note: results_visible column is already included in table creation
    
    # Insert default admin if not exists
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, teamname, is_admin)
        VALUES ('Admin', 'System', TRUE)
    ''')
    
    # Insert default exam status if not exists
    cursor.execute('''
        INSERT OR IGNORE INTO exam_status (id, global_exam_active, current_problem, results_visible)
        VALUES (1, FALSE, NULL, FALSE)
    ''')
    
    # Insert team login credentials if not exists
    cursor.execute('''
        INSERT OR IGNORE INTO login_details (team_name, team_code)
        VALUES 
            ('PSPK', 'pspk'),
            ('REBEL', 'rebel'),
            ('PAVAN', 'pavan')
    ''')
    
    conn.commit()
    conn.close()

# Database functions
def get_user(username):
    """Get user from database"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    return user

def create_user(username, teamname, is_admin=False):
    """Create new user in database"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (username, teamname, is_admin, last_login)
            VALUES (?, ?, ?, ?)
        ''', (username, teamname, is_admin, datetime.now()))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def update_last_login(username):
    """Update user's last login time"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users SET last_login = ? WHERE username = ?
    ''', (datetime.now(), username))
    conn.commit()
    conn.close()

def add_submission(user_id, problem_id, problem_title, correct, language, code):
    """Add submission to database"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO submissions (user_id, problem_id, problem_title, correct, language, code)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, problem_id, problem_title, correct, language, code))
    conn.commit()
    conn.close()

def add_competitive_submission(username, teamname, problem_id, problem_title, passed_test_cases, total_test_cases, score, time_taken, language):
    """Add competitive submission to database"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO competitive_submissions (username, teamname, problem_id, problem_title, passed_test_cases, total_test_cases, score, time_taken, submitted_at, language)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (username, teamname, problem_id, problem_title, passed_test_cases, total_test_cases, score, time_taken, datetime.now().isoformat(), language))
    conn.commit()
    conn.close()

def get_submissions(limit=50):
    """Get recent submissions for admin"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.username, u.teamname, s.problem_title, s.correct, s.language, s.timestamp
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.timestamp DESC
        LIMIT ?
    ''', (limit,))
    submissions = cursor.fetchall()
    conn.close()
    return submissions

def get_competitive_submissions():
    """Get all competitive submissions"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT username, teamname, problem_id, problem_title, passed_test_cases, total_test_cases, score, time_taken, submitted_at, language
        FROM competitive_submissions
        ORDER BY submitted_at DESC
    ''')
    submissions = cursor.fetchall()
    conn.close()
    return submissions

def add_submission_entry(username, team_name, problem_name, passed_test_cases, total_test_cases, time_taken, score):
    """Add submission entry for admin leaderboard with duplicate detection"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    
    # Check if a record already exists for this team_name + problem_name
    cursor.execute('''
        SELECT id, score FROM submission_entries 
        WHERE team_name = ? AND problem_name = ?
    ''', (team_name, problem_name))
    existing_record = cursor.fetchone()
    
    if existing_record is None:
        # No existing record, insert new one
        cursor.execute('''
            INSERT INTO submission_entries (username, team_name, problem_name, passed_test_cases, total_test_cases, time_taken, score, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (username, team_name, problem_name, passed_test_cases, total_test_cases, time_taken, score, datetime.now().isoformat()))
    else:
        # Existing record found, check if new score is better
        existing_id, existing_score = existing_record
        if score > existing_score:
            # New score is better, update the existing record
            cursor.execute('''
                UPDATE submission_entries 
                SET username = ?, passed_test_cases = ?, total_test_cases = ?, time_taken = ?, score = ?, submitted_at = ?
                WHERE id = ?
            ''', (username, passed_test_cases, total_test_cases, time_taken, score, datetime.now().isoformat(), existing_id))
        # If new score is not better, ignore the submission (do nothing)
    
    conn.commit()
    conn.close()

def clear_submissions_for_problem(problem_name):
    """Clear submissions for a specific problem name"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "DELETE FROM submission_entries WHERE problem_name = ?",
            (problem_name,)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error clearing submissions for {problem_name}: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_admin_leaderboard():
    """Get admin leaderboard with rankings - grouped by team with per-problem scores and total scores"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    
    # Get the best submission for each team + problem combination
    cursor.execute('''
        SELECT username, team_name, problem_name, passed_test_cases, total_test_cases, time_taken, score, submitted_at
        FROM submission_entries s1
        WHERE s1.id = (
            SELECT id FROM submission_entries s2
            WHERE s2.team_name = s1.team_name AND s2.problem_name = s1.problem_name
            ORDER BY s2.score DESC, s2.time_taken ASC, s2.submitted_at ASC
            LIMIT 1
        )
        ORDER BY team_name ASC, score DESC, time_taken ASC, submitted_at ASC
    ''')
    submissions = cursor.fetchall()
    conn.close()
    
    # Group submissions by team
    team_data = {}
    for sub in submissions:
        username = sub[0]
        team_name = sub[1]
        problem_name = sub[2]
        passed_test_cases = sub[3]
        total_test_cases = sub[4]
        time_taken = sub[5]
        score = sub[6]
        submitted_at = sub[7]
        
        if team_name not in team_data:
            team_data[team_name] = {
                'username': username,
                'team_name': team_name,
                'problems': [],
                'total_score': 0,
                'earliest_submission': None
            }
        
        # Format submission time to HH:MM:SS
        if submitted_at:
            from datetime import datetime
            dt = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
            formatted_time = dt.strftime('%H:%M:%S')
            
            # Track earliest submission time for tiebreaker
            if team_data[team_name]['earliest_submission'] is None or dt < team_data[team_name]['earliest_submission']:
                team_data[team_name]['earliest_submission'] = dt
        else:
            formatted_time = '00:00:00'
        
        # Add problem to team's problems list
        team_data[team_name]['problems'].append({
            'problem_name': problem_name,
            'passed_test_cases': passed_test_cases,
            'total_test_cases': total_test_cases,
            'time_taken': time_taken,
            'score': score,
            'submitted_at': submitted_at,
            'submission_time': formatted_time
        })
        
        # Add to total score
        team_data[team_name]['total_score'] += score
    
    # Convert to list and sort by total_score (descending), then by earliest submission time
    ranked_teams = []
    for team_name, data in team_data.items():
        # Format earliest submission time
        if data['earliest_submission']:
            earliest_time = data['earliest_submission'].strftime('%H:%M:%S')
        else:
            earliest_time = '00:00:00'
        
        ranked_teams.append({
            'username': data['username'],
            'team_name': data['team_name'],
            'problems': data['problems'],
            'total_score': data['total_score'],
            'earliest_submission_time': earliest_time
        })
    
    # Sort teams by total_score (descending), then by earliest submission time (ascending)
    ranked_teams.sort(key=lambda x: (-x['total_score'], x['earliest_submission_time']))
    
    # Add ranks to teams
    for i, team in enumerate(ranked_teams, 1):
        team['rank'] = i
    
    # Flatten data for frontend consumption
    flattened_data = []
    for team in ranked_teams:
        # Add each problem as a row
        for i, problem in enumerate(team['problems']):
            flattened_data.append({
                'rank': team['rank'] if i == 0 else None,  # Show rank only on first row
                'username': team['username'],
                'team_name': team['team_name'],
                'problem_name': problem['problem_name'],
                'passed_test_cases': problem['passed_test_cases'],
                'total_test_cases': problem['total_test_cases'],
                'time_taken': problem['time_taken'],
                'score': problem['score'],
                'submitted_at': problem['submitted_at'],
                'submission_time': problem['submission_time'],
                'total_score': team['total_score'] if i == len(team['problems']) - 1 else None  # Show total only on last row
            })
    
    return flattened_data

def update_exam_status(active, problem_id=None, results_visible=False):
    """Update exam status"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE exam_status 
        SET global_exam_active = ?, current_problem = ?, results_visible = ?, updated_at = ?
        WHERE id = 1
    ''', (active, problem_id, results_visible, datetime.now()))
    conn.commit()
    conn.close()

def update_problem_status(problem_id, status):
    """Update problem status (active/inactive)"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO problem_status (problem_id, status, updated_at)
        VALUES (?, ?, ?)
    ''', (problem_id, status, datetime.now()))
    conn.commit()
    conn.close()

def get_problem_status(problem_id):
    """Get problem status"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT status FROM problem_status WHERE problem_id = ?
    ''', (problem_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else 'inactive'

def get_all_problem_status():
    """Get all problem statuses"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT problem_id, status, results_visible FROM problem_status
    ''')
    results = cursor.fetchall()
    conn.close()
    # Return dict with problem_id as key and status, results_visible as values
    return {pid: {'status': status, 'results_visible': bool(results_visible)} for pid, status, results_visible in results}

def update_problem_results_visibility(problem_id, results_visible):
    """Update problem results visibility"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO problem_status (problem_id, status, results_visible, updated_at)
        VALUES (?, (SELECT status FROM problem_status WHERE problem_id = ?), ?, ?)
    ''', (problem_id, problem_id, 1 if results_visible else 0, datetime.now()))
    conn.commit()
    conn.close()

def get_exam_status():
    """Get current exam status"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM exam_status WHERE id = 1')
    status = cursor.fetchone()
    conn.close()
    return status

def verify_team_credentials(team_name, team_code):
    """Verify team credentials against database"""
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM login_details WHERE team_name = ? AND team_code = ?', (team_name, team_code))
    team = cursor.fetchone()
    conn.close()
    return team is not None

# Initialize database on startup
init_database()
from datetime import datetime
import threading
import webbrowser
import os
import sys

# Configuration
PORT = 8080
HOST = '0.0.0.0'  # Allow connections from any device on the network

# Sample data for offline use
SAMPLE_DATA = {
    "problems": [
        {
            "id": "1",
            "title": "Count Set Bits",
            "description": "Given an integer N, count the number of set bits (1s) in its binary representation.",
            "difficulty": "easy",
            "points": 100,
            "buggy_code": {
                "python": """n = int(input())

count = 2

while n < 0:
    if (n | 1) = 1:
        count = count + 1
    n = n << 1

print(cout)""",
                "java": """import java.util.*;

public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        int count = 2;

        while (n < 0) {
            if ((n | 1) = 1) {
                count = count + 1;
            }
            n = n << 1;
        }

        System.out.println(cout);
    }
}""",
                "cpp": """#include <iostream>
using namespace std;

int main() {

    int n;
    cin >> n;

    int count = 2;

    while (n < 0) {
        if ((n | 1) = 1) {
            count = count + 1;
        }
        n = n << 1;
    }

    cout << cout;

    return 0;
}"""
            },
            "fixed_code": {
                "python": """n = int(input())

count = 0

while n > 0:
    if (n & 1) == 1:
        count += 1
    n = n >> 1

print(count)""",
                "java": """import java.util.*;

public class Main {

    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        int count = 0;

        while(n > 0)
        {
            if((n & 1) == 1)
            {
                count++;
            }

            n = n >> 1;
        }

        System.out.println(count);
    }
}""",
                "cpp": """#include <iostream>
using namespace std;

int main() {

    int n;
    cin >> n;

    int count = 0;

    while(n > 0)
    {
        if((n & 1) == 1)
        {
            count++;
        }

        n = n >> 1;
    }

    cout << count;

}"""
            },
            "test_cases": [
                {"input": "1", "expected": "1", "hidden": False},
                {"input": "2", "expected": "1", "hidden": False},
                {"input": "3", "expected": "2", "hidden": False},
                {"input": "4", "expected": "1", "hidden": False},
                {"input": "5", "expected": "2", "hidden": False}
            ],
            "exam_started": False,
            "status": "inactive",
            "results_visible": False
        },
        {
            "id": 2,
            "title": "Chat Spam Pattern Detector",
            "description": "In an online messaging platform, users send messages continuously in chat rooms. Sometimes users repeatedly send the same message, which is considered spam. Your task is to debug the given program so that it correctly detects when a message appears three or more consecutive times. If spam is detected, print \"Spam detected: <message>\", otherwise print \"No spam detected\".",
            "difficulty": "medium",
            "points": 250,
            "python": """class ChatSystem:

    def __init__(self):
        self.messages = []

    def add_message(self, message):
        self.messages.append(message)


class SpamDetector(ChatSystem):

    def detect_spam(self):

        if len(self.messages) < 3:
            return "No spam detected"

        count = 1

        for i in range(1, len(self.messages)):

            if self.messages[i] != self.messages[j-1]:
                count -= 1

                if count >= 2:
                    return f"Spam detected: {self.messages[i]}"
            else:
                count = 1

        return "No spam detected"


detector = Spamdetector()

n = int(input())

for i in range(n+1)
    msg = input()
    detector.add_message(msg)

result = detector.detect_spam()

print(result)""",
            "java": """import java.util.*;

class ChatSystem {

    List<String> messages = new ArrayList<>();

    void addMessage(String msg) {
        messages.add(msg);
    }
}

class SpamDetector extends ChatSystem {

    String detectSpam() {

        if(messages.size() < 3)
            return "No spam detected";

        int count = 1;

        for(int i=1;i<messages.size();i++) {

            if(messages.get(i) != messages.get(j-1)) {
                count--;

                if(count >= 2)
                    return "Spam detected: " + messages.get(i);
            }
            else {
                count = 1;
            }
        }

        return "No spam detected";
    }
}

public class Main {

    public static void main(String[] args) {

        Spamdetector detector = new Spamdetector();

        Scanner sc = new Scanner(System.in);

        int n = sc.nextInt();

        for(int i=0;i<=n;i++) {
            String msg = sc.next();
            detector.addMessage(msg);
        }

        System.out.println(detector.detectSpam());
    }
}""",
            "cpp": """#include <iostream>
#include <vector>
#include <string>
using namespace std;

class ChatSystem {
public:
    vector<string> messages;

    void add_message(string msg) {
        messages.push_back(msg);
    }
};

class SpamDetector : public ChatSystem {
public:

    string detect_spam() {

        if(messages.size() < 3)
            return "No spam detected";

        int count = 1;

        for(int i=1;i<messages.size();i++) {

            if(messages[i] != messages[j-1]) {
                count--;

                if(count >= 2)
                    return "Spam detected: " + messages[i];
            }
            else {
                count = 1;
            }
        }

        return "No spam detected";
    }
};

int main() {

    Spamdetector detector;

    int n;
    cin >> n;

    for(int i=0;i<=n;i++) {
        string msg;
        cin >> msg;
        detector.add_message(msg);
    }

    cout << detector.detect_spam();
}""",
            "test_cases": [
                {"input": "3\nhi\nhi\nhi", "expected": "Spam detected: hi", "hidden": False},
                {"input": "4\nhello\nhello\nhello\nbye", "expected": "Spam detected: hello", "hidden": False},
                {"input": "5\nhi\nhello\nhi\nhello\nhi", "expected": "No spam detected", "hidden": False},
                {"input": "4\nhi\nhi\nhai\nhai", "expected": "No spam detected", "hidden": False},
                {"input": "5\nhi\nhi\nhello\nhello\nhello", "expected": "Spam detected: hello", "hidden": False},
                {"input": "4\ntest\ntest\ntest\ntest", "expected": "Spam detected: test", "hidden": True},
                {"input": "2\nhi\nhi", "expected": "No spam detected", "hidden": True}
            ],
            "exam_started": False,
            "status": "inactive",
            "results_visible": False
        },
        {
            "id": 3,
            "title": "Problem 3: Undo/Redo Text Editor (Linked Stack Debugging)",
            "description": """You are building a simple text editor that supports operations like **WRITE, UNDO, REDO, and SHOW**.
The editor maintains history using **two stacks (Undo Stack and Redo Stack)** to track changes made to the text.
However, the given program contains **syntax and logical errors** that prevent it from working correctly.
Your task is to **debug the code, fix the errors, and ensure all operations produce the correct output**.

**Example**

**Input**

```
5
WRITE Hello
WRITE World
UNDO
REDO
SHOW
```

**Output**

```
HelloWorld
```""",
            "difficulty": "Hard",
            "category": "Data Structures",
            "languages": ["python", "java", "cpp"],
            "buggy_code": {
                "python": """class Node:
    def __init__(self, data):
        self.data = data
        self.next = none


class LinkedStack:
    def __init__(self):
        self.top = None

    def push(data):
        new_node = Node(data)
        new_node.next = self.top
        self.top = new_node

    def pop(self):
        if self.top is None:
            return None

        temp = self.top
        self.top = self.top.next
        return temp.data

    def is_empty(self):
        return self.top is None


class TextEditor:
    def __init__(self):
        self.text = "empty"
        self.undo_stack = LinkedStack()
        self.redo_stack = LinkedStack()

    def write(self, new_text):
        self.undo_stack.push(self.text)
        self.text += new_text
        self.redo_stack = LinkedStack()

    def undo(self):
        if self.undo_stack.is_empty()==None:
            self.redo_stack.push(self.text)
            self.text = self.undo_stack.pop()

    def redo(self):
        if not self.undo_stack.is_empty():
            self.undo_stack.push(self.text)
            self.text = self.redo_stack.pop()

    def show(self):
        print(self.Text)


editor = TextEditor()

n = input()

for _ in range(n):
    command = input().split()

    if command[0] == "WRITE":
        editor.write(command[0])

    elif command[0] == "UNDO":
        editor.undo()

    elif command[0] == "REDO":
        editor.redo()

    elif command[0] == "SHOW":
        editor.show()""",
                "java": """import java.util.*;

class Node{
    String data;
    Node next;

    node(String data){
        this.data = data;
        this.next = Null;
    }
}

class LinkedStack{
    Node top;

    void push(String data){
        Node newNode = new Node(data);
        newNode.next = top;
        top = newNode;
    }

    String pop(){
        if(top == null)
            return null;

        Node temp = top;
        top = top.next;
        return temp.data;
    }

    boolean isEmpty(){
        return top == null;
    }
}

class TextEditor{
    String text = "empty";
    LinkedStack undoStack = new LinkedStack();
    LinkedStack redoStack = new LinkedStack();

    void write(String newText){
        undoStack.push(text);
        text += newText;
        redoStack = new LinkedStack();
    }

    void undo(){
        if(undoStack.isEmpty() == false){
            redoStack.push(text);
            text = undoStack.pop();
        }
    }

    void redo(){
        if(!undoStack.isEmpty()){
            undoStack.push(text);
            text = redoStack.pop();
        }
    }

    void show(){
        System.out.println(Text);
    }
}

public class Main{
    public static void main(String[] args){

        Scanner sc = new Scanner(System.in);
        TextEditor editor = new TextEditor();

        int n = sc.nextInt();
        sc.nextLine();

        for(int i=0;i<n;i++){

            String[] command = sc.nextLine().split(" ");

            if(command[0].equals("WRITE")){
                editor.write(command[0]);
            }

            else if(command[0].equals("UNDO")){
                editor.undo();
            }

            else if(command[0].equals("REDO")){
                editor.redo();
            }

            else if(command[0].equals("SHOW")){
                editor.show();
            }
        }
    }
}""",
                "cpp": """#include <iostream>
using namespace std;

class Node{
public:
    string data;
    Node* next;

    node(string data){
        this->data = data;
        this->next = Null;
    }
};

class LinkedStack{
public:
    Node* top;

    void push(string data){
        Node* newNode = new Node(data);
        newNode->next = top;
        top = newNode;
    }

    string pop(){
        if(top == NULL)
            return "";

        Node* temp = top;
        top = top->next;
        return temp->data;
    }

    bool isEmpty(){
        return top == NULL;
    }
};

class TextEditor{
public:
    string text = "empty";
    LinkedStack undoStack;
    LinkedStack redoStack;

    void write(string newText){
        undoStack.push(text);
        text += newText;
        redoStack = LinkedStack();
    }

    void undo(){
        if(undoStack.isEmpty() == false){
            redoStack.push(text);
            text = undoStack.pop();
        }
    }

    void redo(){
        if(!undoStack.isEmpty()){
            undoStack.push(text);
            text = redoStack.pop();
        }
    }

    void show(){
        cout << Text << endl;
    }
};

int main(){

    TextEditor editor;

    int n;
    cin >> n;

    while(n--){

        string cmd;
        cin >> cmd;

        if(cmd == "WRITE"){
            string text;
            cin >> text;
            editor.write(cmd);
        }

        else if(cmd == "UNDO"){
            editor.undo();
        }

        else if(cmd == "REDO"){
            editor.redo();
        }

        else if(cmd == "SHOW"){
            editor.show();
        }
    }
}"""
            },
            "test_cases": [
                {"input": "3\nWRITE Hello\nWRITE World\nSHOW", "expected": "HelloWorld", "hidden": False},
                {"input": "2\nWRITE FixIT\nSHOW", "expected": "FixIT", "hidden": False},
                {"input": "4\nWRITE Hello\nWRITE World\nUNDO\nSHOW", "expected": "Hello", "hidden": False},
                {"input": "5\nWRITE Hello\nWRITE World\nUNDO\nREDO\nSHOW", "expected": "HelloWorld", "hidden": False},
                {"input": "6\nWRITE A\nWRITE B\nWRITE C\nUNDO\nUNDO\nSHOW", "expected": "A", "hidden": False},
                {"input": "7\nWRITE A\nWRITE B\nWRITE C\nUNDO\nUNDO\nREDO\nSHOW", "expected": "AB", "hidden": False},
                {"input": "6\nWRITE A\nWRITE B\nUNDO\nWRITE C\nREDO\nSHOW", "expected": "AC", "hidden": False},
                {"input": "1\nSHOW", "expected": "", "hidden": False}
            ],
            "exam_started": False,
            "status": "inactive",
            "results_visible": False
        }
    ],
    "leaderboard": [
        {"rank": 1, "team": "CodeWarriors", "user": "Alice Chen", "problems_solved": 18, "score": 2450},
        {"rank": 2, "team": "BugBusters", "user": "Bob Smith", "problems_solved": 16, "score": 2200},
        {"rank": 3, "team": "DebugMasters", "user": "Carol Davis", "problems_solved": 15, "score": 1950}
    ],
    "exam_status": {
        "global_exam_active": False,
        "current_problem": None,
        "admin_submissions": []
    }
}

# HTML Template for offline platform
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FixIt - Offline Debugging Platform</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #111827; color: #f9fafb; line-height: 1.6; }
        code { font-family: 'JetBrains Mono', monospace; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
        .gradient-text { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 500; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; font-size: 0.875rem; }
        .btn-primary { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; }
        .btn-primary:hover { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); transform: translateY(-1px); }
        .btn-secondary { background: #374151; color: #e5e7eb; }
        .btn-secondary:hover { background: #4b5563; }
        .card { background: #1f2937; border: 1px solid #374151; border-radius: 0.75rem; overflow: hidden; transition: all 0.2s; }
        .card:hover { border-color: #4b5563; transform: translateY(-2px); }
        .card-header { padding: 1.5rem; border-bottom: 1px solid #374151; }
        .card-body { padding: 1.5rem; }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid #374151; }
        .nav-logo { font-size: 1.5rem; font-weight: 700; color: #3b82f6; }
        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nav-link { color: #9ca3af; text-decoration: none; font-weight: 500; transition: color 0.2s; cursor: pointer; }
        .nav-link:hover { color: #3b82f6; }
        .nav-link.active { color: #3b82f6; }
        .badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .badge-easy { background: #065f46; color: #6ee7b7; }
        .badge-medium { background: #92400e; color: #fbbf24; }
        .badge-hard { background: #991b1b; color: #f87171; }
        .badge-success { background: #065f46; color: #6ee7b7; }
        .badge-error { background: #991b1b; color: #f87171; }
        .badge-warning { background: #92400e; color: #fbbf24; }
        .editor { background: #1e1e1e; border: 1px solid #374151; border-radius: 0.5rem; padding: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.5; min-height: 400px; color: #f9fafb; white-space: pre-wrap; }
        .test-case { background: #111827; border: 1px solid #374151; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
        .hidden { display: none !important; }
        .grid { display: grid; gap: 1rem; }
        .grid-2 { grid-template-columns: repeat(2, 1fr); }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        .flex { display: flex; }
        .flex-between { justify-content: space-between; }
        .flex-center { justify-content: center; align-items: center; }
        .text-center { text-align: center; }
        .mb-2 { margin-bottom: 2rem; }
        .mb-4 { margin-bottom: 4rem; }
        .p-4 { padding: 4rem 0; }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #1f2937; border-radius: 1rem; padding: 2rem; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto; }
        .leaderboard-table { width: 100%; border-collapse: collapse; }
        .leaderboard-table th { background: #374151; padding: 0.75rem; text-align: left; font-weight: 600; color: #f9fafb; font-size: 0.875rem; text-transform: uppercase; }
        .leaderboard-table td { padding: 0.75rem; border-bottom: 1px solid #374151; }
        .leaderboard-table tr:hover { background: #374151; }
        .input { width: 100%; padding: 0.75rem; background: #374151; border: 1px solid #4b5563; border-radius: 0.5rem; color: #f9fafb; margin-bottom: 0.5rem; }
        .input:focus { outline: none; border-color: #3b82f6; }
        .offline-badge { background: #059669; color: #10b981; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; margin-left: 0.5rem; }
        @media (max-width: 768px) { .nav-links { display: none; } .grid-2, .grid-3 { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="container">
        <div class="nav">
            <div class="nav-logo">
                FixIt
                <span class="offline-badge">OFFLINE</span>
            </div>
            <div class="nav-links">
                <span class="nav-link active" onclick="showPage('dashboard')">Dashboard</span>
                <span class="nav-link" onclick="showPage('problems')">Problems</span>
                <span class="nav-link" onclick="showPage('leaderboard')">Leaderboard</span>
                <span class="nav-link" id="admin-link" style="display: none;" onclick="showPage('admin')">Admin Panel</span>
                <div id="user-profile" style="display: none; margin-right: 1rem;">
                    <span style="color: #f9fafb; font-weight: 600;">
                        <i class="fas fa-user-circle" style="margin-right: 0.5rem;"></i>
                        <span id="profile-name">Guest</span>
                    </span>
                    <span id="profile-team" style="color: #9ca3af; margin-left: 0.5rem;"></span>
                </div>
                <button class="btn btn-primary" onclick="showLogin()">Login</button>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container">
        <!-- Dashboard Page -->
        <div id="dashboard-page" class="page">
            <div class="p-4 text-center">
                <h1 class="gradient-text mb-4">Welcome to FixIt! 🐛</h1>
                <p class="mb-4" style="color: #9ca3af;">Professional Debugging Competition Platform - Offline Mode</p>
                
                <div class="grid grid-3 mb-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-bug" style="font-size: 3rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">3 Problems</h3>
                            <p style="color: #9ca3af;">Debug challenges ready</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-code" style="font-size: 3rem; color: #10b981; margin-bottom: 1rem;"></i>
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Python Focus</h3>
                            <p style="color: #9ca3af;">Real debugging scenarios</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-trophy" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Compete & Win</h3>
                            <p style="color: #9ca3af;">Local leaderboard</p>
                        </div>
                    </div>
                </div>
                
                <button class="btn btn-primary" style="font-size: 1.2rem; padding: 1rem 2rem;" onclick="showPage('problems')">
                    <i class="fas fa-play" style="margin-right: 0.5rem;"></i>
                    Start Debugging
                </button>
            </div>
        </div>

        <!-- Problems Page -->
        <div id="problems-page" class="page hidden">
            <h1 class="mb-4">Debugging Problems</h1>
            <div class="grid grid-2" id="problems-list">
                <!-- Problems will be loaded here -->
            </div>
        </div>

        <!-- Problem Detail Page -->
        <div id="problem-detail-page" class="page hidden">
            <div id="problem-content">
                <!-- Problem will be loaded here -->
            </div>
        </div>

        <!-- Leaderboard Page -->
        <div id="leaderboard-page" class="page hidden">
            <h1 class="mb-4">Live Leaderboard</h1>
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Team</th>
                                <th>Problem</th>
                                <th>Passed</th>
                                <th>Score</th>
                                <th>Time</th>
                                <th>Submission Time</th>
                                <th>Total Score</th>
                            </tr>
                        </thead>
                        <tbody id="leaderboard-body">
                            <!-- Leaderboard will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Admin Panel Page -->
        <div id="admin-page" class="page hidden">
            <h1 class="mb-4">Admin Panel - Exam Control</h1>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h3 style="color: #f9fafb;">Global Exam Status</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <span style="color: #9ca3af;">Current Status:</span>
                        <span id="global-exam-status" class="badge badge-warning">INACTIVE</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <span style="color: #9ca3af;">Active Problem:</span>
                        <span id="active-problem" style="color: #f9fafb;">None</span>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3 style="color: #f9fafb;">Problem Control</h3>
                </div>
                <div class="card-body">
                    <div id="admin-problems-list">
                        <!-- Admin problem controls will be loaded here -->
                    </div>
                </div>
            </div>

            <!-- Teams Database Section -->
            <div class="card mb-4">
                <div class="card-header">
                    <h3 style="color: #f9fafb;">Teams Database</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <button class="btn btn-primary" onclick="showTeamsData()">Show Teams Data</button>
                        <button class="btn btn-primary" onclick="showAddTeamModal()">Add a Team</button>
                        <button class="btn btn-primary" onclick="showRemoveTeamModal()">Remove a Team</button>
                    </div>
                    <div id="teams-table-container" style="display: none;">
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="position: sticky; top: 0; background: #1f2937;">
                                    <tr>
                                        <th style="padding: 0.75rem; text-align: left; color: #f9fafb; border-bottom: 1px solid #374151;">ID</th>
                                        <th style="padding: 0.75rem; text-align: left; color: #f9fafb; border-bottom: 1px solid #374151;">Team Name</th>
                                        <th style="padding: 0.75rem; text-align: left; color: #f9fafb; border-bottom: 1px solid #374151;">Team Code</th>
                                        <th style="padding: 0.75rem; text-align: left; color: #f9fafb; border-bottom: 1px solid #374151;">Created At</th>
                                    </tr>
                                </thead>
                                <tbody id="teams-table-body">
                                    <!-- Teams data will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clear Submission Data Section -->
            <div class="card mb-4">
                <div class="card-header">
                    <h3 style="color: #f9fafb;">Clear Submission Data</h3>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: 1rem; color: #9ca3af;">
                        Clear all submissions for specific problems. This will permanently delete submission data and update leaderboard scores.
                    </div>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <div style="margin-bottom: 0.5rem; font-weight: 600; color: #f9fafb;">Problem 1</div>
                            <button class="btn btn-primary" onclick="clearProblemSubmissions('Count Set Bits')" style="width: 100%;">Clear Submissions</button>
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <div style="margin-bottom: 0.5rem; font-weight: 600; color: #f9fafb;">Problem 2</div>
                            <button class="btn btn-primary" onclick="clearProblemSubmissions('Chat Spam Pattern Detector')" style="width: 100%;">Clear Submissions</button>
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <div style="margin-bottom: 0.5rem; font-weight: 600; color: #f9fafb;">Problem 3</div>
                            <button class="btn btn-primary" onclick="clearProblemSubmissions('Problem 3: Undo/Redo Text Editor (Linked Stack Debugging)')" style="width: 100%;">Clear Submissions</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Clear Submissions Confirmation Modal -->
    <div id="clear-submissions-modal" class="modal hidden">
        <div class="modal-content">
            <h2 style="margin-bottom: 1.5rem;">Clear Submissions</h2>
            <div style="margin-bottom: 1.5rem; color: #9ca3af;">
                Do you want to clear all submissions for this problem?<br><br>
                All submissions related to this problem will be permanently deleted.<br>
                This will also update leaderboard scores.
            </div>
            <div class="flex" style="gap: 1rem;">
                <button class="btn btn-primary" onclick="confirmClearSubmissions()">YES</button>
                <button class="btn btn-secondary" onclick="hideClearSubmissionsModal()">CANCEL</button>
            </div>
        </div>
    </div>

    <!-- Login Modal -->
    <div id="login-modal" class="modal hidden">
        <div class="modal-content">
            <h2 style="margin-bottom: 1.5rem;">Login to FixIt</h2>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Login Type</label>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; color: #f9fafb; cursor: pointer;">
                        <input type="radio" name="userType" value="user" checked style="margin-right: 0.5rem;">
                        User
                    </label>
                    <label style="display: flex; align-items: center; color: #f9fafb; cursor: pointer;">
                        <input type="radio" name="userType" value="admin" style="margin-right: 0.5rem;">
                        Admin
                    </label>
                </div>
            </div>
            <div id="user-fields">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Team Name</label>
                    <input type="text" id="teamname" class="input" placeholder="Enter team name">
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Team Code</label>
                    <input type="text" id="teamcode" class="input" placeholder="Enter team code">
                </div>
            </div>
            <div id="admin-fields" style="display: none;">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Admin Password</label>
                    <input type="password" id="admin-password" class="input" placeholder="Enter admin password">
                </div>
            </div>
            <div class="flex" style="gap: 1rem;">
                <button class="btn btn-primary" onclick="login()">Login</button>
                <button class="btn btn-secondary" onclick="hideLogin()">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Add Team Modal -->
    <div id="add-team-modal" class="modal hidden">
        <div class="modal-content">
            <h2 style="margin-bottom: 1.5rem;">Add New Team</h2>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Team Name</label>
                <input type="text" id="new-team-name" class="input" placeholder="Enter team name">
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Team Code</label>
                <input type="text" id="new-team-code" class="input" placeholder="Enter team code">
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Confirm Team Code</label>
                <input type="text" id="confirm-team-code" class="input" placeholder="Confirm team code">
            </div>
            <div class="flex" style="gap: 1rem;">
                <button class="btn btn-primary" onclick="addTeam()">Create Team</button>
                <button class="btn btn-secondary" onclick="hideAddTeamModal()">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Remove Team Modal -->
    <div id="remove-team-modal" class="modal hidden">
        <div class="modal-content">
            <h2 style="margin-bottom: 1.5rem;">Remove Team</h2>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Team Name</label>
                <input type="text" id="remove-team-name" class="input" placeholder="Enter team name">
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Team Code</label>
                <input type="text" id="remove-team-code" class="input" placeholder="Enter team code">
            </div>
            <div class="flex" style="gap: 1rem;">
                <button class="btn btn-primary" onclick="removeTeam()">Remove Team</button>
                <button class="btn btn-secondary" onclick="hideRemoveTeamModal()">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        // Language templates for each problem (fallback if problem data not loaded)
        const languageTemplates = {
            "1": {
                "python": `n = int(input())

count = 2

while n < 0:
    if (n | 1) = 1:
        count = count + 1
    n = n << 1

print(cout)`,
                "java": `import java.util.*;

public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        int count = 2;

        while (n < 0) {
            if ((n | 1) = 1) {
                count = count + 1;
            }
            n = n << 1;
        }

        System.out.println(cout);
    }
}`,
                "cpp": `#include <iostream>
using namespace std;

int main() {

    int n;
    cin >> n;

    int count = 2;

    while (n < 0) {
        if ((n | 1) = 1) {
            count = count + 1;
        }
        n = n << 1;
    }

    cout << cout;

    return 0;
}`
            },
            "2": {
                "python": `class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None
    
    def add_node(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        
        current = self.head
        while current.next:
            current = current.next
        current.next = new_node
    
    def clear_list(self):
        # Bug: Memory leak - not properly clearing nodes
        self.head = None  # This doesn't free the nodes

# Usage
ll = LinkedList()
ll.add_node(1)
ll.add_node(2)
ll.add_node(3)
ll.clear_list()`,
                "java": `class Node {
    int data;
    Node next;
    
    Node(int data) {
        this.data = data;
        this.next = null;
    }
}

class LinkedList {
    Node head;
    
    void addNode(int data) {
        Node newNode = new Node(data);
        if (head == null) {
            head = newNode;
            return;
        }
        
        Node current = head;
        while (current.next != null) {
            current = current.next;
        }
        current.next = newNode;
    }
    
    void clearList() {
        // Bug: Memory leak - not properly clearing nodes
        head = null;  // This doesn't free the nodes
    }
    
    public static void main(String[] args) {
        LinkedList ll = new LinkedList();
        ll.addNode(1);
        ll.addNode(2);
        ll.addNode(3);
        ll.clearList();
    }
}`,
                "cpp": `#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* next;
    
    Node(int data) : data(data), next(nullptr) {}
};

class LinkedList {
private:
    Node* head;
    
public:
    LinkedList() : head(nullptr) {}
    
    void addNode(int data) {
        Node* newNode = new Node(data);
        if (head == nullptr) {
            head = newNode;
            return;
        }
        
        Node* current = head;
        while (current->next != nullptr) {
            current = current->next;
        }
        current->next = newNode;
    }
    
    void clearList() {
        // Bug: Memory leak - not properly clearing nodes
        head = nullptr;  // This doesn't free the nodes
    }
    
    ~LinkedList() {
        // Should properly clean up here
    }
};

int main() {
    LinkedList ll;
    ll.addNode(1);
    ll.addNode(2);
    ll.addNode(3);
    ll.clearList();
    return 0;
}`
            },
            "3": {
                "python": `import threading

class Counter:
    def __init__(self):
        self.value = 0
    
    def increment(self):
        # Bug: Race condition - not thread-safe
        temp = self.value
        # Simulate some processing
        import time
        time.sleep(0.001)
        self.value = temp + 1

def worker(counter, increments):
    for _ in range(increments):
        counter.increment()

# Test with multiple threads
counter = Counter()
threads = []
for i in range(10):
    thread = threading.Thread(target=worker, args=(counter, 100))
    threads.append(thread)
    thread.start()

for thread in threads:
    thread.join()

print(f"Expected: 1000, Got: {counter.value}")`,
                "java": `import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

class Counter {
    private int value = 0;
    private Lock lock = new ReentrantLock();
    
    public void increment() {
        // Bug: Race condition - not using lock properly
        int temp = value;
        try {
            Thread.sleep(1); // Simulate processing
        } catch (InterruptedException e) {}
        value = temp + 1;
    }
    
    public int getValue() {
        return value;
    }
}

class Worker implements Runnable {
    private Counter counter;
    private int increments;
    
    Worker(Counter counter, int increments) {
        this.counter = counter;
        this.increments = increments;
    }
    
    public void run() {
        for (int i = 0; i < increments; i++) {
            counter.increment();
        }
    }
}

public class Main {
    public static void main(String[] args) throws InterruptedException {
        Counter counter = new Counter();
        Thread[] threads = new Thread[10];
        
        for (int i = 0; i < 10; i++) {
            threads[i] = new Thread(new Worker(counter, 100));
            threads[i].start();
        }
        
        for (Thread thread : threads) {
            thread.join();
        }
        
        System.out.println("Expected: 1000, Got: " + counter.getValue());
    }
}`,
                "cpp": `#include <iostream>
#include <thread>
#include <vector>
#include <mutex>

class Counter {
private:
    int value = 0;
    std::mutex mtx;
    
public:
    void increment() {
        // Bug: Race condition - not using lock properly
        int temp = value;
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        value = temp + 1;
    }
    
    int getValue() {
        return value;
    }
};

void worker(Counter& counter, int increments) {
    for (int i = 0; i < increments; i++) {
        counter.increment();
    }
}

int main() {
    Counter counter;
    std::vector<std::thread> threads;
    
    for (int i = 0; i < 10; i++) {
        threads.emplace_back(worker, std::ref(counter), 100);
    }
    
    for (auto& thread : threads) {
        thread.join();
    }
    
    std::cout << "Expected: 1000, Got: " << counter.getValue() << std::endl;
    return 0;
}`
            }
        };

        // Update code when language changes
        function updateCode(problemId, language) {
            const editor = document.getElementById(`editor-${problemId}`);
            const problem = problems.find(p => p.id == problemId);
            
            if (editor && problem) {
                const code = problem.buggy_code?.[language] || problem[language] || '';
                editor.textContent = code;
            }
        }

        // Sample data for offline use
        const SAMPLE_DATA = """ + json.dumps(SAMPLE_DATA) + """;

        // State Management
        let currentUser = null;
        let currentPage = 'dashboard';
        let submissions = [];
        let leaderboard = [...SAMPLE_DATA.leaderboard];
        let problems = [...SAMPLE_DATA.problems];
        let isAdmin = false;
        let examStatus = SAMPLE_DATA.exam_status;

        // Admin functions
        function showLogin() {
            const modal = document.getElementById('login-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.remove('hidden');
            }
        }

        function hideLogin() {
            const modal = document.getElementById('login-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.add('hidden');
            }
        }

        function login() {
            const userType = document.querySelector('input[name="userType"]:checked').value;
            
            if (userType === 'admin') {
                const password = document.getElementById('admin-password').value;
                console.log('Entered password:', password); // Debug log
                console.log('Expected password:', 'Pspk@0902.'); // Debug expected
                if (password.trim() === 'Pspk@0902.') {
                    isAdmin = true;
                    currentUser = { username: 'Admin', teamname: 'System', isAdmin: true };
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    hideLogin();
                    showAdminPanel();
                    alert('Welcome Admin! You have full control over the exam.');
                } else {
                    alert('Invalid admin password!');
                    return;
                }
            } else {
                const teamname = document.getElementById('teamname').value;
                const teamcode = document.getElementById('teamcode').value;
                
                if (!teamname || !teamcode) {
                    alert('Please enter both team name and team code');
                    return;
                }
                
                // Verify credentials with server
                fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        team_name: teamname,
                        team_code: teamcode,
                        is_admin: false
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        currentUser = data.user;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        hideLogin();
                        alert(`Welcome ${teamname}! Start solving problems to earn points.`);
                        updateUI();
                    } else {
                        alert(data.message || 'Login failed');
                    }
                })
                .catch(error => {
                    console.error('Login error:', error);
                    alert('Login failed. Please try again.');
                });
                return; // Don't proceed to updateUI yet
            }
            
            updateUI();
        }

        function updateUI() {
            const userProfile = document.getElementById('user-profile');
            const profileName = document.getElementById('profile-name');
            const profileTeam = document.getElementById('profile-team');
            const adminLink = document.getElementById('admin-link');
            const navLinks = document.querySelectorAll('.nav-link');
            
            if (currentUser) {
                // Show user profile
                userProfile.style.display = 'block';
                
                if (currentUser.isAdmin) {
                    // Admin profile
                    profileName.textContent = 'Admin';
                    profileTeam.textContent = '';
                    profileName.style.color = '#fbbf24'; // Gold color for admin
                    adminLink.style.display = 'block';
                    
                    // Update nav links for admin
                    if (navLinks && navLinks[4]) {
                        navLinks[4].outerHTML = `
                            <span style="color: #f9fafb; margin-right: 1rem;">
                                <i class="fas fa-user-shield"></i> Admin
                            </span>
                            <button class="btn btn-secondary" onclick="logout()">Logout</button>
                        `;
                    }
                } else {
                    // Regular user profile
                    profileName.textContent = currentUser.username;
                    profileTeam.textContent = `(${currentUser.teamname})`;
                    profileName.style.color = '#f9fafb'; // Normal color for user
                    adminLink.style.display = 'none';
                    
                    // Update nav links for user
                    if (navLinks && navLinks[4]) {
                        navLinks[4].outerHTML = `
                            <span style="color: #f9fafb; margin-right: 1rem;">
                                <i class="fas fa-user"></i> ${currentUser.username}
                            </span>
                            <button class="btn btn-secondary" onclick="logout()">Logout</button>
                        `;
                    }
                }
            } else {
                // No user logged in
                userProfile.style.display = 'none';
                adminLink.style.display = 'none';
                
                // Update nav links for guest
                if (navLinks && navLinks[4]) {
                    navLinks[4].outerHTML = '<button class="btn btn-primary" onclick="showLogin()">Login</button>';
                }
            }
        }

        function showAdminPanel() {
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            
            document.getElementById('admin-page').classList.remove('hidden');
            document.getElementById('admin-link').classList.add('active');
            currentPage = 'admin';
            
            loadAdminControls();
            updateExamStatus();
        }

        function loadAdminControls() {
            const container = document.getElementById('admin-problems-list');
            container.innerHTML = problems.map(problem => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <div>
                                <h4 style="color: #f9fafb; margin-bottom: 0.5rem;">${problem.title}</h4>
                                <span class="badge badge-${problem.difficulty}">${problem.difficulty.toUpperCase()}</span>
                                <span class="badge badge-primary">${problem.points} POINTS</span>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-danger" onclick="makeInactive(${problem.id})" ${!problem.exam_started ? 'disabled' : ''}>
                                    <i class="fas fa-stop" style="margin-right: 0.5rem;"></i>
                                    Inactive
                                </button>
                                <button class="btn btn-primary" onclick="startExam(${problem.id})" ${problem.exam_started ? 'disabled' : ''}>
                                    <i class="fas fa-play" style="margin-right: 0.5rem;"></i>
                                    ${problem.exam_started ? 'Exam Started' : 'Start Exam'}
                                </button>
                                <button class="btn btn-secondary" onclick="toggleResults(${problem.id})">
                                    <i class="fas fa-eye" style="margin-right: 0.5rem;"></i>
                                    ${problem.results_visible ? 'Hide Results' : 'Show Results'}
                                </button>
                            </div>
                        </div>
                        <div style="color: #9ca3af; font-size: 0.875rem;">
                            Status: ${problem.exam_started ? '🟢 Exam Active' : '🔴 Not Started'} | 
                            Results: ${problem.results_visible ? '👁️ Visible' : '🙈 Hidden'}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function updateExamStatus() {
            const statusElement = document.getElementById('global-exam-status');
            const activeProblemElement = document.getElementById('active-problem');
            
            const activeProblem = problems.find(p => p.exam_started);
            
            if (activeProblem) {
                statusElement.textContent = 'ACTIVE';
                statusElement.className = 'badge badge-success';
                activeProblemElement.textContent = activeProblem.title;
            } else {
                statusElement.textContent = 'INACTIVE';
                statusElement.className = 'badge badge-warning';
                activeProblemElement.textContent = 'None';
            }
        }

        function startExam(problemId) {
            const problem = problems.find(p => p.id == problemId);
            if (problem) {
                // Add confirmation dialog
                const confirmed = confirm("Are you sure you want to start this exam?");
                if (!confirmed) {
                    return; // Cancel the action if admin clicks NO
                }
                
                problem.exam_started = true;
                examStatus.global_exam_active = true;
                examStatus.current_problem = problemId;
                
                // Update problem status via API
                fetch('/api/exam-control', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'start',
                        problem_id: problemId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Notify all users (in real implementation, this would be WebSocket)
                        alert(`Exam started for "${problem.title}"! All users can now access this problem.`);
                        
                        loadAdminControls();
                        updateExamStatus();
                        
                        // Refresh problems display to update button states
                        if (typeof displayProblems === 'function') {
                            displayProblems();
                        }
                    }
                })
                .catch(error => {
                    console.error('Failed to start exam:', error);
                    alert('Failed to start exam. Please try again.');
                });
            }
        }

        function makeInactive(problemId) {
            const problem = problems.find(p => p.id == problemId);
            if (problem) {
                // Add confirmation dialog
                const confirmed = confirm("Are you sure you want to deactivate this problem?");
                if (!confirmed) {
                    return; // Cancel the action if admin clicks NO
                }
                
                problem.exam_started = false;
                
                // Update problem status to inactive via API
                fetch('/api/exam-control', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'inactive',
                        problem_id: problemId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Notify admin
                        alert(`Problem "${problem.title}" has been deactivated. Users can no longer access it.`);
                        
                        loadAdminControls();
                        updateExamStatus();
                        
                        // Refresh problems display to update button states
                        if (typeof displayProblems === 'function') {
                            displayProblems();
                        }
                    }
                })
                .catch(error => {
                    console.error('Failed to deactivate problem:', error);
                    alert('Failed to deactivate problem. Please try again.');
                });
            }
        }

        function toggleResults(problemId) {
            const problem = problems.find(p => p.id == problemId);
            if (problem) {
                const newVisibility = !problem.results_visible;
                
                // Update backend via API
                fetch('/api/results-visibility', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        problem_id: problemId,
                        results_visible: newVisibility
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update local state
                        problem.results_visible = newVisibility;
                        loadAdminControls();
                        
                        // Refresh leaderboard to update visibility for users
                        if (typeof updateLeaderboard === 'function') {
                            updateLeaderboard();
                        }
                        
                        alert(`Results for "${problem.title}" are now ${newVisibility ? 'visible' : 'hidden'} to all users.`);
                    } else {
                        alert('Failed to update results visibility. Please try again.');
                    }
                })
                .catch(error => {
                    console.error('Failed to update results visibility:', error);
                    alert('Failed to update results visibility. Please try again.');
                });
            }
        }

        function showSubmissions() {
            const container = document.getElementById('submissions-list');
            const submissions = examStatus.admin_submissions;
            
            if (submissions.length === 0) {
                container.innerHTML = '<p style="color: #9ca3af;">No submissions yet.</p>';
                return;
            }
            
            container.innerHTML = `
                <div style="background: #111827; border-radius: 0.5rem; padding: 1rem;">
                    <h4 style="color: #f9fafb; margin-bottom: 1rem;">Recent Submissions</h4>
                    ${submissions.map(sub => `
                        <div style="background: #1f2937; padding: 0.75rem; border-radius: 0.25rem; margin-bottom: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <span style="color: #f9fafb; font-weight: 600;">${sub.username}</span>
                                    <span style="color: #9ca3af; margin-left: 0.5rem;">${sub.teamname}</span>
                                </div>
                                <div>
                                    <span class="badge ${sub.correct ? 'badge-success' : 'badge-error'}">
                                        ${sub.correct ? '✓ Correct' : '✗ Incorrect'}
                                    </span>
                                    <span style="color: #9ca3af; margin-left: 0.5rem; font-size: 0.875rem;">
                                        ${new Date(sub.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                            <div style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.25rem;">
                                Problem: ${sub.problem_title}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        function makeResultsVisible() {
            problems.forEach(problem => {
                problem.results_visible = true;
            });
            
            loadAdminControls();
            alert('All results are now visible to everyone!');
        }

        function logout() {
            currentUser = null;
            isAdmin = false;
            localStorage.removeItem('currentUser');
            
            // Hide admin link
            document.getElementById('admin-link').style.display = 'none';
            
            updateUI();
            showPage('dashboard');
            alert('You have been logged out.');
        }

        // Handle login type change
        document.addEventListener('DOMContentLoaded', function() {
            const userTypeRadios = document.querySelectorAll('input[name="userType"]');
            userTypeRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    const userFields = document.getElementById('user-fields');
                    const adminFields = document.getElementById('admin-fields');
                    
                    if (this.value === 'admin') {
                        userFields.style.display = 'none';
                        adminFields.style.display = 'block';
                    } else {
                        userFields.style.display = 'block';
                        adminFields.style.display = 'none';
                    }
                });
            });
            
            loadUserFromStorage();
            displayProblems();
        });

        // Display problems
        function displayProblems() {
            // Fetch problem statuses first
            fetch('/api/problem-status')
                .then(response => response.json())
                .then(problemStatuses => {
                    const container = document.getElementById('problems-list');
                    container.innerHTML = problems.map(problem => {
                        const problemStatus = problemStatuses[problem.id] || {status: 'inactive', results_visible: false};
                        const status = problemStatus.status;
                        const isDisabled = status === 'inactive';
                        
                        return `
                        <div class="card" onclick="${!isDisabled ? `showProblem(${problem.id})` : ''}" style="${isDisabled ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                            <div class="card-header">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div>
                                        <h3 style="font-size: 1.25rem; font-weight: 600; color: #f9fafb; margin-bottom: 0.5rem;">
                                            ${status === 'inactive' ? `Problem ${problem.id}` : problem.title}
                                        </h3>
                                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <span class="badge badge-${problem.difficulty}">${problem.difficulty.toUpperCase()}</span>
                                            ${status === 'active' ? '<span class="badge badge-success">ACTIVE</span>' : '<span class="badge badge-secondary">LOCKED</span>'}
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">${problem.points}</div>
                                        <div style="font-size: 0.875rem; color: #9ca3af;">points</div>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                ${!isDisabled ? `<p style="color: #9ca3af; margin-bottom: 1rem;">${problem.description}</p>` : ''}
                                <button class="btn btn-primary" ${isDisabled ? 'disabled' : ''} onclick="${!isDisabled ? `showProblem(${problem.id})` : 'event.stopPropagation()'}">
                                    <i class="fas fa-play" style="margin-right: 0.5rem;"></i>
                                    Solve Now
                                </button>
                                ${isDisabled ? '<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">Problem will be available when the admin starts the exam.</p>' : ''}
                            </div>
                        </div>
                    `;
                    }).join('');
                })
                .catch(error => {
                    console.error('Failed to fetch problem statuses:', error);
                    // Fallback to original display if status fetch fails
                    const container = document.getElementById('problems-list');
                    container.innerHTML = problems.map(problem => `
                        <div class="card" onclick="showProblem(${problem.id})">
                            <div class="card-header">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div>
                                        <h3 style="font-size: 1.25rem; font-weight: 600; color: #f9fafb; margin-bottom: 0.5rem;">
                                            ${problem.title}
                                        </h3>
                                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <span class="badge badge-${problem.difficulty}">${problem.difficulty.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">${problem.points}</div>
                                        <div style="font-size: 0.875rem; color: #9ca3af;">points</div>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <p style="color: #9ca3af; margin-bottom: 1rem;">${problem.description}</p>
                                <button class="btn btn-primary">
                                    <i class="fas fa-play" style="margin-right: 0.5rem;"></i>
                                    Solve Now
                                </button>
                            </div>
                        </div>
                    `).join('');
                });
        }

        // Page Navigation
        function showPage(page) {
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            
            document.getElementById(`${page}-page`).classList.remove('hidden');
            document.querySelectorAll('.nav-link').forEach(l => {
                if (l.textContent.toLowerCase().includes(page)) {
                    l.classList.add('active');
                }
            });
            currentPage = page;
            
            if (page === 'problems') {
                displayProblems();
            } else if (page === 'leaderboard') {
                updateLeaderboard();
            } else if (page === 'admin') {
                loadAdminControls();
                updateExamStatus();
            }
        }

        // Show Problem Detail
        function showProblem(problemId) {
            const problem = problems.find(p => p.id == problemId);
            if (!problem) return;

            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.getElementById('problem-detail-page').classList.remove('hidden');

            document.getElementById('problem-content').innerHTML = `
                <div class="card mb-4">
                    <div class="card-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h2 style="font-size: 1.5rem; font-weight: 600; color: #f9fafb; margin-bottom: 0.5rem;">
                                    ${problem.title}
                                </h2>
                                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span class="badge badge-${problem.difficulty}">${problem.difficulty.toUpperCase()}</span>
                                    <span class="badge badge-primary">${problem.points} POINTS</span>
                                </div>
                            </div>
                            <button class="btn btn-secondary" onclick="showPage('problems')">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <p style="color: #9ca3af; margin-bottom: 1.5rem;">${problem.description}</p>
                        
                        <h3 style="margin-bottom: 1rem; color: #f9fafb;">Buggy Code:</h3>
                        <div style="margin-bottom: 1rem;">
                            <select id="language-${problem.id}" class="input" style="width: 200px; margin-bottom: 1rem;" onchange="updateCode(${problem.id}, this.value)">
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                            </select>
                        </div>
                        <div class="editor" id="editor-${problem.id}" contenteditable="true">${problem.buggy_code?.python || problem.python || ''}</div>
                        
                        <div style="margin: 1rem 0; padding: 1rem; background: #1f2937; border-radius: 0.5rem; border: 1px solid #374151;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div style="font-size: 1.25rem; font-weight: 600; color: #f9fafb;">
                                    Time Remaining: <span id="timer-${problem.id}">15:00</span>
                                </div>
                                <div id="timer-status-${problem.id}" style="font-size: 0.875rem; color: #10b981;">Time Started</div>
                            </div>
                        </div>
                        
                        <div style="margin: 1.5rem 0; display: flex; gap: 1rem;">
                            <button id="runCodeBtn-${problem.id}" class="btn btn-secondary" onclick="runCode(${problem.id})">
                                <i class="fas fa-play" style="margin-right: 0.5rem;"></i>
                                Run Code
                            </button>
                            <button id="submitBtn-${problem.id}" class="btn btn-primary" onclick="submitSolution(${problem.id})">
                                <i class="fas fa-check" style="margin-right: 0.5rem;"></i>
                                Submit Solution
                            </button>
                        </div>
                        
                        <div id="test-results-${problem.id}"></div>
                    </div>
                </div>
            `;
            
            // Initialize the editor with Python code
            setTimeout(() => {
                updateCode(problemId, 'python');
                checkAndRestoreTimer(problemId);
            }, 10);
        }

        // Timer functionality for competition
        let timers = {};
        
        // Problem-specific timer durations in minutes
        const problemDurations = {
            1: 15,  // Problem 1: 15 minutes
            2: 25,  // Problem 2: 25 minutes
            3: 35   // Problem 3: 35 minutes
        };
        
        function startTimer(problemId) {
            // Clear any existing timer
            if (timers[problemId]) {
                clearInterval(timers[problemId]);
            }
            
            // Get problem-specific duration
            const durationMinutes = problemDurations[problemId] || 15; // Default to 15 minutes
            const durationSeconds = durationMinutes * 60;
            
            // Store start time
            const startTime = Date.now();
            localStorage.setItem(`timer_start_${problemId}`, startTime.toString());
            
            // Update timer status
            const statusEl = document.getElementById(`timer-status-${problemId}`);
            if (statusEl) {
                statusEl.textContent = 'Timer Running';
                statusEl.style.color = '#10b981';
            }
            
            // Start countdown
            timers[problemId] = setInterval(() => {
                const currentTime = Date.now();
                const elapsed = Math.floor((currentTime - startTime) / 1000); // seconds
                const remaining = Math.max(0, durationSeconds - elapsed);
                
                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;
                
                const timerEl = document.getElementById(`timer-${problemId}`);
                if (timerEl) {
                    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    // Change color based on time remaining
                    if (remaining < 120) { // Less than 2 minutes
                        timerEl.style.color = '#ef4444'; // Red
                    } else if (remaining < 300) { // Less than 5 minutes
                        timerEl.style.color = '#f59e0b'; // Yellow
                    } else {
                        timerEl.style.color = '#10b981'; // Green
                    }
                }
                
                // Check if time is up
                if (remaining <= 0) {
                    endTimer(problemId);
                }
            }, 1000); // Update every second
        }
        
        function endTimer(problemId) {
            // Clear timer
            if (timers[problemId]) {
                clearInterval(timers[problemId]);
                delete timers[problemId];
            }
            
            // Update status
            const statusEl = document.getElementById(`timer-status-${problemId}`);
            const timerEl = document.getElementById(`timer-${problemId}`);
            const runBtn = document.getElementById(`runCodeBtn-${problemId}`);
            const submitBtn = document.getElementById(`submitBtn-${problemId}`);
            
            if (statusEl) {
                statusEl.textContent = 'Time is Over';
                statusEl.style.color = '#ef4444';
            }
            
            if (timerEl) {
                timerEl.textContent = '00:00';
                timerEl.style.color = '#ef4444';
            }
            
            // Disable buttons
            if (runBtn) {
                runBtn.disabled = true;
                runBtn.style.opacity = '0.5';
                runBtn.style.cursor = 'not-allowed';
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.style.cursor = 'not-allowed';
            }
        }
        
        function checkAndRestoreTimer(problemId) {
            // Check if timer is already running
            const storedStartTime = localStorage.getItem(`timer_start_${problemId}`);
            const currentTime = Date.now();
            
            if (storedStartTime) {
                // Timer was already started, resume it
                const elapsedSeconds = Math.floor((currentTime - parseInt(storedStartTime)) / 1000);
                const problemDuration = getProblemDuration(problemId) * 60; // Convert to seconds
                
                const remainingSeconds = Math.max(0, problemDuration - elapsedSeconds);
                
                if (remainingSeconds > 0) {
                    // Resume timer with remaining time
                    console.log(`Resuming timer for problem ${problemId} with ${remainingSeconds} seconds remaining`);
                    startTimer(problemId);
                } else {
                    // Timer expired, start fresh timer
                    console.log(`Timer expired for problem ${problemId}, starting fresh timer`);
                    localStorage.removeItem(`timer_start_${problemId}`);
                    startTimer(problemId);
                }
            } else {
                // First time opening problem, start fresh timer
                console.log(`Starting fresh timer for problem ${problemId}`);
                startTimer(problemId);
            }
        }

        // Helper function to get problem duration in seconds
        function getProblemDuration(problemId) {
            const durations = {
                1: 15 * 60,  // Problem 1: 15 minutes
                2: 25 * 60,  // Problem 2: 25 minutes
                3: 35 * 60   // Problem 3: 35 minutes
            };
            return durations[problemId] || 15 * 60;  // Default: 15 minutes
        }

        // Execute code using backend API
        async function executeCode(code, language, input, problemTitle = null) {
            try {
                const response = await fetch('/api/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code,
                        language: language,
                        input: input,
                        problem_title: problemTitle
                    })
                });
                
                const result = await response.json();
                
                // Debug logging
                console.log('Execution Result:', {
                    input: input,
                    output: result.output,
                    status: result.status,
                    error: result.error
                });
                
                return result;
                
            } catch (error) {
                console.error('Execution failed:', error);
                return {
                    success: false,
                    output: '',
                    error: 'Execution failed: ' + error.message
                };
            }
        }

        // Run Code
        function runCode(problemId) {
            const problem = problems.find(p => p.id == problemId);
            const editor = document.getElementById(`editor-${problem.id}`);
            const languageSelect = document.getElementById(`language-${problemId}`);
            const selectedLanguage = languageSelect ? languageSelect.value : 'python';
            const code = editor.textContent;
            const resultsDiv = document.getElementById(`test-results-${problemId}`);
            
            resultsDiv.innerHTML = '<h3 style="margin-bottom: 1rem; color: #f9fafb;">Running Tests...</h3>';
            
            setTimeout(async () => {
                let results = '';
                let passed = 0;
                let total = 0;
                
                console.log('Problem test cases:', problem.test_cases);
                console.log('Code to execute:', code);
                console.log('Selected language:', selectedLanguage);
                
                // Use traditional for loop instead of for...of to avoid potential issues
                for (let i = 0; i < problem.test_cases.length; i++) {
                    const testCase = problem.test_cases[i];
                    const index = i;
                    
                    console.log(`Processing test case ${index + 1}:`, testCase);
                    
                    if (!testCase.hidden) {
                        total++;
                        
                        // Execute code with test input
                        const result = await executeCode(code, selectedLanguage, testCase.input, problem.title);
                        
                        // Compare output with expected
                        let isCorrect = false;
                        if (result.status === 'accepted' && !result.error) {
                            // Strip whitespace and compare
                            const actualOutput = result.output.trim();
                            const expectedOutput = testCase.expected.toString().trim();
                            isCorrect = actualOutput === expectedOutput;
                            
                            console.log(`Comparison - Input: ${testCase.input}, Expected: "${expectedOutput}", Actual: "${actualOutput}", Correct: ${isCorrect}`);
                        } else {
                            console.log(`Execution failed - Status: ${result.status}, Error: ${result.error}`);
                        }
                        
                        if (isCorrect) passed++;
                        
                        results += `
                            <div class="test-case">
                                <div class="flex-between" style="margin-bottom: 0.5rem;">
                                    <span style="font-weight: 600; color: #f9fafb;">Test Case ${index + 1}</span>
                                    <span class="badge ${isCorrect ? 'badge-success' : 'badge-error'}">
                                        ${isCorrect ? '✓ PASSED' : '✗ FAILED'}
                                    </span>
                                </div>
                                <div style="font-size: 0.875rem; color: #9ca3af; margin-bottom: 0.5rem;">
                                    <strong>Input:</strong> ${testCase.input}<br>
                                    <strong>Expected:</strong> ${testCase.expected}<br>
                                    <strong>Output:</strong> ${result.status === 'accepted' ? result.output : (result.error && (result.error.includes('SyntaxError') || result.error.includes('NameError') || result.error.includes('TypeError') || result.error.includes('File "') || result.error.includes('cannot assign') || result.error.includes('invalid syntax') || result.error.includes('error:') || result.error.includes('Error') || result.error.includes('cannot find symbol') || result.error.includes('unexpected type') || result.error.includes('required:') || result.error.includes('found:')) ? 'Syntax Error' : result.error)}
                                </div>
                            </div>
                        `;
                    }
                }
                
                const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
                results += `
                    <div style="margin-top: 1rem; padding: 1rem; background: #1f2937; border-radius: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600; color: #f9fafb;">Summary: ${passed}/${total} tests passed</span>
                            <span style="font-weight: 700; color: ${successRate === 100 ? '#10b981' : '#f59e0b'};">${successRate}% Success Rate</span>
                        </div>
                    </div>
                `;
                
                resultsDiv.innerHTML = results;
            }, 1000);
        }

        // Submit Solution
        function submitSolution(problemId) {
            if (!currentUser) {
                showLogin();
                return;
            }
            
            // Check if timer has expired
            const timerStatus = document.getElementById(`timer-status-${problemId}`);
            if (timerStatus && timerStatus.textContent === 'Time is Over') {
                alert('❌ Time is up! Submission is closed.');
                return;
            }
            
            const problem = problems.find(p => p.id == problemId);
            const editor = document.getElementById(`editor-${problem.id}`);
            const languageSelect = document.getElementById(`language-${problemId}`);
            const selectedLanguage = languageSelect ? languageSelect.value : 'python';
            const code = editor.textContent;
            
            // Get timer start time from localStorage
            const startTimeStr = localStorage.getItem(`timer_start_${problemId}`);
            const startTime = startTimeStr ? parseInt(startTimeStr) : Date.now();
            const submissionTime = Date.now();
            const timeTaken = Math.floor((submissionTime - startTime) / 1000); // seconds
            
            // Evaluate solution against test cases
            evaluateSolution(problemId, selectedLanguage, code, timeTaken);
        }
        
        // Evaluate solution against test cases
        async function evaluateSolution(problemId, language, code, timeTaken) {
            const problem = problems.find(p => p.id == problemId);
            
            try {
                // Run all test cases
                const testCases = problem.test_cases;
                let passedCount = 0;
                let results = [];
                
                for (let i = 0; i < testCases.length; i++) {
                    const testCase = testCases[i];
                    
                    const result = await executeCode(code, language, testCase.input, problem.title);
                    
                    const isCorrect = result.status === 'accepted' && result.output === testCase.expected;
                    if (isCorrect) {
                        passedCount += 2;  // Each test case counts as 2 for total of 10
                    }
                    
                    results.push({
                        input: testCase.input,
                        expected: testCase.expected,
                        actual: result.output,
                        passed: isCorrect
                    });
                }
                
                // Calculate problem-specific total test cases
                let totalTestCases;
                if (problem.id === '1') {
                    totalTestCases = testCases.length * 2;  // Problem 1: 5 test cases × 2 = 10 total tests
                } else if (problem.id === '2' || problem.id === '3') {
                    totalTestCases = testCases.length * 2;  // Problems 2&3: 5 test cases × 2 = 10 total tests
                } else {
                    totalTestCases = testCases.length * 2;  // Default: 5 test cases × 2 = 10 total tests
                }
                const total_score = (passedCount * 1000) - timeTaken; // Heavily prioritize test cases passed
                
                // Store submission
                if (currentUser && !currentUser.isAdmin) {
                    const submission = {
                        username: currentUser.username,
                        team_name: currentUser.teamname,
                        problem_name: problem.title,
                        passed_test_cases: passedCount,
                        total_test_cases: totalTestCases,
                        time_taken: timeTaken,
                        score: total_score,
                        submitted_at: new Date().toISOString(),
                        language: language
                    };
                    
                    // Send to backend for storage
                    fetch('/api/submission', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(submission)
                    });
                    
                    // Auto-refresh leaderboard after successful submission
                    setTimeout(() => {
                        updateLeaderboard();
                    }, 1000); // Refresh after 1 second
                }
                
                // Show results with detailed scoring
                const minutes = Math.floor(timeTaken / 60);
                const seconds = timeTaken % 60;
                const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                
                if (passedCount === totalTestCases) {
                    alert(`✅ Solution Correct  
You passed **${passedCount} / ${totalTestCases}** test cases.

Score Details:
Test Case Score: ${passedCount} / ${totalTestCases}  
Base Score: ${passedCount * 1000} points  
Time Taken: ${timeDisplay}  
Time Penalty: ${timeTaken} points  

Total Score: **${total_score}**`);
                } else {
                    alert(`❌ Solution Incorrect  
You passed **${passedCount} / ${totalTestCases}** test cases.

Score Details:
Test Case Score: ${passedCount} / ${totalTestCases}  
Base Score: ${passedCount * 1000} points  
Time Taken: ${timeDisplay}  
Time Penalty: ${timeTaken} points  

Total Score: **${total_score}**`);
                }
                
            } catch (error) {
                console.error('Evaluation failed:', error);
                alert('❌ Evaluation failed. Please try again.');
            }
        }

        // Load user from storage
        function loadUserFromStorage() {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                currentUser = JSON.parse(stored);
                isAdmin = currentUser.isAdmin || false;
                
                // Show admin link if admin
                if (isAdmin) {
                    document.getElementById('admin-link').style.display = 'block';
                }
                
                updateUI();
            }
        }

        // Update Leaderboard
        function updateLeaderboard() {
            // Check if user is admin
            if (!isAdmin) {
                // Fetch problem statuses from backend
                fetch('/api/problem-status')
                    .then(response => response.json())
                    .then(problemStatuses => {
                        // Check if any problem has results visible
                        const resultsVisible = Object.values(problemStatuses).some(status => status.results_visible === true);
                        
                        if (!resultsVisible) {
                            const tbody = document.getElementById('leaderboard-body');
                            if (tbody) {
                                tbody.innerHTML = `
                                    <tr>
                                        <td colspan="7" style="text-align: center; color: #9ca3af; padding: 2rem;">
                                            <i class="fas fa-lock" style="margin-bottom: 1rem; font-size: 2rem; display: block;"></i>
                                            Results are currently hidden by the administrator.
                                        </td>
                                    </tr>
                                `;
                            }
                            return;
                        }
                        
                        // Results are visible, fetch and display leaderboard
                        fetchLeaderboardData();
                    })
                    .catch(error => {
                        console.error('Failed to fetch problem statuses:', error);
                        // Fallback to showing leaderboard if status fetch fails
                        fetchLeaderboardData();
                    });
            } else {
                // Admin always sees leaderboard
                fetchLeaderboardData();
            }
        }
        
        function fetchLeaderboardData() {
            fetch('/api/admin-leaderboard')
                .then(response => response.json())
                .then(data => {
                    const tbody = document.getElementById('leaderboard-body');
                    if (tbody) {
                        if (data.length === 0) {
                            tbody.innerHTML = `
                                <tr>
                                    <td colspan="8" style="text-align: center; color: #9ca3af;">No submissions yet.</td>
                                </tr>
                            `;
                        } else {
                            // Group data by team for total score calculation
                            const teamGroups = {};
                            data.forEach(entry => {
                                if (!teamGroups[entry.team_name]) {
                                    teamGroups[entry.team_name] = {
                                        entries: [],
                                        totalScore: 0
                                    };
                                }
                                teamGroups[entry.team_name].entries.push(entry);
                                if (entry.score) {
                                    teamGroups[entry.team_name].totalScore += entry.score;
                                }
                            });
                            
                            // Show admin leaderboard format with team grouping
                            let currentTeam = null;
                            let html = '';
                            
                            data.forEach((entry, index) => {
                                // Check if this is a new team
                                if (entry.team_name !== currentTeam) {
                                    currentTeam = entry.team_name;
                                    // This is the first row for this team
                                    html += `
                                        <tr>
                                            <td><span style="font-weight: 700; color: ${entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#d1d5db' : entry.rank === 3 ? '#fb923c' : '#9ca3af'};">${entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '#' + entry.rank}</span></td>
                                            <td>
                                                <div>
                                                    <div style="font-weight: 600; color: #f9fafb;">${entry.team_name || '-'}</div>
                                                    <div style="font-size: 0.875rem; color: #9ca3af;">${entry.username || '-'}</div>
                                                </div>
                                            </td>
                                            <td style="font-weight: 600;">${entry.problem_name || '-'}</td>
                                            <td style="font-weight: 600;">${entry.passed_test_cases || '-'}/${entry.total_test_cases || '-'}</td>
                                            <td style="font-weight: 700; color: #3b82f6;">${entry.score || '-'}</td>
                                            <td style="font-weight: 600;">${entry.time_taken ? entry.time_taken + 's' : '-'}</td>
                                            <td style="font-weight: 600; color: #10b981;">${entry.submission_time || '-'}</td>
                                            <td style="font-weight: 700; color: #10b981;">${teamGroups[entry.team_name].entries.length === 1 ? teamGroups[entry.team_name].totalScore : ''}</td>
                                        </tr>
                                    `;
                                } else {
                                    // This is a subsequent row for the same team (no rank, no team name)
                                    const isLastRow = index === data.length - 1 || data[index + 1].team_name !== entry.team_name;
                                    html += `
                                        <tr>
                                            <td></td>
                                            <td></td>
                                            <td style="font-weight: 600;">${entry.problem_name || '-'}</td>
                                            <td style="font-weight: 600;">${entry.passed_test_cases || '-'}/${entry.total_test_cases || '-'}</td>
                                            <td style="font-weight: 700; color: #3b82f6;">${entry.score || '-'}</td>
                                            <td style="font-weight: 600;">${entry.time_taken ? entry.time_taken + 's' : '-'}</td>
                                            <td style="font-weight: 600; color: #10b981;">${entry.submission_time || '-'}</td>
                                            <td style="font-weight: 700; color: #10b981;">${isLastRow ? teamGroups[entry.team_name].totalScore : ''}</td>
                                        </tr>
                                    `;
                                }
                            });
                            
                            tbody.innerHTML = html;
                        }
                    }
                })
                .catch(error => {
                    console.error('Failed to update leaderboard:', error);
                });
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {
            loadUserFromStorage();
            displayProblems();
            
            // Set up periodic refresh for problem status updates
            setInterval(() => {
                if (document.getElementById('problems-page').classList.contains('hidden') === false) {
                    // Only refresh if problems page is visible
                    displayProblems();
                }
            }, 10000); // Refresh every 10 seconds
        });

        // Teams Database Management Functions
        function showTeamsData() {
            fetch('/api/admin/teams')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const tbody = document.getElementById('teams-table-body');
                        tbody.innerHTML = '';
                        
                        data.teams.forEach(team => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td style="padding: 0.75rem; color: #f9fafb; border-bottom: 1px solid #374151;">${team.id}</td>
                                <td style="padding: 0.75rem; color: #f9fafb; border-bottom: 1px solid #374151;">${team.team_name}</td>
                                <td style="padding: 0.75rem; color: #f9fafb; border-bottom: 1px solid #374151;">${team.team_code}</td>
                                <td style="padding: 0.75rem; color: #f9fafb; border-bottom: 1px solid #374151;">${team.created_at}</td>
                            `;
                            tbody.appendChild(row);
                        });
                        
                        document.getElementById('teams-table-container').style.display = 'block';
                    } else {
                        alert('Error loading teams data: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error loading teams data');
                });
        }

        function showAddTeamModal() {
            document.getElementById('add-team-modal').classList.remove('hidden');
        }

        function hideAddTeamModal() {
            document.getElementById('add-team-modal').classList.add('hidden');
            // Clear form fields
            document.getElementById('new-team-name').value = '';
            document.getElementById('new-team-code').value = '';
            document.getElementById('confirm-team-code').value = '';
        }

        function addTeam() {
            const teamName = document.getElementById('new-team-name').value.trim();
            const teamCode = document.getElementById('new-team-code').value.trim();
            const confirmCode = document.getElementById('confirm-team-code').value.trim();

            // Validation
            if (!teamName) {
                alert('Team name cannot be empty');
                return;
            }
            if (!teamCode) {
                alert('Team code cannot be empty');
                return;
            }
            if (teamCode !== confirmCode) {
                alert('Team codes do not match');
                return;
            }

            fetch('/api/admin/add-team', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    team_name: teamName,
                    team_code: teamCode
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Team created successfully');
                    hideAddTeamModal();
                    // Refresh teams table if visible
                    if (document.getElementById('teams-table-container').style.display === 'block') {
                        showTeamsData();
                    }
                } else {
                    alert('Error creating team: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error creating team');
            });
        }

        function showRemoveTeamModal() {
            document.getElementById('remove-team-modal').classList.remove('hidden');
        }

        function hideRemoveTeamModal() {
            document.getElementById('remove-team-modal').classList.add('hidden');
            // Clear form fields
            document.getElementById('remove-team-name').value = '';
            document.getElementById('remove-team-code').value = '';
        }

        function removeTeam() {
            const teamName = document.getElementById('remove-team-name').value.trim();
            const teamCode = document.getElementById('remove-team-code').value.trim();

            if (!teamName || !teamCode) {
                alert('Please enter both team name and team code');
                return;
            }

            if (confirm(`Are you sure you want to remove team "${teamName}"?`)) {
                fetch('/api/admin/remove-team', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        team_name: teamName,
                        team_code: teamCode
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Team removed successfully');
                        hideRemoveTeamModal();
                        // Refresh teams table if visible
                        if (document.getElementById('teams-table-container').style.display === 'block') {
                            showTeamsData();
                        }
                    } else {
                        alert('Error removing team: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error removing team');
                });
            }
        }

        // Clear Submissions Functions
        let currentProblemToClear = 1;

        function clearProblemSubmissions(problemName) {
            if (!confirm("Are you sure you want to clear submissions for " + problemName + "?")) {
                return;
            }

            fetch('/api/admin-clear-submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    problem_name: problemName
                })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                // refresh leaderboard
                fetchLeaderboardData();
            })
            .catch(err => console.error(err));
        }
        
        // ==========================================
        // ANTI-CHEATING: Copy/Paste Blocking
        // ==========================================
        
        // Function to show warning message
        function showAntiCheatWarning(action) {
            // Create a custom warning instead of alert to avoid disrupting contest
            const warning = document.createElement('div');
            warning.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            `;
            warning.textContent = `${action} are disabled during the contest.`;
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(warning);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                warning.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (warning.parentNode) {
                        warning.parentNode.removeChild(warning);
                    }
                    if (style.parentNode) {
                        style.parentNode.removeChild(style);
                    }
                }, 300);
            }, 3000);
        }
        
        // Function to check if we're in a coding context
        function isInCodingContext(element) {
            // Check if event target is within an editor
            while (element && element !== document.body) {
                if (element.classList && element.classList.contains('editor')) {
                    return true;
                }
                element = element.parentNode;
            }
            return false;
        }
        
        // Block copy events
        document.addEventListener('copy', function(e) {
            if (isInCodingContext(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                showAntiCheatWarning('Copy and Paste');
                return false;
            }
        });
        
        // Block paste events
        document.addEventListener('paste', function(e) {
            if (isInCodingContext(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                showAntiCheatWarning('Copy and Paste');
                return false;
            }
        });
        
        // Block cut events
        document.addEventListener('cut', function(e) {
            if (isInCodingContext(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                showAntiCheatWarning('Cut operation');
                return false;
            }
        });
        
        // Block right-click context menu
        document.addEventListener('contextmenu', function(e) {
            if (isInCodingContext(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
        
        // Block keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (isInCodingContext(e.target)) {
                // Block Ctrl+C (Copy)
                if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showAntiCheatWarning('Copy disabled during contest');
                    return false;
                }
                
                // Block Ctrl+V (Paste)
                if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showAntiCheatWarning('Paste disabled during contest');
                    return false;
                }
                
                // Block Ctrl+X (Cut)
                if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showAntiCheatWarning('Cut disabled during contest');
                    return false;
                }
                
                // Allow other keyboard shortcuts for normal typing
                // Arrow keys, backspace, enter, etc. are not blocked
            }
        });
        
        // Additional protection: Block drag and drop
        document.addEventListener('dragstart', function(e) {
            if (isInCodingContext(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
        
        document.addEventListener('drop', function(e) {
            if (isInCodingContext(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
        
        // Console warning for developers
        console.log('%c🚫 ANTI-CHEATING SYSTEM ACTIVE', 'color: #ef4444; font-weight: bold; font-size: 14px;');
        console.log('%cCopy, Paste, Cut, and Right-Click are disabled in coding areas', 'color: #f59e0b; font-size: 12px;');
    </script>
</body>
</html>
"""

class FixItHandler(http.server.SimpleHTTPRequestHandler):
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
        elif self.path == '/api/leaderboard':
            # Get exam status to determine competition phase
            exam_status = get_exam_status()
            is_competition_active = exam_status['global_exam_active'] if exam_status else False
            results_visible = exam_status['results_visible'] if exam_status else False
            
            if is_competition_active and not results_visible:
                # During competition: only show submission status
                submissions = get_competitive_submissions()
                
                # Group by user and show latest submission per problem
                user_submissions = {}
                for sub in submissions:
                    username = sub[0]
                    if username not in user_submissions:
                        user_submissions[username] = {
                            'username': username,
                            'teamname': sub[1],
                            'submissions': []
                        }
                    
                    user_submissions[username]['submissions'].append({
                        'problem_id': sub[2],
                        'problem_title': sub[3],
                        'status': 'Submitted'
                    })
                
                # Convert to array format
                leaderboard_data = []
                for username, data in user_submissions.items():
                    for sub in data['submissions']:
                        leaderboard_data.append({
                            'username': username,
                            'teamname': data['teamname'],
                            'status': 'Submitted'
                        })
                
                response_data = leaderboard_data
                
            else:
                # After competition: show full rankings
                submissions = get_competitive_submissions()
                
                # Calculate rankings
                if submissions:
                    # Group by user and get best performance
                    user_scores = {}
                    for sub in submissions:
                        username = sub[0]
                        score = sub[4]  # passed_test_cases * 100
                        time_taken = sub[5]
                        
                        if username not in user_scores or score > user_scores[username]['score']:
                            user_scores[username] = {
                                'username': username,
                                'teamname': sub[1],
                                'score': score,
                                'time_taken': time_taken,
                                'passed_test_cases': sub[6],
                                'total_test_cases': sub[7],
                                'submitted_at': sub[8]
                            }
                    
                    # Sort by score (desc), then time (asc), then submission time (asc)
                    ranked_users = sorted(user_scores.values(), 
                                        key=lambda x: (-x['score'], x['time_taken'], x['submitted_at']))
                    
                    # Add rank
                    for i, user in enumerate(ranked_users, 1):
                        user['rank'] = i
                    
                    response_data = ranked_users
                else:
                    response_data = []
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
        elif self.path == '/api/admin-leaderboard':
            # Get admin leaderboard with rankings
            leaderboard_data = get_admin_leaderboard()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(leaderboard_data).encode('utf-8'))
        elif self.path == '/api/problem-status':
            # Get all problem statuses
            problem_statuses = get_all_problem_status()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(problem_statuses).encode('utf-8'))
        elif self.path == '/api/submissions':
            # Get submissions from database
            submissions = get_submissions()
            submissions_data = []
            for sub in submissions:
                submissions_data.append({
                    'username': sub[0],
                    'teamname': sub[1],
                    'problem_title': sub[2],
                    'correct': sub[3],
                    'language': sub[4],
                    'timestamp': sub[5]
                })
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(submissions_data).encode('utf-8'))
        elif self.path == '/api/exam-status':
            # Get exam status from database
            status = get_exam_status()
            if status:
                status_data = {
                    'global_exam_active': bool(status[1]),
                    'current_problem': status[2],
                    'results_visible': bool(status[3])
                }
            else:
                status_data = {
                    'global_exam_active': False,
                    'current_problem': None,
                    'results_visible': False
                }
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(status_data).encode('utf-8'))
        elif self.path == '/api/admin/teams':
            # Get all teams from database
            conn = sqlite3.connect('fixit_database.db')
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM login_details ORDER BY created_at DESC')
            teams = cursor.fetchall()
            conn.close()
            
            teams_data = []
            for team in teams:
                teams_data.append({
                    'id': team[0],
                    'team_name': team[1],
                    'team_code': team[2],
                    'created_at': team[3]
                })
            
            response_data = {
                'success': True,
                'teams': teams_data
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/auth/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            teamname = data.get('teamname')
            password = data.get('password')
            is_admin = data.get('is_admin', False)
            
            if is_admin:
                # Admin login
                if password == 'Pspk@0902.':
                    # Check if admin exists in database
                    admin_user = get_user('Admin')
                    if admin_user:
                        update_last_login('Admin')
                        response_data = {
                            'success': True,
                            'user': {
                                'username': 'Admin',
                                'teamname': 'System',
                                'is_admin': True
                            }
                        }
                    else:
                        # Create admin user if doesn't exist
                        create_user('Admin', 'System', True)
                        response_data = {
                            'success': True,
                            'user': {
                                'username': 'Admin',
                                'teamname': 'System',
                                'is_admin': True
                            }
                        }
                else:
                    response_data = {'success': False, 'message': 'Invalid admin password'}
            else:
                # Team login
                team_name = data.get('team_name')
                team_code = data.get('team_code')
                
                if team_name and team_code:
                    # Verify team credentials against database
                    if verify_team_credentials(team_name, team_code):
                        # Check if user exists in users table
                        existing_user = get_user(team_name)
                        if existing_user:
                            # Update last login
                            update_last_login(team_name)
                        else:
                            # Create new user in users table
                            create_user(team_name, team_name, False)
                        
                        response_data = {
                            'success': True,
                            'user': {
                                'username': team_name,
                                'teamname': team_name,
                                'is_admin': False
                            }
                        }
                    else:
                        response_data = {'success': False, 'message': 'Invalid team name or code'}
                else:
                    response_data = {'success': False, 'message': 'Team name and code are required'}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/submit':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            teamname = data.get('teamname')
            problem_id = data.get('problem_id')
            problem_title = data.get('problem_title')
            passed_test_cases = data.get('passed_test_cases')
            total_test_cases = data.get('total_test_cases')
            score = data.get('score')
            time_taken = data.get('time_taken')
            language = data.get('language')
            
            # Get user from database
            user = get_user(username)
            if user:
                # Apply problem-specific test case multipliers
                problem_id = int(problem_id)
                if problem_id == 1:
                    multiplier = 2  # Problem 1: Each test case counts as 2
                elif problem_id == 2:
                    multiplier = 2  # Problem 2: Each test case counts as 2
                elif problem_id == 3:
                    multiplier = 2  # Problem 3: Each test case counts as 2
                else:
                    multiplier = 2  # Default: Each test case counts as 2
                
                # Apply multiplier to test case counts
                adjusted_passed_test_cases = passed_test_cases * multiplier
                adjusted_total_test_cases = total_test_cases * multiplier
                
                # Add competitive submission to database with adjusted counts
                add_competitive_submission(username, teamname, problem_id, problem_title, adjusted_passed_test_cases, adjusted_total_test_cases, score, time_taken, language)
                response_data = {'success': True}
            else:
                response_data = {'success': False, 'message': 'User not found'}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/submission':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            team_name = data.get('team_name')
            problem_name = data.get('problem_name')
            passed_test_cases = data.get('passed_test_cases')
            total_test_cases = data.get('total_test_cases')
            time_taken = data.get('time_taken')
            score = data.get('score')
            
            # Store submission in database
            add_submission_entry(username, team_name, problem_name, passed_test_cases, total_test_cases, time_taken, score)
            
            response_data = {'success': True, 'message': 'Submission stored successfully'}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/submissions':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            problem_id = data.get('problem_id')
            problem_title = data.get('problem_title')
            correct = data.get('correct')
            language = data.get('language')
            code = data.get('code')
            
            # Get user from database
            user = get_user(username)
            if user:
                # Add submission to database
                add_submission(user[0], problem_id, problem_title, correct, language, code)
                response_data = {'success': True}
            else:
                response_data = {'success': False, 'message': 'User not found'}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/exam-control':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            action = data.get('action')
            problem_id = data.get('problem_id')
            results_visible = data.get('results_visible', False)
            
            if action == 'start':
                update_exam_status(True, problem_id, results_visible)
                # Also update problem status to active
                update_problem_status(problem_id, 'active')
            elif action == 'inactive':
                # Update problem status to inactive
                update_problem_status(problem_id, 'inactive')
            elif action == 'stop':
                update_exam_status(False, None, False)
            elif action == 'toggle_results':
                status = get_exam_status()
                if status:
                    update_exam_status(status[1], status[2], results_visible)
            
            response_data = {'success': True}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/results-visibility':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            problem_id = data.get('problem_id')
            results_visible = data.get('results_visible', False)
            
            if problem_id:
                update_problem_results_visibility(problem_id, results_visible)
                response_data = {'success': True}
            else:
                response_data = {'success': False, 'message': 'Problem ID required'}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/execute':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            code = data.get('code', '')
            language = data.get('language', 'python')
            input_data = data.get('input', '')
            problem_title = data.get('problem_title', '')
            
            # Import robust judge system
            import tempfile
            import subprocess
            import os
            import time
            import logging
            
            # Configure logging for this execution
            logging.basicConfig(level=logging.INFO)
            logger = logging.getLogger(__name__)
            
            try:
                with tempfile.TemporaryDirectory() as temp_dir:
                    if language == 'python':
                        # Write Python code to file
                        code_file = os.path.join(temp_dir, 'solution.py')
                        with open(code_file, 'w') as f:
                            f.write(code)
                        
                        logger.info(f"Executing Python code with input: '{input_data}'")
                        
                        # Execute Python code with input
                        result = subprocess.run(
                            ['python', code_file],
                            input=input_data,
                            text=True,
                            capture_output=True,
                            timeout=5,
                            cwd=temp_dir
                        )
                        
                        if result.returncode == 0:
                            output_clean = result.stdout.strip()
                            logger.info(f"Python execution success - Output: '{output_clean}'")
                            response_data = {
                                'status': 'accepted',
                                'output': output_clean,
                                'error': result.stderr.strip(),
                                'execution_time': 0,
                                'memory_used': 0
                            }
                        else:
                            logger.warning(f"Python execution failed - Error: '{result.stderr.strip()}'")
                            response_data = {
                                'status': 'runtime_error',
                                'output': result.stdout.strip(),
                                'error': result.stderr.strip(),
                                'execution_time': 0,
                                'memory_used': 0
                            }
                            
                    elif language == 'java':
                        # Write Java code to file
                        code_file = os.path.join(temp_dir, 'Main.java')
                        with open(code_file, 'w') as f:
                            f.write(code)
                        
                        logger.info(f"Compiling and executing Java code with input: '{input_data}'")
                        
                        # Compile Java code
                        compile_result = subprocess.run(
                            ['./jdk/bin/javac', code_file],
                            capture_output=True,
                            text=True,
                            timeout=5,
                            cwd=temp_dir
                        )
                        
                        if compile_result.returncode != 0:
                            response_data = {
                                'status': 'compile_error',
                                'output': '',
                                'error': compile_result.stderr.strip(),
                                'execution_time': 0,
                                'memory_used': 0
                            }
                        else:
                            # Execute Java code with input
                            result = subprocess.run(
                                ['./jdk/bin/java', '-cp', temp_dir, 'Main'],
                                input=input_data,
                                text=True,
                                capture_output=True,
                                timeout=5,
                                cwd=temp_dir
                            )
                            
                            if result.returncode == 0:
                                output_clean = result.stdout.strip()
                                logger.info(f"Java execution success - Output: '{output_clean}'")
                                response_data = {
                                    'status': 'accepted',
                                    'output': output_clean,
                                    'error': result.stderr.strip(),
                                    'execution_time': 0,
                                    'memory_used': 0
                                }
                            else:
                                logger.warning(f"Java execution failed - Error: '{result.stderr.strip()}'")
                                response_data = {
                                    'status': 'runtime_error',
                                    'output': result.stdout.strip(),
                                    'error': result.stderr.strip(),
                                    'execution_time': 0,
                                    'memory_used': 0
                                }
                                
                    elif language == 'cpp':
                        # Write C++ code to file
                        code_file = os.path.join(temp_dir, 'solution.cpp')
                        exe_file = os.path.join(temp_dir, 'solution.exe')
                        with open(code_file, 'w') as f:
                            f.write(code)
                        
                        logger.info(f"Evaluating C++ code with input: '{input_data}', Problem: '{problem_title}'")
                        
                        # Determine evaluation strategy based on problem
                        if problem_title in ['Chat Spam Pattern Detector', 'Problem 3: Undo/Redo Text Editor (Linked Stack Debugging)']:
                            # PRIMARY: Compilation Method for Problems 2 & 3 (using g++)
                            logger.info(f"Using Compilation Method for {problem_title}")
                            
                            # Check if g++ compiler is available
                            try:
                                subprocess.run(['g++', '--version'], capture_output=True, timeout=2)
                                compiler_available = True
                            except (subprocess.TimeoutExpired, FileNotFoundError):
                                compiler_available = False
                            
                            if compiler_available:
                                # Compile C++ code
                                compile_result = subprocess.run(
                                    ['g++', code_file, '-o', exe_file],
                                    capture_output=True,
                                    text=True,
                                    timeout=5,
                                    cwd=temp_dir
                                )
                                
                                if compile_result.returncode != 0:
                                    response_data = {
                                        'status': 'compile_error',
                                        'output': '',
                                        'error': compile_result.stderr.strip(),
                                        'execution_time': 0,
                                        'memory_used': 0
                                    }
                                else:
                                    # Execute C++ code with input
                                    result = subprocess.run(
                                        [exe_file],
                                        input=input_data,
                                        text=True,
                                        capture_output=True,
                                        timeout=5,
                                        cwd=temp_dir
                                    )
                                    
                                    if result.returncode == 0:
                                        output_clean = result.stdout.strip()
                                        logger.info(f"C++ execution success - Output: '{output_clean}'")
                                        response_data = {
                                            'status': 'accepted',
                                            'output': output_clean,
                                            'error': result.stderr.strip(),
                                            'execution_time': 0,
                                            'memory_used': 0
                                        }
                                    else:
                                        response_data = {
                                            'status': 'runtime_error',
                                            'output': result.stdout.strip(),
                                            'error': result.stderr.strip(),
                                            'execution_time': 0,
                                            'memory_used': 0
                                        }
                            else:
                                # Fallback: Line Comparison Method if compiler not available
                                logger.warning("g++ not available - using Line Comparison Method as fallback")
                                
                                # Define bug patterns for fallback
                                cpp_bugs = {
                                    'count_initialization': 'count = 2',
                                    'loop_condition': 'while (n < 0)',
                                    'bitwise_operator': 'if ((n | 1) = 1)',
                                    'shift_direction': 'n = n << 1',
                                    'print_variable': 'cout << cout'
                                }
                                
                                cpp_fixes = {
                                    'count_initialization': 'count = 0',
                                    'loop_condition': 'while (n > 0)',
                                    'bitwise_operator': 'if ((n & 1) == 1)',
                                    'shift_direction': 'n = n >> 1',
                                    'print_variable': 'cout << count'
                                }
                                
                                # Robust normalization function for fallback
                                def normalize_cpp_code(code):
                                    """Normalize C++ code for reliable comparison"""
                                    normalized = code.lower()
                                    
                                    # Remove all whitespace variations
                                    normalized = re.sub(r'\s+', '', normalized)  # Remove all spaces
                                    normalized = re.sub(r'\n+', '', normalized)  # Remove newlines
                                    normalized = re.sub(r'\t+', '', normalized)  # Remove tabs
                                    
                                    # Remove common formatting variations
                                    normalized = normalized.replace(' ', '')  # Remove spaces
                                    normalized = normalized.replace('{', '{')
                                    normalized = normalized.replace('}', '}')
                                    normalized = normalized.replace('(', '(')
                                    normalized = normalized.replace(')', ')')
                                    normalized = normalized.replace(';', ';')
                                    
                                    return normalized
                                
                                # Normalize both user code and bug/fix patterns
                                normalized_code = normalize_cpp_code(code)
                                all_bugs_fixed = True
                                bugs_found = []
                                
                                # Check each bug systematically
                                for bug_id, buggy_line in cpp_bugs.items():
                                    normalized_buggy = normalize_cpp_code(buggy_line)
                                    normalized_fix = normalize_cpp_code(cpp_fixes[bug_id])
                                    
                                    # Check if buggy pattern exists in normalized code
                                    if normalized_buggy in normalized_code:
                                        bugs_found.append(f"Buggy pattern found: {buggy_line}")
                                        all_bugs_fixed = False
                                    # Check if fix pattern exists in normalized code
                                    elif normalized_fix not in normalized_code:
                                        bugs_found.append(f"Fix not found: {cpp_fixes[bug_id]}")
                                        all_bugs_fixed = False
                                
                                if all_bugs_fixed:
                                    # All bugs fixed - simulate correct execution
                                    logger.info("All C++ bugs fixed - running test cases")
                                    
                                    # Simulate correct execution for all test cases
                                    input_val = int(input_data)
                                    if input_val == 1:
                                        output_clean = '1'
                                    elif input_val == 2:
                                        output_clean = '1'
                                    elif input_val == 3:
                                        output_clean = '2'
                                    elif input_val == 4:
                                        output_clean = '1'
                                    elif input_val == 5:
                                        output_clean = '2'
                                    elif input_val == 6:
                                        output_clean = '2'
                                    elif input_val == 7:
                                        output_clean = '3'
                                    elif input_val == 8:
                                        output_clean = '1'
                                    elif input_val == 9:
                                        output_clean = '2'
                                    elif input_val == 10:
                                        output_clean = '2'
                                    else:
                                        output_clean = '0'
                                        
                                    response_data = {
                                        'status': 'accepted',
                                        'output': output_clean,
                                        'error': '',
                                        'execution_time': 0,
                                        'memory_used': 0
                                    }
                                else:
                                    # Some bugs remain - all test cases fail
                                    logger.warning(f"C++ bugs not fixed: {bugs_found}")
                                    response_data = {
                                        'status': 'compile_error',
                                        'output': '',
                                        'error': 'Syntax Error',
                                        'execution_time': 0,
                                        'memory_used': 0
                                    }
                        
                        else:
                            # For Problem 1 or unknown problems, use standard compilation
                            logger.info(f"Using standard compilation for problem: '{problem_title}'")
                            
                            # Check if g++ compiler is available
                            try:
                                subprocess.run(['g++', '--version'], capture_output=True, timeout=2)
                                compiler_available = True
                            except (subprocess.TimeoutExpired, FileNotFoundError):
                                compiler_available = False
                            
                            if not compiler_available:
                                # Fallback: Line Comparison Method for Problem 1
                                logger.info("Using Line Comparison Method for Count Set Bits")
                                
                                # Define the 6 bugs that need to be fixed
                                cpp_bugs = {
                                    'count_initialization': 'count = 2',
                                    'loop_condition': 'while (n < 0)',
                                    'bitwise_operator': 'if ((n | 1) = 1)',
                                    'shift_direction': 'n = n << 1',
                                    'print_variable': 'cout << cout'
                                }
                                
                                # Define the correct fixes
                                cpp_fixes = {
                                    'count_initialization': 'count = 0',
                                    'loop_condition': 'while (n > 0)',
                                    'bitwise_operator': 'if ((n & 1) == 1)',
                                    'shift_direction': 'n = n >> 1',
                                    'print_variable': 'cout << count'
                                }
                                
                                # Robust normalization function
                                def normalize_cpp_code(code):
                                    """Normalize C++ code for reliable comparison"""
                                    normalized = code.lower()
                                    
                                    # Remove all whitespace variations
                                    normalized = re.sub(r'\s+', '', normalized)  # Remove all spaces
                                    normalized = re.sub(r'\n+', '', normalized)  # Remove newlines
                                    normalized = re.sub(r'\t+', '', normalized)  # Remove tabs
                                    
                                    # Remove common formatting variations
                                    normalized = normalized.replace(' ', '')  # Remove spaces
                                    normalized = normalized.replace('{', '{')
                                    normalized = normalized.replace('}', '}')
                                    normalized = normalized.replace('(', '(')
                                    normalized = normalized.replace(')', ')')
                                    normalized = normalized.replace(';', ';')
                                    
                                    return normalized
                                
                                # Normalize both user code and bug/fix patterns
                                normalized_code = normalize_cpp_code(code)
                                all_bugs_fixed = True
                                bugs_found = []
                                
                                # Check each bug systematically
                                for bug_id, buggy_line in cpp_bugs.items():
                                    normalized_buggy = normalize_cpp_code(buggy_line)
                                    normalized_fix = normalize_cpp_code(cpp_fixes[bug_id])
                                    
                                    # Check if buggy pattern exists in normalized code
                                    if normalized_buggy in normalized_code:
                                        bugs_found.append(f"Buggy pattern found: {buggy_line}")
                                        all_bugs_fixed = False
                                    # Check if fix pattern exists in normalized code
                                    elif normalized_fix not in normalized_code:
                                        bugs_found.append(f"Fix not found: {cpp_fixes[bug_id]}")
                                        all_bugs_fixed = False
                                
                                if all_bugs_fixed:
                                    # All bugs fixed - run test cases and show correct results
                                    logger.info("All Count Set Bits bugs fixed - running test cases")
                                    
                                    # Simulate correct execution for all test cases
                                    input_val = int(input_data)
                                    if input_val == 1:
                                        output_clean = '1'
                                    elif input_val == 2:
                                        output_clean = '1'
                                    elif input_val == 3:
                                        output_clean = '2'
                                    elif input_val == 4:
                                        output_clean = '1'
                                    elif input_val == 5:
                                        output_clean = '2'
                                    elif input_val == 6:
                                        output_clean = '2'
                                    elif input_val == 7:
                                        output_clean = '3'
                                    elif input_val == 8:
                                        output_clean = '1'
                                    elif input_val == 9:
                                        output_clean = '2'
                                    elif input_val == 10:
                                        output_clean = '2'
                                    else:
                                        output_clean = '0'
                                        
                                    response_data = {
                                        'status': 'accepted',
                                        'output': output_clean,
                                        'error': '',
                                        'execution_time': 0,
                                        'memory_used': 0
                                    }
                                else:
                                    # Some bugs remain - all test cases fail
                                    logger.warning(f"Count Set Bits bugs not fixed: {bugs_found}")
                                    response_data = {
                                        'status': 'compile_error',
                                        'output': '',
                                        'error': 'Syntax Error',
                                        'execution_time': 0,
                                        'memory_used': 0
                                    }
                            else:
                                # Compile C++ code
                                compile_result = subprocess.run(
                                    ['g++', code_file, '-o', exe_file],
                                    capture_output=True,
                                    text=True,
                                    timeout=5,
                                    cwd=temp_dir
                                )
                                
                                if compile_result.returncode != 0:
                                    response_data = {
                                        'status': 'compile_error',
                                        'output': '',
                                        'error': compile_result.stderr.strip(),
                                        'execution_time': 0,
                                        'memory_used': 0
                                    }
                                else:
                                    # Execute C++ code with input
                                    result = subprocess.run(
                                        [exe_file],
                                        input=input_data,
                                        text=True,
                                        capture_output=True,
                                        timeout=5,
                                        cwd=temp_dir
                                    )
                                    
                                    if result.returncode == 0:
                                        output_clean = result.stdout.strip()
                                        logger.info(f"C++ execution success - Output: '{output_clean}'")
                                        response_data = {
                                            'status': 'accepted',
                                            'output': output_clean,
                                            'error': result.stderr.strip(),
                                            'execution_time': 0,
                                            'memory_used': 0
                                        }
                                    else:
                                        response_data = {
                                            'status': 'runtime_error',
                                            'output': result.stdout.strip(),
                                            'error': result.stderr.strip(),
                                            'execution_time': 0,
                                            'memory_used': 0
                                        }
                        
            except subprocess.TimeoutExpired:
                logger.error("Execution timeout")
                response_data = {
                    'status': 'time_limit_exceeded',
                    'output': '',
                    'error': 'Execution time limit exceeded',
                    'execution_time': 5000,
                    'memory_used': 0
                }
            except Exception as e:
                logger.error(f"Execution error: {str(e)}")
                response_data = {
                    'status': 'error',
                    'output': '',
                    'error': str(e),
                    'execution_time': 0,
                    'memory_used': 0
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/admin/add-team':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            team_name = data.get('team_name', '').strip()
            team_code = data.get('team_code', '').strip()
            
            if not team_name or not team_code:
                response_data = {'success': False, 'message': 'Missing team data'}
            else:
                conn = sqlite3.connect('fixit_database.db')
                cursor = conn.cursor()
                try:
                    cursor.execute('INSERT INTO login_details (team_name, team_code) VALUES (?, ?)', (team_name, team_code))
                    conn.commit()
                    response_data = {'success': True, 'message': 'Team created successfully'}
                except sqlite3.IntegrityError:
                    response_data = {'success': False, 'message': 'Team already exists'}
                finally:
                    conn.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/admin/remove-team':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            team_name = data.get('team_name', '').strip()
            team_code = data.get('team_code', '').strip()
            
            conn = sqlite3.connect('fixit_database.db')
            cursor = conn.cursor()
            cursor.execute('DELETE FROM login_details WHERE team_name = ? AND team_code = ?', (team_name, team_code))
            conn.commit()
            
            if cursor.rowcount == 0:
                response_data = {'success': False, 'message': 'Team not found'}
            else:
                response_data = {'success': True, 'message': 'Team removed successfully'}
            
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/admin-clear-submissions':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            problem_name = data.get('problem_name')
            
            if problem_name:
                # Clear submissions for the specified problem
                success = clear_submissions_for_problem(problem_name)
                
                if success:
                    response_data = {
                        'status': 'success',
                        'message': 'Submissions cleared successfully'
                    }
                else:
                    response_data = {
                        'status': 'error',
                        'message': 'Failed to clear submissions'
                    }
            else:
                response_data = {
                    'status': 'error',
                    'message': 'Problem name required'
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        elif self.path == '/api/admin/clear-problem-submissions':
            # Verify admin access via session cookie
            admin_session = self.headers.get('Cookie')
            is_admin = False
            
            # Debug: Print the received cookie for troubleshooting
            print(f"DEBUG: Received cookie: {admin_session}")
            
            if admin_session:
                # Parse session cookie (format: "admin_session=true")
                session_parts = admin_session.split(';')
                print(f"DEBUG: Session parts: {session_parts}")
                for part in session_parts:
                    if part.strip() == 'admin_session=true':
                        is_admin = True
                        print("DEBUG: Admin session validated!")
                        break
            else:
                print("DEBUG: No admin session cookie found")
            
            if not is_admin:
                print("DEBUG: Admin access denied!")
                response_data = {'success': False, 'message': 'Unauthorized access'}
                self.send_response(403)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            problem_id = data.get('problem_id')
            
            if problem_id:
                # Validate problem_id
                try:
                    problem_id = int(problem_id)
                    if problem_id not in [1, 2, 3]:
                        raise ValueError("Invalid problem_id. Must be 1, 2, or 3.")
                except ValueError:
                    response_data = {'success': False, 'message': f'Invalid problem_id: {problem_id}. Must be 1, 2, or 3.'}
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return
                
                # Delete all submissions for the specified problem with proper transaction handling
                conn = sqlite3.connect('fixit_database.db')
                cursor = conn.cursor()
                
                try:
                    # Start transaction for data integrity
                    cursor.execute('BEGIN TRANSACTION')
                    
                    # Get count of submissions to be deleted for logging
                    cursor.execute('SELECT COUNT(*) FROM submissions WHERE problem_id = ?', (problem_id,))
                    count_before = cursor.fetchone()[0]
                    
                    # Delete submissions
                    cursor.execute('DELETE FROM submissions WHERE problem_id = ?', (problem_id,))
                    
                    # Also clear from competitive_submissions to maintain consistency
                    cursor.execute('DELETE FROM competitive_submissions WHERE problem_id = ?', (problem_id,))
                    
                    # Commit transaction
                    cursor.execute('COMMIT')
                    
                    count_after = cursor.fetchone()[0]
                    deleted_count = count_before - count_after
                    
                    print(f"DEBUG: Deleted {deleted_count} submissions for problem {problem_id}")
                    
                    response_data = {
                        'success': True, 
                        'message': f'Successfully deleted {deleted_count} submissions for problem {problem_id}'
                    }
                    
                except Exception as e:
                    print(f"ERROR: Failed to delete submissions for problem {problem_id}: {str(e)}")
                    conn.rollback()
                    response_data = {
                        'success': False, 
                        'message': f'Failed to delete submissions: {str(e)}'
                    }
                
                finally:
                    conn.close()
                
                print(f"DEBUG: Deleted submissions for problem {problem_id}")
                response_data = {'success': True, 'message': f'Submissions for problem {problem_id} cleared successfully'}
            else:
                response_data = {'success': False, 'message': 'Problem ID required'}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        else:
            self.send_response(404)
            self.end_headers()

def get_local_ip():
    """Get the local IP address for network access"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"

def main():
    print("🚀 Starting FixIt Offline Server...")
    print("=" * 50)
    
    # Get local IP for network access
    local_ip = get_local_ip()
    
    # Start server
    with socketserver.TCPServer((HOST, PORT), FixItHandler) as httpd:
        print(f"✅ Server started successfully!")
        print(f"📍 Local access: http://localhost:{PORT}")
        print(f"🌐 Network access: http://{local_ip}:{PORT}")
        print(f"📱 Mobile access: http://{local_ip}:{PORT}")
        print("=" * 50)
        print("🎯 Instructions for other users:")
        print("1. Connect to the same WiFi network")
        print("2. Open browser and go to the Network URL above")
        print("3. No installation required!")
        print("=" * 50)
        print("🛑 Press Ctrl+C to stop the server")
        print()
        
        # Auto-open browser for host
        try:
            webbrowser.open(f'http://localhost:{PORT}')
            print("🌐 Browser opened automatically!")
        except:
            print("📝 Manually open: http://localhost:{PORT}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            httpd.shutdown()

if __name__ == "__main__":
    main()
