        import React, { useState } from 'react';
        import { API_BASE_URL } from './config'; // Import your API base URL
        import './App.css'; // Ensure App.css styles are available for login page

        function LoginPage({ onLoginSuccess }) {
          const [username, setUsername] = useState('');
          const [password, setPassword] = useState('');
          const [loading, setLoading] = useState(false);
          const [error, setError] = useState('');

          const handleLogin = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');

            try {
             const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
              });

              const data = await response.json();

              if (!response.ok) {
                const message = data.error || data.message || 'Login failed';
                throw new Error(message);
              }

              onLoginSuccess(data.token); // Pass the token to the parent App component
            } catch (err) {
              console.error("Login error:", err);
              setError(err.message);
            } finally {
              setLoading(false);
            }
          };

          return (
            <div className="login-container">
              <div className="login-box">
                <h2>Admin Login</h2>
                {error && <p className="error-message">Error: {error}</p>}
                <form onSubmit={handleLogin}>
                  <div className="input-group">
                    <label htmlFor="username">Username:</label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="password">Password:</label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
              </div>
            </div>
          );
        }

        export default LoginPage;
        
