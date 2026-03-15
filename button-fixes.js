// FixIt Button Functionality Fixes
// Add this script to resolve button issues

// 1. Enhanced Page Navigation with Error Handling
function showPage(page) {
    try {
        console.log("Navigating to page:", page);
        
        // Hide all pages with error handling
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        
        // Remove active class from nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        
        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.style.display = 'block';
            
            // Update active nav link
            navLinks.forEach(l => {
                if (l.textContent.toLowerCase().includes(page)) {
                    l.classList.add('active');
                }
            });
            
            // Page-specific initialization
            if (page === 'problems') {
                displayProblems();
            } else if (page === 'leaderboard') {
                updateLeaderboard();
            }
            
            console.log("Successfully navigated to:", page);
        } else {
            console.error("Page not found:", page);
            alert(`Page "${page}" not found!`);
        }
    } catch (error) {
        console.error("Navigation error:", error);
        alert("Navigation failed. Please check console for details.");
    }
}

// 2. Enhanced Login Functions
function showLogin() {
    try {
        console.log("Showing login modal");
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            loginModal.style.display = 'flex';
        } else {
            console.error("Login modal not found");
        }
    } catch (error) {
        console.error("Show login error:", error);
    }
}

function hideLogin() {
    try {
        console.log("Hiding login modal");
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.add('hidden');
            loginModal.style.display = 'none';
        }
    } catch (error) {
        console.error("Hide login error:", error);
    }
}

// 3. Enhanced Problem Functions
function showProblem(problemId) {
    try {
        console.log("Showing problem:", problemId);
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        
        // Show problem detail page
        const problemDetailPage = document.getElementById('problem-detail-page');
        if (problemDetailPage) {
            problemDetailPage.classList.remove('hidden');
            problemDetailPage.style.display = 'block';
            
            // Load problem content
            loadProblemContent(problemId);
        } else {
            console.error("Problem detail page not found");
        }
    } catch (error) {
        console.error("Show problem error:", error);
    }
}

function loadProblemContent(problemId) {
    // Implementation for loading problem content
    console.log("Loading content for problem:", problemId);
}

// 4. Enhanced Admin Functions
function showSubmissions() {
    try {
        console.log("Showing submissions");
        // Implementation for showing submissions
        alert("Submissions feature coming soon!");
    } catch (error) {
        console.error("Show submissions error:", error);
    }
}

function makeResultsVisible() {
    try {
        console.log("Making results visible");
        // Implementation for making results visible
        alert("Results visibility feature coming soon!");
    } catch (error) {
        console.error("Make results visible error:", error);
    }
}

// 5. Button Event Listeners Setup
function setupButtonListeners() {
    console.log("Setting up button listeners...");
    
    // Add click listeners to all buttons with onclick attributes
    const buttons = document.querySelectorAll('button[onclick]');
    buttons.forEach(button => {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            button.addEventListener('click', function(e) {
                try {
                    eval(onclickAttr);
                } catch (error) {
                    console.error("Button click error:", error);
                }
            });
        }
    });
    
    // Add click listeners to nav links
    const navLinks = document.querySelectorAll('.nav-link[onclick]');
    navLinks.forEach(link => {
        const onclickAttr = link.getAttribute('onclick');
        if (onclickAttr) {
            link.addEventListener('click', function(e) {
                try {
                    eval(onclickAttr);
                } catch (error) {
                    console.error("Nav link click error:", error);
                }
            });
        }
    });
}

// 6. Initialize on DOM Load
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - initializing button functionality");
    
    // Setup button listeners
    setupButtonListeners();
    
    // Show dashboard by default
    showPage('dashboard');
    
    // Add global error handler
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
    });
    
    console.log("Button functionality initialized");
});

// 7. Debug Function
function debugButtons() {
    console.log("=== BUTTON DEBUG ===");
    
    // Check if pages exist
    const pages = ['dashboard', 'problems', 'leaderboard', 'admin'];
    pages.forEach(page => {
        const pageElement = document.getElementById(`${page}-page`);
        console.log(`Page ${page}:`, pageElement ? 'EXISTS' : 'MISSING');
    });
    
    // Check if functions exist
    const functions = ['showPage', 'showLogin', 'hideLogin', 'showProblem'];
    functions.forEach(func => {
        console.log(`Function ${func}:`, typeof window[func] !== 'undefined' ? 'EXISTS' : 'MISSING');
    });
    
    // Check buttons
    const buttons = document.querySelectorAll('button[onclick]');
    console.log(`Buttons with onclick: ${buttons.length}`);
    buttons.forEach((button, index) => {
        console.log(`Button ${index + 1}:`, button.textContent.trim(), button.getAttribute('onclick'));
    });
    
    console.log("=== END DEBUG ===");
}

// Add debug function to global scope
window.debugButtons = debugButtons;

console.log("Button fixes loaded. Run debugButtons() in console to test.");
