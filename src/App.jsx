const { useState, useEffect, useMemo, useRef } = React;

// Load CSV from GitHub - FIXED: pointing to main branch
const GITHUB_CSV_URL = 'https://raw.githubusercontent.com/JignasaBhunia/gate-test-manager/main/tests_seed.csv';
const STORAGE_KEY = 'gate_tests_v1';
const SETTINGS_KEY = 'gate_tests_settings_v1';

function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i] || '';
        });
        return obj;
    });
}

// Compute percentile for each test based on marks_obtained / marks (as percentage)
// Derive percent marks and percentile for each test.
// If user supplies rank and total_students, percentile is computed from rank.
// Otherwise percentile is computed from percent-marks distribution across tests.
function deriveMetrics(arr) {
    try {
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

function App() {
    const MAX_COMPARE_USERS = 5; // only allow comparing up to this many users (free tier/support constraint)
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ platform: '', subject: '', type: '', status: '', search: '' });
    const [editingCell, setEditingCell] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTest, setNewTest] = useState({ platform: '', platformNew: '', name: '', date: '', type: '', subject: '', questions: '', marks: '', time: '', syllabus: '', link: '', remarks: '', status: 'Not Started', marks_obtained: '', potential_marks: '', percentile: '', rank: '' });
    const [settings, setSettings] = useState({ dark: false, syncEnabled: false, firebaseConfig: null });
    // Authenticated user (when using Firebase)
    const [user, setUser] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);
    const [selectedCompareUsers, setSelectedCompareUsers] = useState([]);
    const firebaseRef = useRef(null);
    const applyingRemote = useRef(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const analyticsRefs = useRef({ hist: null, pie: null, timeSeries: null });
    const [analyticsSubjects, setAnalyticsSubjects] = useState([]);
    const [analyticsAggregate, setAnalyticsAggregate] = useState('day'); // 'day' | 'week' | 'month'
    const [analyticsCombineMode, setAnalyticsCombineMode] = useState('combine'); // 'combine' or 'multi'
    const [showRandomModal, setShowRandomModal] = useState(false);
    const [pickedRandom, setPickedRandom] = useState(null);
    const [randomOptions, setRandomOptions] = useState({ platform: '', subject: '', type: '', status: '', useCurrentFilters: true });
    const [showNewPlatformInput, setShowNewPlatformInput] = useState(false);
    const [showNewSubjectInput, setShowNewSubjectInput] = useState(false);
    const [showNewTypeInput, setShowNewTypeInput] = useState(false);
    const [csvBlobUrl, setCsvBlobUrl] = useState(null);
    const analyticsCharts = useRef({});

    useEffect(() => {
        // load settings
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) setSettings(JSON.parse(raw));
        } catch (e) { console.warn('Could not parse settings', e); }

        // Load tests from localStorage first, fallback to CSV
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const local = JSON.parse(raw);
                setTests(deriveMetrics(local));
                setLoading(false);
                return;
            }
        } catch (e) {
            console.warn('Failed to read local storage', e);
        }

        console.log('Loading CSV from:', GITHUB_CSV_URL);
        fetch(GITHUB_CSV_URL)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.text();
            })
            .then(csv => {
                const parsedTests = parseCSV(csv);
                setTests(deriveMetrics(parsedTests));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading CSV:', err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    // Apply theme
    useEffect(() => {
        if (settings.dark) document.body.classList.add('dark'); else document.body.classList.remove('dark');
    }, [settings.dark]);

    // Persist tests locally and push to firebase (users/<uid>/tests) when enabled or logged in
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tests)); } catch (e) { console.warn('Could not save tests locally', e); }

        if ((settings.syncEnabled || user) && firebaseRef.current && !applyingRemote.current) {
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
                    // write basic public profile (opt-in)
                    try {
                        firebase.database().ref(`users/${u.uid}/profile`).update({ displayName: u.displayName || null, email: u.email || null, photoURL: u.photoURL || null, lastSeen: Date.now() });
                    } catch(e) { console.warn('profile write failed', e); }

                    // listen to user's tests
                    const dbRef = firebase.database().ref(`users/${u.uid}/tests`);
                    dbRef.on('value', snap => {
                        const remote = snap.val();
                        if (!remote) return;
                        applyingRemote.current = true;
                        setTests(deriveMetrics(remote));
                        setTimeout(() => { applyingRemote.current = false; }, 300);
                    });
                } else {
                    setUser(null);
                    firebaseRef.current = null;
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
            return true;
        });
    }, [tests, filters]);

    const metrics = useMemo(() => {
        const total = tests.length;
        const completedStatuses = ['Completed', 'Analysis Done'];
        const pendingStatuses = ['Pending', 'Not Started', 'Test Given', 'Analysis Pending'];
        const completed = tests.filter(t => completedStatuses.includes(t.status)).length;
        const pending = tests.filter(t => pendingStatuses.includes(t.status)).length;
        const notStarted = tests.filter(t => t.status === 'Not Started').length;
        
        const completedTests = tests.filter(t => t.marks_obtained !== undefined && t.marks_obtained !== null && t.marks_obtained !== '');
        const avgScore = completedTests.length > 0
            ? (completedTests.reduce((sum, t) => sum + (parseFloat(t.marks_obtained) || 0), 0) / completedTests.length).toFixed(1)
            : '0.0';

        return { total, completed, pending: pending + notStarted, avgScore };
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
        setFilters({ platform: '', subject: '', type: '', status: '', search: '' });
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
        return () => { try { if (csvBlobUrl) window.URL.revokeObjectURL(csvBlobUrl); } catch(e){} };
    }, [tests]);

    const updateTestStatus = (testId, newStatus) => {
        setTests(prev => prev.map(test => 
            test.id === testId ? { ...test, status: newStatus } : test
        ));
    };

    const handleCellEdit = (testId, field, value) => {
        setTests(prev => deriveMetrics(prev.map(test => 
            test.id === testId ? { ...test, [field]: value } : test
        )));
        setEditingCell(null);
    };

    const openEditModal = (test) => {
        setEditingTest({...test});
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
        const id = String(Date.now()) + '-' + Math.floor(Math.random()*1000);
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
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); } catch (e) {}
    };

    const [showSyncModal, setShowSyncModal] = useState(false);
    const [firebaseForm, setFirebaseForm] = useState(settings.firebaseConfig || { apiKey:'', authDomain:'', databaseURL:'', projectId:'', storageBucket:'', messagingSenderId:'', appId:'' });

    const saveSyncConfig = () => {
        const updated = { ...settings, firebaseConfig: firebaseForm };
        setSettings(updated);
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); } catch (e) {}
        alert('Firebase config saved. Now enable sync to start.');
        setShowSyncModal(false);
    };

    const toggleSyncEnabled = () => {
        const updated = { ...settings, syncEnabled: !settings.syncEnabled };
        setSettings(updated);
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)); } catch (e) {}
        if (!updated.syncEnabled) {
            // disabling sync: detach listeners
            if (firebaseRef.current && window.firebase) {
                try { firebase.database().ref(`gate_tests/${firebaseRef.current.uid}`).off(); } catch (e) {}
            }
        } else {
            if (!settings.firebaseConfig) setShowSyncModal(true);
        }
    };

    // Fetch list of users (for comparison) - limited to first 10 for safety
    const fetchOtherUsers = async () => {
        if (!window.firebase) return;
        try {
            const snap = await firebase.database().ref('users').limitToFirst(10).once('value');
            const val = snap.val() || {};
            const arr = Object.keys(val).map(k => ({ uid: k, displayName: (val[k].profile && (val[k].profile.displayName || val[k].profile.email)) || k }));
            setOtherUsers(arr);
        } catch (e) { console.warn('Failed to fetch users', e); }
    };

    // Draw analytics charts (histogram and platform pie). If compare UIDs provided, fetch their tests and include as datasets.
    const drawAnalyticsCharts = async () => {
        try {
            // prepare base dataset (current user's tests)
            const makeScoreArray = (arr) => arr.map(t => {
                const mGot = parseFloat(t.marks_obtained);
                const mTot = parseFloat(t.marks);
                if (!isNaN(mGot) && !isNaN(mTot) && mTot > 0) return (mGot / mTot) * 100;
                if (!isNaN(mGot)) return mGot;
                return null;
            }).filter(v => v !== null && !isNaN(v));

            const datasets = [];
            const labels = [];

            // helper to compute histogram buckets
            const computeBuckets = (scores, bucketCount = 10) => {
                if (!scores.length) return {labels:[], counts:[]};
                const min = 0;
                const max = 100;
                const size = (max - min) / bucketCount;
                const counts = Array(bucketCount).fill(0);
                scores.forEach(s => {
                    const idx = Math.min(bucketCount - 1, Math.floor((s - min) / size));
                    if (idx >= 0 && idx < bucketCount) counts[idx]++;
                });
                const lab = counts.map((c,i) => `${Math.round(min + i*size)}-${Math.round(min + (i+1)*size)}`);
                return { labels: lab, counts };
            };

            // current (local) tests
            const baseScores = makeScoreArray(tests);
            const baseBuckets = computeBuckets(baseScores);
            labels.push(...baseBuckets.labels);
            datasets.push({ label: 'You', data: baseBuckets.counts, backgroundColor: 'rgba(66,153,225,0.6)' });

            // fetch and add compare users datasets
            for (let uid of selectedCompareUsers) {
                try {
                    const snap = await firebase.database().ref(`users/${uid}/tests`).once('value');
                    const t = snap.val() || [];
                    const scores = makeScoreArray(t);
                    const buckets = computeBuckets(scores);
                    datasets.push({ label: `User ${uid}`, data: buckets.counts, backgroundColor: `rgba(${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},0.6)` });
                } catch (e) { console.warn('Failed fetch user tests', e); }
            }

            // Render histogram
            try {
                const ctx = document.getElementById('chartHistogram')?.getContext('2d');
                if (ctx) {
                    if (analyticsRefs.current.hist) analyticsRefs.current.hist.destroy();
                    analyticsRefs.current.hist = new Chart(ctx, {
                        type: 'bar',
                        data: { labels: baseBuckets.labels, datasets },
                        options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
                    });
                }
            } catch (e) { console.warn('Histogram render failed', e); }

            // Platform pie chart
            const platformCounts = {};
            tests.forEach(t => { platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1; });
            try {
                const ctx2 = document.getElementById('chartPlatform')?.getContext('2d');
                if (ctx2) {
                    if (analyticsRefs.current.pie) analyticsRefs.current.pie.destroy();
                    analyticsRefs.current.pie = new Chart(ctx2, {
                        type: 'pie',
                        data: { labels: Object.keys(platformCounts), datasets: [{ data: Object.values(platformCounts), backgroundColor: Object.keys(platformCounts).map((_,i)=>`hsl(${i*60},70%,60%)` ) }] },
                        options: { responsive: true }
                    });
                }
            } catch (e) { console.warn('Platform pie render failed', e); }

            // Time-series chart (percentMarks over time + marks-lost)
            try {
                const dateAgg = {};
                tests.forEach(t => {
                    if (analyticsSubject && analyticsSubject !== '' && t.subject !== analyticsSubject) return;
                    if (!t.date) return;
                    const d = new Date(t.date);
                    if (isNaN(d)) return;
                    const key = d.toISOString().slice(0,10);
                    const pm = parseFloat(t.percentMarks);
                    const mGot = parseFloat(t.marks_obtained);
                    const potential = (t.potential_marks !== undefined && t.potential_marks !== '') ? parseFloat(t.potential_marks) : parseFloat(t.marks);
                    const marksLost = (!isNaN(potential) && !isNaN(mGot)) ? (potential - mGot) : null;
                    if (!dateAgg[key]) dateAgg[key] = { count:0, sumPm:0, sumLost:0, lostCount:0 };
                    if (!isNaN(pm)) { dateAgg[key].count++; dateAgg[key].sumPm += pm; }
                    if (marksLost !== null && !isNaN(marksLost)) { dateAgg[key].sumLost += marksLost; dateAgg[key].lostCount++; }
                });

                const dates = Object.keys(dateAgg).sort();
                const labelsTS = dates;
                const dataPm = dates.map(d => dateAgg[d].count ? parseFloat((dateAgg[d].sumPm / dateAgg[d].count).toFixed(1)) : null);
                const dataLost = dates.map(d => dateAgg[d].lostCount ? parseFloat((dateAgg[d].sumLost / dateAgg[d].lostCount).toFixed(1)) : null);

                const ctx3 = document.getElementById('chartTimeSeries')?.getContext('2d');
                if (ctx3) {
                    if (analyticsRefs.current.timeSeries) analyticsRefs.current.timeSeries.destroy();
                    analyticsRefs.current.timeSeries = new Chart(ctx3, {
                        type: 'line',
                        data: {
                            labels: labelsTS,
                            datasets: [
                                { label: 'Percent Marks (avg)', data: dataPm, borderColor: 'rgba(66,153,225,0.9)', backgroundColor: 'rgba(66,153,225,0.2)', yAxisID: 'y' },
                                { label: 'Marks Lost (avg)', data: dataLost, borderColor: 'rgba(229,62,62,0.9)', backgroundColor: 'rgba(229,62,62,0.2)', yAxisID: 'y2' }
                            ]
                        },
                        options: {
                            responsive:true,
                            interaction: { mode:'index', intersect:false },
                            plugins: { legend: { position: 'top' } },
                            scales: {
                                x: { title: { display: true, text: 'Date' } },
                                y: { type:'linear', display:true, position:'left', title: { display:true, text:'Percent Marks (%)' }, beginAtZero:true, max:100 },
                                y2: { type:'linear', display:true, position:'right', title: { display:true, text:'Marks Lost' }, beginAtZero:true, grid: { drawOnChartArea:false } }
                            }
                        }
                    });
                }
            } catch(e) { console.warn('Time series render failed', e); }

        } catch (e) { console.warn('drawAnalyticsCharts failed', e); }
    };

    useEffect(() => {
        if (!showAnalyticsModal) return;
        // ensure other users loaded
        fetchOtherUsers();
        // draw charts
        drawAnalyticsCharts();
    }, [showAnalyticsModal, tests, selectedCompareUsers, analyticsSubjects, analyticsAggregate, analyticsCombineMode]);

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

    const Header = window.AppComponents?.Header || (() => null);
    const Table = window.AppComponents?.Table || (() => null);

    return (
        <div className="container">
            <Header
                openAddModal={openAddModal}
                toggleDark={toggleDark}
                settings={settings}
                setShowSyncModal={setShowSyncModal}
                user={user}
                onSignIn={() => {
                    if (!settings.firebaseConfig) { alert('Please configure Firebase in Sync settings first.'); setShowSyncModal(true); return; }
                    try {
                        const provider = new firebase.auth.GoogleAuthProvider();
                        firebase.auth().signInWithPopup(provider).catch(err => alert('Sign-in failed: ' + err.message));
                    } catch (e) { alert('Firebase not initialized. Open Sync settings to configure.'); setShowSyncModal(true); }
                }}
                onSignOut={() => { try { firebase.auth().signOut(); } catch(e){} }}
            />

            <Table
                metrics={metrics}
                filters={filters}
                uniqueValues={uniqueValues}
                handleFilterChange={handleFilterChange}
                clearFilters={clearFilters}
                pickRandomTest={pickRandomTest}
                setShowAnalyticsModal={setShowAnalyticsModal}
                downloadCSV={downloadCSV}
                filteredTests={filteredTests}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                handleCellEdit={handleCellEdit}
                updateTestStatus={updateTestStatus}
                openEditModal={openEditModal}
                deleteTest={deleteTest}
            />

            {showEditModal && (
                <div className="modal active">
                    <div className="modal-content">
                        <h2>Edit Test Details</h2>
                        <div className="form-group">
                            <label>Test Name</label>
                            <input 
                                type="text" 
                                value={editingTest.name}
                                onChange={e => setEditingTest({...editingTest, name: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input 
                                type="date" 
                                value={editingTest.date}
                                onChange={e => setEditingTest({...editingTest, date: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <input 
                                type="text" 
                                value={editingTest.subject}
                                onChange={e => setEditingTest({...editingTest, subject: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Questions</label>
                            <input 
                                type="number" 
                                value={editingTest.questions}
                                onChange={e => setEditingTest({...editingTest, questions: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Marks</label>
                            <input 
                                type="number" 
                                value={editingTest.marks}
                                onChange={e => setEditingTest({...editingTest, marks: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Time (minutes)</label>
                            <input 
                                type="number" 
                                value={editingTest.time}
                                onChange={e => setEditingTest({...editingTest, time: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Syllabus</label>
                            <textarea 
                                value={editingTest.syllabus}
                                onChange={e => setEditingTest({...editingTest, syllabus: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Link</label>
                            <input 
                                type="url" 
                                value={editingTest.link}
                                onChange={e => setEditingTest({...editingTest, link: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Remarks</label>
                            <textarea 
                                value={editingTest.remarks}
                                onChange={e => setEditingTest({...editingTest, remarks: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Rank</label>
                            <input type="number" min="1" value={editingTest.rank || ''} onChange={e => setEditingTest({...editingTest, rank: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Total Students</label>
                            <input type="number" min="1" value={editingTest.total_students || editingTest.totalStudents || ''} onChange={e => setEditingTest({...editingTest, total_students: e.target.value})} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={saveEditedTest}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showAddModal && (
                <div className="modal active">
                    <div className="modal-content">
                        <h2>Add New Test</h2>
                        <div className="form-group">
                            <label>Test Name</label>
                            <input type="text" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Platform</label>
                            <div style={{display:'flex', gap:8}}>
                                <select value={newTest.platform} onChange={e => setNewTest({...newTest, platform: e.target.value})}>
                                    <option value="">Select Platform</option>
                                    {uniqueValues.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <button className="btn-secondary" style={{padding:'8px 10px'}} onClick={() => setShowNewPlatformInput(v => !v)}>{showNewPlatformInput ? 'Cancel' : 'Add New'}</button>
                            </div>
                            {showNewPlatformInput && (
                                <div style={{marginTop:8}}>
                                    <input placeholder="New platform name" value={newTest.platformNew} onChange={e => setNewTest({...newTest, platformNew: e.target.value})} />
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <div style={{display:'flex', gap:8}}>
                                <select value={newTest.subject} onChange={e => setNewTest({...newTest, subject: e.target.value})}>
                                    <option value="">Select Subject</option>
                                    {uniqueValues.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button className="btn-secondary" style={{padding:'8px 10px'}} onClick={() => setShowNewSubjectInput(v => !v)}>{showNewSubjectInput ? 'Cancel' : 'Add New'}</button>
                            </div>
                            {showNewSubjectInput && (
                                <div style={{marginTop:8}}>
                                    <input placeholder="New subject" value={newTest.subjectNew} onChange={e => setNewTest({...newTest, subjectNew: e.target.value})} />
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <div style={{display:'flex', gap:8}}>
                                <select value={newTest.type} onChange={e => setNewTest({...newTest, type: e.target.value})}>
                                    <option value="">Select Type</option>
                                    {uniqueValues.types.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button className="btn-secondary" style={{padding:'8px 10px'}} onClick={() => setShowNewTypeInput(v => !v)}>{showNewTypeInput ? 'Cancel' : 'Add New'}</button>
                            </div>
                            {showNewTypeInput && (
                                <div style={{marginTop:8}}>
                                    <input placeholder="New type" value={newTest.typeNew} onChange={e => setNewTest({...newTest, typeNew: e.target.value})} />
                                </div>
                            )}
                        </div>
                        <div className="form-group"><label>Date</label><input type="date" value={newTest.date} onChange={e => setNewTest({...newTest, date: e.target.value})} /></div>
                        <div className="form-group"><label>Questions</label><input type="number" value={newTest.questions} onChange={e => setNewTest({...newTest, questions: e.target.value})} /></div>
                        <div className="form-group"><label>Marks</label><input type="number" value={newTest.marks} onChange={e => setNewTest({...newTest, marks: e.target.value})} /></div>
                        <div className="form-group"><label>Time (minutes)</label><input type="number" value={newTest.time} onChange={e => setNewTest({...newTest, time: e.target.value})} /></div>
                        <div className="form-group"><label>Remarks</label><textarea value={newTest.remarks} onChange={e => setNewTest({...newTest, remarks: e.target.value})} /></div>
                        <div className="form-group"><label>Rank</label><input type="number" min="1" value={newTest.rank} onChange={e => setNewTest({...newTest, rank: e.target.value})} /></div>
                        <div className="form-group"><label>Total Students</label><input type="number" min="1" value={newTest.total_students} onChange={e => setNewTest({...newTest, total_students: e.target.value})} /></div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={addNewTest}>Add Test</button>
                        </div>
                    </div>
                </div>
            )}

            {showAnalyticsModal && (
                <div className="modal active">
                    <div className="modal-content" style={{maxWidth: '900px'}}>
                        <h2>Analytics Dashboard</h2>
                        <p style={{color:'var(--muted)'}}>Score distribution and platform breakdown. You can compare with other users (requires Firebase users to be present).</p>
                        <div style={{display:'flex', gap:12, marginBottom:12}}>
                            <div style={{flex:1}}>
                                <label style={{display:'block', marginBottom:6}}>Compare with users</label>
                                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                                    <select multiple style={{minHeight:80, width:'100%'}} value={selectedCompareUsers} onChange={e => setSelectedCompareUsers(Array.from(e.target.selectedOptions).map(o=>o.value).slice(0, MAX_COMPARE_USERS))}>
                                        {otherUsers.map(u => <option key={u.uid} value={u.uid}>{u.displayName} ({u.uid.slice(0,6)})</option>)}
                                    </select>
                                </div>
                                <div style={{marginTop:8}}>
                                    <button className="btn-secondary" onClick={fetchOtherUsers}>Refresh Users</button>
                                </div>
                            </div>
                            <div style={{flex:1}}>
                                <label style={{display:'block', marginBottom:6}}>Summary</label>
                                <div style={{background:'var(--card)', padding:12, borderRadius:8}}>
                                    <div><strong>Total tests:</strong> {tests.length}</div>
                                    <div><strong>Average score:</strong> {metrics.avgScore}%</div>
                                    <div><strong>Platforms:</strong> {uniqueValues.platforms.join(', ')}</div>
                                </div>
                            </div>
                            <div style={{width:320, display:'flex', gap:8, alignItems:'center'}}>
                                <div style={{flex:1}}>
                                    <label style={{display:'block', marginBottom:6}}>Subjects</label>
                                    <select multiple value={analyticsSubjects} onChange={e => setAnalyticsSubjects(Array.from(e.target.selectedOptions).map(o=>o.value))} style={{minHeight:80, width:'100%'}}>
                                        {uniqueValues.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{width:140}}>
                                    <label style={{display:'block', marginBottom:6}}>Mode</label>
                                    <select value={analyticsCombineMode} onChange={e => setAnalyticsCombineMode(e.target.value)}>
                                        <option value="combine">Combine (avg)</option>
                                        <option value="multi">Multi-series</option>
                                    </select>
                                </div>
                                <div style={{width:120}}>
                                    <label style={{display:'block', marginBottom:6}}>Aggregate</label>
                                    <select value={analyticsAggregate} onChange={e => setAnalyticsAggregate(e.target.value)}>
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="month">Month</option>
                                    </select>
                                </div>
                                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                                    <button className="btn-secondary" onClick={() => {
                                        // export CSV of current time-series
                                        try {
                                            const chart = analyticsRefs.current.timeSeries;
                                            if (!chart) { alert('No time-series chart available yet'); return; }
                                            const labels = chart.data.labels || [];
                                            const datasets = chart.data.datasets || [];
                                            const rows = [ ['date', ...datasets.map(d=>d.label)] ];
                                            for (let i=0;i<labels.length;i++) rows.push([labels[i], ...datasets.map(d=> (d.data[i]===null||d.data[i]===undefined)?'':d.data[i])]);
                                            const csv = rows.map(r => r.map(c => (''+c).includes(',')?('"'+(''+c).replace(/"/g,'""')+'"'):(c||'')).join(',')).join('\n');
                                            const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a'); a.href = url; a.download = 'analytics_timeseries.csv'; a.click(); URL.revokeObjectURL(url);
                                        } catch(e){ alert('Export failed: '+e.message); }
                                    }}>Export CSV</button>
                                    <button className="btn-secondary" onClick={() => {
                                        try {
                                            const chart = analyticsRefs.current.timeSeries;
                                            if (!chart) { alert('No time-series chart available yet'); return; }
                                            const url = chart.toBase64Image();
                                            const a = document.createElement('a'); a.href = url; a.download = 'analytics_timeseries.png'; a.click();
                                        } catch(e){ alert('Export image failed: '+e.message); }
                                    }}>Export PNG</button>
                                </div>
                            </div>
                        </div>

                        <div style={{display:'grid', gridTemplateColumns:'1fr 360px', gap:16}}>
                            <div style={{background:'var(--card)', padding:12, borderRadius:8}}>
                                <canvas id="chartHistogram" width="800" height="300" />
                            </div>
                            <div style={{background:'var(--card)', padding:12, borderRadius:8}}>
                                <canvas id="chartPlatform" width="300" height="300" />
                            </div>
                        </div>

                        <div style={{background:'var(--card)', padding:12, borderRadius:8, marginTop:12}}>
                            <canvas id="chartTimeSeries" width="1000" height="280" />
                        </div>

                        <div className="modal-actions" style={{marginTop:16}}>
                            <button className="btn-secondary" onClick={() => setShowAnalyticsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {showRandomModal && (
                <div className="modal active">
                    <div className="modal-content">
                        <h2>Pick a Random Test</h2>
                        <div className="form-group">
                            <label><input type="checkbox" checked={randomOptions.useCurrentFilters} onChange={e => setRandomOptions({...randomOptions, useCurrentFilters: e.target.checked})} /> Use current filters</label>
                        </div>
                        {!randomOptions.useCurrentFilters && (
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                                <div className="form-group"><label>Platform</label>
                                    <select value={randomOptions.platform} onChange={e => setRandomOptions({...randomOptions, platform: e.target.value})}>
                                        <option value="">Any</option>
                                        {uniqueValues.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label>Subject</label>
                                    <select value={randomOptions.subject} onChange={e => setRandomOptions({...randomOptions, subject: e.target.value})}>
                                        <option value="">Any</option>
                                        {uniqueValues.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label>Type</label>
                                    <select value={randomOptions.type} onChange={e => setRandomOptions({...randomOptions, type: e.target.value})}>
                                        <option value="">Any</option>
                                        {uniqueValues.types.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label>Status</label>
                                    <select value={randomOptions.status} onChange={e => setRandomOptions({...randomOptions, status: e.target.value})}>
                                        <option value="">Any</option>
                                        {uniqueValues.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div style={{marginTop:12}}>
                            <button className="btn-primary" onClick={performRandomPick}>Pick</button>
                            <button className="btn-secondary" style={{marginLeft:8}} onClick={() => { setShowRandomModal(false); setPickedRandom(null); }}>Close</button>
                        </div>

                        {pickedRandom && (
                            <div style={{marginTop:12, background:'var(--card)', padding:12, borderRadius:8}}>
                                <h3>{pickedRandom.name}</h3>
                                <div><strong>Platform:</strong> {pickedRandom.platform}</div>
                                <div><strong>Subject:</strong> {pickedRandom.subject}</div>
                                <div style={{marginTop:8}}>
                                    <button className="btn-secondary" onClick={() => { openEditModal(pickedRandom); setShowRandomModal(false); }}>Open / Edit</button>
                                    <button className="btn-primary" style={{marginLeft:8}} onClick={() => { setTests(prev => prev.map(t => t.id === pickedRandom.id ? {...t, status:'Test Given', updatedAt: Date.now()} : t)); setShowRandomModal(false); }}>Mark as Given</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSyncModal && (
                <div className="modal active">
                    <div className="modal-content">
                        <h2>Sync Configuration</h2>
                        <p style={{color:'var(--muted)'}}>Paste your Firebase Web config below (create a Firebase project and enable Realtime Database if you want multi-device sync).</p>
                        <div className="form-group"><label>apiKey</label><input value={firebaseForm.apiKey} onChange={e => setFirebaseForm({...firebaseForm, apiKey: e.target.value})} /></div>
                        <div className="form-group"><label>authDomain</label><input value={firebaseForm.authDomain} onChange={e => setFirebaseForm({...firebaseForm, authDomain: e.target.value})} /></div>
                        <div className="form-group"><label>databaseURL</label><input value={firebaseForm.databaseURL} onChange={e => setFirebaseForm({...firebaseForm, databaseURL: e.target.value})} /></div>
                        <div className="form-group"><label>projectId</label><input value={firebaseForm.projectId} onChange={e => setFirebaseForm({...firebaseForm, projectId: e.target.value})} /></div>
                        <div className="form-group"><label>appId</label><input value={firebaseForm.appId} onChange={e => setFirebaseForm({...firebaseForm, appId: e.target.value})} /></div>
                        <div style={{display:'flex', gap:12, marginTop:12}}>
                            <button className="btn-secondary" onClick={() => setShowSyncModal(false)}>Close</button>
                            <button className="btn-primary" onClick={saveSyncConfig}>Save Config</button>
                            <button className="btn-secondary" onClick={toggleSyncEnabled}>{settings.syncEnabled ? 'Disable Sync' : 'Enable Sync'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// expose App to global scope so the bootstrap script can render it
window.App = App;
window.App = App;
