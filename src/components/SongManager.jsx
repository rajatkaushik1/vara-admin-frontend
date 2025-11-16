import React, { useEffect, useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { analyzeAudioWithEssentia } from '../utils/essentiaAnalysis';
<<<<<<< HEAD
import { analyzeAudioFile } from '../utils/audioAnalysis';
=======
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09

const LAST_BATCH_KEY = 'varaAdminLastBatchId';

function SongManager({ genreUpdateKey, adminRole: adminRoleProp }) {
<<<<<<< HEAD

=======
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
  // --- STATE VARIABLES ---
  const [songs, setSongs] = useState([]);
  const [allGenres, setAllGenres] = useState([]);
  const [allSubGenres, setAllSubGenres] = useState([]);
  const [allInstruments, setAllInstruments] = useState([]);
  const [allMoods, setAllMoods] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [batchApiEnabled, setBatchApiEnabled] = useState(true); // keep graceful handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
<<<<<<< HEAD
=======
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [autoDetectResult, setAutoDetectResult] = useState(null);
  const analyzeSeqRef = useRef(0);
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09

  // Info Box + Batch inline add
  const [infoBoxText, setInfoBoxText] = useState('');
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  // Form state (DEFAULT COLLECTION TYPE → 'paid')
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    externalSongId: '',
    batchId: '',
    bpm: '',
    key: '',
    hasVocals: false,
    duration: '',
    collectionType: 'paid', // CHANGED: default to paid
    genres: [],
    subGenres: [],
    instruments: [],
    moods: [],
    imageFile: null,
    audioFile: null,
  });

  // For edit label
  const [editingSongOriginalTitle, setEditingSongOriginalTitle] = useState('');

  // Filters
  const [genreSearchTerm, setGenreSearchTerm] = useState('');
  const [subGenreSearchTerm, setSubGenreSearchTerm] = useState('');
  const [instrumentSearchTerm, setInstrumentSearchTerm] = useState('');
  const [moodSearchTerm, setMoodSearchTerm] = useState('');
  const [songSearchTerm, setSongSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  // Notifications
  const [notification, setNotification] = useState({ message: '', type: '' });
  const adminToken = localStorage.getItem('adminToken');
  // Role detection (prop-first; falls back to internal fetch if needed)
  const [adminRole, setAdminRole] = useState(adminRoleProp || null);
  const isEditor = (adminRoleProp ? adminRoleProp === 'editor' : adminRole === 'editor');
<<<<<<< HEAD
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [audioAnalysisResult, setAudioAnalysisResult] = useState(null);
  const audioAnalysisSeqRef = useRef(0);
=======
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
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
      const songsUrl = isEditor
        ? `${API_BASE_URL}/api/songs/mine?${nocache}`
        : `${API_BASE_URL}/api/songs?${nocache}`;
      const [songsRes, genresRes, subGenresRes, instrumentsRes, moodsRes] = await Promise.all([
        fetch(songsUrl, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
        fetch(`${API_BASE_URL}/api/genres?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
        fetch(`${API_BASE_URL}/api/subgenres?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
        fetch(`${API_BASE_URL}/api/instruments?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
        fetch(`${API_BASE_URL}/api/moods?${nocache}`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
      ]);

      if (!songsRes.ok) throw new Error('Failed to fetch songs.');
      if (!genresRes.ok) throw new Error('Failed to fetch genres.');
      if (!subGenresRes.ok) throw new Error('Failed to fetch sub-genres.');
      if (!instrumentsRes.ok) throw new Error('Failed to fetch instruments.');
      if (!moodsRes.ok) throw new Error('Failed to fetch moods.');

      const [songsData, genresData, subGenresData, instrumentsData, moodsData] = await Promise.all([
        songsRes.json(), genresRes.json(), subGenresRes.json(), instrumentsRes.json(), moodsRes.json()
      ]);

      // Fetch batches separately so we can handle 404 gracefully
      let batchesData = [];
      try {
        const batchesRes = await fetch(`${API_BASE_URL}/api/batches?${nocache}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (batchesRes.status === 404) {
          setBatchApiEnabled(false); // API not mounted in this environment
          batchesData = [];
        } else if (!batchesRes.ok) {
          throw new Error('Failed to fetch batches.');
        } else {
          batchesData = await batchesRes.json();
          setBatchApiEnabled(true);
        }
      } catch (bErr) {
        console.warn('Batches fetch failed or unavailable:', bErr?.message || bErr);
        if (bErr?.message?.includes('Failed to fetch batches')) {
          setBatchApiEnabled(false);
        }
        batchesData = [];
      }

      setSongs(Array.isArray(songsData) ? songsData : []);
      setAllGenres(Array.isArray(genresData) ? genresData : []);
      setAllSubGenres(Array.isArray(subGenresData) ? subGenresData : []);
      setAllInstruments(Array.isArray(instrumentsData) ? instrumentsData : []);
      setAllMoods(Array.isArray(moodsData) ? moodsData : []);
      setAllBatches(Array.isArray(batchesData) ? batchesData : []);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [adminToken, genreUpdateKey, isEditor]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refreshBatches = async () => {
    try {
      const nocache = `admin_nocache=${Date.now()}`;
      const res = await fetch(`${API_BASE_URL}/api/batches?${nocache}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const arr = await res.json();
        if (Array.isArray(arr)) {
          setAllBatches(arr);
          setBatchApiEnabled(true);
        }
      }
      // If 404, leave state as-is; user can still add a new batch inline.
    } catch (e) {
      console.warn('refreshBatches failed:', e?.message || e);
    }
  };

  // Helpers
  const getLastBatchDefault = () => localStorage.getItem(LAST_BATCH_KEY) || '';

  const resetForm = () => {
    setFormData({
      id: null,
      title: '',
      externalSongId: '',
      batchId: getLastBatchDefault(),
      bpm: '',
      key: '',
      hasVocals: false,
      duration: '',
      collectionType: 'paid', // CHANGED: default to paid on reset too
      genres: [],
      subGenres: [],
      instruments: [],
      moods: [],
      imageFile: null,
      audioFile: null,
    });
    setEditingSongOriginalTitle('');
    setInfoBoxText('');
    const img = document.getElementById('newSongImageInput');
    const aud = document.getElementById('newSongAudioInput');
    if (img) img.value = '';
    if (aud) aud.value = '';
<<<<<<< HEAD
  };

  // --- FORM HANDLERS ---
=======
    setIsAnalyzingAudio(false);
    setAutoDetectResult(null);
    analyzeSeqRef.current = 0;
  };

  // --- FORM HANDLERS ---

  const runAudioAnalysis = useCallback(async (file) => {
    if (!file) return;

    const seq = ++analyzeSeqRef.current;
    setIsAnalyzingAudio(true);
    setAutoDetectResult(null);

    try {
      const result = await analyzeAudioWithEssentia(file, {
        maxSeconds: 75,
        minBpm: 60,
        maxBpm: 180,
      });

      // If another file was selected meanwhile, ignore this result
      if (seq !== analyzeSeqRef.current) return;

      if (result && (result.bpm != null || result.key)) {
        const safeConfidence =
          typeof result.confidence === 'number'
            ? Math.max(0, Math.min(1, result.confidence))
            : null;

        setAutoDetectResult({
          bpm: result.bpm != null ? result.bpm : null,
          key: result.key || null,
          confidence: safeConfidence,
        });

        // Auto-fill BPM and Key while allowing manual overrides
        setFormData((prev) => {
          const next = { ...prev };
          if (result.bpm != null) {
            next.bpm = result.bpm;
          }
          // Only auto-fill key if we have some confidence; threshold ~0.15
          if (result.key && (safeConfidence === null || safeConfidence >= 0.15)) {
            next.key = result.key;
          }
          return next;
        });
      }
    } catch (err) {
      console.error('Audio auto-analysis failed:', err);
    } finally {
      // Only clear the loading state if this is the latest analysis request
      if (seq === analyzeSeqRef.current) {
        setIsAnalyzingAudio(false);
      }
    }
  }, [setFormData]);

>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
  const handleFormChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'file') {
      const file = files[0];
      setFormData(prev => ({ ...prev, [name]: file }));
<<<<<<< HEAD

      if (name === 'audioFile' && file) {
        // Existing: detect duration from the selected file
=======
      if (name === 'audioFile' && file) {
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
        const audioUrl = URL.createObjectURL(file);
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
          setFormData(prev => ({ ...prev, duration: Math.round(audio.duration) }));
          URL.revokeObjectURL(audioUrl);
        };
<<<<<<< HEAD

        // NEW: trigger BPM/Key analysis
        // Use a sequence number to avoid race conditions if the file changes quickly
        const seq = ++audioAnalysisSeqRef.current;
        setIsAnalyzingAudio(true);
        setAudioAnalysisResult(null);

        (async () => {
          try {
            let analysis = null;
            let source = 'essentia';

            try {
              analysis = await analyzeAudioWithEssentia(file, { maxSeconds: 75 });
            } catch (err) {
              console.warn('Essentia analysis failed, falling back:', err);
              analysis = null;
            }

            // If Essentia failed or did not produce a BPM, fall back to the simpler analyzer
            if (!analysis || (!analysis.bpm && !analysis.key)) {
              source = 'fallback';
              try {
                analysis = await analyzeAudioFile(file, {
                  maxSeconds: 75,
                  minBpm: 60,
                  maxBpm: 180
                });
              } catch (fallbackErr) {
                console.warn('Fallback analysis failed:', fallbackErr);
                analysis = null;
              }
            }

            // If the user already selected another file, discard this result
            if (audioAnalysisSeqRef.current !== seq) {
              return;
            }

            if (analysis && (analysis.bpm || analysis.key)) {
              const detectedBpm = analysis.bpm || '';
              const detectedKey = analysis.key || '';

              // Auto-fill form fields, but keep them editable
              setFormData(prev => ({
                ...prev,
                bpm: detectedBpm || prev.bpm,
                key: detectedKey || prev.key,
              }));

              setAudioAnalysisResult({
                bpm: analysis.bpm || null,
                key: analysis.key || null,
                confidence:
                  typeof analysis.confidence === 'number' ? analysis.confidence : 0,
                source,
              });
            } else {
              setAudioAnalysisResult({
                bpm: null,
                key: null,
                confidence: 0,
                source: 'none',
              });
            }
          } catch (outerErr) {
            console.warn('Unexpected audio analysis error:', outerErr);
            if (audioAnalysisSeqRef.current === seq) {
              setAudioAnalysisResult({
                bpm: null,
                key: null,
                confidence: 0,
                source: 'error',
              });
            }
          } finally {
            if (audioAnalysisSeqRef.current === seq) {
              setIsAnalyzingAudio(false);
            }
          }
        })();
      }

=======
        // NEW: trigger auto BPM/Key analysis
        runAudioAnalysis(file);
      }
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
      return;
    }

    if (type === 'checkbox') {
      if (name === 'hasVocals') {
        setFormData(prev => ({ ...prev, hasVocals: checked }));
      } else {
        const id = value;
        const list = formData[name] || [];
        const newList = checked ? [...list, id] : list.filter(item => item !== id);
        setFormData(prev => ({ ...prev, [name]: newList }));
      }
      return;
    }

    if (name === 'batchId') {
      setFormData(prev => ({ ...prev, batchId: value }));
      if (value) localStorage.setItem(LAST_BATCH_KEY, value);
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (song) => {
    setEditingSongOriginalTitle(song.title);
    setFormData({
      id: song._id,
      title: song.title,
      externalSongId: song.externalSongId || '',
      batchId: song.batch && song.batch._id ? song.batch._id : '',
      bpm: song.bpm || '',
      key: song.key || '',
      hasVocals: !!song.hasVocals,
      duration: song.duration || '',
      collectionType: song.collectionType,
      genres: song.genres ? song.genres.map(g => g._id) : [],
      subGenres: song.subGenres ? song.subGenres.map(sg => sg._id) : [],
      instruments: song.instruments ? song.instruments.map(i => i._id) : [],
      moods: song.moods ? song.moods.map(m => m._id) : [],
      imageFile: null,
      audioFile: null,
    });
    window.scrollTo(0, 0);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  // --- CREATE / UPDATE / DELETE ---
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
    payload.append('moods', JSON.stringify(formData.moods));
    payload.append('bpm', formData.bpm);
    payload.append('key', formData.key);
    payload.append('hasVocals', formData.hasVocals);
    payload.append('image', formData.imageFile);
    payload.append('audio', formData.audioFile);
    if (formData.externalSongId) payload.append('externalSongId', formData.externalSongId);
    if (formData.batchId) payload.append('batchId', formData.batchId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/songs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
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
      moods: formData.moods,
      externalSongId: formData.externalSongId || '',
      batchId: formData.batchId || '',
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/songs/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
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

  // --- INFO BOX PARSER ---
  const normalize = (s) => (s || '').toString().trim().toLowerCase().replace(/[.\-_/]/g, ' ').replace(/\s+/g, ' ');
  const findByName = (items, targetNames) => {
    const targets = Array.isArray(targetNames) ? targetNames : [targetNames];
    for (const t of targets) {
      const tn = normalize(t);
      const found = items.find(it => normalize(it.name) === tn);
      if (found) return found;
    }
    return null;
  };

  const applyInfoBox = () => {
    const text = (infoBoxText || '').trim();
    if (!text) {
      showNotification('Info Box is empty.', 'error');
      return;
    }

    const parts = text.split('|').map(s => s.trim());
    const nextData = { ...formData };

    const notFound = { genres: [], subGenres: [], moods: [], instruments: [] };

    // Song ID
    const songPart = parts.find(p => /^song\s+/i.test(p));
    if (songPart) {
      const m = songPart.match(/song\s+([A-Za-z0-9\-]+)/i);
      if (m && m[1]) nextData.externalSongId = m[1].trim();
    }

    // Genres (Ads → ADVERSTISEMENT or Advertisement, with safe fallback)
    const genrePart = parts.find(p => /^genre\s*:/i.test(p));
    if (genrePart) {
      const val = genrePart.split(':')[1] || '';
      const names = val.split(',').map(s => s.trim()).filter(Boolean);
      const chosen = [];
      names.forEach((nameRaw) => {
        let name = nameRaw;
        if (/^ads$/i.test(name)) {
          // Try preferred exact names first
          let preferred = findByName(allGenres, ['ADVERSTISEMENT', 'Advertisement']);
          if (!preferred) {
            // Safe fallback: any genre containing "advert" (avoids matching "adventure")
            const fallback = allGenres.find(g => {
              const nn = (g?.name || '').toLowerCase().replace(/[.\-_/]/g, ' ');
              return nn.includes('advert');
            });
            if (fallback) {
              chosen.push(fallback._id);
              return;
            }
          } else {
            chosen.push(preferred._id);
            return;
          }
        }
        const g = findByName(allGenres, name);
        if (g) chosen.push(g._id);
        else notFound.genres.push(nameRaw);
      });
      if (chosen.length) nextData.genres = Array.from(new Set(chosen));
    }

    // Sub-genres
    const subGenrePart = parts.find(p => /^sub-?genres?\s*:/i.test(p));
    if (subGenrePart) {
      const val = subGenrePart.split(':')[1] || '';
      const names = val.split(',').map(s => s.trim()).filter(Boolean);
      const chosen = [];
      names.forEach((nameRaw) => {
        const sg = findByName(allSubGenres, nameRaw);
        if (sg) chosen.push(sg._id);
        else notFound.subGenres.push(nameRaw);
      });
      if (chosen.length) nextData.subGenres = Array.from(new Set(chosen));
    }

    // Moods (support "Mood:", "Moods:", "Mood(s):")
    const moodsPart = parts.find(p => /^mood(?:s|\(s\))?\s*:/i.test(p));
    if (moodsPart) {
      const val = moodsPart.split(':')[1] || '';
      const names = val.split(',').map(s => s.trim()).filter(Boolean);
      const chosen = [];
      names.forEach((nameRaw) => {
        const m = findByName(allMoods, nameRaw);
        if (m) chosen.push(m._id);
        else notFound.moods.push(nameRaw);
      });
      if (chosen.length) nextData.moods = Array.from(new Set(chosen));
    }

    // Anchor Instrument (Guitar → Acoustic; Elec. Guitar preserved)
    const instPart = parts.find(p => /^anchor\s+instrument\s*:/i.test(p));
    if (instPart) {
      const val = (instPart.split(':')[1] || '').trim();
      let preferredNames = [];
      if (/^guitar$/i.test(val)) {
        preferredNames = ['Acoustic'];
      } else if (/^acoustic$/i.test(val)) {
        preferredNames = ['Acoustic'];
      } else if (/^(elec(\.|tric)?\s*guitar)$/i.test(val)) {
        preferredNames = ['Elec. Guitar', 'Electric Guitar'];
      } else {
        preferredNames = [val];
      }
      const found = findByName(allInstruments, preferredNames);
      if (found) {
        const current = new Set(nextData.instruments || []);
        current.add(found._id);
        nextData.instruments = Array.from(current);
      } else {
        notFound.instruments.push(val);
      }
    }

    // Vocals
    const vocalPart = parts.find(p => /^vocal\s*:/i.test(p));
    if (vocalPart) {
      const val = (vocalPart.split(':')[1] || '').trim().toLowerCase();
      if (val === 'on') nextData.hasVocals = true;
      if (val === 'off') nextData.hasVocals = false;
    }

    setFormData(nextData);

    const msgs = [];
    if (notFound.genres.length) msgs.push(`Genres not found: ${notFound.genres.join(', ')}`);
    if (notFound.subGenres.length) msgs.push(`Sub-genres not found: ${notFound.subGenres.join(', ')}`);
    if (notFound.moods.length) msgs.push(`Moods not found: ${notFound.moods.join(', ')}`);
    if (notFound.instruments.length) msgs.push(`Instruments not found: ${notFound.instruments.join(', ')}`);
    if (msgs.length) showNotification(msgs.join(' | '), 'error');
    else showNotification('Info applied successfully.', 'success');
  };

  // --- ADD NEW BATCH INLINE ---
  const handleCreateBatchInline = async () => {
    if (!batchApiEnabled) {
      showNotification('Batch API is not enabled on this backend. Deploy /api/batches to use this feature.', 'error');
      return;
    }
    const name = (newBatchName || '').trim();
    if (!name) {
      showNotification('Enter a batch name first.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/batches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
      });
      if (res.status === 404) {
        setBatchApiEnabled(false);
        throw new Error('Batch API is not enabled on this backend.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }
      const updated = [...allBatches, data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setAllBatches(updated);
      setFormData(prev => ({ ...prev, batchId: data._id }));
      localStorage.setItem(LAST_BATCH_KEY, data._id);
      setNewBatchName('');
      setIsAddingBatch(false);
      showNotification(`Batch "${data.name}" created and selected.`, 'success');
    } catch (err) {
      showNotification(`Failed to create batch: ${err.message}`, 'error');
    }
  };

  // --- FILTERS & TABLE DATA ---
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
    .filter(song => {
      const term = (songSearchTerm || '').toString().trim();
      // When the search box is empty, show all songs (same behavior as before)
      if (!term) return true;

      // Title match (existing behavior, case-insensitive)
      const title = (song?.title || '').toString().toLowerCase();
      const titleMatch = title.includes(term.toLowerCase());

      // New: Song ID match (externalSongId)
      // Case-insensitive, ignore any non-alphanumeric characters (hyphens, spaces, underscores, etc.)
      const normalizeForId = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const idNorm = normalizeForId(song?.externalSongId || '');
      const termNorm = normalizeForId(term);
      const idMatch = termNorm.length > 0 && idNorm.includes(termNorm);

      return titleMatch || idMatch;
    })
    .sort((a, b) => (sortOrder === 'asc'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt)
    ));

  // --- STYLES ---
  const buttonStyle = { padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '14px', margin: '0 5px', transition: 'background-color 0.2s ease', opacity: isSubmitting ? 0.7 : 1 };
  const editButtonStyle = { ...buttonStyle, backgroundColor: '#ffc107', color: '#333' };
  const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white' };
  const tableHeaderStyle = { backgroundColor: '#333', padding: '10px', textAlign: 'left', color: '#fff' };
  const tableCellStyle = { padding: '10px', verticalAlign: 'top', color: '#ddd' };
  const tagBase = { display: 'inline-flex', alignItems: 'center', backgroundColor: '#555', padding: '5px 10px', borderRadius: '5px', fontSize: '0.85em', color: '#eee', marginRight: '8px', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' };
  const genreTagStyle = { ...tagBase, backgroundColor: '#e74c3c' };
  const subTagStyle = { ...tagBase, backgroundColor: '#3498db' };
  const instrumentTagStyle = { ...tagBase, backgroundColor: '#21c45d', color: '#0e1a12' };
  const moodTagStyle = { ...tagBase, backgroundColor: '#8e44ad', color: '#ffffff' };

  if (loading) return <div style={{ padding: '20px', color: '#eee' }}>Loading song data...</div>;
  if (error) return <div style={{ padding: '20px', color: '#dc3545' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
<<<<<<< HEAD
     <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Manage Songs</h2>
=======
      <h2 style={{ color: '#eee', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Manage Songs</h2>
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
      {notification.message && (
        <div style={{ padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {notification.message}
        </div>
      )}

      {/* Info Box */}
      <div style={{ marginBottom: '15px', background: '#2d2d2d', padding: '12px', borderRadius: '6px' }}>
        <label style={{ color: '#ccc', display: 'block', marginBottom: 6 }}>Info Box (paste and click Apply):</label>
        <textarea
          value={infoBoxText}
          onChange={(e) => setInfoBoxText(e.target.value)}
          rows={3}
          placeholder={'Song SF-004221 | Genre: Vlogs | Sub-genres: Daily | Mood(s): Happy | Anchor Instrument: Acoustic | Vocal: Off'}
          style={{ width: '100%', padding: 8, background: '#555', color: '#fff', border: '1px solid #666', borderRadius: 4 }}
        />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={applyInfoBox} style={{ ...buttonStyle, backgroundColor: '#6f42c1', color: 'white' }}>
            Apply Info
          </button>
        </div>
        <div style={{ color: '#9aa', fontSize: 12, marginTop: 6 }}>
          Rules: Title is not changed. Mood Family is ignored. Synonyms: "Guitar" → Acoustic; "Ads" → ADVERSTISEMENT (or Advertisement).
        </div>
      </div>

      {/* --- FORM --- */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
        <h3 style={{ color: '#eee', marginBottom: '15px' }}>
          {formData.id ? `Edit Song: ${editingSongOriginalTitle}` : 'Upload New Song:'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <input type="text" name="title" placeholder="Enter song title" value={formData.title} onChange={handleFormChange} style={{ padding: 8, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} required />
            <input type="text" name="externalSongId" placeholder="Song ID (e.g., SF-004221)" value={formData.externalSongId} onChange={handleFormChange} style={{ padding: 8, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} />
            <input type="number" name="bpm" placeholder="e.g., 120" value={formData.bpm} onChange={handleFormChange} style={{ padding: 8, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} required />
            <input type="text" name="key" placeholder="e.g., C Major" value={formData.key} onChange={handleFormChange} style={{ padding: 8, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} required />
          </div>
<<<<<<< HEAD
=======
          {isAnalyzingAudio && (
            <div style={{ marginTop: 6, color: '#ffc107', fontSize: 12 }}>
              Auto-detecting BPM/Key from audio file...
            </div>
          )}
          {!isAnalyzingAudio && autoDetectResult && (autoDetectResult.bpm != null || autoDetectResult.key) && (
            <div style={{ marginTop: 6, color: '#9aa', fontSize: 12 }}>
              Auto-detected
              {autoDetectResult.bpm != null ? ` BPM: ${autoDetectResult.bpm}` : ''}
              {autoDetectResult.key ? (autoDetectResult.bpm != null ? ', ' : ' Key: ') : ''}
              {autoDetectResult.key && autoDetectResult.bpm == null ? `${autoDetectResult.key}` : ''}
              {typeof autoDetectResult.confidence === 'number'
                ? ` (confidence ${(autoDetectResult.confidence * 100).toFixed(0)}%)`
                : ''}
              . You can still edit BPM and Key manually.
            </div>
          )}
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09

          {/* Batch */}
          <div>
            <label style={{ display: 'block', color: '#ccc', marginBottom: 6 }}>Batch:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                name="batchId"
                value={formData.batchId}
                onChange={handleFormChange}
                onFocus={refreshBatches}
                style={{ padding: 8, background: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }}
              >
                <option value="">— No Batch —</option>
                {allBatches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
              {!isEditor && (
                !isAddingBatch ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingBatch(true)}
                    style={{ ...buttonStyle, backgroundColor: batchApiEnabled ? '#17a2b8' : '#6c757d', color: 'white', cursor: batchApiEnabled ? 'pointer' : 'not-allowed' }}
                  >
                    + Add New Batch
                  </button>
                ) : (
                  <>
                    <input type="text" value={newBatchName} onChange={(e) => setNewBatchName(e.target.value)} placeholder="New batch name" style={{ padding: 8, background: '#555', color: '#fff', border: '1px solid #666', borderRadius: 4 }} />
                    <button type="button" onClick={handleCreateBatchInline} style={{ ...buttonStyle, backgroundColor: '#28a745', color: 'white' }}>Save</button>
                    <button type="button" onClick={() => { setIsAddingBatch(false); setNewBatchName(''); }} style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
                  </>
                )
              )}
            </div>
            {batchApiEnabled && (
              <div style={{ color: '#9aa', fontSize: 12, marginTop: 6 }}>
                We auto-select your last used batch for new songs.
              </div>
            )}
          </div>

          {/* Vocals */}
          <label><input type="checkbox" name="hasVocals" checked={formData.hasVocals} onChange={handleFormChange} /> This song contains vocals</label>

          {/* Genres */}
          <div>
            <label>Genres (Select multiple):</label>
            <input type="text" placeholder="Search genres..." value={genreSearchTerm} onChange={(e) => setGenreSearchTerm(e.target.value)} style={{ padding: 8, width: 'calc(100% - 16px)', marginBottom: 10, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 8, backgroundColor: '#555', border: '1px solid #666', borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
              {allGenres
                .filter(g => (g?.name || '').toLowerCase().includes(genreSearchTerm.toLowerCase()))
                .map(genre => (
                  <label key={genre._id}>
                    <input type="checkbox" name="genres" value={genre._id} checked={formData.genres.includes(genre._id)} onChange={handleFormChange} /> {genre.name}
                  </label>
                ))}
            </div>
          </div>

          {/* Sub-genres */}
          <div>
            <label>Sub-genres (Select multiple):</label>
            <input type="text" placeholder="Search sub-genres..." value={subGenreSearchTerm} onChange={(e) => setSubGenreSearchTerm(e.target.value)} style={{ padding: 8, width: 'calc(100% - 16px)', marginBottom: 10, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 8, backgroundColor: '#555', border: '1px solid #666', borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
              {allSubGenres
                .filter(sg => {
                  const matchesSearch = (sg?.name || '').toLowerCase().includes(subGenreSearchTerm.toLowerCase());
                  if (formData.genres.length === 0) return matchesSearch;
                  const matchesSelectedGenre = sg.genre && formData.genres.includes(sg.genre._id);
                  return matchesSearch && matchesSelectedGenre;
                })
                .map(subGenre => (
                  <label key={subGenre._id}>
                    <input type="checkbox" name="subGenres" value={subGenre._id} checked={formData.subGenres.includes(subGenre._id)} onChange={handleFormChange} /> {subGenre.name}
                  </label>
                ))}
            </div>
          </div>

          {/* Instruments */}
          <div>
            <label>Instruments (Select multiple):</label>
            <input type="text" placeholder="Search instrument..." value={instrumentSearchTerm} onChange={(e) => setInstrumentSearchTerm(e.target.value)} style={{ padding: 8, width: 'calc(100% - 16px)', marginBottom: 10, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 8, backgroundColor: '#555', border: '1px solid #666', borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
              {allInstruments
                .filter(inst => (inst?.name || '').toLowerCase().includes(instrumentSearchTerm.toLowerCase()))
                .map(inst => (
                  <label key={inst._id}>
                    <input type="checkbox" name="instruments" value={inst._id} checked={formData.instruments.includes(inst._id)} onChange={handleFormChange} /> {inst.name}
                  </label>
                ))}
            </div>
          </div>

          {/* Moods */}
          <div>
            <label>Moods (Select multiple):</label>
            <input type="text" placeholder="Search mood..." value={moodSearchTerm} onChange={(e) => setMoodSearchTerm(e.target.value)} style={{ padding: 8, width: 'calc(100% - 16px)', marginBottom: 10, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 8, backgroundColor: '#555', border: '1px solid #666', borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
              {allMoods
                .filter(mood => (mood?.name || '').toLowerCase().includes(moodSearchTerm.toLowerCase()))
                .map(m => (
                  <label key={m._id}>
                    <input type="checkbox" name="moods" value={m._id} checked={formData.moods.includes(m._id)} onChange={handleFormChange} /> {m.name}
                  </label>
                ))}
            </div>
          </div>

          {/* Collection Type */}
          <div>
            <label><input type="radio" name="collectionType" value="free" checked={formData.collectionType === 'free'} onChange={handleFormChange} /> Free</label>
            <label style={{ marginLeft: 12 }}><input type="radio" name="collectionType" value="paid" checked={formData.collectionType === 'paid'} onChange={handleFormChange} /> Paid</label>
          </div>

          {/* Files */}
          <div>
            <label htmlFor="newSongImageInput">Cover Image {formData.id && '(leave blank to keep existing)'}:</label>
            <input type="file" id="newSongImageInput" name="imageFile" accept="image/*" onChange={handleFormChange} style={{ padding: 8, width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} required={!formData.id} />
          </div>
          <div style={{ color: '#bbb', fontStyle: 'italic', fontSize: '0.9em' }}>
            Note: When updating a song, you cannot change the audio or image files. To do so, please delete and re-upload the song.
          </div>
          <div>
            <label htmlFor="newSongAudioInput">Audio File {formData.id && '(leave blank to keep existing)'}:</label>
<<<<<<< HEAD
            <input
              type="file"
              id="newSongAudioInput"
              name="audioFile"
              accept="audio/*"
              onChange={handleFormChange}
              style={{ padding: 8, width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }}
              required={!formData.id}
            />
            {formData.duration && (
              <div>Detected Duration: {formData.duration} seconds</div>
            )}
            {isAnalyzingAudio && (
              <div style={{ color: '#ffc107', marginTop: 4, fontSize: '0.9em' }}>
                Auto-detecting BPM/Key from audio...
              </div>
            )}
            {!isAnalyzingAudio && audioAnalysisResult && (
              <div style={{ color: '#9fd3ff', marginTop: 4, fontSize: '0.9em' }}>
                Detected
                {audioAnalysisResult.bpm ? ` BPM: ${audioAnalysisResult.bpm}` : ''}
                {audioAnalysisResult.key
                  ? `${audioAnalysisResult.bpm ? ',' : ''} Key: ${audioAnalysisResult.key}`
                  : ''}
                {typeof audioAnalysisResult.confidence === 'number'
                  ? ` (confidence ~${Math.round(audioAnalysisResult.confidence * 100)}%, ${
                      audioAnalysisResult.source === 'essentia'
                        ? 'Essentia'
                        : audioAnalysisResult.source === 'fallback'
                        ? 'fallback'
                        : audioAnalysisResult.source
                    })`
                  : ''}
              </div>
            )}
=======
            <input type="file" id="newSongAudioInput" name="audioFile" accept="audio/*" onChange={handleFormChange} style={{ padding: 8, width: 'calc(100% - 16px)', backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} required={!formData.id} />
            {formData.duration && <div>Detected Duration: {formData.duration} seconds</div>}
>>>>>>> c3c26b8fe40b4a0726798353e00d61262626ae09
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', backgroundColor: isSubmitting ? '#888' : '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: 15 }}>
            {isSubmitting ? (formData.id ? 'Updating...' : 'Uploading...') : (formData.id ? 'Update Song' : 'Upload Song')}
          </button>
          {formData.id && (
            <button type="button" onClick={handleCancelEdit} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 10 }}>
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      {/* --- TABLE --- */}
      <h3>Existing Songs:</h3>
      <div style={{ marginBottom: 15, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="text" placeholder="Search by Title or Song ID..." value={songSearchTerm} onChange={(e) => setSongSearchTerm(e.target.value)} style={{ padding: 8, width: 250, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }} />
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: 8, backgroundColor: '#555', color: 'white', border: '1px solid #666', borderRadius: 4 }}>
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...tableHeaderStyle, width: '70px', textAlign: 'center' }}>S.No</th>
            <th style={tableHeaderStyle}>Cover</th>
            <th style={tableHeaderStyle}>Details</th>
            <th style={tableHeaderStyle}>Song ID</th>
            <th style={tableHeaderStyle}>Batch</th>
            <th style={tableHeaderStyle}>Metadata</th>
            <th style={tableHeaderStyle}>Tags</th>
            <th style={tableHeaderStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayedSongs.map((song, index) => (
            <tr key={song._id} style={{ borderBottom: '1px solid #444' }}>
              <td style={{ ...tableCellStyle, textAlign: 'center' }}>{index + 1}</td>
              <td style={tableCellStyle}>
                <img
                  src={song.imageUrl}
                  alt={song.title}
                  style={{ width: 60, height: 60, borderRadius: 4, objectFit: 'cover' }}
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/60x60/000/FFF?text=N/A'; }}
                />
              </td>
              <td style={tableCellStyle}>
                <div style={{ fontWeight: 'bold', color: 'white' }}>{song.title}</div>
                <div>Duration: {song.duration}s</div>
                <div>Collection: {song.collectionType}</div>
              </td>
              <td style={tableCellStyle}>
                {song.externalSongId || '—'}
              </td>
              <td style={tableCellStyle}>
                {song.batch && song.batch.name ? song.batch.name : '—'}
              </td>
              <td style={tableCellStyle}>
                <div><strong>BPM:</strong> {song.bpm || 'N/A'}</div>
                <div><strong>Key:</strong> {song.key || 'N/A'}</div>
                <div><strong>Vocals:</strong> {song.hasVocals ? 'Yes' : 'No'}</div>
              </td>
              <td style={tableCellStyle}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {song.genres.map(g => <span key={g._id} style={genreTagStyle}>{g.name}</span>)}
                  {song.subGenres.map(sg => <span key={sg._id} style={subTagStyle}>{sg.name}</span>)}
                  {song.instruments && song.instruments.map(inst => (<span key={inst._id} style={instrumentTagStyle}>{inst.name}</span>))}
                  {song.moods && song.moods.map(m => (<span key={m._id} style={moodTagStyle}>{m.name}</span>))}
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
