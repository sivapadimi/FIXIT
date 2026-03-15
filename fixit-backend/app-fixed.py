from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import asyncio
from datetime import datetime
import uuid

app = FastAPI(title="FixIt API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class User(BaseModel):
    id: str
    username: str
    team_name: str
    college: str

class Problem(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    points: int
    buggy_code: str
    fixed_code: str
    test_cases: List[dict]

class Submission(BaseModel):
    problem_id: str
    code: str
    language: str

# In-memory storage
users = []
problems = []
submissions = []
leaderboard = []

# Initialize sample data
def init_data():
    global problems, leaderboard
    
    problems = [
        {
            "id": "1",
            "title": "Array Index Out of Bounds",
            "description": "Fix the array access bug that causes runtime errors when accessing elements beyond array bounds.",
            "difficulty": "easy",
            "points": 100,
            "buggy_code": """def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr) + 1):  # Bug: should be len(arr)
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val

test_array = [1, 5, 3, 9, 2]
print(find_max(test_array))""",
            "fixed_code": """def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr)):  # Fixed: removed +1
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val

test_array = [1, 5, 3, 9, 2]
print(find_max(test_array))""",
            "test_cases": [
                {"input": "[1,5,3,9,2]", "expected": "9", "hidden": False},
                {"input": "[]", "expected": "Error: Empty array", "hidden": False},
                {"input": "[7]", "expected": "7", "hidden": True},
                {"input": "[-1,0,1]", "expected": "1", "hidden": True},
                {"input": "[2,2,2,2]", "expected": "2", "hidden": True},
                {"input": "[100,50,25,75]", "expected": "100", "hidden": True}
            ]
        }
    ]

init_data()

# HTML Template
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FixIt - Professional Debugging Platform</title>
    
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
        @media (max-width: 768px) { .nav-links { display: none; } .grid-2, .grid-3 { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="container">
        <div class="nav">
            <div class="nav-logo">FixIt</div>
            <div class="nav-links">
                <span class="nav-link active" onclick="showPage('dashboard')">Dashboard</span>
                <span class="nav-link" onclick="showPage('problems')">Problems</span>
                <span class="nav-link" onclick="showPage('leaderboard')">Leaderboard</span>
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
                <p class="mb-4" style="color: #9ca3af;">Professional Debugging Competition Platform</p>
                
                <div class="grid grid-3 mb-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-bug" style="font-size: 3rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">12 Problems</h3>
                            <p style="color: #9ca3af;">Debug challenges ready</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-code" style="font-size: 3rem; color: #10b981; margin-bottom: 1rem;"></i>
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Python, Java, C++</h3>
                            <p style="color: #9ca3af;">Multiple languages supported</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-trophy" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Compete & Win</h3>
                            <p style="color: #9ca3af;">Real-time leaderboard</p>
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
                                <th>Problems Solved</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody id="leaderboard-body">
                            <!-- Leaderboard will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Login Modal -->
    <div id="login-modal" class="modal hidden">
        <div class="modal-content">
            <h2 style="margin-bottom: 1.5rem;">Login to FixIt</h2>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Username</label>
                <input type="text" id="username" class="input" placeholder="Enter username">
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #9ca3af;">Team Name</label>
                <input type="text" id="teamname" class="input" placeholder="Enter team name">
            </div>
            <div class="flex" style="gap: 1rem;">
                <button class="btn btn-primary" onclick="login()">Login</button>
                <button class="btn btn-secondary" onclick="hideLogin()">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        // State Management
        let currentUser = null;
        let currentPage = 'dashboard';
        let submissions = [];
        let leaderboard = [];
        let problems = [];

        // Language templates for each problem
        const languageTemplates = {
            "1": {
                "python": `def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr)):  # Bug: should be len(arr)
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val

test_array = [1, 5, 3, 9, 2]
print(find_max(test_array))`,
                "java": `public class Solution {
    public static int findMax(int[] arr) {
        int maxVal = arr[0];
        for (int i = 0; i < arr.length; i++) {  // Bug: should be i < arr.length
            if (arr[i] > maxVal) {
                maxVal = arr[i];
            }
        }
        return maxVal;
    }

    public static void main(String[] args) {
        int[] testArray = {1, 5, 3, 9, 2};
        System.out.println(findMax(testArray));
    }
}`,
                "cpp": `#include <iostream>
#include <vector>
using namespace std;

int findMax(const vector<int>& arr) {
    int maxVal = arr[0];
    for (int i = 0; i < arr.size(); i++) {  // Bug: should be i < arr.size()
        if (arr[i] > maxVal) {
            maxVal = arr[i];
        }
    }
    return maxVal;
}

int main() {
    vector<int> testArray = {1, 5, 3, 9, 2};
    cout << findMax(testArray) << endl;
    return 0;
}`
            }
        };

        // Update code when language changes
        function updateCode(problemId, language) {
            const editor = document.getElementById(`editor-${problemId}`);
            if (editor && languageTemplates[problemId] && languageTemplates[problemId][language]) {
                editor.textContent = languageTemplates[problemId][language];
            }
        }

        // Load problems from API
        async function loadProblems() {
            try {
                const response = await fetch('/api/problems');
                problems = await response.json();
                displayProblems();
            } catch (error) {
                console.error('Error loading problems:', error);
            }
        }

        // Display problems
        function displayProblems() {
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
                loadProblems();
            } else if (page === 'leaderboard') {
                updateLeaderboard();
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
                        <div class="editor" id="editor-${problem.id}" contenteditable="true">${problem.buggy_code}</div>
                        
                        <div style="margin: 1.5rem 0; display: flex; gap: 1rem;">
                            <button class="btn btn-secondary" onclick="runCode(${problem.id})">
                                <i class="fas fa-play" style="margin-right: 0.5rem;"></i>
                                Run Code
                            </button>
                            <button class="btn btn-primary" onclick="submitSolution(${problem.id})">
                                <i class="fas fa-check" style="margin-right: 0.5rem;"></i>
                                Submit Solution
                            </button>
                        </div>
                        
                        <div id="test-results-${problem.id}"></div>
                    </div>
                </div>
            `;
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
            
            setTimeout(() => {
                let results = '';
                let passed = 0;
                let total = 0;
                
                problem.test_cases.forEach((testCase, index) => {
                    if (!testCase.hidden) {
                        total++;
                        // Check if the bug is fixed based on selected language
                        let isCorrect = false;
                        
                        if (selectedLanguage === 'python') {
                            isCorrect = (code.includes('range(len(arr))') && !code.includes('range(len(arr) + 1'));
                        } else if (selectedLanguage === 'java') {
                            isCorrect = (code.includes('for (int i = 0;') && code.includes('i < arr.length; i++'));
                        } else if (selectedLanguage === 'cpp') {
                            isCorrect = (code.includes('for (int i = 0;') && code.includes('i < arr.size(); i++'));
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
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.875rem;">
                                    <div>
                                        <span style="color: #9ca3af;">Input:</span>
                                        <div style="background: #111827; padding: 0.5rem; border-radius: 0.25rem; margin-top: 0.25rem;">
                                            ${testCase.input}
                                        </div>
                                    </div>
                                    <div>
                                        <span style="color: #9ca3af;">Expected:</span>
                                        <div style="background: #111827; padding: 0.5rem; border-radius: 0.25rem; margin-top: 0.25rem;">
                                            ${testCase.expected}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                });
                
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
            
            const problem = problems.find(p => p.id == problemId);
            const editor = document.getElementById(`editor-${problem.id}`);
            const languageSelect = document.getElementById(`language-${problemId}`);
            const selectedLanguage = languageSelect ? languageSelect.value : 'python';
            const code = editor.textContent;
            
            // Check if correct based on selected language
            let isCorrect = false;
            if (selectedLanguage === 'python') {
                isCorrect = (code.includes('range(len(arr))') && !code.includes('range(len(arr) + 1'));
            } else if (selectedLanguage === 'java') {
                isCorrect = (code.includes('for (int i = 0;') && code.includes('i < arr.length; i++'));
            } else if (selectedLanguage === 'cpp') {
                isCorrect = (code.includes('for (int i = 0;') && code.includes('i < arr.size(); i++'));
            }
            
            if (isCorrect) {
                alert(`🎉 Congratulations! You solved "${problem.title}" and earned ${problem.points} points!`);
                updateLeaderboard();
                showPage('problems');
            } else {
                alert('❌ Solution is not correct. Keep trying! Check the test results for hints.');
            }
        }

        // Login/Logout
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
            const username = document.getElementById('username').value;
            const teamname = document.getElementById('teamname').value;
            
            if (!username || !teamname) {
                alert('Please enter both username and team name');
                return;
            }
            
            currentUser = { username, teamname };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Hide modal first
            hideLogin();
            
            // Update UI
            const navLinks = document.querySelectorAll('.nav-link');
            if (navLinks && navLinks[3]) {
                navLinks[3].outerHTML = `
                    <span style="color: #f9fafb; margin-right: 1rem;">
                        <i class="fas fa-user"></i> ${currentUser.username}
                    </span>
                    <button class="btn btn-secondary" onclick="logout()">Logout</button>
                `;
            }
            
            alert(`Welcome ${username}! Start solving problems to earn points.`);
        }

        function logout() {
            currentUser = null;
            localStorage.removeItem('currentUser');
            
            // Update UI
            const navLinks = document.querySelectorAll('.nav-link');
            if (navLinks && navLinks[3]) {
                navLinks[3].outerHTML = '<button class="btn btn-primary" onclick="showLogin()">Login</button>';
            }
            
            alert('You have been logged out.');
        }

        // Load user from storage
        function loadUserFromStorage() {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                currentUser = JSON.parse(stored);
                // Update UI
                const navLinks = document.querySelectorAll('.nav-link');
                if (navLinks && navLinks[3]) {
                    navLinks[3].outerHTML = `
                        <span style="color: #f9fafb; margin-right: 1rem;">
                            <i class="fas fa-user"></i> ${currentUser.username}
                        </span>
                        <button class="btn btn-secondary" onclick="logout()">Logout</button>
                    `;
                }
            }
        }

        // Update Leaderboard
        function updateLeaderboard() {
            const tbody = document.getElementById('leaderboard-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td><span style="font-weight: 700; color: #fbbf24;">🥇 #1</span></td>
                        <td>
                            <div>
                                <div style="font-weight: 600; color: #f9fafb;">CodeWarriors</div>
                                <div style="font-size: 0.875rem; color: #9ca3af;">Alice Chen</div>
                            </div>
                        </td>
                        <td style="font-weight: 600;">18</td>
                        <td style="font-weight: 700; color: #3b82f6;">2450</td>
                    </tr>
                    <tr>
                        <td><span style="font-weight: 700; color: #d1d5db;">🥈 #2</span></td>
                        <td>
                            <div>
                                <div style="font-weight: 600; color: #f9fafb;">BugBusters</div>
                                <div style="font-size: 0.875rem; color: #9ca3af;">Bob Smith</div>
                            </div>
                        </td>
                        <td style="font-weight: 600;">16</td>
                        <td style="font-weight: 700; color: #3b82f6;">2200</td>
                    </tr>
                    <tr>
                        <td><span style="font-weight: 700; color: #fb923c;">🥉 #3</span></td>
                        <td>
                            <div>
                                <div style="font-weight: 600; color: #f9fafb;">DebugMasters</div>
                                <div style="font-size: 0.875rem; color: #9ca3af;">Carol Davis</div>
                            </div>
                        </td>
                        <td style="font-weight: 600;">15</td>
                        <td style="font-weight: 700; color: #3b82f6;">1950</td>
                    </tr>
                `;
            }
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {
            loadUserFromStorage();
            loadProblems();
        });
    </script>
</body>
</html>
"""

# Routes
@app.get("/")
async def read_root():
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=HTML_TEMPLATE, status_code=200)

@app.get("/api/problems", response_model=List[Problem])
async def get_problems():
    return problems

@app.get("/api/problems/{problem_id}")
async def get_problem(problem_id: str):
    problem = next((p for p in problems if p["id"] == problem_id), None)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem

@app.post("/api/auth/login")
async def login(user: User):
    users.append(user)
    return {"message": "Login successful", "user": user}

@app.post("/api/submissions")
async def submit_solution(submission: Submission):
    await asyncio.sleep(1)
    
    result = {
        "id": str(uuid.uuid4()),
        "status": "accepted" if "len(arr)" in submission.code else "wrong_answer",
        "score": 100 if "len(arr)" in submission.code else 0
    }
    
    submissions.append(result)
    return result

@app.get("/api/leaderboard")
async def get_leaderboard():
    return leaderboard

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
