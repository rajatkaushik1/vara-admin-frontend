import React, { useEffect, useState } from 'react';
import LoginPage from './LoginPage';
import GenreManager from './components/GenreManager';
import SubGenreManager from './components/SubGenreManager';
import InstrumentManager from './components/InstrumentManager';
import SongManager from './components/SongManager';
import AnalyticsManager from './components/AnalyticsManager';
import MoodManager from './components/MoodManager';
import PanelManager from './components/PanelManager';

import { API_BASE_URL } from './config';
import './App.css';

function App() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [activeTab, setActiveTab] = useState('genres');
  const [genreUpdateKey, setGenreUpdateKey] = useState(0);

  // New: role state loaded from backend
  const [adminRole, setAdminRole] = useState(null); // 'admin' | 'editor' | null
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const handleLoginSuccess = (token) => {
    setAdminToken(token);
    localStorage.setItem('adminToken', token);
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('adminToken');
    setAdminRole(null);
    setActiveTab('genres');
  };

  const handleGenreDataChange = () => {
    setGenreUpdateKey(prevKey => prevKey + 1);
  };

  // Fetch role/profile when token changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!adminToken) {
        setAdminRole(null);
        return;
      }
      setProfileLoading(true);
      setProfileError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || `HTTP ${res.status}`);
        }
        // Expect data.role to be 'admin' or 'editor'
        setAdminRole(data?.role || 'admin');
      } catch (err) {
        console.error('Profile load failed:', err);
        setProfileError(err.message || 'Failed to load role');
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [adminToken]);

  // If sub-admin, ensure default tab is 'songs'
  useEffect(() => {
    if (adminRole === 'editor' && activeTab !== 'songs') {
      setActiveTab('songs');
    }
  }, [adminRole, activeTab]);

  if (!adminToken) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Navigation renderer based on role
  const renderNav = () => {
    if (profileLoading) {
      return <div style={{ color: '#aaa', padding: '8px 12px' }}>Loading role…</div>;
    }
    if (adminRole === 'editor') {
      return (
        <>
          <button
            className={activeTab === 'songs' ? 'active' : ''}
            onClick={() => setActiveTab('songs')}
          >
            Manage Songs
          </button>
        </>
      );
    }
    // Default: admin or role not yet loaded → show full admin
    // Place "Manage Panels" first so it is always visible.
    return (
      <>
        <button
          className={activeTab === 'panels' ? 'active' : ''}
          onClick={() => setActiveTab('panels')}
        >
          Manage Panels
        </button>
        <button
          className={activeTab === 'genres' ? 'active' : ''}
          onClick={() => setActiveTab('genres')}
        >
          Manage Genres
        </button>
        <button
          className={activeTab === 'subgenres' ? 'active' : ''}
          onClick={() => setActiveTab('subgenres')}
        >
          Manage Sub-genres
        </button>
        <button
          className={activeTab === 'instruments' ? 'active' : ''}
          onClick={() => setActiveTab('instruments')}
        >
          Manage Instruments
        </button>
        <button
          className={activeTab === 'moods' ? 'active' : ''}
          onClick={() => setActiveTab('moods')}
        >
          Manage Moods
        </button>
        <button
          className={activeTab === 'songs' ? 'active' : ''}
          onClick={() => setActiveTab('songs')}
        >
          Manage Songs
        </button>
        <button
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics Dashboard
        </button>
      </>
    );
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/logo.png" alt="Vara Logo" className="app-logo" />
          <h1>Admin Panel</h1>
        </div>
        <nav className="dashboard-nav">
          {renderNav()}
        </nav>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      {/* Optional role error */}
      {profileError && (
        <div style={{ background: '#dc3545', color: '#fff', padding: 10, textAlign: 'center' }}>
          {profileError}
        </div>
      )}

      <main className="dashboard-content">
        {adminRole === 'editor' ? (
          <>
            {activeTab === 'songs' && <SongManager genreUpdateKey={genreUpdateKey} adminRole={adminRole} />}
          </>
        ) : (
          <>
            {activeTab === 'panels' && <PanelManager />}
            {activeTab === 'genres' && <GenreManager onGenreAdded={handleGenreDataChange} />}
            {activeTab === 'subgenres' && <SubGenreManager genreUpdateKey={genreUpdateKey} />}
            {activeTab === 'instruments' && <InstrumentManager />}
            {activeTab === 'moods' && <MoodManager />}
            {activeTab === 'songs' && <SongManager genreUpdateKey={genreUpdateKey} adminRole={adminRole} />}
            {activeTab === 'analytics' && <AnalyticsManager />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;

// Don’t change any other function than this. Keep all other project files untouched.
