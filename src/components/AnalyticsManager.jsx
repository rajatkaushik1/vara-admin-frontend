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

    // Fetch all songs analytics
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetch(ANALYTICS_ENDPOINTS.getAllSongsAnalytics());
            if (!response.ok) throw new Error('Failed to fetch analytics');
            const data = await response.json();
            setAnalyticsData(data);
        } catch (err) {
            setError('Failed to load analytics data');
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch platform-wide statistics
    const fetchPlatformStats = async () => {
        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.getPlatformStats(timeFilter));
            if (!response.ok) throw new Error('Failed to fetch platform stats');
            const data = await response.json();
            setPlatformStats(data);
        } catch (err) {
            console.error('Platform stats fetch error:', err);
        }
    };

    // Fetch detailed song analytics
    const fetchSongDetails = async (songId) => {
        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.getSongAnalytics(songId, timeFilter));
            if (!response.ok) throw new Error('Failed to fetch song details');
            const data = await response.json();
            setSongDetails(data);
        } catch (err) {
            console.error('Song details fetch error:', err);
        }
    };

    // Reset weekly counters (admin action)
    const resetWeeklyCounters = async () => {
        if (!confirm('Are you sure you want to reset all weekly counters? This will affect trending calculations.')) {
            return;
        }

        try {
            const response = await fetch(ANALYTICS_ENDPOINTS.resetWeeklyCounters(), {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to reset counters');
            
            alert('Weekly counters reset successfully!');
            fetchAnalytics();
            fetchPlatformStats();
        } catch (err) {
            alert('Failed to reset counters');
            console.error('Reset error:', err);
        }
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

    // Platform Overview Component
    const PlatformOverview = () => (
        <div className="analytics-overview">
            <div className="analytics-controls">
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                    <option value="1">Last 24 hours</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>
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

    // Song Analytics Table Component
    const SongsTable = () => (
        <div className="songs-analytics-table">
            <div className="table-header">
                <h3>All Songs Analytics</h3>
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
    );

    // Song Details Modal Component
    const SongDetailsModal = () => {
        if (!songDetails) return null;

        return (
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
        );
    };

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
            </div>

            <div className="analytics-content">
                {activeTab === 'overview' && <PlatformOverview />}
                {activeTab === 'songs' && <SongsTable />}
            </div>

            {selectedSong && <SongDetailsModal />}
        </div>
    );
};

export default AnalyticsManager;
