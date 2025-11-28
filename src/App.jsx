const { useState, useEffect, useMemo, useRef } = React;

// Load CSV from GitHub - FIXED: pointing to main branch
// Load data from local manifest
const MANIFEST_URL = 'public/data/manifest.json';
const STORAGE_KEY = 'gate_tests_v1';
const SETTINGS_KEY = 'gate_tests_settings_v1';

// PASTE YOUR FIREBASE CONFIG HERE TO MAKE IT PERMANENT
// Example: const DEFAULT_FIREBASE_CONFIG = { apiKey: "...", ... };
// We now try to load it from window.GATE_APP_CONFIG (defined in src/config.js) to keep it separate.
const DEFAULT_FIREBASE_CONFIG = (window.GATE_APP_CONFIG && window.GATE_APP_CONFIG.firebaseConfig) || null;



// Compute percentile for each test based on marks_obtained / marks (as percentage)
// Derive percent marks and percentile for each test.
// If user supplies rank and total_students, percentile is computed from rank.
// Otherwise percentile is computed from percent-marks distribution across tests.
// CSV Parser
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        // Handle quoted strings (e.g. "Topic, Subtopic")
        const row = [];
        let inQuote = false;
        let current = '';
        for (let char of lines[i]) {
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());

        if (row.length === headers.length) {
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = row[idx];
            });
            result.push(obj);
        }
    }
    return result;
}

function deriveMetrics(arr) {
    try {
        if (!Array.isArray(arr)) return [];
        const cloned = (arr || []).map(t => ({ ...t }));

        // compute percent marks for each test
        const scored = cloned.map(t => {
            const mGot = parseFloat(t.marks_obtained);
            const mTot = parseFloat(t.marks);
            let percentMarks = null;
            if (!isNaN(mGot) && !isNaN(mTot) && mTot > 0) percentMarks = (mGot / mTot) * 100;
            else if (!isNaN(mGot)) percentMarks = mGot;
            return { ...t, __percentMarks: percentMarks };
        });

        // build array of valid percentMarks
        const validScores = scored.filter(s => s.__percentMarks !== null).map(s => s.__percentMarks).sort((a, b) => a - b);
        const n = validScores.length;

        return scored.map(s => {
            const out = { ...s };
            // percent marks rounded
            out.percentMarks = (out.__percentMarks !== null && out.__percentMarks !== undefined) ? parseFloat(out.__percentMarks.toFixed(1)) : '';

            // if user provided rank and total_students, compute percentile from that
            const rank = parseInt(out.rank, 10);
            const total = parseInt(out.total_students || out.totalStudents || out.total, 10);
            if (!isNaN(rank) && rank > 0 && !isNaN(total) && total > 0) {
                // percentile as proportion of students below or equal: ((total - rank + 1) / total) * 100
                const p = ((total - rank + 1) / total) * 100;
                out.percentile = parseFloat(p.toFixed(1));
            } else if (n > 0 && out.__percentMarks !== null) {
                // compute percentile based on distribution of percentMarks
                const below = validScores.filter(x => x < out.__percentMarks).length;
                const equal = validScores.filter(x => x === out.__percentMarks).length;
                const perc = ((below + 0.5 * equal) / n) * 100;
                out.percentile = parseFloat(perc.toFixed(1));
            } else {
                out.percentile = '';
            }

            delete out.__percentMarks;
            return out;
        });
    } catch (e) {
        console.warn('deriveMetrics failed', e);
        return arr;
    }
}

// Helper to merge tests: incoming overwrites existing by ID, adds new
const mergeTests = (existing, incoming) => {
    const map = new Map();
    if (Array.isArray(existing)) existing.forEach(t => map.set(t.id, t));
    if (Array.isArray(incoming)) incoming.forEach(t => map.set(t.id, t));
    return Array.from(map.values());
};

function App() {
    const MAX_COMPARE_USERS = 5; // only allow comparing up to this many users (free tier/support constraint)
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ platform: '', subject: '', type: '', status: '', search: '', startDate: '', endDate: '' });
    const [editingCell, setEditingCell] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTest, setNewTest] = useState({ platform: '', platformNew: '', name: '', date: '', type: '', subject: '', questions: '', marks: '', time: '', syllabus: '', link: '', remarks: '', status: 'Not Started', marks_obtained: '', potential_marks: '', percentile: '', rank: '' });
    const [settings, setSettings] = useState({ dark: false, syncEnabled: false, firebaseConfig: DEFAULT_FIREBASE_CONFIG });
    // Authenticated user (when using Firebase)
    const [user, setUser] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);
    const [selectedCompareUsers, setSelectedCompareUsers] = useState([]);
    const firebaseRef = useRef(null);
    const applyingRemote = useRef(false);
    const hasLoadedRemote = useRef(false); // Track if we've loaded data from firebase
    const isInitialSync = useRef(false); // Track if we are in the initial sync phase (waiting for first pull)
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'analytics'
    const [showRandomModal, setShowRandomModal] = useState(false);
    const [pickedRandom, setPickedRandom] = useState(null);
    const [randomOptions, setRandomOptions] = useState({ platform: '', subject: '', type: '', status: '', useCurrentFilters: true });
    const [showNewPlatformInput, setShowNewPlatformInput] = useState(false);
    const [showNewSubjectInput, setShowNewSubjectInput] = useState(false);
    const [showNewTypeInput, setShowNewTypeInput] = useState(false);
    const [csvBlobUrl, setCsvBlobUrl] = useState(null);

    // Column Visibility State
    const ALL_COLUMNS = [
        { id: 'id', label: 'ID', default: true },
        { id: 'platform', label: 'Platform', default: true },
        { id: 'name', label: 'Test Name', default: true },
        { id: 'subject', label: 'Subject', default: true },
        { id: 'type', label: 'Type', default: true },
        { id: 'questions', label: 'Q', default: false },
        { id: 'marks', label: 'Marks', default: true },
        { id: 'time', label: 'Time', default: true },
        { id: 'status', label: 'Status', default: true },
        { id: 'marks_obtained', label: 'Obtained', default: false },
        { id: 'potential_marks', label: 'Potential', default: false },
        { id: 'percentMarks', label: '% Marks', default: true },
        { id: 'percentile', label: 'Percentile', default: false },
        { id: 'rank', label: 'Rank', default: false },
        { id: 'actions', label: 'Actions', default: true, locked: true }
    ];

    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('gate_visible_columns');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.warn('Failed to parse visible columns from local storage', e);
        }
        return ALL_COLUMNS.filter(c => c.default).map(c => c.id);
    });

    const toggleColumn = (colId) => {
        setVisibleColumns(prev => {
            const newCols = prev.includes(colId)
                ? prev.filter(c => c !== colId)
                : [...prev, colId];
            localStorage.setItem('gate_visible_columns', JSON.stringify(newCols));
            return newCols;
        });
    };

    const handleCellEdit = (testId, field, value) => {
        setTests(prev => deriveMetrics(prev.map(t => {
            if (t.id === testId) {
                return { ...t, [field]: value, updatedAt: Date.now() };
            }
            return t;
        })));
        setEditingCell(null);
    };


    const loadFromManifest = () => {
        console.log('Loading data from manifest:', MANIFEST_URL);
        fetch(MANIFEST_URL)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(manifest => {
                if (!manifest.files || !Array.isArray(manifest.files)) throw new Error('Invalid manifest format');
                const promises = manifest.files.map(file => 
                    fetch(file).then(r => {
                        if (!r.ok) throw new Error(`Failed to load ${file}`);
                        return r.text();
                    }).then(parseCSV)
                );
                return Promise.all(promises);
            })
            .then(results => {
                // If we have already loaded remote data (e.g. fast firebase auth), DO NOT overwrite
                if (hasLoadedRemote.current) {
                    console.log('Ignoring local data load because remote data already loaded');
                    return;
                }
                const allTests = results.flat();
                // Merge with existing tests (manifest data overwrites local if IDs match, fixing broken seed data)
                setTests(prev => deriveMetrics(mergeTests(prev, allTests)));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading data:', err);
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        // load settings
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) setSettings(JSON.parse(raw));
        } catch (e) { console.warn('Could not parse settings', e); }

        // Load tests from localStorage first
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const local = JSON.parse(raw);
                setTests(deriveMetrics(local));
                setLoading(false);
                // Do NOT return; continue to loadFromManifest to ensure seed data is present/updated
            }
        } catch (e) {
            console.warn('Failed to read local storage', e);
        }

        loadFromManifest();
    }, []);

    // Apply theme
    useEffect(() => {
        if (settings.dark) document.body.classList.add('dark'); else document.body.classList.remove('dark');
    }, [settings.dark]);

    // Persist tests locally and push to firebase (users/<uid>/tests) when enabled or logged in
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tests)); } catch (e) { console.warn('Could not save tests locally', e); }

        if ((settings.syncEnabled || user) && firebaseRef.current && !applyingRemote.current) {
            // Prevent overwriting remote data if we are still in the initial sync phase (haven't pulled yet)
            if (isInitialSync.current) {
                console.log('Skipping sync push: Initial sync in progress');
                return;
            }
            try {
                const uid = firebaseRef.current.uid;
                firebase.database().ref(`users/${uid}/tests`).set(tests);
            } catch (e) { console.warn('Sync push failed', e); }
        }
    }, [tests, user, settings.syncEnabled]);

    // Setup firebase if config provided: initialize app and listen for auth changes
    useEffect(() => {
        if (!settings.firebaseConfig) return;
        if (!window.firebase) {
            alert('Firebase SDK not loaded. Please check your connection.');
            return;
        }

        try {
            if (!firebase.apps.length) firebase.initializeApp(settings.firebaseConfig);

            // Observe auth state
            firebase.auth().onAuthStateChanged(u => {
                if (u) {
                    setUser(u);
                    firebaseRef.current = { uid: u.uid };
                    isInitialSync.current = true; // Mark as initial sync started
                    
                    // write basic public profile (opt-in)
                    try {
                        firebase.database().ref(`users/${u.uid}/profile`).update({ displayName: u.displayName || null, email: u.email || null, photoURL: u.photoURL || null, lastSeen: Date.now() });
                    } catch (e) { console.warn('profile write failed', e); }

                    // listen to user's tests
                    const dbRef = firebase.database().ref(`users/${u.uid}/tests`);
                    dbRef.on('value', snap => {
                        const remote = snap.val();
                        // We received a value (null or data), so initial sync check is done
                        isInitialSync.current = false;
                        
                        if (!remote) return;
                        
                        hasLoadedRemote.current = true;
                        applyingRemote.current = true;
                        setTests(deriveMetrics(remote));
                        setTimeout(() => { applyingRemote.current = false; }, 300);
                    });
                } else {
                    setUser(null);
                    firebaseRef.current = null;
                    isInitialSync.current = false;
                    hasLoadedRemote.current = false;
                }
            });
        } catch (e) { console.warn('Firebase init error', e); }
    }, [settings.firebaseConfig]);

    const filteredTests = useMemo(() => {
        return tests.filter(test => {
            if (filters.platform && test.platform !== filters.platform) return false;
            if (filters.subject && test.subject !== filters.subject) return false;
            if (filters.type && test.type !== filters.type) return false;
            if (filters.status && test.status !== filters.status) return false;
            if (filters.search && !test.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.startDate) {
                const testDate = new Date(test.date);
                const start = new Date(filters.startDate);
                if (testDate < start) return false;
            }
            if (filters.endDate) {
                const testDate = new Date(test.date);
                const end = new Date(filters.endDate);
                if (testDate > end) return false;
            }
            return true;
        });
    }, [tests, filters]);

    const metrics = useMemo(() => {
        const total = tests.length;
        const completedStatuses = ['Completed', 'Analysis Done'];
        const pendingStatuses = ['Pending', 'Not Started', 'Test Given', 'Analysis Pending'];
        const completed = tests.filter(t => completedStatuses.includes(t.status)).length;
        const pending = tests.filter(t => pendingStatuses.includes(t.status)).length;
        // const notStarted = tests.filter(t => t.status === 'Not Started').length; // Removed: 'Not Started' is already in pendingStatuses

        const completedTests = tests.filter(t => t.marks_obtained !== undefined && t.marks_obtained !== null && t.marks_obtained !== '');
        
        let avgPercent = '0.0';
        if (completedTests.length > 0) {
            const totalPercent = completedTests.reduce((sum, t) => {
                const mGot = parseFloat(t.marks_obtained);
                const mTot = parseFloat(t.marks);
                let p = 0;
                if (!isNaN(mGot) && !isNaN(mTot) && mTot > 0) p = (mGot / mTot) * 100;
                else if (!isNaN(mGot)) p = mGot; // Fallback if total marks missing, assume marks_obtained is percent? Or just 0. safely 0 if unsure but logic above handles it.
                return sum + p;
            }, 0);
            avgPercent = (totalPercent / completedTests.length).toFixed(1);
        }

        return { total, completed, pending, avgPercent };
    }, [tests]);

    const uniqueValues = useMemo(() => ({
        platforms: [...new Set(tests.map(t => t.platform))],
        subjects: [...new Set(tests.map(t => t.subject))],
        types: [...new Set(tests.map(t => t.type))],
        statuses: [...new Set(tests.map(t => t.status))]
    }), [tests]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ platform: '', subject: '', type: '', status: '', search: '', startDate: '', endDate: '' });
    };

    const pickRandomTest = () => {
        // open modal to pick with restrictions
        setPickedRandom(null);
        setShowRandomModal(true);
    };

    const downloadCSV = (filename = 'gate_tests_updated.csv') => {
        const headers = ['id', 'platform', 'name', 'date', 'type', 'subject', 'questions', 'marks', 'time', 'syllabus', 'link', 'remarks', 'status', 'marks_obtained', 'potential_marks', 'percentile', 'rank', 'updatedAt'];
        const csvRows = [
            headers.join(','),
            ...tests.map(test =>
                headers.map(h => {
                    const value = (test[h] !== undefined && test[h] !== null) ? String(test[h]) : '';
                    // Escape values with commas or quotes
                    return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Keep a reusable CSV blob url updated for quick downloads
    useEffect(() => {
        try {
            const headers = ['id', 'platform', 'name', 'date', 'type', 'subject', 'questions', 'marks', 'time', 'syllabus', 'link', 'remarks', 'status', 'marks_obtained', 'potential_marks', 'percentile', 'rank', 'updatedAt'];
            const csvRows = [
                headers.join(','),
                ...tests.map(test => headers.map(h => {
                    const value = (test[h] !== undefined && test[h] !== null) ? String(test[h]) : '';
                    return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
                }).join(','))
            ].join('\n');
            const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            setCsvBlobUrl(url);
        } catch (e) {
            console.warn('Failed to update CSV blob', e);
        }
        // revoke previous when tests change handled by browser GC, but cleanup on unmount
        return () => { try { if (csvBlobUrl) window.URL.revokeObjectURL(csvBlobUrl); } catch (e) { } };
    }, [tests]);

    const updateTestStatus = (testId, newStatus) => {
        setTests(prev => prev.map(test =>
            test.id === testId ? { ...test, status: newStatus } : test
        ));
    };



    const openEditModal = (test) => {
        setEditingTest({ ...test });
        setShowEditModal(true);
    };

    const saveEditedTest = () => {
        setTests(prev => deriveMetrics(prev.map(test => test.id === editingTest.id ? { ...editingTest, updatedAt: Date.now() } : test)));
        setShowEditModal(false);
        setEditingTest(null);
    };

    // Add / Delete helpers
    const openAddModal = () => {
        setNewTest({ platform: '', platformNew: '', subject: '', subjectNew: '', type: '', typeNew: '', name: '', date: '', questions: '', marks: '', time: '', syllabus: '', link: '', remarks: '', status: 'Not Started', marks_obtained: '', potential_marks: '', rank: '', total_students: '' });
        setShowNewPlatformInput(false);
        setShowNewSubjectInput(false);
        setShowNewTypeInput(false);
        setShowAddModal(true);
    };

    const addNewTest = () => {
        const id = String(Date.now()) + '-' + Math.floor(Math.random() * 1000);
        const platform = (showNewPlatformInput && newTest.platformNew) ? newTest.platformNew : newTest.platform;
        const subject = (showNewSubjectInput && newTest.subjectNew) ? newTest.subjectNew : newTest.subject;
        const type = (showNewTypeInput && newTest.typeNew) ? newTest.typeNew : newTest.type;
        const testToAdd = { ...newTest, platform, subject, type, id, updatedAt: Date.now() };
        // remove helper fields from stored object
        if (testToAdd.platformNew) delete testToAdd.platformNew;
        if (testToAdd.subjectNew) delete testToAdd.subjectNew;
        if (testToAdd.typeNew) delete testToAdd.typeNew;
        setTests(prev => deriveMetrics([testToAdd, ...prev]));
        setShowAddModal(false);
        setShowNewPlatformInput(false);
    };

    const deleteTest = (testId) => {
        if (!confirm('Delete this test? This cannot be undone.')) return;
        setTests(prev => deriveMetrics(prev.filter(t => t.id !== testId)));
    };

    // Theme & Sync helpers
    const toggleDark = () => {
        const updated = { ...settings, dark: !settings.dark };
        setSettings(updated);
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); } catch (e) { }
    };

    const [showSyncModal, setShowSyncModal] = useState(false);
    const [firebaseForm, setFirebaseForm] = useState(settings.firebaseConfig || { apiKey: '', authDomain: '', databaseURL: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });

    const saveSyncConfig = () => {
        const updated = { ...settings, firebaseConfig: firebaseForm };
        setSettings(updated);
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); } catch (e) { }

        // Try to initialize firebase immediately so user can sign in without reloading
        if (window.firebase) {
            try {
                if (!firebase.apps.length) {
                    // Attempt init with provided config
                    firebase.initializeApp(firebaseForm);
                }

                // Optionally try a lightweight DB check if databaseURL provided
                if (firebaseForm.databaseURL) {
                    try {
                        firebase.database().ref('.info/connected').once('value').then(() => {
                            // connection probe succeeded
                        }).catch(() => { });
                    } catch (e) { }
                }
                alert('Firebase config saved and initialized. You can now enable sync and sign in.');
            } catch (e) {
                console.warn('Firebase init on save failed', e);
                alert('Firebase config saved, but initialization failed. You can still enable sync and try signing in — check console for details.');
            }
        } else {
            alert('Firebase config saved. SDK not loaded (check network).');
        }

        setShowSyncModal(false);
    };

    // Import / Export / Bulk Edit
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [bulkEditContent, setBulkEditContent] = useState('');

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(tests, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gate_tests_backup.json';
        a.click();
        window.URL.revokeObjectURL(url);
    };



    const openBulkEdit = () => {
        // Prepare CSV-like content for editing: ID, Name, Marks Obtained, Date
        // Or just JSON? JSON is safer for structure. Let's use JSON for now as it's robust.
        // User asked for "Bulk Edit" to paste data from Excel. CSV is better for Excel copy-paste.
        // Let's try a simple CSV format: ID, Name, Marks Obtained, Date
        const header = 'id,name,marks_obtained,date\n';
        const rows = tests.map(t => `${t.id},"${t.name.replace(/"/g, '""')}",${t.marks_obtained || ''},${t.date || ''}`).join('\n');
        setBulkEditContent(header + rows);
        setShowBulkEditModal(true);
    };

    const saveBulkEdit = () => {
        // Parse the CSV content
        const lines = bulkEditContent.trim().split('\n');
        const header = lines[0].split(','); // assume standard order
        // We only update matching IDs
        const updates = {};
        lines.slice(1).forEach(line => {
            // Simple CSV split (doesn't handle commas in quotes perfectly without a lib, but sufficient for simple bulk edits)
            // For robustness, let's assume user won't break the format too much or we use a regex.
            // Regex for CSV split: /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
            if (cols[0]) {
                updates[cols[0]] = {
                    marks_obtained: cols[2],
                    date: cols[3]
                };
            }
        });

        setTests(prev => deriveMetrics(prev.map(t => {
            if (updates[t.id]) {
                return { ...t, ...updates[t.id], updatedAt: Date.now() };
            }
            return t;
        })));
        setShowBulkEditModal(false);
    };

    const testFirebaseConnection = async () => {
        if (!window.firebase) {
            alert('Firebase SDK not loaded (network issue).');
            return;
        }
        try {
            // attempt init in a safe way
            if (!firebase.apps.length) firebase.initializeApp(firebaseForm);
            // if databaseURL provided, try a light probe
            if (firebaseForm.databaseURL) {
                try {
                    await firebase.database().ref('.info/connected').once('value');
                    alert('Test OK: Realtime Database reachable (or reachable enough to read .info/connected).');
                } catch (e) {
                    console.warn('DB probe failed', e);
                    alert('Initialization succeeded, but DB probe failed (check databaseURL & rules). See console for details.');
                }
            } else {
                alert('Firebase initialized (no databaseURL provided). Authentication will work; Realtime Database features need databaseURL.');
            }
        } catch (e) {
            console.warn('Firebase test failed', e);
            alert('Firebase initialization failed. Check the config and console for details.');
        }
    };

    const saveAndEnableSync = () => {
        // Save config and immediately enable sync
        const updated = { ...settings, firebaseConfig: firebaseForm, syncEnabled: true };
        setSettings(updated);
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); } catch (e) { }

        if (window.firebase) {
            try {
                if (!firebase.apps.length) firebase.initializeApp(firebaseForm);
                alert('Sync enabled and Firebase initialized. Please sign in to start syncing.');
            } catch (e) {
                console.warn('Failed to init firebase on save & enable', e);
                alert('Saved settings but failed to initialize Firebase. Open Sync settings to retry.');
            }
        } else {
            alert('Settings saved. Firebase SDK not loaded in this session. You can still sign in after reloading the page.');
        }

        setShowSyncModal(false);
    };

    const toggleSyncEnabled = () => {
        const enabled = !settings.syncEnabled;
        // If enabling but no firebaseConfig, prompt user to add
        if (enabled && (!settings.firebaseConfig || !settings.firebaseConfig.apiKey)) {
            setShowSyncModal(true);
            return;
        }

        const updated = { ...settings, syncEnabled: enabled };
        setSettings(updated);
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); } catch (e) { }

        if (!enabled) {
            // disabling sync: detach listeners
            if (firebaseRef.current && window.firebase) {
                try { firebase.database().ref(`users/${firebaseRef.current.uid}/tests`).off(); } catch (e) { }
            }
            alert('Sync disabled. Local data remains on this device.');
        } else {
            // enabling: ensure firebase is initialized
            if (window.firebase && settings.firebaseConfig) {
                try {
                    if (!firebase.apps.length) firebase.initializeApp(settings.firebaseConfig);
                    alert('Sync enabled. If you are signed in, data will be pushed to your account.');
                } catch (e) {
                    console.warn('Firebase init when enabling sync failed', e);
                    alert('Sync enabled in settings, but Firebase initialization failed. Open Sync settings to verify the config.');
                }
            }
        }
    };



    const performRandomPick = () => {
        let pool = tests.slice();
        if (randomOptions.useCurrentFilters) {
            pool = filteredTests;
        } else {
            if (randomOptions.platform) pool = pool.filter(t => t.platform === randomOptions.platform);
            if (randomOptions.subject) pool = pool.filter(t => t.subject === randomOptions.subject);
            if (randomOptions.type) pool = pool.filter(t => t.type === randomOptions.type);
            if (randomOptions.status) pool = pool.filter(t => t.status === randomOptions.status);
        }
        pool = pool.filter(t => t.status !== 'Completed');
        if (!pool.length) { alert('No tests match the selected filters.'); return; }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setPickedRandom(pick);
    };

    if (loading) {
        return (
            <div className="container">
                <header>
                    <h1>GATE Test Manager</h1>
                    <p className="subtitle">Loading test data...</p>
                </header>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <header>
                    <h1>GATE Test Manager</h1>
                    <p className="subtitle" style={{ color: '#e53e3e' }}>Error loading data: {error}</p>
                </header>
            </div>
        );
    }



    const handleImportJSON = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    if (confirm(`Importing ${imported.length} tests. This will MERGE with your current data (updating existing IDs, adding new ones). Continue?`)) {
                        setTests(prev => deriveMetrics(mergeTests(prev, imported)));
                        alert('Import successful!');
                    }
                } else {
                    alert('Invalid JSON format: Expected an array of tests.');
                }
            } catch (err) {
                alert('Failed to parse JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // reset input
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target.result;
                const parsed = parseCSV(csv);
                if (parsed && parsed.length > 0) {
                    if (confirm(`Importing ${parsed.length} tests from CSV. This will MERGE with your current data. Continue?`)) {
                        setTests(prev => deriveMetrics(mergeTests(prev, parsed)));
                        alert('Import successful!');
                    }
                } else {
                    alert('No valid data found in CSV.');
                }
            } catch (err) {
                alert('Failed to parse CSV: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // reset input
    };

    const handleResetData = () => {
        if (confirm('Are you sure you want to RESET all data to the default seed? This will erase your local changes unless you have synced them.')) {
            setLoading(true);
            localStorage.removeItem(STORAGE_KEY);
            loadFromManifest();
            alert('Data reset to default seed (reloaded from server).');
        }
    };


    const Header = window.AppComponents?.Header || (() => null);
    const Table = window.AppComponents?.Table || (() => null);
    const Analytics = window.AppComponents?.Analytics || (() => null);
    const Sidebar = window.AppComponents?.Sidebar || (() => null);

    return (
        <div className="app-layout">
            <Sidebar 
                currentView={currentView}
                setCurrentView={setCurrentView}
                toggleDark={toggleDark}
                settings={settings}
                onSignOut={() => { try { firebase.auth().signOut(); } catch (e) { } }}
                user={user}
            />
            
            <main className="main-content">
                <Header
                    openAddModal={openAddModal}
                    settings={settings}
                    setShowSyncModal={setShowSyncModal}
                    user={user}
                    onSignIn={() => {
                        if (!settings.firebaseConfig) { alert('Please configure Firebase in Sync settings first.'); setShowSyncModal(true); return; }
                        try {
                            const provider = new firebase.auth.GoogleAuthProvider();
                            firebase.auth().signInWithPopup(provider).catch(err => {
                                if (err.code === 'auth/configuration-not-found') {
                                    alert('Sign-in failed: Google Sign-In is not enabled in your Firebase Console.\n\nGo to Firebase Console > Authentication > Sign-in method, and enable "Google".');
                                } else if (err.code === 'auth/unauthorized-domain') {
                                    alert('Sign-in failed: This domain is not authorized.\n\nGo to Firebase Console > Authentication > Settings > Authorized domains, and add this domain (e.g., localhost or your custom domain).');
                                } else {
                                    alert('Sign-in failed: ' + err.message);
                                }
                            });
                        } catch (e) { alert('Firebase not initialized. Open Sync settings to configure.'); setShowSyncModal(true); }
                    }}
                    onSignOut={() => { try { firebase.auth().signOut(); } catch (e) { } }}
                    onExport={handleExportJSON}
                    onImport={handleImportJSON}
                    onImportCSV={handleImportCSV}
                    onReset={handleResetData}
                    onBulkEdit={openBulkEdit}
                />

                {currentView === 'dashboard' ? (
                    <Table
                        metrics={metrics}
                        filters={filters}
                        uniqueValues={uniqueValues}
                        handleFilterChange={handleFilterChange}
                        clearFilters={clearFilters}
                        pickRandomTest={pickRandomTest}
                        downloadCSV={downloadCSV}
                        tests={filteredTests}
                        editingCell={editingCell}
                        setEditingCell={setEditingCell}
                        onEdit={openEditModal}
                        onDelete={deleteTest}
                        visibleColumns={visibleColumns}
                        toggleColumn={toggleColumn}
                        allColumns={ALL_COLUMNS}
                        onCellEdit={handleCellEdit}
                    />
                ) : (
                    <Analytics tests={tests} />
                )}
            </main>

            {/* Modals */}
            <div className={`modal ${showAddModal ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal')) setShowAddModal(false); }}>
                <div className="modal-content">
                    <h2>Add New Test</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Platform</label>
                            <select 
                                value={showNewPlatformInput ? 'Other' : newTest.platform} 
                                onChange={e => {
                                    if(e.target.value === 'Other') setShowNewPlatformInput(true);
                                    else { setShowNewPlatformInput(false); setNewTest({...newTest, platform: e.target.value}); }
                                }}
                            >
                                <option value="">Select Platform</option>
                                {uniqueValues.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                                <option value="Other">Other (Add New)</option>
                            </select>
                            {showNewPlatformInput && (
                                <input 
                                    type="text" 
                                    placeholder="Enter new platform" 
                                    value={newTest.platformNew || ''} 
                                    onChange={e => setNewTest({...newTest, platformNew: e.target.value})}
                                />
                            )}
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <select 
                                value={showNewSubjectInput ? 'Other' : newTest.subject} 
                                onChange={e => {
                                    if(e.target.value === 'Other') setShowNewSubjectInput(true);
                                    else { setShowNewSubjectInput(false); setNewTest({...newTest, subject: e.target.value}); }
                                }}
                            >
                                <option value="">Select Subject</option>
                                {uniqueValues.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="Other">Other (Add New)</option>
                            </select>
                            {showNewSubjectInput && (
                                <input 
                                    type="text" 
                                    placeholder="Enter new subject" 
                                    value={newTest.subjectNew || ''} 
                                    onChange={e => setNewTest({...newTest, subjectNew: e.target.value})}
                                />
                            )}
                        </div>
                        <div className="form-group full-width">
                            <label>Test Name</label>
                            <input type="text" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} placeholder="e.g. Full Length Test 1" />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" value={newTest.date} onChange={e => setNewTest({...newTest, date: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select 
                                value={showNewTypeInput ? 'Other' : newTest.type} 
                                onChange={e => {
                                    if(e.target.value === 'Other') setShowNewTypeInput(true);
                                    else { setShowNewTypeInput(false); setNewTest({...newTest, type: e.target.value}); }
                                }}
                            >
                                <option value="">Select Type</option>
                                {uniqueValues.types.map(t => <option key={t} value={t}>{t}</option>)}
                                <option value="Other">Other (Add New)</option>
                            </select>
                            {showNewTypeInput && (
                                <input 
                                    type="text" 
                                    placeholder="Enter new type" 
                                    value={newTest.typeNew || ''} 
                                    onChange={e => setNewTest({...newTest, typeNew: e.target.value})}
                                />
                            )}
                        </div>
                        <div className="form-group">
                            <label>Total Marks</label>
                            <input type="number" value={newTest.marks} onChange={e => setNewTest({...newTest, marks: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Questions</label>
                            <input type="number" value={newTest.questions} onChange={e => setNewTest({...newTest, questions: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Time (mins)</label>
                            <input type="number" value={newTest.time} onChange={e => setNewTest({...newTest, time: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select value={newTest.status} onChange={e => setNewTest({...newTest, status: e.target.value})}>
                                <option value="Not Started">Not Started</option>
                                <option value="Test Given">Test Given</option>
                                <option value="Analysis Pending">Analysis Pending</option>
                                <option value="Analysis Done">Analysis Done</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label>Syllabus / Topics</label>
                            <textarea value={newTest.syllabus} onChange={e => setNewTest({...newTest, syllabus: e.target.value})} rows="2"></textarea>
                        </div>
                        <div className="form-group full-width">
                            <label>Link</label>
                            <input type="text" value={newTest.link} onChange={e => setNewTest({...newTest, link: e.target.value})} placeholder="https://..." />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={addNewTest}>Add Test</button>
                    </div>
                </div>
            </div>

            <div className={`modal ${showEditModal ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal')) setShowEditModal(false); }}>
                <div className="modal-content">
                    <h2>Edit Test</h2>
                    {editingTest && (
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Test Name</label>
                                <input type="text" value={editingTest.name} onChange={e => setEditingTest({...editingTest, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Marks Obtained</label>
                                <input type="number" value={editingTest.marks_obtained} onChange={e => setEditingTest({...editingTest, marks_obtained: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Total Marks</label>
                                <input type="number" value={editingTest.marks} onChange={e => setEditingTest({...editingTest, marks: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Rank</label>
                                <input type="number" value={editingTest.rank} onChange={e => setEditingTest({...editingTest, rank: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Percentile</label>
                                <input type="number" value={editingTest.percentile} onChange={e => setEditingTest({...editingTest, percentile: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={editingTest.status} onChange={e => setEditingTest({...editingTest, status: e.target.value})}>
                                    {uniqueValues.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group full-width">
                                <label>Remarks</label>
                                <textarea value={editingTest.remarks} onChange={e => setEditingTest({...editingTest, remarks: e.target.value})} rows="3"></textarea>
                            </div>
                        </div>
                    )}
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={saveEditedTest}>Save Changes</button>
                    </div>
                </div>
            </div>

            <div className={`modal ${showSyncModal ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal')) setShowSyncModal(false); }}>
                <div className="modal-content">
                    <h2>Sync Settings</h2>
                    <p className="mb-4">Configure Firebase to sync your data across devices.</p>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>API Key</label>
                            <input type="text" value={firebaseForm.apiKey} onChange={e => setFirebaseForm({...firebaseForm, apiKey: e.target.value})} />
                        </div>
                        <div className="form-group full-width">
                            <label>Auth Domain</label>
                            <input type="text" value={firebaseForm.authDomain} onChange={e => setFirebaseForm({...firebaseForm, authDomain: e.target.value})} />
                        </div>
                        <div className="form-group full-width">
                            <label>Database URL</label>
                            <input type="text" value={firebaseForm.databaseURL} onChange={e => setFirebaseForm({...firebaseForm, databaseURL: e.target.value})} />
                        </div>
                        <div className="form-group full-width">
                            <label>Project ID</label>
                            <input type="text" value={firebaseForm.projectId} onChange={e => setFirebaseForm({...firebaseForm, projectId: e.target.value})} />
                        </div>
                        <div className="form-group full-width">
                            <label>Storage Bucket</label>
                            <input type="text" value={firebaseForm.storageBucket} onChange={e => setFirebaseForm({...firebaseForm, storageBucket: e.target.value})} />
                        </div>
                        <div className="form-group full-width">
                            <label>Messaging Sender ID</label>
                            <input type="text" value={firebaseForm.messagingSenderId} onChange={e => setFirebaseForm({...firebaseForm, messagingSenderId: e.target.value})} />
                        </div>
                        <div className="form-group full-width">
                            <label>App ID</label>
                            <input type="text" value={firebaseForm.appId} onChange={e => setFirebaseForm({...firebaseForm, appId: e.target.value})} />
                        </div>
                    </div>
                    <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '24px' }}>
                        <div>
                            <button className="btn-secondary" onClick={testFirebaseConnection} style={{ marginRight: '8px' }}>Test Connection</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-secondary" onClick={() => setShowSyncModal(false)}>Close</button>
                            <button className="btn-secondary" onClick={saveSyncConfig}>Save Config</button>
                            <button className="btn-primary" onClick={saveAndEnableSync}>Save & Enable Sync</button>
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--md-sys-color-outline)', paddingTop: '16px' }}>
                        <div className="flex-between">
                            <span>Sync Status: <strong>{settings.syncEnabled ? 'Enabled' : 'Disabled'}</strong></span>
                            <button className="btn-secondary" onClick={toggleSyncEnabled}>
                                {settings.syncEnabled ? 'Disable Sync' : 'Enable Sync'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`modal ${showBulkEditModal ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal')) setShowBulkEditModal(false); }}>
                <div className="modal-content" style={{ maxWidth: '800px' }}>
                    <h2>Bulk Edit</h2>
                    <p className="mb-4">Paste CSV data here to update multiple tests. Format: <code>id,name,marks_obtained,date</code></p>
                    <textarea 
                        value={bulkEditContent} 
                        onChange={e => setBulkEditContent(e.target.value)} 
                        rows="15" 
                        style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre' }}
                    ></textarea>
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setShowBulkEditModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={saveBulkEdit}>Apply Changes</button>
                    </div>
                </div>
            </div>

            <div className={`modal ${showRandomModal ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal')) setShowRandomModal(false); }}>
                <div className="modal-content">
                    <h2>Pick Random Test</h2>
                    {!pickedRandom ? (
                        <>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" checked={randomOptions.useCurrentFilters} onChange={e => setRandomOptions({...randomOptions, useCurrentFilters: e.target.checked})} style={{ width: 'auto' }} />
                                    Use Current Dashboard Filters
                                </label>
                            </div>
                            {!randomOptions.useCurrentFilters && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Platform</label>
                                        <select value={randomOptions.platform} onChange={e => setRandomOptions({...randomOptions, platform: e.target.value})}>
                                            <option value="">Any</option>
                                            {uniqueValues.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Subject</label>
                                        <select value={randomOptions.subject} onChange={e => setRandomOptions({...randomOptions, subject: e.target.value})}>
                                            <option value="">Any</option>
                                            {uniqueValues.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setShowRandomModal(false)}>Cancel</button>
                                <button className="btn-primary" onClick={performRandomPick}>Pick Random</button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <span className="material-icons" style={{ fontSize: '48px', color: 'var(--md-sys-color-primary)', marginBottom: '16px' }}>casino</span>
                            <h3>{pickedRandom.name}</h3>
                            <p>{pickedRandom.platform} • {pickedRandom.subject}</p>
                            <div className="modal-actions" style={{ justifyContent: 'center' }}>
                                <button className="btn-secondary" onClick={() => setPickedRandom(null)}>Pick Another</button>
                                <button className="btn-primary" onClick={() => { setShowRandomModal(false); openEditModal(pickedRandom); }}>Start / Edit</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
// expose App to global scope so the bootstrap script can render it
window.App = App;
