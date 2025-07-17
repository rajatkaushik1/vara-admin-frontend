        import React, { useState, useEffect } from 'react';
        import LoginPage from './LoginPage';
        import GenreManager from './components/GenreManager';
        import SubGenreManager from './components/SubGenreManager';
        import SongManager from './components/SongManager';
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
                <h1>Vara Admin Panel</h1>
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
                    className={activeTab === 'songs' ? 'active' : ''}
                    onClick={() => setActiveTab('songs')}
                  >
                    Manage Songs
                  </button>
                </nav>
                <button onClick={handleLogout} className="logout-button">
                  Logout
                </button>
              </header>

              <main className="dashboard-content">
                {activeTab === 'genres' && <GenreManager onGenreAdded={handleGenreDataChange} />}
                {activeTab === 'subgenres' && <SubGenreManager genreUpdateKey={genreUpdateKey} />}
                {activeTab === 'songs' && <SongManager genreUpdateKey={genreUpdateKey} />}
              </main>
            </div>
          );
        }

        export default App;
        