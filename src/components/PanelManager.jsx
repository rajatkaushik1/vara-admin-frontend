import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';

function PanelManager() {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState({ type: '', message: '' });

  // Create form
  const [panelName, setPanelName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Per-row edit states
  const [editMap, setEditMap] = useState({}); // id -> { name, username, passwordOpen, newPassword, savingInfo, savingPwd }

  const adminToken = localStorage.getItem('adminToken');

  const showNotif = (message, type = 'success') => {
    setNotif({ type, message });
    setTimeout(() => setNotif({ type: '', message: '' }), 4500);
  };

  const fetchPanels = useCallback(async () => {
    if (!adminToken) {
      setLoading(false);
      showNotif('Missing admin token. Please login again.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/panels`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setPanels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchPanels error:', err);
      showNotif(`Failed to load panels: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchPanels();
  }, [fetchPanels]);

  const resetCreateForm = () => {
    setPanelName('');
    setLoginId('');
    setPassword('');
    setIsCreating(false);
  };

  const handleCreate = async () => {
    const name = (panelName || '').trim();
    const username = (loginId || '').trim();
    const pwd = (password || '').trim();

    if (!name || !username || !pwd) {
      showNotif('panelName, loginId and password are required.', 'error');
      return;
    }

    try {
      setIsCreating(true);
      const res = await fetch(`${API_BASE_URL}/api/panels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ panelName: name, loginId: username, password: pwd })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showNotif(`Panel "${data?.name || name}" created.`, 'success');
      resetCreateForm();
      fetchPanels();
    } catch (err) {
      console.error('create panel error:', err);
      showNotif(`Failed to create panel: ${err.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const beginEdit = (row) => {
    setEditMap(prev => ({
      ...prev,
      [row._id]: {
        name: row.name || '',
        username: row.username || '',
        passwordOpen: false,
        newPassword: '',
        savingInfo: false,
        savingPwd: false
      }
    }));
  };

  const cancelEdit = (id) => {
    setEditMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleInfoChange = (id, field, value) => {
    setEditMap(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const saveInfo = async (id) => {
    const row = editMap[id];
    if (!row) return;
    const name = (row.name || '').trim();
    const username = (row.username || '').trim();
    if (!name || !username) {
      showNotif('panelName and loginId cannot be empty.', 'error');
      return;
    }

    try {
      setEditMap(prev => ({ ...prev, [id]: { ...row, savingInfo: true } }));
      const res = await fetch(`${API_BASE_URL}/api/panels/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ panelName: name, loginId: username })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showNotif('Panel info updated.', 'success');
      cancelEdit(id);
      fetchPanels();
    } catch (err) {
      console.error('saveInfo error:', err);
      showNotif(`Failed to update panel: ${err.message}`, 'error');
    }
  };

  const togglePassword = (id, open) => {
    setEditMap(prev => ({
      ...prev,
      [id]: { ...prev[id], passwordOpen: open, newPassword: '' }
    }));
  };

  const savePassword = async (id) => {
    const row = editMap[id];
    if (!row) return;
    const pwd = (row.newPassword || '').trim();
    if (!pwd || pwd.length < 4) {
      showNotif('Password must be at least 4 characters.', 'error');
      return;
    }

    try {
      setEditMap(prev => ({ ...prev, [id]: { ...row, savingPwd: true } }));
      const res = await fetch(`${API_BASE_URL}/api/panels/${id}/password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: pwd })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showNotif('Password updated.', 'success');
      togglePassword(id, false);
    } catch (err) {
      console.error('savePassword error:', err);
      showNotif(`Failed to update password: ${err.message}`, 'error');
    } finally {
      setEditMap(prev => ({ ...prev, [id]: { ...prev[id], savingPwd: false } }));
    }
  };

  const deletePanel = async (id, displayName) => {
    const confirmed = window.confirm(`Delete panel "${displayName}"? This does not delete their songs.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/panels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showNotif('Panel deleted.', 'success');
      fetchPanels();
    } catch (err) {
      console.error('deletePanel error:', err);
      showNotif(`Failed to delete panel: ${err.message}`, 'error');
    }
  };

  // Styles
  const box = { background: '#333', padding: 16, borderRadius: 8, marginBottom: 20 };
  const label = { color: '#ccc', display: 'block', marginBottom: 6 };
  const input = { padding: 8, background: '#555', color: '#fff', border: '1px solid #666', borderRadius: 4 };
  const button = { padding: '8px 12px', border: 'none', borderRadius: 4, cursor: 'pointer' };
  const btnPrimary = { ...button, background: '#007bff', color: '#fff' };
  const btnWarn = { ...button, background: '#ffc107', color: '#333' };
  const btnDanger = { ...button, background: '#dc3545', color: '#fff' };
  const btnGrey = { ...button, background: '#6c757d', color: '#fff' };
  const cell = { padding: 10, verticalAlign: 'top', color: '#ddd', borderBottom: '1px solid #444' };
  const th = { background: '#222', color: '#fff', padding: 10, textAlign: 'left' };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: 10 }}>Manage Pannels</h2>

      {notif.message && (
        <div style={{ padding: 10, margin: '12px 0', borderRadius: 4, background: notif.type === 'success' ? '#28a745' : '#dc3545', color: '#fff' }}>
          {notif.message}
        </div>
      )}

      {/* Create */}
      <div style={box}>
        <h3 style={{ color: '#eee', marginTop: 0 }}>Create New Pannel</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={label}>Panel Name</label>
            <input style={input} value={panelName} onChange={e => setPanelName(e.target.value)} placeholder="e.g., YouTube Ops" />
          </div>
          <div>
            <label style={label}>Login ID</label>
            <input style={input} value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="e.g., yt_ops" />
          </div>
          <div>
            <label style={label}>Password</label>
            <input style={input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button disabled={isCreating} onClick={handleCreate} style={btnPrimary}>
            {isCreating ? 'Creating…' : 'Create Panel'}
          </button>
          <button disabled={isCreating} onClick={resetCreateForm} style={{ ...btnGrey, marginLeft: 8 }}>Clear</button>
        </div>
        <div style={{ color: '#9aa', fontSize: 12, marginTop: 8 }}>
          Email is auto-generated as loginId@panel.local (unique). Passwords are securely hashed on the server.
        </div>
      </div>

      {/* List */}
      <div style={box}>
        <h3 style={{ color: '#eee', marginTop: 0 }}>Existing Pannels</h3>
        {loading ? (
          <div style={{ color: '#aaa' }}>Loading…</div>
        ) : panels.length === 0 ? (
          <div style={{ color: '#aaa' }}>No sub-admin pannels yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Panel Name</th>
                <th style={th}>Login ID</th>
                <th style={th}>Email</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {panels.map((p) => {
                const e = editMap[p._id];
                const isEditing = !!e;
                return (
                  <tr key={p._id}>
                    <td style={cell}>
                      {!isEditing ? (
                        <span>{p.name || '—'}</span>
                      ) : (
                        <input style={input} value={e.name} onChange={ev => handleInfoChange(p._id, 'name', ev.target.value)} />
                      )}
                    </td>
                    <td style={cell}>
                      {!isEditing ? (
                        <span>{p.username || '—'}</span>
                      ) : (
                        <input style={input} value={e.username} onChange={ev => handleInfoChange(p._id, 'username', ev.target.value)} />
                      )}
                    </td>
                    <td style={cell}><span>{p.email || '—'}</span></td>
                    <td style={cell}>
                      {!isEditing ? (
                        <>
                          <button onClick={() => beginEdit(p)} style={btnWarn}>Edit</button>
                          <button onClick={() => togglePassword(p._id, true)} style={{ ...btnGrey, marginLeft: 8 }}>Change Password</button>
                          <button onClick={() => deletePanel(p._id, p.name || p.username)} style={{ ...btnDanger, marginLeft: 8 }}>Delete</button>
                        </>
                      ) : (
                        <>
                          <button disabled={e.savingInfo} onClick={() => saveInfo(p._id)} style={btnPrimary}>{e.savingInfo ? 'Saving…' : 'Save'}</button>
                          <button disabled={e.savingInfo} onClick={() => cancelEdit(p._id)} style={{ ...btnGrey, marginLeft: 8 }}>Cancel</button>
                        </>
                      )}

                      {/* Password editor */}
                      {e && e.passwordOpen && (
                        <div style={{ marginTop: 10, padding: 10, background: '#2a2a2a', borderRadius: 6 }}>
                          <div style={{ marginBottom: 8, color: '#ddd' }}>Set New Password for {p.username}</div>
                          <input
                            type="password"
                            placeholder="New password"
                            style={{ ...input, width: 260 }}
                            value={e.newPassword}
                            onChange={ev => handleInfoChange(p._id, 'newPassword', ev.target.value)}
                          />
                          <div style={{ marginTop: 8 }}>
                            <button disabled={e.savingPwd} onClick={() => savePassword(p._id)} style={btnPrimary}>{e.savingPwd ? 'Saving…' : 'Save Password'}</button>
                            <button disabled={e.savingPwd} onClick={() => togglePassword(p._id, false)} style={{ ...btnGrey, marginLeft: 8 }}>Close</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default PanelManager;

// Don’t change any other function or file.
