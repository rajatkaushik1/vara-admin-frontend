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

    const adminToken = localStorage.getItem('adminToken'); // 1) Add adminToken

    // Fetch analytics data
    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.getAllSongsAnalytics(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) // 2) Add Authorization header
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
                    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) // 2) Add Authorization header
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
            const response = await fetch(ANALYTICS_ENDPOINTS.getSongAnalytics(songId, timeFilter), { // 3) Use timeFilter
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) // 2) Add Authorization header
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

    // 4) Load data immediately on mount and when timeFilter changes
    useEffect(() => {
        fetchAnalytics();
        fetchPlatformStats();
        setLastRefresh(new Date());
    }, [timeFilter]);

    // 5) Fetch song details when selectedSong or timeFilter changes
    useEffect(() => {
        if (selectedSong) {
            fetchSongDetails(selectedSong);
        }
    }, [selectedSong, timeFilter]);

    // NEW: Manual refresh function
    const handleManualRefresh = () => {
        console.log('🔄 Manual refresh triggered...');
        fetchAnalytics();
        fetchPlatformStats();
        setLastRefresh(new Date());
    };

    // Reset weekly counters (admin action)
    const resetWeeklyCounters = async () => {
        if (!confirm('Are you sure you want to reset all weekly counters? This will affect trending calculations.')) {
            return;
        }

        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.resetWeeklyCounters(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) // 2) Add Authorization header
                }
            });
            if (!response.ok) throw new Error('Failed to reset counters');
            
            alert('Weekly counters reset successfully!');
            fetchAnalytics();
            fetchPlatformStats();
            setLastRefresh(new Date()); // 6) Refresh overview after reset
        } catch (err) {
            alert('Failed to reset counters');
            console.error('Reset error:', err);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || seconds < 0) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const formatHours = (hours) => {
        if (!hours) return "0h";
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        return `${hours.toFixed(1)}h`;
    };

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

            {platformStats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Total Songs</h3>
                        <div className="stat-number">{platformStats.totalSongs}</div>
                    </div>
                    <div className="stat-card">
                        <h3>Total Plays</h3>
                        <div className="stat-number">{platformStats.stats.totalPlays || 0}</div>
                        <div className="stat-sub">Weekly: {platformStats.stats.weeklyPlays || 0}</div>
                    </div>
                    <div className="stat-card">
                        <h3>Total Downloads</h3>
                        <div className="stat-number">{platformStats.stats.totalDownloads || 0}</div>
                        <div className="stat-sub">Weekly: {platformStats.stats.weeklyDownloads || 0}</div>
                    </div>
                    <div className="stat-card">
                        <h3>Total Favorites</h3>
                        <div className="stat-number">{platformStats.stats.totalFavorites || 0}</div>
                        <div className="stat-sub">Weekly: {platformStats.stats.weeklyFavorites || 0}</div>
                    </div>
                    <div className="stat-card">
                        <h3>Total Playtime</h3>
                        <div className="stat-number">{formatHours(platformStats.stats.totalPlaytimeHours)}</div>
                    </div>
                </div>
            )}

            {platformStats?.topSongs && (
                <div className="top-songs-section">
                    <h3>Top Performing Songs</h3>
                    <div className="top-songs-list">
                        {platformStats.topSongs.map((song, index) => (
                            <div key={song._id} className="top-song-item">
                                <span className="rank">#{index + 1}</span>
                                <div className="song-info">
                                    <strong>{song.title}</strong>
                                    <span className="artist">{song.artist}</span>
                                </div>
                                <div className="song-stats">
                                    <span>🎵 {song.analytics.totalPlays}</span>
                                    <span>⬇️ {song.analytics.totalDownloads}</span>
                                    <span>❤️ {song.analytics.totalFavorites}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) {
        return <div className="analytics-loading">Loading analytics data...</div>;
    }

    if (error) {
        return <div className="analytics-error">{error}</div>;
    }

    return (
        <div className="analytics-manager">
            <div className="analytics-header">
                <h2>📊 Analytics Dashboard</h2>
                <div className="analytics-tabs">
                    <button 
                        className={activeTab === 'overview' ? 'active' : ''}
                        onClick={() => {
                            setActiveTab('overview');
                            fetchAnalytics(); // 6) Refresh overview when switching tabs
                            fetchPlatformStats();
                            setLastRefresh(new Date());
                        }}
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
                            <button onClick={handleManualRefresh} className="refresh-btn">
                                🔄 Refresh Data
                            </button>
                        </div>
                        
                        <div className="table-wrapper">
                            <table className="analytics-table">
                                <thead>
                                    <tr>
                                        <th>Song</th>
                                        <th>Plays</th>
                                        <th>Downloads</th>
                                        <th>Favorites</th>
                                        <th>Playtime</th>
                                        <th>Trending Score</th>
                                        <th>Last Played</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analyticsData.map(song => (
                                        <tr key={song._id}>
                                            <td className="song-cell">
                                                <div className="song-info">
                                                    <strong>{song.title}</strong>
                                                    <div className="song-meta">
                                                        {song.artist} • {song.collectionType}
                                                    </div>
                                                    <div className="song-genres">
                                                        {song.genres?.map(g => g.name).join(', ')}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="stat-cell">
                                                    <strong>{song.analytics.totalPlays}</strong>
                                                    <small>({song.analytics.weeklyPlays} this week)</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="stat-cell">
                                                    <strong>{song.analytics.totalDownloads}</strong>
                                                    <small>({song.analytics.weeklyDownloads} this week)</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="stat-cell">
                                                    <strong>{song.analytics.totalFavorites}</strong>
                                                    <small>({song.analytics.weeklyFavorites} this week)</small>
                                                </div>
                                            </td>
                                            <td>{formatHours(song.analytics.totalPlaytimeHours)}</td>
                                            <td>
                                                <span className="trending-score">
                                                    {Math.round(song.analytics.trendingScore || 0)}
                                                </span>
                                            </td>
                                            <td>
                                                {song.analytics.lastPlayedAt 
                                                    ? new Date(song.analytics.lastPlayedAt).toLocaleDateString()
                                                    : 'Never'
                                                }
                                            </td>
                                            <td>
                                                <button 
                                                    onClick={() => setSelectedSong(song._id)}
                                                    className="view-details-btn"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {selectedSong && songDetails && (
                <div className="modal-overlay" onClick={() => setSelectedSong(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{songDetails.song.title}</h2>
                            <button onClick={() => setSelectedSong(null)} className="close-btn">×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="song-details-grid">
                                <div className="detail-section">
                                    <h3>Basic Info</h3>
                                    <p><strong>Artist:</strong> {songDetails.song.artist}</p>
                                    <p><strong>Duration:</strong> {formatTime(songDetails.song.duration)}</p>
                                    <p><strong>Collection:</strong> {songDetails.song.collectionType}</p>
                                    <p><strong>Genres:</strong> {songDetails.song.genres?.map(g => g.name).join(', ')}</p>
                                </div>
                                
                                <div className="detail-section">
                                    <h3>Analytics Summary</h3>
                                    <p><strong>Total Plays:</strong> {songDetails.song.analytics.totalPlays}</p>
                                    <p><strong>Total Downloads:</strong> {songDetails.song.analytics.totalDownloads}</p>
                                    <p><strong>Total Favorites:</strong> {songDetails.song.analytics.totalFavorites}</p>
                                    <p><strong>Total Playtime:</strong> {formatHours(songDetails.song.analytics.totalPlaytimeHours)}</p>
                                    <p><strong>Trending Score:</strong> {Math.round(songDetails.song.analytics.trendingScore || 0)}</p>
                                    <p><strong>Avg Completion:</strong> {Math.round(songDetails.avgCompletionRate || 0)}%</p>
                                </div>
                            </div>

                            {songDetails.popularTimestamps && songDetails.popularTimestamps.length > 0 && (
                                <div className="detail-section">
                                    <h3>Most Popular Timestamps</h3>
                                    <div className="timestamps-list">
                                        {songDetails.popularTimestamps.slice(0, 10).map((timestamp, index) => (
                                            <div key={index} className="timestamp-item">
                                                <span className="time">{formatTime(timestamp.avgPosition)}</span>
                                                <span className="count">{timestamp.count} seeks</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {songDetails.recentInteractions && (
                                <div className="detail-section">
                                    <h3>Recent Activity</h3>
                                    <div className="activity-list">
                                        {songDetails.recentInteractions.slice(0, 20).map((interaction, index) => (
                                            <div key={index} className="activity-item">
                                                <span className="action">{interaction.interactionType}</span>
                                                <span className="user">{interaction.userEmail || 'Anonymous'}</span>
                                                <span className="time">
                                                    {new Date(interaction.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsManager;
