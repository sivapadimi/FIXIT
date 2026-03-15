/**
 * Real-time Updates Service for FixIt Leaderboard
 * Handles WebSocket connections and live updates
 */

class RealtimeService {
    constructor(io) {
        this.io = io;
        this.connectedClients = new Map();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            
            // Store client info
            this.connectedClients.set(socket.id, {
                connectedAt: new Date(),
                lastActivity: new Date()
            });

            // Join leaderboard room for updates
            socket.join('leaderboard');

            // Handle client requests
            socket.on('subscribe-leaderboard', () => {
                socket.join('leaderboard');
                socket.emit('subscribed', { room: 'leaderboard' });
            });

            socket.on('subscribe-team', (teamId) => {
                socket.join(`team-${teamId}`);
                socket.emit('subscribed', { room: `team-${teamId}` });
            });

            socket.on('unsubscribe-team', (teamId) => {
                socket.leave(`team-${teamId}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
                this.connectedClients.delete(socket.id);
            });

            // Handle ping for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: new Date() });
            });

            // Send initial data
            this.sendInitialData(socket);
        });
    }

    async sendInitialData(socket) {
        try {
            // Send current leaderboard
            const leaderboard = await this.getLeaderboardData();
            socket.emit('leaderboard-update', leaderboard);

            // Send recent activity
            const recentActivity = await this.getRecentActivity();
            socket.emit('recent-activity', recentActivity);

        } catch (error) {
            console.error('Error sending initial data:', error);
            socket.emit('error', { message: 'Failed to load initial data' });
        }
    }

    /**
     * Broadcast new submission to all connected clients
     */
    async broadcastNewSubmission(submissionData) {
        const {
            team_id,
            problem_id,
            score,
            is_correct,
            team_name,
            problem_title
        } = submissionData;

        // Prepare event data
        const eventData = {
            type: 'new-submission',
            team_id,
            problem_id,
            score,
            is_correct,
            team_name,
            problem_title,
            timestamp: new Date()
        };

        // Broadcast to all leaderboard subscribers
        this.io.to('leaderboard').emit('new-submission', eventData);

        // Broadcast to team-specific subscribers
        this.io.to(`team-${team_id}`).emit('team-update', eventData);

        // Update leaderboard and broadcast changes
        await this.broadcastLeaderboardUpdate();

        console.log(`Broadcasted new submission: Team ${team_name} scored ${score} points`);
    }

    /**
     * Broadcast leaderboard update to all clients
     */
    async broadcastLeaderboardUpdate() {
        try {
            const leaderboard = await this.getLeaderboardData();
            
            this.io.to('leaderboard').emit('leaderboard-update', {
                type: 'leaderboard-update',
                data: leaderboard,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Error broadcasting leaderboard update:', error);
        }
    }

    /**
     * Broadcast competition event
     */
    async broadcastCompetitionEvent(eventType, data) {
        const eventData = {
            type: eventType,
            data,
            timestamp: new Date()
        };

        this.io.to('leaderboard').emit('competition-event', eventData);

        // Log event for analytics
        console.log(`Competition event: ${eventType}`, data);
    }

    /**
     * Get current leaderboard data
     */
    async getLeaderboardData() {
        // This would typically query your database
        // For now, return a placeholder structure
        return {
            rankings: [], // Would contain ranked teams
            last_updated: new Date(),
            total_teams: 0
        };
    }

    /**
     * Get recent activity
     */
    async getRecentActivity() {
        // This would query your competition_events table
        return {
            activities: [], // Would contain recent events
            last_updated: new Date()
        };
    }

    /**
     * Send periodic updates to keep connections alive
     */
    startPeriodicUpdates() {
        // Update leaderboard every 30 seconds
        setInterval(async () => {
            await this.broadcastLeaderboardUpdate();
        }, 30000);

        // Clean up inactive connections every 5 minutes
        setInterval(() => {
            this.cleanupInactiveConnections();
        }, 300000);

        console.log('Started periodic updates');
    }

    /**
     * Clean up inactive connections
     */
    cleanupInactiveConnections() {
        const now = new Date();
        const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

        for (const [socketId, client] of this.connectedClients) {
            if (now - client.lastActivity > inactiveThreshold) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.disconnect(true);
                }
                this.connectedClients.delete(socketId);
            }
        }

        console.log(`Cleaned up connections. Active clients: ${this.connectedClients.size}`);
    }

    /**
     * Get connection statistics
     */
    getStats() {
        return {
            connected_clients: this.connectedClients.size,
            rooms: this.io.sockets.adapter.rooms,
            uptime: process.uptime()
        };
    }

    /**
     * Handle competition start/end events
     */
    async handleCompetitionStart() {
        await this.broadcastCompetitionEvent('competition-start', {
            message: 'Competition has started!',
            timestamp: new Date()
        });
    }

    async handleCompetitionEnd() {
        await this.broadcastCompetitionEvent('competition-end', {
            message: 'Competition has ended!',
            final_results: await this.getLeaderboardData(),
            timestamp: new Date()
        });
    }

    /**
     * Handle problem unlock events
     */
    async handleProblemUnlock(problemId) {
        await this.broadcastCompetitionEvent('problem-unlock', {
            problem_id: problemId,
            message: `New problem unlocked!`,
            timestamp: new Date()
        });
    }
}

module.exports = RealtimeService;
