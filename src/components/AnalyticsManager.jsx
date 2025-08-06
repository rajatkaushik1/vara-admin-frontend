import React, { useState, useEffect } from 'react';
import { API_BASE_URL, ANALYTICS_ENDPOINTS } from '../config';

const AnalyticsManager = () => {
    const [analyticsData, setAnalyticsData] = useState([]);
    const [platformStats, setPlatformStats] = useState(null);
    const [selectedSong, setSelectedSong] = useState(null);
    const [songDetails, setSongDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [timeFilter, setTimeFilter] = useState('7'); // days
    const [autoRefresh, setAutoRefresh] = useState(true); // NEW: Auto-refresh toggle
    const [lastRefresh, setLastRefresh] = useState(new Date()); // NEW: Track last refresh

    // Fetch analytics data
    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.getAllSongsAnalytics(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }

            const data = await response.json();
            setAnalyticsData(data);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch platform stats
    const fetchPlatformStats = async () => {
        setLoading(true);
        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.getPlatformStats(timeFilter), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch platform stats');
            }

            const data = await response.json();
            setPlatformStats(data);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch song details
    const fetchSongDetails = async (songId) => {
        setLoading(true);
        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.getSongAnalytics(songId), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch song details');
            }

            const data = await response.json();
            setSongDetails(data);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // NEW: Auto-refresh functionality
    useEffect(() => {
        if (!autoRefresh) return;

        const refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing analytics data...');
            fetchAnalytics();
            fetchPlatformStats();
            setLastRefresh(new Date());
        }, 15000); // Refresh every 15 seconds

        return () => clearInterval(refreshInterval);
    }, [autoRefresh, timeFilter]);

    // NEW: Manual refresh function
    const handleManualRefresh = () => {
        console.log('🔄 Manual refresh triggered...');
        fetchAnalytics();
        fetchPlatformStats();
        setLastRefresh(new Date());
    };

    useEffect(() => {
        fetchAnalytics();
        fetchPlatformStats();
    }, [timeFilter]);

    useEffect(() => {
        if (selectedSong) {
            fetchSongDetails(selectedSong);
        }
    }, [selectedSong, timeFilter]);

    // Platform Overview Component with refresh controls
    const PlatformOverview = () => (
        <div className="analytics-overview">
            <div className="analytics-controls">
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                    <option value="1">Last 24 hours</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>
                
                {/* NEW: Auto-refresh controls */}
                <div className="refresh-controls">
                    <label className="auto-refresh-toggle">
                        <input 
                            type="checkbox" 
                            checked={autoRefresh} 
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh (15s)
                    </label>
                    <button onClick={handleManualRefresh} className="refresh-btn">
                        🔄 Refresh Now
                    </button>
                    <span className="last-refresh">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                </div>

                <button onClick={resetWeeklyCounters} className="reset-btn">
                    Reset Weekly Counters
                </button>
            </div>

            {loading ? (
                <p>Loading analytics data...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : (
                <div className="platform-stats">
                    <div className="stat-item">
                        <h3>Total Plays</h3>
                        <p>{platformStats.totalPlays}</p>
                    </div>
                    <div className="stat-item">
                        <h3>Total Downloads</h3>
                        <p>{platformStats.totalDownloads}</p>
                    </div>
                    <div className="stat-item">
                        <h3>Total Favorites</h3>
                        <p>{platformStats.totalFavorites}</p>
                    </div>
                    <div className="stat-item">
                        <h3>New Users</h3>
                        <p>{platformStats.newUsers}</p>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="analytics-manager">
            <div className="analytics-header">
                <h2>📊 Analytics Dashboard</h2>
                <div className="analytics-tabs">
                    <button 
                        className={activeTab === 'overview' ? 'active' : ''}
                        onClick={() => setActiveTab('overview')}
                    >
                        Platform Overview
                    </button>
                    <button 
                        className={activeTab === 'songs' ? 'active' : ''}
                        onClick={() => setActiveTab('songs')}
                    >
                        Song Analytics
                    </button>
                </div>
                
                {/* NEW: Real-time status indicator */}
                <div className="status-indicator">
                    {autoRefresh ? (
                        <span className="status-live">🟢 Live Updates</span>
                    ) : (
                        <span className="status-manual">🔴 Manual Mode</span>
                    )}
                </div>
            </div>

            <div className="analytics-content">
                {activeTab === 'overview' && <PlatformOverview />}
                {activeTab === 'songs' && (
                    <div className="songs-analytics-table">
                        <div className="table-header">
                            <h3>All Songs Analytics</h3>
                            {/* NEW: Refresh button in songs tab too */}
                            <button onClick={handleManualRefresh} className="refresh-btn">
                                🔄 Refresh Data
                            </button>
                        </div>
                        
                        {/* ...existing table code... */}
                    </div>
                )}
            </div>

            {/* ...existing modal code... */}
        </div>
    );
};

export default AnalyticsManager;
