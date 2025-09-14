import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from '../config'; // Make sure this uses your named export: import { API_BASE_URL }

/**
 * SongManager Component
 *
 * Handles all logic for creating, reading, updating, and deleting songs.
 * This version adds full MOODS support:
 *  - Fetch moods from /api/moods
 *  - Multi-select moods in the form
 *  - Include moods in create/update payloads
 *  - Show purple mood tags in the songs table
 */
function SongManager({ genreUpdateKey }) {
    // --- STATE VARIABLES ---
    const [songs, setSongs] = useState([]);
    const [allGenres, setAllGenres] = useState([]);
    const [allSubGenres, setAllSubGenres] = useState([]);
    const [allInstruments, setAllInstruments] = useState([]);
    const [allMoods, setAllMoods] = useState([]); // NEW
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // A single state object for the form data
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        bpm: '',
        key: '',
        hasVocals: false,
        duration: '',
        collectionType: 'free',
        genres: [],
        subGenres: [],
        instruments: [],
        moods: [], // NEW
        imageFile: null,
        audioFile: null,
    });

    // State for the "edit" mode to show the original title
    const [editingSongOriginalTitle, setEditingSongOriginalTitle] = useState('');

    // States for search/filter inputs
    const [genreSearchTerm, setGenreSearchTerm] = useState('');
    const [subGenreSearchTerm, setSubGenreSearchTerm] = useState('');
    const [instrumentSearchTerm, setInstrumentSearchTerm] = useState('');
    const [moodSearchTerm, setMoodSearchTerm] = useState(''); // NEW
    const [songSearchTerm, setSongSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');

    // State for success/error notifications
    const [notification, setNotification] = useState({ message: '', type: '' });

    const adminToken = localStorage.getItem('adminToken');

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification({ message: '', type: '' });
        }, 4000);
    };

    // --- DATA FETCHING ---
    const fetchAllData = useCallback(async () => {
        if (!adminToken) {
            setError('Authentication token missing. Please log in.');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const nocache = `admin_nocache=${Date.now()}`;
            const [songsRes, genresRes, subGenresRes, instrumentsRes, moodsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/songs?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
                fetch(`${API_BASE_URL}/api/genres?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
                fetch(`${API_BASE_URL}/api/subgenres?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
                fetch(`${API_BASE_URL}/api/instruments?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
                fetch(`${API_BASE_URL}/api/moods?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }), // NEW
            ]);

            if (!songsRes.ok) throw new Error('Failed to fetch songs.');
            if (!genresRes.ok) throw new Error('Failed to fetch genres.');
            if (!subGenresRes.ok) throw new Error('Failed to fetch sub-genres.');
            if (!instrumentsRes.ok) throw new Error('Failed to fetch instruments.');
            if (!moodsRes.ok) throw new Error('Failed to fetch moods.'); // NEW

            const songsData = await songsRes.json();
            const genresData = await genresRes.json();
            const subGenresData = await subGenresRes.json();
            const instrumentsData = await instrumentsRes.json();
            const moodsData = await moodsRes.json(); // NEW

            setSongs(songsData);
            setAllGenres(genresData);
            setAllSubGenres(subGenresData);
            setAllInstruments(instrumentsData);
            setAllMoods(Array.isArray(moodsData) ? moodsData : []); // NEW
        } catch (err) {
            console.error("Failed to fetch initial data:", err);
            setError(err.message);
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [adminToken, genreUpdateKey]); // Rerun if genreUpdateKey changes

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // --- FORM HANDLING ---

    // Reset form to its initial state
    const resetForm = () => {
        setFormData({
            id: null,
            title: '',
            bpm: '',
            key: '',
            hasVocals: false,
            duration: '',
            collectionType: 'free',
            genres: [],
            subGenres: [],
            instruments: [],
            moods: [], // NEW
            imageFile: null,
            audioFile: null,
        });
        setEditingSongOriginalTitle('');
        // Clear file input fields visually
        const img = document.getElementById('newSongImageInput');
        const aud = document.getElementById('newSongAudioInput');
        if (img) img.value = '';
        if (aud) aud.value = '';
    };

    // Handle changes in form inputs
    const handleFormChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            const file = files[0];
            setFormData(prev => ({ ...prev, [name]: file }));
            if (name === 'audioFile' && file) {
                // Auto-calculate duration
                const audioUrl = URL.createObjectURL(file);
                const audio = new Audio(audioUrl);
                audio.onloadedmetadata = () => {
                    setFormData(prev => ({ ...prev, duration: Math.round(audio.duration) }));
                    URL.revokeObjectURL(audioUrl);
                };
            }
        } else if (type === 'checkbox') {
            // Handle single checkbox for 'hasVocals'
            if (name === 'hasVocals') {
                setFormData(prev => ({ ...prev, hasVocals: checked }));
            } else {
                // Handle multi-select checkboxes (genres, subGenres, instruments, moods)
                const id = value;
                const list = formData[name] || [];
                const newList = checked ? [...list, id] : list.filter(item => item !== id);
                setFormData(prev => ({ ...prev, [name]: newList }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Populate form when "Edit" is clicked
    const handleEditClick = (song) => {
        setEditingSongOriginalTitle(song.title);
        setFormData({
            id: song._id,
            title: song.title,
            bpm: song.bpm || '',
            key: song.key || '',
            hasVocals: song.hasVocals || false,
            duration: song.duration || '',
            collectionType: song.collectionType,
            genres: song.genres ? song.genres.map(g => g._id) : [],
            subGenres: song.subGenres ? song.subGenres.map(sg => sg._id) : [],
            instruments: (song.instruments ? song.instruments.map(i => i._id) : []),
            moods: (song.moods ? song.moods.map(m => m._id) : []), // NEW
            imageFile: null,
            audioFile: null,
        });
        window.scrollTo(0, 0);
    };

    const handleCancelEdit = () => {
        resetForm();
    };

    // --- SUBMISSION LOGIC (CREATE / UPDATE / DELETE) ---

    // Handles CREATING a new song
    const handleCreateSong = async () => {
        if (!formData.title.trim() || !formData.duration || formData.genres.length === 0 || !String(formData.bpm).trim() || !formData.key.trim()) {
            showNotification('Please fill in all required fields!', 'error');
            return;
        }
        if (!formData.imageFile || !formData.audioFile) {
            showNotification('Both image and audio files are required for new songs!', 'error');
            return;
        }

        setIsSubmitting(true);
        const payload = new FormData();
        payload.append('title', formData.title);
        payload.append('duration', formData.duration);
        payload.append('collectionType', formData.collectionType);
        payload.append('genres', JSON.stringify(formData.genres));
        payload.append('subGenres', JSON.stringify(formData.subGenres));
        payload.append('instruments', JSON.stringify(formData.instruments));
        payload.append('moods', JSON.stringify(formData.moods)); // NEW
        payload.append('bpm', formData.bpm);
        payload.append('key', formData.key);
        payload.append('hasVocals', formData.hasVocals);
        payload.append('image', formData.imageFile);
        payload.append('audio', formData.audioFile);

        try {
            const response = await fetch(`${API_BASE_URL}/api/songs`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }, // No 'Content-Type' for FormData
                body: payload,
            });
            const data = await response.json();
            if (!response.ok) {
                 throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            showNotification('Song uploaded successfully!', 'success');
            resetForm();
            await fetchAllData();
        } catch (err) {
            console.error("Failed to upload song:", err);
            showNotification(`Upload Error: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handles UPDATING an existing song
    const handleUpdateSong = async () => {
        if (!formData.title.trim() || !String(formData.bpm).trim() || !formData.key.trim()) {
            showNotification('Title, BPM, and Key cannot be empty!', 'error');
            return;
        }
        setIsSubmitting(true);

        const payload = {
            title: formData.title,
            bpm: formData.bpm,
            key: formData.key,
            hasVocals: formData.hasVocals,
            collectionType: formData.collectionType,
            genres: formData.genres,
            subGenres: formData.subGenres,
            instruments: formData.instruments,
            moods: formData.moods, // NEW
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/songs/${formData.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json', // Specify JSON content type
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            showNotification('Song updated successfully!', 'success');
            resetForm();
            await fetchAllData();
        } catch (err) {
            console.error("Failed to update song:", err);
            showNotification(`Update Error: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Main submission handler that decides whether to create or update
    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.id) {
            handleUpdateSong();
        } else {
            handleCreateSong();
        }
    };

    const handleDeleteSong = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/songs/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            showNotification('Song deleted successfully!', 'success');
            await fetchAllData();
        } catch (err) {
            console.error("Failed to delete song:", err);
            showNotification(`Error deleting song: ${err.message}`, 'error');
        }
    };


    // --- FILTERING AND SORTING LOGIC ---
    const filteredGenres = allGenres.filter(genre =>
        (genre?.name || '').toLowerCase().includes(genreSearchTerm.toLowerCase())
    );

    const filteredSubGenres = allSubGenres.filter(subGenre => {
        const matchesSearch = (subGenre?.name || '').toLowerCase().includes(subGenreSearchTerm.toLowerCase());
        if (formData.genres.length === 0) return matchesSearch;
        const matchesSelectedGenre = subGenre.genre && formData.genres.includes(subGenre.genre._id);
        return matchesSearch && matchesSelectedGenre;
    });

    const filteredInstruments = allInstruments.filter(inst =>
        (inst?.name || '').toLowerCase().includes(instrumentSearchTerm.toLowerCase())
    );

    const filteredMoods = allMoods.filter(mood =>
        (mood?.name || '').toLowerCase().includes(moodSearchTerm.toLowerCase())
    );

    const displayedSongs = songs
        .filter(song =>
            (song?.title || '').toLowerCase().includes(songSearchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'asc') return new Date(a.createdAt) - new Date(b.createdAt);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

    // --- RENDER LOGIC (Styles are kept from your original code) ---
    const buttonStyle = { padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '14px', margin: '0 5px', transition: 'background-color 0.2s ease', opacity: isSubmitting ? 0.7 : 1 };
    const editButtonStyle = { ...buttonStyle, backgroundColor: '#ffc107', color: '#333' };
    const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white' };
    const tableHeaderStyle = { backgroundColor: '#333', padding: '10px', textAlign: 'left', color: '#fff' };
    const tableCellStyle = { padding: '10px', verticalAlign: 'top', color: '#ddd' };
    const genreSubGenreTagStyle = { display: 'inline-flex', alignItems: 'center', backgroundColor: '#555', padding: '5px 10px', borderRadius: '5px', fontSize: '0.85em', color: '#eee', marginRight: '8px', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' };
    const instrumentTagStyle = { ...genreSubGenreTagStyle, backgroundColor: '#21c45d', color: '#0e1a12' };
    const moodTagStyle = { ...genreSubGenreTagStyle, backgroundColor: '#8e44ad', color: '#ffffff' }; // NEW purple

    if (loading) return <div style={{ padding: '20px', color: '#eee' }}>Loading song data...</div>;
    if (error) return <div style={{ padding: '20px', color: '#dc3545' }}>Error: {error}</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Manage Songs</h2>
            {notification.message && (<div style={{ padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>{notification.message}</div>)}

            {/* --- FORM SECTION --- */}
            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
                <h3 style={{ color: '#eee', marginBottom: '15px' }}>{formData.id ? `Edit Song: ${editingSongOriginalTitle}` : 'Upload New Song:'}</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                        {/* Title, BPM, Key Inputs */}
                        <input type="text" name="title" placeholder="Enter song title" value={formData.title} onChange={handleFormChange} style={{ padding: '8px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required />
                        <input type="number" name="bpm" placeholder="e.g., 120" value={formData.bpm} onChange={handleFormChange} style={{ padding: '8px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required />
                        <input type="text" name="key" placeholder="e.g., C Major" value={formData.key} onChange={handleFormChange} style={{ padding: '8px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required />
                    </div>
                    
                    {/* Vocals Checkbox */}
                    <label><input type="checkbox" name="hasVocals" checked={formData.hasVocals} onChange={handleFormChange} /> This song contains vocals</label>

                    {/* Genres and Sub-Genres Selection */}
                    <div>
                        <label>Genres (Select multiple):</label>
                        <input type="text" placeholder="Search genres..." value={genreSearchTerm} onChange={(e) => setGenreSearchTerm(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', marginBottom: '10px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '8px', backgroundColor: '#555', border: '1px solid #666', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                            {filteredGenres.map(genre => (<label key={genre._id}><input type="checkbox" name="genres" value={genre._id} checked={formData.genres.includes(genre._id)} onChange={handleFormChange} /> {genre.name}</label>))}
                        </div>
                    </div>
                    <div>
                        <label>Sub-genres (Select multiple):</label>
                        <input type="text" placeholder="Search sub-genres..." value={subGenreSearchTerm} onChange={(e) => setSubGenreSearchTerm(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', marginBottom: '10px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '8px', backgroundColor: '#555', border: '1px solid #666', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                            {filteredSubGenres.map(subGenre => (<label key={subGenre._id}><input type="checkbox" name="subGenres" value={subGenre._id} checked={formData.subGenres.includes(subGenre._id)} onChange={handleFormChange} /> {subGenre.name}</label>))}
                        </div>
                    </div>

                    {/* Instruments */}
                    <div>
                        <label>Instruments (Select multiple):</label>
                        <input
                          type="text"
                          placeholder="Search instrument..."
                          value={instrumentSearchTerm}
                          onChange={(e) => setInstrumentSearchTerm(e.target.value)}
                          style={{ padding: '8px', width: 'calc(100% - 16px)', marginBottom: '10px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '8px', backgroundColor: '#555', border: '1px solid #666', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                          {filteredInstruments.map(inst => (
                            <label key={inst._id}>
                              <input
                                type="checkbox"
                                name="instruments"
                                value={inst._id}
                                checked={formData.instruments.includes(inst._id)}
                                onChange={handleFormChange}
                              /> {inst.name}
                            </label>
                          ))}
                        </div>
                    </div>

                    {/* Moods (NEW) */}
                    <div>
                        <label>Moods (Select multiple):</label>
                        <input
                          type="text"
                          placeholder="Search mood..."
                          value={moodSearchTerm}
                          onChange={(e) => setMoodSearchTerm(e.target.value)}
                          style={{ padding: '8px', width: 'calc(100% - 16px)', marginBottom: '10px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '8px', backgroundColor: '#555', border: '1px solid #666', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                          {filteredMoods.map(m => (
                            <label key={m._id}>
                              <input
                                type="checkbox"
                                name="moods"
                                value={m._id}
                                checked={formData.moods.includes(m._id)}
                                onChange={handleFormChange}
                              /> {m.name}
                            </label>
                          ))}
                        </div>
                    </div>

                    {/* Collection Type Radio */}
                    <div>
                        <label><input type="radio" name="collectionType" value="free" checked={formData.collectionType === 'free'} onChange={handleFormChange} /> Free</label>
                        <label><input type="radio" name="collectionType" value="paid" checked={formData.collectionType === 'paid'} onChange={handleFormChange} /> Paid</label>
                    </div>

                    {/* File Inputs */}
                    <div>
                        <label htmlFor="newSongImageInput">Cover Image {formData.id && '(leave blank to keep existing)'}:</label>
                        <input type="file" id="newSongImageInput" name="imageFile" accept="image/*" onChange={handleFormChange} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required={!formData.id} />
                    </div>
                    <div style={{ color: '#bbb', fontStyle: 'italic', fontSize: '0.9em' }}>
                        Note: When updating a song, you cannot change the audio or image files. To do so, please delete and re-upload the song.
                    </div>
                    <div>
                        <label htmlFor="newSongAudioInput">Audio File {formData.id && '(leave blank to keep existing)'}:</label>
                        <input type="file" id="newSongAudioInput" name="audioFile" accept="audio/*" onChange={handleFormChange} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required={!formData.id} />
                        {formData.duration && <div>Detected Duration: {formData.duration} seconds</div>}
                    </div>

                    {/* Submit and Cancel Buttons */}
                    <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', backgroundColor: isSubmitting ? '#888' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '15px' }}>
                        {isSubmitting ? (formData.id ? 'Updating...' : 'Uploading...') : (formData.id ? 'Update Song' : 'Upload Song')}
                    </button>
                    {formData.id && (<button type="button" onClick={handleCancelEdit} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>Cancel Edit</button>)}
                </form>
            </div>

            {/* --- EXISTING SONGS TABLE --- */}
            <h3>Existing Songs:</h3>
             <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="text" placeholder="Search by Title..." value={songSearchTerm} onChange={(e) => setSongSearchTerm(e.target.value)} style={{ padding: '8px', width: '250px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} />
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '8px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }}>
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={tableHeaderStyle}>Cover</th>
                        <th style={tableHeaderStyle}>Details</th>
                        <th style={tableHeaderStyle}>Metadata</th>
                        <th style={tableHeaderStyle}>Genres</th>
                        <th style={tableHeaderStyle}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedSongs.map(song => (
                        <tr key={song._id} style={{ borderBottom: '1px solid #444' }}>
                            <td style={tableCellStyle}><img src={song.imageUrl} alt={song.title} style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/60x60/000/FFF?text=N/A'; }} /></td>
                            <td style={tableCellStyle}>
                                <div style={{ fontWeight: 'bold', color: 'white' }}>{song.title}</div>
                                <div>Duration: {song.duration}s</div>
                                <div>Collection: {song.collectionType}</div>
                            </td>
                            <td style={tableCellStyle}>
                                <div><strong>BPM:</strong> {song.bpm || 'N/A'}</div>
                                <div><strong>Key:</strong> {song.key || 'N/A'}</div>
                                <div><strong>Vocals:</strong> {song.hasVocals ? 'Yes' : 'No'}</div>
                            </td>
                            <td style={tableCellStyle}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {song.genres.map(g => <span key={g._id} style={{ ...genreSubGenreTagStyle, backgroundColor: '#e74c3c' }}>{g.name}</span>)}
                                    {song.subGenres.map(sg => <span key={sg._id} style={{ ...genreSubGenreTagStyle, backgroundColor: '#3498db' }}>{sg.name}</span>)}
                                    {song.instruments && song.instruments.map(inst => (
                                        <span key={inst._id} style={instrumentTagStyle}>{inst.name}</span>
                                    ))}
                                    {song.moods && song.moods.map(m => ( // NEW
                                        <span key={m._id} style={moodTagStyle}>{m.name}</span>
                                    ))}
                                </div>
                            </td>
                            <td style={tableCellStyle}>
                                <button onClick={() => handleEditClick(song)} style={editButtonStyle}>Edit</button>
                                <button onClick={() => handleDeleteSong(song._id, song.title)} style={deleteButtonStyle}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default SongManager;
