import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config'; // Import your API base URL

function SubGenreManager({ genreUpdateKey }) {
  const [subGenres, setSubGenres] = useState([]);
  const [genres, setGenres] = useState([]); // State to hold genres for the dropdown
  const [newSubGenreName, setNewSubGenreName] = useState('');
  const [newSubGenreDescription, setNewSubGenreDescription] = useState(''); // New state for description
  const [newSubGenreImage, setNewSubGenreImage] = useState(null); // New state for image file
  const [selectedGenreId, setSelectedGenreId] = useState(''); // State for parent genre selection
  const [editingSubGenre, setEditingSubGenre] = useState(null);
  const [editSubGenreName, setEditSubGenreName] = useState('');
  const [editSubGenreDescription, setEditSubGenreDescription] = useState(''); // New state for editing description
  const [editSubGenreImage, setEditSubGenreImage] = useState(null); // New state for editing image file
  const [editSelectedGenreId, setEditSelectedGenreId] = useState('');
  const [clearEditImage, setClearEditImage] = useState(false); // State to clear existing image
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // NEW: State for search term

  const adminToken = localStorage.getItem('adminToken');

  // Effect to fetch genres for the dropdown and sub-genres
  useEffect(() => {
    if (adminToken) {
      fetchGenresForDropdown(true);
      fetchSubGenres();
    } else {
      setError('You are not authenticated. Please log in.');
    }
  }, [adminToken, genreUpdateKey]); // Re-fetch when genreUpdateKey changes (from App.jsx)


  const fetchGenresForDropdown = async (noCache = false) => {
    setError('');
    try {
      const url = `${API_BASE_URL}/api/genres${noCache ? `?_ts=${Date.now()}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGenres(data);
    } catch (err) {
      console.error("Failed to fetch genres for sub-genre dropdown:", err);
      setError(`Failed to fetch genres for dropdown: ${err.message}`);
    }
  };

  const fetchSubGenres = async (noCache = false) => {
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE_URL}/api/subgenres${noCache ? `?_ts=${Date.now()}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSubGenres(data);
    } catch (err) {
      console.error("Failed to fetch sub-genres:", err);
      setError(`Failed to fetch sub-genres: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubGenre = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!newSubGenreName.trim() || !selectedGenreId) {
      setError('Sub-genre name and parent genre are required.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', newSubGenreName);
    formData.append('genre', selectedGenreId);
    formData.append('description', newSubGenreDescription);
    if (newSubGenreImage) {
      formData.append('subGenreImage', newSubGenreImage);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/subgenres`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Normalize the created sub-genre to ensure genre name is present
      let created = data && data._id ? data : null;
      if (created) {
        if (!created.genre || !created.genre.name) {
          const parent = genres.find(g => g._id === selectedGenreId);
          if (parent) {
            created = { ...created, genre: { _id: parent._id, name: parent.name } };
          }
        }
        // Insert new sub-genre at the TOP for visibility
        setSubGenres((prev) => [created, ...prev]);
      }

      setMessage('Sub-genre added successfully!');
      setNewSubGenreName('');
      setNewSubGenreDescription('');
      setNewSubGenreImage(null);
      setSelectedGenreId('');
      setSearchTerm(''); // Clear filter so the new item is guaranteed visible

      // Safely clear the file input visually
      const newSubGenreImageInput = document.getElementById('newSubGenreImageInput');
      if (newSubGenreImageInput) newSubGenreImageInput.value = '';

      // Revalidate with cache-buster to ensure full sync
      await fetchSubGenres(true);
    } catch (err) {
      console.error("Error adding sub-genre:", err);
      setError(`Error adding sub-genre: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (subGenre) => {
    setEditingSubGenre(subGenre._id);
    setEditSubGenreName(subGenre.name);
    setEditSubGenreDescription(subGenre.description || '');
    setEditSelectedGenreId(subGenre.genre._id); // Set the current parent genre
    setEditSubGenreImage(null);
    setClearEditImage(false);
    // Safely clear the file input visually
    const editSubGenreImageInput = document.getElementById('editSubGenreImageInput');
    if (editSubGenreImageInput) editSubGenreImageInput.value = '';
  };

  const handleUpdateSubGenre = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!editSubGenreName.trim() || !editSelectedGenreId) {
      setError('Sub-genre name and parent genre are required.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', editSubGenreName);
    formData.append('genre', editSelectedGenreId);
    formData.append('description', editSubGenreDescription);
    if (editSubGenreImage) {
      formData.append('subGenreImage', editSubGenreImage);
    }
    formData.append('clearImage', clearEditImage);

    try {
      const response = await fetch(`${API_BASE_URL}/api/subgenres/${editingSubGenre}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setMessage('Sub-genre updated successfully!');
      setEditingSubGenre(null);
      setEditSubGenreName('');
      setEditSubGenreDescription('');
      setEditSubGenreImage(null);
      setEditSelectedGenreId('');
      setClearEditImage(false);
      // Safely clear the file input visually
      const editSubGenreImageInput = document.getElementById('editSubGenreImageInput');
      if (editSubGenreImageInput) editSubGenreImageInput.value = '';

      fetchSubGenres(true);
    } catch (err) {
      console.error("Error updating sub-genre:", err);
      setError(`Error updating sub-genre: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubGenre = async (id) => {
    setMessage('Deleting sub-genre...');
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/subgenres/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });

      // If already deleted server-side, treat as success in UI.
      if (response.status === 404) {
        // Optimistically remove from current list
        setSubGenres((prev) => prev.filter((sg) => sg._id !== id));
        setMessage('Sub-genre already deleted (404). List updated.');
        // Revalidate to ensure full sync (cache-busted)
        await fetchSubGenres(true);
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Optimistically remove from current list (instant UI feedback)
      setSubGenres((prev) => prev.filter((sg) => sg._id !== id));

      setMessage(data.message || 'Sub-genre deleted successfully!');
      // Revalidate with cache-buster to avoid stale cache
      await fetchSubGenres(true);
    } catch (err) {
      console.error("Error deleting sub-genre:", err);
      setError(`Error deleting sub-genre: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Filtered sub-genres for display based on search term
  const filteredSubGenres = subGenres.filter(subGenre => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      subGenre.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (subGenre.description && subGenre.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (subGenre.genre && subGenre.genre.name.toLowerCase().includes(lowerCaseSearchTerm))
    );
  });

  const formInputStyle = {
    padding: '10px',
    margin: '5px 0',
    borderRadius: '5px',
    border: '1px solid #444',
    backgroundColor: '#333',
    color: '#eee',
    width: 'calc(100% - 22px)'
  };

  const selectStyle = {
    ...formInputStyle,
    width: '100%',
    appearance: 'none', // Remove default arrow
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '16px',
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
      <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Manage Sub-genres</h2>

      {loading && <p style={{ color: '#007bff' }}>Loading...</p>}
      {error && <p style={{ color: '#dc3545' }}>Error: {error}</p>}
      {message && <p style={{ color: '#28a745' }}>{message}</p>}

      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
        <h3 style={{ color: '#eee', marginBottom: '15px' }}>{editingSubGenre ? 'Edit Sub-genre' : 'Add New Sub-genre'}</h3>
        <form onSubmit={editingSubGenre ? handleUpdateSubGenre : handleAddSubGenre} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Sub-genre Name"
            value={editingSubGenre ? editSubGenreName : newSubGenreName}
            onChange={(e) => editingSubGenre ? setEditSubGenreName(e.target.value) : setNewSubGenreName(e.target.value)}
            style={formInputStyle}
            disabled={loading}
            required
          />
          <textarea
            placeholder="Sub-genre Description (Optional)"
            value={editingSubGenre ? editSubGenreDescription : newSubGenreDescription}
            onChange={(e) => editingSubGenre ? setEditSubGenreDescription(e.target.value) : setNewSubGenreDescription(e.target.value)}
            rows="3"
            style={{ ...formInputStyle, resize: 'vertical' }}
            disabled={loading}
          ></textarea>
          <select
            value={editingSubGenre ? editSelectedGenreId : selectedGenreId}
            onChange={(e) => editingSubGenre ? setEditSelectedGenreId(e.target.value) : setSelectedGenreId(e.target.value)}
            style={selectStyle}
            disabled={loading}
            required
          >
            <option value="">Select Parent Genre</option>
            {genres.map((genre) => (
              <option key={genre._id} value={genre._id}>
                {genre.name}
              </option>
            ))}
          </select>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Sub-genre Image (Optional):</label>
            <input
              type="file"
              id={editingSubGenre ? 'editSubGenreImageInput' : 'newSubGenreImageInput'}
              accept="image/*"
              onChange={(e) => editingSubGenre ? setEditSubGenreImage(e.target.files[0]) : setNewSubGenreImage(e.target.files[0])}
              style={{ ...formInputStyle, border: 'none', backgroundColor: 'transparent', padding: '0' }}
              disabled={loading}
            />
            {editingSubGenre && subGenres.find(sg => sg._id === editingSubGenre)?.imageUrl && !editSubGenreImage && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <img src={subGenres.find(sg => sg._id === editingSubGenre).imageUrl} alt="Current Sub-genre" style={imagePreviewStyle} />
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
            {editingSubGenre && editSubGenreImage && (
                <p style={{ color: '#bbb', fontSize: '0.9em', marginTop: '5px' }}>New image selected: {editSubGenreImage.name}</p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" style={primaryButtonStyle} disabled={loading}>
              {loading ? (editingSubGenre ? 'Updating...' : 'Adding...') : (editingSubGenre ? 'Update Sub-genre' : 'Add Sub-genre')}
            </button>
            {editingSubGenre && (
              <button type="button" onClick={() => { setEditingSubGenre(null); setNewSubGenreName(''); setNewSubGenreDescription(''); setNewSubGenreImage(null); setSelectedGenreId(''); setEditSelectedGenreId(''); setClearEditImage(false); const editSubGenreImageInput = document.getElementById('editSubGenreImageInput'); if (editSubGenreImageInput) editSubGenreImageInput.value = ''; }} style={cancelButtonStyle} disabled={loading}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <h3 style={{ color: '#eee', marginBottom: '15px' }}>Existing Sub-genres</h3>
      {/* NEW: Search Input for Sub-genres */}
      <input
        type="text"
        placeholder="Search sub-genres by name, description, or parent genre..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ ...formInputStyle, width: 'calc(100% - 22px)', marginBottom: '20px' }}
      />

      {filteredSubGenres.length === 0 && !loading && <p style={{ color: '#bbb' }}>No sub-genres found matching your search criteria. Add one above!</p>}
      {filteredSubGenres.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '10px', overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={{ ...tableHeaderStyle, width: '70px', textAlign: 'center' }}>S.No</th>
              <th style={tableHeaderStyle}>Image</th>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Parent Genre</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubGenres.map((subGenre, index) => ( // Changed from subGenres.map to filteredSubGenres.map
              <tr key={subGenre._id} style={tableRowStyle}>
                <td style={{ ...tableCellStyle, textAlign: 'center' }}>{index + 1}</td>
                <td style={tableCellStyle}>
                  {subGenre.imageUrl ? (
                    <img src={subGenre.imageUrl} alt={subGenre.name} style={imagePreviewStyle} />
                  ) : (
                    <div style={{ ...imagePreviewStyle, backgroundColor: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '0.8em' }}>No Image</div>
                  )}
                </td>
                <td style={tableCellStyle}>{subGenre.name}</td>
                <td style={tableCellStyle}>{subGenre.description || 'No description provided.'}</td>
                <td style={tableCellStyle}>{subGenre.genre ? subGenre.genre.name : 'N/A'}</td>
                <td style={tableCellStyle}>
                  <button onClick={() => handleEditClick(subGenre)} style={editButtonStyle} disabled={loading}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteSubGenre(subGenre._id)} style={deleteButtonStyle} disabled={loading}>
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

export default SubGenreManager;
