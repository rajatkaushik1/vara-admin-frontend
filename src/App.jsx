import React, { useState } from 'react';
    import LoginPage from './LoginPage';
    import GenreManager from './components/GenreManager';
    import SubGenreManager from './components/SubGenreManager';
    import InstrumentManager from './components/InstrumentManager';
    import SongManager from './components/SongManager';
    import AnalyticsManager from './components/AnalyticsManager';
    import './App.css'; // Import App-specific styles

    function App() {
      const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
      const [activeTab, setActiveTab] = useState('genres'); // Default active tab
      const [genreUpdateKey, setGenreUpdateKey] = useState(0); // Key to force refresh of SubGenre/Song managers

      // Callback to handle successful login
      const handleLoginSuccess = (token) => {
        setAdminToken(token);
        localStorage.setItem('adminToken', token); // Store token in local storage
      };

      // Callback to handle logout
      const handleLogout = () => {
        setAdminToken(null);
        localStorage.removeItem('adminToken'); // Remove token from local storage
      };

      // Callback to trigger re-fetch in SubGenreManager and SongManager
      const handleGenreDataChange = () => {
        setGenreUpdateKey(prevKey => prevKey + 1);
      };

      if (!adminToken) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
      }

      return (
        <div className="admin-dashboard">
          <header className="dashboard-header">
            <div className="header-left">
              <img src="/logo.png" alt="Vara Logo" className="app-logo" />
              <h1>Vara Admin Panel</h1>
            </div>
            <nav className="dashboard-nav">
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
            </nav>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </header>

          <main className="dashboard-content">
            {activeTab === 'genres' && <GenreManager onGenreAdded={handleGenreDataChange} />}
            {activeTab === 'subgenres' && <SubGenreManager genreUpdateKey={genreUpdateKey} />}
            {activeTab === 'instruments' && <InstrumentManager />}
            {activeTab === 'songs' && <SongManager genreUpdateKey={genreUpdateKey} />}
            {activeTab === 'analytics' && <AnalyticsManager />}
          </main>
        </div>
      );
    }

    export default App;
