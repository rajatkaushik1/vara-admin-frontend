import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function InstrumentManager() {
  // Data
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // New instrument form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [clearEditImage, setClearEditImage] = useState(false);

  // UI helpers
  const [searchTerm, setSearchTerm] = useState('');

  const adminToken = (typeof window !== 'undefined') ? localStorage.getItem('adminToken') : null;

  const setNotice = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setMessage('');
    } else {
      setMessage(msg);
      setError('');
    }
  };

  const fetchInstruments = async () => {
    setLoading(true);
    setError(''); // keep any prior success message visible
    try {
      const res = await fetch(`${API_BASE_URL}/api/instruments`, {
        headers: {
          'Authorization': adminToken ? `Bearer ${adminToken}` : undefined,
        }
      });
      if (!res.ok) {
        // Graceful message when backend is not ready yet
        if (res.status === 404) {
          setNotice('The Instruments API is not enabled yet. We will add it in the next step.', true);
          setInstruments([]);
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch instruments (status ${res.status})`);
      }
      const data = await res.json();
      setInstruments(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotice(`Could not load instruments: ${err.message}`, true);
      setInstruments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) {
      setNotice('You are not authenticated. Please log in.', true);
      return;
    }
    fetchInstruments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  // Create
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      return setNotice('Instrument name is required.', true);
    }
    const form = new FormData();
    form.append('name', newName.trim());
    form.append('description', newDescription || '');
    if (newImage) form.append('instrumentImage', newImage);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/instruments`, {
        method: 'POST',
        headers: { 'Authorization': adminToken ? `Bearer ${adminToken}` : undefined },
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || `Instrument "${(newName || '').trim()}" already exists.`);
        }
        throw new Error(data.error || `Failed to add instrument (status ${res.status}).`);
      }
      setNotice('Instrument added successfully!');
      setNewName(''); setNewDescription(''); setNewImage(null);
      const input = document.getElementById('newInstrumentImageInput');
      if (input) input.value = '';
      await fetchInstruments(); // keep success message visible
    } catch (err) {
      setNotice(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Edit helpers
  const startEdit = (inst) => {
    setEditingId(inst._id);
    setEditName(inst.name || '');
    setEditDescription(inst.description || '');
    setEditImage(null);
    setClearEditImage(false);
    const input = document.getElementById('editInstrumentImageInput');
    if (input) input.value = '';
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditImage(null);
    setClearEditImage(false);
    const input = document.getElementById('editInstrumentImageInput');
    if (input) input.value = '';
  };

  // Update
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    if (!editName.trim()) {
      return setNotice('Instrument name cannot be empty.', true);
    }
    const form = new FormData();
    form.append('name', editName.trim());
    form.append('description', editDescription || '');
    if (editImage) form.append('instrumentImage', editImage);
    form.append('clearImage', clearEditImage ? 'true' : 'false');

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/instruments/${editingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': adminToken ? `Bearer ${adminToken}` : undefined
        },
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || `Another instrument with the name "${(editName || '').trim()}" already exists.`);
        }
        throw new Error(data.error || `Failed to update instrument (status ${res.status}).`);
      }
      setNotice('Instrument updated successfully!');
      cancelEdit();
      fetchInstruments();
    } catch (err) {
      setNotice(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this instrument?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/instruments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': adminToken ? `Bearer ${adminToken}` : undefined }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete instrument.');
      setNotice(data.message || 'Instrument deleted successfully.');
      fetchInstruments();
    } catch (err) {
      setNotice(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filtered = instruments.filter(inst => {
    const q = (searchTerm || '').toLowerCase();
    return (
      (inst.name || '').toLowerCase().includes(q) ||
      (inst.description || '').toLowerCase().includes(q)
    );
  });

  // Shared inline styles (match your Genre/SubGenre managers)
  const formInputStyle = { padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#333', color: '#eee', width: 'calc(100% - 22px)' };
  const buttonStyle = { padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '14px', margin: '0 5px', transition: 'background-color 0.2s ease', opacity: loading ? 0.7 : 1 };
  const primaryButtonStyle = { ...buttonStyle, backgroundColor: '#007bff', color: 'white' };
  const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d', color: 'white' };
  const editButtonStyle = { ...buttonStyle, backgroundColor: '#ffc107', color: '#333' };
  const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white' };
  const tableHeaderStyle = { backgroundColor: '#333', padding: '10px', textAlign: 'left', color: '#fff' };
  const tableRowStyle = { backgroundColor: '#2a2a2a', borderBottom: '1px solid #444' };
  const tableCellStyle = { padding: '10px', verticalAlign: 'top' };
  const imagePreviewStyle = { width: '100px', height: '100px', objectFit: 'cover', borderRadius: '5px', marginRight: '10px' };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Manage Instruments</h2>

      {loading && <p style={{ color: '#007bff' }}>Loading...</p>}
      {error && <p style={{ color: '#dc3545' }}>Error: {error}</p>}
      {message && <p style={{ color: '#28a745' }}>{message}</p>}

      {/* Add / Edit Form */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
        <h3 style={{ color: '#eee', marginBottom: '15px' }}>{editingId ? 'Edit Instrument' : 'Add New Instrument'}</h3>
        <form onSubmit={editingId ? handleUpdate : handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Instrument Name"
            value={editingId ? editName : newName}
            onChange={(e) => editingId ? setEditName(e.target.value) : setNewName(e.target.value)}
            style={formInputStyle}
            disabled={loading}
            required
          />
          <textarea
            placeholder="Instrument Description (Optional)"
            rows="3"
            value={editingId ? editDescription : newDescription}
            onChange={(e) => editingId ? setEditDescription(e.target.value) : setNewDescription(e.target.value)}
            style={{ ...formInputStyle, resize: 'vertical' }}
            disabled={loading}
          />
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Instrument Image (Optional):</label>
            <input
              type="file"
              id={editingId ? 'editInstrumentImageInput' : 'newInstrumentImageInput'}
              accept="image/*"
              onChange={(e) => editingId ? setEditImage(e.target.files[0]) : setNewImage(e.target.files[0])}
              style={{ ...formInputStyle, border: 'none', backgroundColor: 'transparent', padding: '0' }}
              disabled={loading}
            />
            {editingId && instruments.find(x => x._id === editingId)?.imageUrl && !editImage && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <img src={instruments.find(x => x._id === editingId).imageUrl} alt="Current" style={imagePreviewStyle} />
                <label style={{ color: '#bbb', marginLeft: '10px' }}>
                  <input type="checkbox" checked={clearEditImage} onChange={(e) => setClearEditImage(e.target.checked)} disabled={loading} /> Clear existing image
                </label>
              </div>
            )}
            {editingId && editImage && (
              <p style={{ color: '#bbb', fontSize: '0.9em', marginTop: '5px' }}>New image selected: {editImage.name}</p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" style={primaryButtonStyle} disabled={loading}>
              {loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Instrument' : 'Add Instrument')}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} style={cancelButtonStyle} disabled={loading}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* Search */}
      <h3 style={{ color: '#eee', marginBottom: '15px' }}>Existing Instruments</h3>
      <input
        type="text"
        placeholder="Search instruments by name or description..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ ...formInputStyle, width: 'calc(100% - 22px)', marginBottom: '20px' }}
      />

      {/* Table */}
      {filtered.length === 0 && !loading && <p style={{ color: '#bbb' }}>No instruments found. If backend is not ready, this will be empty for now.</p>}
      {filtered.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '10px', overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Image</th>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inst => (
              <tr key={inst._id} style={tableRowStyle}>
                <td style={tableCellStyle}>
                  {inst.imageUrl ? (
                    <img src={inst.imageUrl} alt={inst.name} style={imagePreviewStyle} />
                  ) : (
                    <div style={{ ...imagePreviewStyle, backgroundColor: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '0.8em' }}>No Image</div>
                  )}
                </td>
                <td style={tableCellStyle}>{inst.name}</td>
                <td style={tableCellStyle}>{inst.description || '—'}</td>
                <td style={tableCellStyle}>
                  <button onClick={() => startEdit(inst)} style={editButtonStyle} disabled={loading}>Edit</button>
                  <button onClick={() => handleDelete(inst._id)} style={deleteButtonStyle} disabled={loading}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default InstrumentManager;
