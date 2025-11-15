import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config'; // Import your API base URL

function GenreManager({ onGenreAdded }) {
  const [genres, setGenres] = useState([]);
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreDescription, setNewGenreDescription] = useState(''); // New state for description
  const [newGenreImage, setNewGenreImage] = useState(null); // New state for image file
  const [editingGenre, setEditingGenre] = useState(null);
  const [editGenreName, setEditGenreName] = useState('');
  const [editGenreDescription, setEditGenreDescription] = useState(''); // New state for editing description
  const [editGenreImage, setEditGenreImage] = useState(null); // New state for editing image file
  const [clearEditImage, setClearEditImage] = useState(false); // State to clear existing image
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // NEW: State for search term

  const adminToken = localStorage.getItem('adminToken');

  useEffect(() => {
    if (adminToken) {
      fetchGenres();
    } else {
      setError('You are not authenticated. Please log in.');
    }
  }, [adminToken]);

  const fetchGenres = async (noCache = false) => {
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE_URL}/api/genres${noCache ? `?_ts=${Date.now()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGenres(data);
    } catch (err) {
      console.error("Failed to fetch genres:", err);
      setError(`Failed to fetch genres: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGenre = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!newGenreName.trim()) {
      setError('Genre name cannot be empty.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', newGenreName);
    formData.append('description', newGenreDescription); // Append description
    if (newGenreImage) {
      formData.append('genreImage', newGenreImage); // Append image file
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/genres`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          // 'Content-Type': 'multipart/form-data' is NOT needed with FormData, browser sets it
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setMessage('Genre added successfully!');
      setNewGenreName('');
      setNewGenreDescription('');
      setNewGenreImage(null); // Clear image input
      // Safely clear the file input visually
      const newImageInput = document.getElementById('newGenreImageInput');
      if (newImageInput) newImageInput.value = '';

      fetchGenres(true); // Refresh with cache-busting
      onGenreAdded(); // Notify parent for potential sub-genre/song manager refresh
    } catch (err) {
      console.error("Error adding genre:", err);
      setError(`Error adding genre: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (genre) => {
    setEditingGenre(genre._id);
    setEditGenreName(genre.name);
    setEditGenreDescription(genre.description || ''); // Set current description
    setEditGenreImage(null); // Clear file input for edit
    setClearEditImage(false); // Reset clear image checkbox
    // Safely clear the file input visually
    const editImageInput = document.getElementById('editGenreImageInput');
    if (editImageInput) editImageInput.value = '';
  };

  const handleUpdateGenre = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!editGenreName.trim()) {
      setError('Genre name cannot be empty.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', editGenreName);
    formData.append('description', editGenreDescription); // Append description
    if (editGenreImage) {
      formData.append('genreImage', editGenreImage); // Append new image file
    }
    formData.append('clearImage', clearEditImage); // Send clear image flag

    try {
      const response = await fetch(`${API_BASE_URL}/api/genres/${editingGenre}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setMessage('Genre updated successfully!');
      setEditingGenre(null);
      setEditGenreName('');
      setEditGenreDescription('');
      setEditGenreImage(null);
      setClearEditImage(false);
      // Safely clear the file input visually
      const editImageInput = document.getElementById('editGenreImageInput');
      if (editImageInput) editImageInput.value = '';

      fetchGenres(true);
      onGenreAdded();
    } catch (err) {
      console.error("Error updating genre:", err);
      setError(`Error updating genre: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGenre = async (id) => {
    setMessage('Deleting genre...');
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/genres/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      // If already deleted server-side, treat as success in UI.
      if (response.status === 404) {
        // Optimistically remove from current list
        setGenres((prev) => prev.filter((g) => g._id !== id));
        setMessage('Genre already deleted (404). List updated.');
        // Revalidate to ensure full sync with server (cache-busted)
        await fetchGenres(true);
        onGenreAdded?.();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Optimistically remove from current list (instant UI feedback)
      setGenres((prev) => prev.filter((g) => g._id !== id));

      setMessage(data.message || 'Genre deleted successfully!');
      // Revalidate with cache-buster to avoid any stale caches
      await fetchGenres(true);
      onGenreAdded?.();
    } catch (err) {
      console.error("Error deleting genre:", err);
      setError(`Error deleting genre: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Filtered genres for display based on search term
  const filteredGenres = genres.filter(genre => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      genre.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (genre.description && genre.description.toLowerCase().includes(lowerCaseSearchTerm))
    );
  });

  const formInputStyle = {
    padding: '10px',
    margin: '5px 0',
    borderRadius: '5px',
    border: '1px solid #444',
    backgroundColor: '#333',
    color: '#eee',
    width: 'calc(100% - 22px)' // Account for padding and border
  };

  const buttonStyle = {
    padding: '10px 15px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    margin: '0 5px',
    transition: 'background-color 0.2s ease',
    opacity: loading ? 0.7 : 1
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: 'white',
  };

  const editButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ffc107',
    color: '#333',
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    color: 'white',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
    color: 'white',
  };

  const tableHeaderStyle = {
    backgroundColor: '#333',
    padding: '10px',
    textAlign: 'left',
    color: '#fff'
  };

  const tableRowStyle = {
    backgroundColor: '#2a2a2a',
    borderBottom: '1px solid #444'
  };

  const tableCellStyle = {
    padding: '10px',
    verticalAlign: 'top'
  };

  const imagePreviewStyle = {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '5px',
    marginRight: '10px'
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Manage Genres</h2>

      {loading && <p style={{ color: '#007bff' }}>Loading...</p>}
      {error && <p style={{ color: '#dc3545' }}>Error: {error}</p>}
      {message && <p style={{ color: '#28a745' }}>{message}</p>}

      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
        <h3 style={{ color: '#eee', marginBottom: '15px' }}>{editingGenre ? 'Edit Genre' : 'Add New Genre'}</h3>
        <form onSubmit={editingGenre ? handleUpdateGenre : handleAddGenre} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Genre Name"
            value={editingGenre ? editGenreName : newGenreName}
            onChange={(e) => editingGenre ? setEditGenreName(e.target.value) : setNewGenreName(e.target.value)}
            style={formInputStyle}
            disabled={loading}
            required
          />
          <textarea
            placeholder="Genre Description (Optional)"
            value={editingGenre ? editGenreDescription : newGenreDescription}
            onChange={(e) => editingGenre ? setEditGenreDescription(e.target.value) : setNewGenreDescription(e.target.value)}
            rows="3"
            style={{ ...formInputStyle, resize: 'vertical' }}
            disabled={loading}
          ></textarea>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Genre Image (Optional):</label>
            <input
              type="file"
              id={editingGenre ? 'editGenreImageInput' : 'newGenreImageInput'} // Unique IDs for inputs
              accept="image/*"
              onChange={(e) => editingGenre ? setEditGenreImage(e.target.files[0]) : setNewGenreImage(e.target.files[0])}
              style={{ ...formInputStyle, border: 'none', backgroundColor: 'transparent', padding: '0' }}
              disabled={loading}
            />
            {editingGenre && genres.find(g => g._id === editingGenre)?.imageUrl && !editGenreImage && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <img src={genres.find(g => g._id === editingGenre).imageUrl} alt="Current Genre" style={imagePreviewStyle} />
                <label style={{ color: '#bbb', marginLeft: '10px' }}>
                  <input
                    type="checkbox"
                    checked={clearEditImage}
                    onChange={(e) => setClearEditImage(e.target.checked)}
                    disabled={loading}
                  /> Clear existing image
                </label>
              </div>
            )}
            {editingGenre && editGenreImage && (
                <p style={{ color: '#bbb', fontSize: '0.9em', marginTop: '5px' }}>New image selected: {editGenreImage.name}</p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" style={primaryButtonStyle} disabled={loading}>
              {loading ? (editingGenre ? 'Updating...' : 'Adding...') : (editingGenre ? 'Update Genre' : 'Add Genre')}
            </button>
            {editingGenre && (
              <button type="button" onClick={() => { setEditingGenre(null); setNewGenreName(''); setNewGenreDescription(''); setNewGenreImage(null); setClearEditImage(false); const editImageInput = document.getElementById('editGenreImageInput'); if (editImageInput) editImageInput.value = ''; }} style={cancelButtonStyle} disabled={loading}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <h3 style={{ color: '#eee', marginBottom: '15px' }}>Existing Genres</h3>
      {/* NEW: Search Input for Genres */}
      <input
        type="text"
        placeholder="Search genres by name or description..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ ...formInputStyle, width: 'calc(100% - 22px)', marginBottom: '20px' }}
      />

      {filteredGenres.length === 0 && !loading && <p style={{ color: '#bbb' }}>No genres found matching your search criteria. Add one above!</p>}
      {filteredGenres.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '10px', overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={{ ...tableHeaderStyle, width: '70px', textAlign: 'center' }}>S.No</th>
              <th style={tableHeaderStyle}>Image</th>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGenres.map((genre, index) => ( // Changed from genres.map to filteredGenres.map
              <tr key={genre._id} style={tableRowStyle}>
                <td style={{ ...tableCellStyle, textAlign: 'center' }}>{index + 1}</td>
                <td style={tableCellStyle}>
                  {genre.imageUrl ? (
                    <img src={genre.imageUrl} alt={genre.name} style={imagePreviewStyle} />
                  ) : (
                    <div style={{ ...imagePreviewStyle, backgroundColor: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '0.8em' }}>No Image</div>
                  )}
                </td>
                <td style={tableCellStyle}>{genre.name}</td>
                <td style={tableCellStyle}>{genre.description || 'No description provided.'}</td>
                <td style={tableCellStyle}>
                  <button onClick={() => handleEditClick(genre)} style={editButtonStyle} disabled={loading}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteGenre(genre._id)} style={deleteButtonStyle} disabled={loading}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default GenreManager;
