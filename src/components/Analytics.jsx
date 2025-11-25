
const Analytics = ({ tests, otherUsers = [], user }) => {
    const [analyticsSubject, setAnalyticsSubject] = React.useState('');
    const [analyticsAggregate, setAnalyticsAggregate] = React.useState('day'); // 'day' | 'week' | 'month'
    const analyticsRefs = React.useRef({ hist: null, pie: null, timeSeries: null });

    const subjects = React.useMemo(() => [...new Set(tests.map(t => t.subject).filter(Boolean))], [tests]);

    // Helper to get score array
    const makeScoreArray = (tList) => {
        return tList.map(t => {
            const mGot = parseFloat(t.marks_obtained);
            const mTot = parseFloat(t.marks);
            if (!isNaN(mGot) && !isNaN(mTot) && mTot > 0) return (mGot / mTot) * 100;
            if (!isNaN(mGot)) return mGot;
            return null;
        }).filter(v => v !== null && !isNaN(v));
    };

    // Helper to compute histogram buckets
    const computeBuckets = (scores, bucketCount = 10) => {
        if (!scores.length) return { labels: [], counts: [] };
        const min = 0;
        const max = 100;
        const size = (max - min) / bucketCount;
        const counts = Array(bucketCount).fill(0);
        scores.forEach(s => {
            const idx = Math.min(bucketCount - 1, Math.floor((s - min) / size));
            if (idx >= 0 && idx < bucketCount) counts[idx]++;
        });
        const lab = counts.map((c, i) => `${Math.round(min + i * size)}-${Math.round(min + (i + 1) * size)}`);
        return { labels: lab, counts };
    };

    React.useEffect(() => {
        const drawCharts = () => {
            // 1. Histogram
            const baseScores = makeScoreArray(tests);
            const baseBuckets = computeBuckets(baseScores);
            const datasets = [{ label: 'You', data: baseBuckets.counts, backgroundColor: 'rgba(66,153,225,0.6)' }];

            // Add other users if needed (omitted for now to keep it simple, can be added back if requested)

            const ctxHist = document.getElementById('chartHistogram')?.getContext('2d');
            if (ctxHist) {
                if (analyticsRefs.current.hist) analyticsRefs.current.hist.destroy();
                analyticsRefs.current.hist = new Chart(ctxHist, {
                    type: 'bar',
                    data: { labels: baseBuckets.labels, datasets },
                    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
                });
            }

            // 2. Platform Pie Chart
            const platformCounts = {};
            tests.forEach(t => { platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1; });
            const ctxPie = document.getElementById('chartPlatform')?.getContext('2d');
            if (ctxPie) {
                if (analyticsRefs.current.pie) analyticsRefs.current.pie.destroy();
                analyticsRefs.current.pie = new Chart(ctxPie, {
                    type: 'pie',
                    data: { labels: Object.keys(platformCounts), datasets: [{ data: Object.values(platformCounts), backgroundColor: Object.keys(platformCounts).map((_, i) => `hsl(${i * 60},70%,60%)`) }] },
                    options: { responsive: true }
                });
            }

            // 3. Time Series Chart
            const dateAgg = {};
            tests.forEach(t => {
                if (analyticsSubject && analyticsSubject !== '' && t.subject !== analyticsSubject) return;
                if (!t.date) return;
                const d = new Date(t.date);
                if (isNaN(d)) return;

                let key;
                if (analyticsAggregate === 'week') {
                    const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
                    key = firstDay.toISOString().slice(0, 10);
                } else if (analyticsAggregate === 'month') {
                    key = d.toISOString().slice(0, 7);
                } else {
                    key = d.toISOString().slice(0, 10);
                }

                const pm = parseFloat(t.percentMarks);
                const mGot = parseFloat(t.marks_obtained);
                const potential = (t.potential_marks !== undefined && t.potential_marks !== '') ? parseFloat(t.potential_marks) : parseFloat(t.marks);
                const marksLost = (!isNaN(potential) && !isNaN(mGot)) ? (potential - mGot) : null;

                if (!dateAgg[key]) dateAgg[key] = { count: 0, sumPm: 0, sumLost: 0, lostCount: 0 };
                if (!isNaN(pm)) { dateAgg[key].count++; dateAgg[key].sumPm += pm; }
                if (marksLost !== null && !isNaN(marksLost)) { dateAgg[key].sumLost += marksLost; dateAgg[key].lostCount++; }
            });

            const dates = Object.keys(dateAgg).sort();
            const dataPm = dates.map(d => dateAgg[d].count ? parseFloat((dateAgg[d].sumPm / dateAgg[d].count).toFixed(1)) : null);
            const dataLost = dates.map(d => dateAgg[d].lostCount ? parseFloat((dateAgg[d].sumLost / dateAgg[d].lostCount).toFixed(1)) : null);

            const ctxTS = document.getElementById('chartTimeSeries')?.getContext('2d');
            if (ctxTS) {
                if (analyticsRefs.current.timeSeries) analyticsRefs.current.timeSeries.destroy();
                analyticsRefs.current.timeSeries = new Chart(ctxTS, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [
                            { label: 'Percent Marks (avg)', data: dataPm, borderColor: 'rgba(66,153,225,0.9)', backgroundColor: 'rgba(66,153,225,0.2)', yAxisID: 'y', tension: 0.3 },
                            { label: 'Marks Lost (avg)', data: dataLost, borderColor: 'rgba(229,62,62,0.9)', backgroundColor: 'rgba(229,62,62,0.2)', yAxisID: 'y2', tension: 0.3 }
                        ]
                    },
                    options: {
                        responsive: true,
                        interaction: { mode: 'index', intersect: false },
                        plugins: { legend: { position: 'top' } },
                        scales: {
                            x: { title: { display: true, text: 'Date' } },
                            y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Percent Marks (%)' }, beginAtZero: true, max: 100 },
                            y2: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Marks Lost' }, beginAtZero: true, grid: { drawOnChartArea: false } }
                        }
                    }
                });
            }
        };

        // Delay slightly to ensure DOM is ready
        setTimeout(drawCharts, 100);
    }, [tests, analyticsSubject, analyticsAggregate]);

    return (
        <div className="analytics-container">
            <div className="controls" style={{ marginBottom: '24px' }}>
                <div className="filters" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="filter-group">
                        <label>Filter by Subject</label>
                        <select value={analyticsSubject} onChange={e => setAnalyticsSubject(e.target.value)}>
                            <option value="">All Subjects</option>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Aggregate By</label>
                        <select value={analyticsAggregate} onChange={e => setAnalyticsAggregate(e.target.value)}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                <div className="chart-card" style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Performance Over Time</h3>
                    <div style={{ position: 'relative', height: '400px', width: '100%' }}>
                        <canvas id="chartTimeSeries"></canvas>
                    </div>
                </div>

                <div className="chart-card" style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Score Distribution</h3>
                    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                        <canvas id="chartHistogram"></canvas>
                    </div>
                </div>

                <div className="chart-card" style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Test Platforms</h3>
                    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                        <canvas id="chartPlatform"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Analytics = Analytics;
