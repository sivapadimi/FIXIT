import sqlite3
import json
from datetime import datetime

def test_team_creation():
    """Test team creation functionality"""
    print("🧪 TESTING TEAM CREATION FUNCTIONALITY")
    print("=" * 50)
    
    # Connect to database
    conn = sqlite3.connect('fixit_database.db')
    cursor = conn.cursor()
    
    try:
        # Test adding multiple teams
        test_teams = [
            ("TEAM01", "code01"),
            ("TEAM02", "code02"),
            ("TEAM03", "code03"),
            ("TEAM04", "code04"),
            ("TEAM05", "code05"),
        ]
        
        print("📝 Adding test teams...")
        for i, (team_name, team_code) in enumerate(test_teams, 1):
            try:
                cursor.execute('INSERT INTO login_details (team_name, team_code) VALUES (?, ?)', (team_name, team_code))
                conn.commit()
                print(f"  ✅ Team {i}: {team_name} - {team_code}")
            except sqlite3.IntegrityError as e:
                print(f"  ❌ Team {i} failed: {e}")
                conn.rollback()
        
        # Check final count
        cursor.execute('SELECT COUNT(*) FROM login_details')
        final_count = cursor.fetchone()[0]
        
        print(f"\n📊 Final team count: {final_count}")
        
        # Show all teams
        cursor.execute('SELECT team_name, team_code FROM login_details ORDER BY id DESC LIMIT 10')
        recent_teams = cursor.fetchall()
        
        print(f"\n📋 Most recent teams:")
        for team in recent_teams:
            print(f"  🏷️ {team[0]} - {team[1]}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_team_creation()
