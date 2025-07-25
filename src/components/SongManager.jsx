import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';

function SongManager({ genreUpdateKey }) {
    // --- STATE VARIABLES ---
    const [songs, setSongs] = useState([]);
    const [allGenres, setAllGenres] = useState([]);
    const [allSubGenres, setAllSubGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // States for song upload form inputs
    const [newSongTitle, setNewSongTitle] = useState('');
    const [selectedGenreIds, setSelectedGenreIds] = useState([]);
    const [selectedSubGenreIds, setSelectedSubGenreIds] = useState([]);
    const [newSongCollectionType, setNewSongCollectionType] = useState('free');
    const [newSongImage, setNewSongImage] = useState(null);
    const [newSongAudio, setNewSongAudio] = useState(null);
    const [uploading, setUploading] = useState(false);

    // --- NEW STATE VARIABLES FOR BPM, KEY, VOCALS ---
    const [newSongBPM, setNewSongBPM] = useState('');
    const [newSongKey, setNewSongKey] = useState('');
    const [newSongHasVocals, setNewSongHasVocals] = useState(false);
    const [newSongDuration, setNewSongDuration] = useState('');


    // States for search/filter inputs
    const [genreSearchTerm, setGenreSearchTerm] = useState('');
    const [subGenreSearchTerm, setSubGenreSearchTerm] = useState('');
    const [songSearchTerm, setSongSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');

    // States for editing a song
    const [editingSongId, setEditingSongId] = useState(null);
    const [editingSongOriginalTitle, setEditingSongOriginalTitle] = useState('');
    const [clearEditImage, setClearEditImage] = useState(false);
    const [clearEditAudio, setClearEditAudio] = useState(false);

    // State for success notifications
    const [notification, setNotification] = useState({ message: '', type: '' });

    const adminToken = localStorage.getItem('adminToken');

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification({ message: '', type: '' });
        }, 4000);
    };

    // --- API FETCHING FUNCTIONS (Unchanged from your code) ---
    const fetchSongs = useCallback(async () => {
        if (!adminToken) {
            setError('Authentication token missing. Please log in.');
            setLoading(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/songs`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setSongs(data);
        } catch (err) {
            console.error("Failed to fetch songs:", err);
            setError(`Failed to fetch songs: ${err.message}`);
            showNotification(`Error fetching songs: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [adminToken]);

    const fetchAllGenres = useCallback(async () => {
        if (!adminToken) {
            setError('Authentication token missing. Please log in.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/genres`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setAllGenres(data);
        } catch (err) {
            console.error("Failed to fetch genres for song manager:", err);
            setError(`Failed to fetch genres: ${err.message}`);
            showNotification(`Error fetching genres: ${err.message}`, 'error');
        }
    }, [adminToken]);

    const fetchAllSubGenres = useCallback(async () => {
        if (!adminToken) {
            setError('Authentication token missing. Please log in.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/subgenres`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setAllSubGenres(data);
        } catch (err) {
            console.error("Failed to fetch sub-genres for song manager:", err);
            setError(`Failed to fetch sub-genres: ${err.message}`);
            showNotification(`Error fetching sub-genres: ${err.message}`, 'error');
        }
    }, [adminToken]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);
            if (!adminToken) {
                setLoading(false);
                return;
            }
            try {
                await Promise.all([fetchSongs(), fetchAllGenres(), fetchAllSubGenres()]);
            } catch (err) {
                // Errors are handled by individual fetch functions
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [genreUpdateKey, adminToken, fetchSongs, fetchAllGenres, fetchAllSubGenres]);

    // --- Filtering and Sorting Logic (Unchanged from your code) ---
    const filteredGenres = allGenres.filter(genre =>
        genre.name.toLowerCase().includes(genreSearchTerm.toLowerCase())
    );

    const filteredSubGenres = allSubGenres.filter(subGenre => {
        const matchesSearch = subGenre.name.toLowerCase().includes(subGenreSearchTerm.toLowerCase());
        if (selectedGenreIds.length === 0) return matchesSearch;
        const matchesSelectedGenre = subGenre.genre && selectedGenreIds.includes(subGenre.genre._id);
        return matchesSearch && matchesSelectedGenre;
    });

    const displayedSongs = songs
        .filter(song =>
            song.title.toLowerCase().includes(songSearchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'asc') return a._id.localeCompare(b._id);
            return b._id.localeCompare(a._id);
        });

    // --- CORRECTED Event Handler for Song Upload/Update ---
    const handleAddSong = async (e) => {
        e.preventDefault();

        if (!adminToken) {
            showNotification('Authentication token missing. Please log in.', 'error');
            return;
        }

        if (!newSongTitle.trim() || !newSongDuration.trim() || selectedGenreIds.length === 0 || selectedSubGenreIds.length === 0 || !newSongBPM.trim() || !newSongKey.trim()) {
            showNotification('Please fill in all required fields (Title, Duration, Genres, Sub-genres, BPM, Key)!', 'error');
            return;
        }

        if (!editingSongId && (!newSongImage || !newSongAudio)) {
            showNotification('Both image and audio files are required for new songs!', 'error');
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('title', newSongTitle);
        formData.append('duration', newSongDuration);
        formData.append('collectionType', newSongCollectionType);
        
        // --- FIX: Send arrays as JSON strings, as expected by the backend ---
        formData.append('genres', JSON.stringify(selectedGenreIds));
        formData.append('subGenres', JSON.stringify(selectedSubGenreIds));
        
        // --- ADD NEW FIELDS ---
        formData.append('bpm', newSongBPM);
        formData.append('key', newSongKey);
        formData.append('hasVocals', newSongHasVocals);

        // --- FIX: Use 'image' and 'audio' as field names to match backend ---
        if (newSongImage) formData.append('image', newSongImage);
        if (newSongAudio) formData.append('audio', newSongAudio);

        try {
            const method = editingSongId ? 'PUT' : 'POST';
            const url = editingSongId ? `${API_BASE_URL}/api/songs/${editingSongId}` : `${API_BASE_URL}/api/songs`;

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${adminToken}` },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMsg = data.message || (data.errors && data.errors[0].msg) || `HTTP error! status: ${response.status}`;
                throw new Error(errorMsg);
            }

            handleCancelEdit(); // Reset form
            await fetchSongs();
            showNotification(`Song ${editingSongId ? 'updated' : 'uploaded'} successfully!`, 'success');

        } catch (err) {
            console.error(`Failed to ${editingSongId ? 'update' : 'upload'} song:`, err);
            setError(`Error ${editingSongId ? 'updating' : 'uploading'} song: ${err.message}`);
            showNotification(`Error: ${err.message}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    // --- CORRECTED Edit and Cancel Handlers ---
    const handleEditClick = (song) => {
        setEditingSongId(song._id);
        setEditingSongOriginalTitle(song.title);
        setNewSongTitle(song.title);
        setNewSongDuration(song.duration || '');
        setSelectedGenreIds(song.genres ? song.genres.map(g => g._id) : []);
        setSelectedSubGenreIds(song.subGenres ? song.subGenres.map(sg => sg._id) : []);
        setNewSongCollectionType(song.collectionType);

        // --- POPULATE NEW FIELDS ---
        setNewSongBPM(song.bpm || '');
        setNewSongKey(song.key || '');
        setNewSongHasVocals(song.hasVocals || false);

        setNewSongImage(null);
        setNewSongAudio(null);
        setClearEditImage(false);
        setClearEditAudio(false);
        
        const imageInput = document.getElementById('newSongImageInput');
        if (imageInput) imageInput.value = '';
        const audioInput = document.getElementById('newSongAudioInput');
        if (audioInput) audioInput.value = '';
    };

    const handleCancelEdit = () => {
        setEditingSongId(null);
        setEditingSongOriginalTitle('');
        setNewSongTitle('');
        setNewSongDuration('');
        setSelectedGenreIds([]);
        setSelectedSubGenreIds([]);
        setNewSongCollectionType('free');
        setNewSongImage(null);
        setNewSongAudio(null);
        setClearEditImage(false);
        setClearEditAudio(false);
        
        // --- RESET NEW FIELDS ---
        setNewSongBPM('');
        setNewSongKey('');
        setNewSongHasVocals(false);

        const imageInput = document.getElementById('newSongImageInput');
        if (imageInput) imageInput.value = '';
        const audioInput = document.getElementById('newSongAudioInput');
        if (audioInput) audioInput.value = '';
    };

    // --- Delete Handler (Unchanged from your code) ---
    const handleDeleteSong = async (id, title) => {
        if (!adminToken) {
            showNotification('Authentication token missing. Please log in.', 'error');
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the song "${title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/songs/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            showNotification('Song deleted successfully!', 'success');
            await fetchSongs();
        } catch (err) {
            console.error("Failed to delete song:", err);
            setError(`Error deleting song: ${err.message}`);
            showNotification(`Error deleting song: ${err.message}`, 'error');
        }
    };

    // --- RENDER LOGIC (Inline styles preserved from your code) ---
    const buttonStyle = { padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '14px', margin: '0 5px', transition: 'background-color 0.2s ease', opacity: uploading ? 0.7 : 1 };
    const editButtonStyle = { ...buttonStyle, backgroundColor: '#ffc107', color: '#333' };
    const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white' };
    const tableHeaderStyle = { backgroundColor: '#333', padding: '10px', textAlign: 'left', color: '#fff' };
    const tableCellStyle = { padding: '10px', verticalAlign: 'top' };
    const imagePreviewStyle = { width: '100px', height: '100px', objectFit: 'cover', borderRadius: '5px', marginRight: '10px' };
    const genreSubGenreTagStyle = { display: 'inline-flex', alignItems: 'center', backgroundColor: '#555', padding: '5px 10px', borderRadius: '5px', fontSize: '0.85em', color: '#eee', marginRight: '8px', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' };
    
    if (loading) return <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px', backgroundColor: '#333', color: '#eee' }}>Loading song data...</div>;
    if (error) return <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px', backgroundColor: '#333', color: '#eee' }}>Error: {error}</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Manage Songs</h2>
            {notification.message && (<div style={{ padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>{notification.message}</div>)}

            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
                <h3 style={{ color: '#eee', marginBottom: '15px' }}>{editingSongId ? `Edit Song: ${editingSongOriginalTitle}` : 'Upload New Song:'}</h3>
                <form onSubmit={handleAddSong} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                        <div>
                            <label htmlFor="title" style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Title:</label>
                            <input type="text" id="title" placeholder="Enter song title" value={newSongTitle} onChange={(e) => setNewSongTitle(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required />
                        </div>
                        <div>
                            <label htmlFor="duration" style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Duration (seconds):</label>
                            <input type="number" id="duration" placeholder="e.g., 180" value={newSongDuration} onChange={(e) => setNewSongDuration(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required />
                        </div>
                        <div>
                            <label htmlFor="bpm" style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>BPM (Beats Per Minute):</label>
                            <input type="number" id="bpm" placeholder="e.g., 120" value={newSongBPM} onChange={(e) => setNewSongBPM(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required />
                        </div>
                        <div>
                            <label htmlFor="key" style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Key:</label>
                            <input type="text" id="key" placeholder="e.g., C Major" value={newSongKey} onChange={(e) => setNewSongKey(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required />
                        </div>
                    </div>
                    
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', color: 'white', padding: '8px', backgroundColor: '#555', border: '1px solid #666', borderRadius: '4px', marginTop: '5px' }}>
                            <input type="checkbox" checked={newSongHasVocals} onChange={(e) => setNewSongHasVocals(e.target.checked)} style={{ marginRight: '10px', height: '18px', width: '18px' }} />
                            This song contains vocals
                        </label>
                    </div>

                    {/* Genres, Sub-genres, and other inputs (Unchanged from your code) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Genres (Select multiple):</label>
                        <input type="text" placeholder="Search genres..." value={genreSearchTerm} onChange={(e) => setGenreSearchTerm(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', marginBottom: '10px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '8px', backgroundColor: '#555', border: '1px solid #666', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                            {filteredGenres.map(genre => (<label key={genre._id} style={{ display: 'flex', alignItems: 'center', color: 'white', marginRight: '10px' }}><input type="checkbox" value={genre._id} checked={selectedGenreIds.includes(genre._id)} onChange={(e) => { const id = e.target.value; setSelectedGenreIds(prev => e.target.checked ? [...prev, id] : prev.filter(item => item !== id)); }} style={{ marginRight: '5px' }} />{genre.name}</label>))}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Sub-genres (Select multiple):</label>
                        <input type="text" placeholder="Search sub-genres..." value={subGenreSearchTerm} onChange={(e) => setSubGenreSearchTerm(e.target.value)} style={{ padding: '8px', width: 'calc(100% - 16px)', marginBottom: '10px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '8px', backgroundColor: '#555', border: '1px solid #666', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                            {filteredSubGenres.map(subGenre => (<label key={subGenre._id} style={{ display: 'flex', alignItems: 'center', color: 'white', marginRight: '10px' }}><input type="checkbox" value={subGenre._id} checked={selectedSubGenreIds.includes(subGenre._id)} onChange={(e) => { const id = e.target.value; setSelectedSubGenreIds(prev => e.target.checked ? [...prev, id] : prev.filter(item => item !== id)); }} style={{ marginRight: '5px' }} />{subGenre.name} ({subGenre.genre ? subGenre.genre.name.split(' ')[0] : 'N/A'})</label>))}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Collection Type:</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ color: '#bbb' }}><input type="radio" name="collectionType" value="free" checked={newSongCollectionType === 'free'} onChange={(e) => setNewSongCollectionType(e.target.value)} style={{ marginRight: '5px' }} /> Collection Free (Requires Signup)</label>
                            <label style={{ color: '#bbb' }}><input type="radio" name="collectionType" value="paid" checked={newSongCollectionType === 'paid'} onChange={(e) => setNewSongCollectionType(e.target.value)} style={{ marginRight: '5px' }} /> Collection Paid (Monthly Subscription)</label>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="newSongImageInput" style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Cover Image {editingSongId && '(optional)'}:</label>
                        <input type="file" id="newSongImageInput" accept="image/*" onChange={(e) => setNewSongImage(e.target.files[0])} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required={!editingSongId} />
                        {editingSongId && songs.find(s => s._id === editingSongId)?.imageUrl && !newSongImage && (<div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}><img src={songs.find(s => s._id === editingSongId).imageUrl} alt="Current Cover" style={imagePreviewStyle} /></div>)}
                    </div>
                    <div>
                        <label htmlFor="newSongAudioInput" style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Audio File {editingSongId && '(optional)'}:</label>
                        <input type="file" id="newSongAudioInput" accept="audio/*" onChange={(e) => setNewSongAudio(e.target.files[0])} style={{ padding: '8px', width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} required={!editingSongId} />
                        {editingSongId && songs.find(s => s._id === editingSongId)?.audioUrl && !newSongAudio && (<div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}><audio controls src={songs.find(s => s._id === editingSongId).audioUrl} style={{ width: '100%' }}>Your browser does not support audio.</audio></div>)}
                    </div>

                    <button type="submit" disabled={uploading} style={{ padding: '10px 20px', backgroundColor: uploading ? '#888' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: uploading ? 'not-allowed' : 'pointer', marginTop: '15px' }}>
                        {uploading ? (editingSongId ? 'Updating...' : 'Adding...') : (editingSongId ? 'Update Song' : 'Upload Song')}
                    </button>
                    {editingSongId && (<button type="button" onClick={handleCancelEdit} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>Cancel Edit</button>)}
                </form>
            </div>

            <h3>Existing Songs:</h3>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="text" placeholder="Search by Title..." value={songSearchTerm} onChange={(e) => setSongSearchTerm(e.target.value)} style={{ padding: '8px', width: '250px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }} />
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '8px', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: '4px' }}>
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {displayedSongs.map(song => (
                    <li key={song._id} style={{ marginBottom: '15px', padding: '15px', background: '#444', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <img src={song.imageUrl} alt={song.title} style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100/000/FFF?text=No+Image'; }} />
                        <div style={{ flexGrow: 1 }}>
                            <h4 style={{ margin: '0', color: 'white', fontSize: '1.1em' }}>{song.title} <span style={{ fontSize: '0.9em', color: '#bbb' }}>(Collection {song.collectionType})</span></h4>
                            
                            <div style={{ margin: '8px 0 5px 0', fontSize: '0.9em', color: '#bbb' }}>
                                <strong>BPM:</strong> {song.bpm || 'N/A'} | <strong>Key:</strong> {song.key || 'N/A'} | <strong>Vocals:</strong> {song.hasVocals ? 'Yes' : 'No'}
                            </div>

                            <div style={{ margin: '8px 0 5px 0', fontSize: '0.9em', color: '#bbb' }}>
                                <strong>Genres:</strong> {song.genres && song.genres.length > 0 ? song.genres.map(g => g.name).join(', ') : 'N/A'}
                            </div>
                            <div style={{ margin: '5px 0 8px 0', fontSize: '0.9em', color: '#bbb' }}>
                                <strong>Sub-genres:</strong> {song.subGenres && song.subGenres.length > 0 ? song.subGenres.map(sg => sg.name).join(', ') : 'N/A'}
                            </div>
                            <audio controls src={song.audioUrl} style={{ width: '100%', marginTop: '10px' }}>Your browser does not support the audio element.</audio>
                            <span style={{ fontSize: '0.8em', color: '#777', display: 'block', marginTop: '5px' }}>ID: {song._id}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '20px', flexShrink: 0 }}>
                            <button onClick={() => handleEditClick(song)} style={editButtonStyle}>Edit Song</button>
                            <button onClick={() => handleDeleteSong(song._id, song.title)} style={deleteButtonStyle}>Delete Song</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default SongManager;
