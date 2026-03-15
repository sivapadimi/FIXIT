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
    allow_origins=["http://localhost:5173"],
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

# In-memory storage (replace with MongoDB later)
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
            "description": "Fix the array access bug",
            "difficulty": "easy",
            "points": 100,
            "buggy_code": """def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr) + 1):  # Bug here
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val""",
            "fixed_code": """def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr)):  # Fixed
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val""",
            "test_cases": [
                {"input": "[1,5,3,9,2]", "expected": "9", "hidden": False},
                {"input": "[]", "expected": "Error", "hidden": True}
            ]
        }
    ]

init_data()

# Routes
@app.get("/")
async def root():
    return {"message": "FixIt API is running"}

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
