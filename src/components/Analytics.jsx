
const Analytics = ({ tests, otherUsers = [], user }) => {
    // State for filters
    const [analyticsSubject, setAnalyticsSubject] = React.useState('');
    const [analyticsPlatform, setAnalyticsPlatform] = React.useState('');
    const [analyticsType, setAnalyticsType] = React.useState('');
    const [analyticsStartDate, setAnalyticsStartDate] = React.useState('');
    const [analyticsEndDate, setAnalyticsEndDate] = React.useState('');
    const [analyticsAggregate, setAnalyticsAggregate] = React.useState('day'); // 'day' | 'week' | 'month'

    const analyticsRefs = React.useRef({ hist: null, pie: null, timeSeries: null, scatter: null });

    // Extract unique values for dropdowns
    const uniqueValues = React.useMemo(() => ({
        subjects: [...new Set(tests.map(t => t.subject).filter(Boolean))],
        platforms: [...new Set(tests.map(t => t.platform).filter(Boolean))],
        types: [...new Set(tests.map(t => t.type).filter(Boolean))]
    }), [tests]);

    // Filter tests based on all criteria
    const filteredTests = React.useMemo(() => {
        return tests.filter(t => {
            if (analyticsSubject && t.subject !== analyticsSubject) return false;
            if (analyticsPlatform && t.platform !== analyticsPlatform) return false;
            if (analyticsType && t.type !== analyticsType) return false;
            if (analyticsStartDate) {
                if (new Date(t.date) < new Date(analyticsStartDate)) return false;
            }
            if (analyticsEndDate) {
                if (new Date(t.date) > new Date(analyticsEndDate)) return false;
            }
            return true;
        });
    }, [tests, analyticsSubject, analyticsPlatform, analyticsType, analyticsStartDate, analyticsEndDate]);

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
        const lab = counts.map((c, i) => `${Math.round(min + i * size)}-${Math.round(min + (i + 1) * size)}%`);
        return { labels: lab, counts };
    };

    React.useEffect(() => {
        const drawCharts = () => {
            // 1. Histogram (Score Distribution)
            const baseScores = makeScoreArray(filteredTests);
            const baseBuckets = computeBuckets(baseScores);
            const ctxHist = document.getElementById('chartHistogram')?.getContext('2d');
            if (ctxHist) {
                if (analyticsRefs.current.hist) analyticsRefs.current.hist.destroy();
                analyticsRefs.current.hist = new Chart(ctxHist, {
                    type: 'bar',
                    data: {
                        labels: baseBuckets.labels,
                        datasets: [{
                            label: 'Test Count',
                            data: baseBuckets.counts,
                            backgroundColor: 'rgba(66, 153, 225, 0.6)',
                            borderColor: 'rgba(66, 153, 225, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Number of Tests' } },
                            x: { title: { display: true, text: 'Percentage Range' } }
                        }
                    }
                });
            }

            // 2. Platform Pie Chart
            const platformCounts = {};
            filteredTests.forEach(t => { platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1; });
            const ctxPie = document.getElementById('chartPlatform')?.getContext('2d');
            if (ctxPie) {
                if (analyticsRefs.current.pie) analyticsRefs.current.pie.destroy();
                analyticsRefs.current.pie = new Chart(ctxPie, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(platformCounts),
                        datasets: [{
                            data: Object.values(platformCounts),
                            backgroundColor: [
                                '#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565', '#ecc94b', '#667eea', '#ed64a6'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'right' }
                        }
                    }
                });
            }

            // 3. Time Series Chart (Avg Performance)
            const dateAgg = {};
            filteredTests.forEach(t => {
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
                if (!dateAgg[key]) dateAgg[key] = { count: 0, sumPm: 0 };
                if (!isNaN(pm)) { dateAgg[key].count++; dateAgg[key].sumPm += pm; }
            });

            const dates = Object.keys(dateAgg).sort();
            const dataPm = dates.map(d => dateAgg[d].count ? parseFloat((dateAgg[d].sumPm / dateAgg[d].count).toFixed(1)) : null);

            const ctxTS = document.getElementById('chartTimeSeries')?.getContext('2d');
            if (ctxTS) {
                if (analyticsRefs.current.timeSeries) analyticsRefs.current.timeSeries.destroy();
                analyticsRefs.current.timeSeries = new Chart(ctxTS, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Avg % Marks',
                            data: dataPm,
                            borderColor: '#4299e1',
                            backgroundColor: 'rgba(66, 153, 225, 0.1)',
                            fill: true,
                            tension: 0.3,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        interaction: { mode: 'index', intersect: false },
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { title: { display: true, text: 'Date' } },
                            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Average Percentage' } }
                        }
                    }
                });
            }

            // 4. Scatter Plot (Individual Test Performance)
            const scatterData = filteredTests
                .filter(t => t.date && t.percentMarks !== undefined && t.percentMarks !== null)
                .map(t => ({
                    x: new Date(t.date),
                    y: parseFloat(t.percentMarks),
                    testName: t.name,
                    platform: t.platform,
                    marks: `${t.marks_obtained} / ${t.marks}`
                }));

            const ctxScatter = document.getElementById('chartScatter')?.getContext('2d');
            if (ctxScatter) {
                if (analyticsRefs.current.scatter) analyticsRefs.current.scatter.destroy();
                analyticsRefs.current.scatter = new Chart(ctxScatter, {
                    type: 'scatter',
                    data: {
                        datasets: [{
                            label: 'Test Result',
                            data: scatterData,
                            backgroundColor: '#ed8936',
                            borderColor: '#dd6b20',
                            pointRadius: 6,
                            pointHoverRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const point = context.raw;
                                        return [
                                            `Test: ${point.testName}`,
                                            `Score: ${point.y}% (${point.marks})`,
                                            `Platform: ${point.platform}`,
                                            `Date: ${point.x.toLocaleDateString()}`
                                        ];
                                    }
                                }
                            },
                            legend: { display: false }
                        },
                        scales: {
                            x: {
                                type: 'time',
                                time: { unit: 'day' },
                                title: { display: true, text: 'Date' }
                            },
                            y: {
                                beginAtZero: true,
                                max: 100,
                                title: { display: true, text: 'Percentage' }
                            }
                        }
                    }
                });
            }
        };

        // Delay slightly to ensure DOM is ready
        setTimeout(drawCharts, 100);
    }, [filteredTests, analyticsAggregate]);

    return (
        <div className="analytics-container">
            <div className="controls" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Analytics Dashboard</h2>
                    <div className="filter-group">
                        <label>Aggregate Trend By</label>
                        <select value={analyticsAggregate} onChange={e => setAnalyticsAggregate(e.target.value)} style={{ width: '150px' }}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                </div>

                <div className="filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', background: 'var(--surface-variant)', padding: '16px', borderRadius: '8px' }}>
                    <div className="filter-group">
                        <label>Subject</label>
                        <select value={analyticsSubject} onChange={e => setAnalyticsSubject(e.target.value)}>
                            <option value="">All Subjects</option>
                            {uniqueValues.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Platform</label>
                        <select value={analyticsPlatform} onChange={e => setAnalyticsPlatform(e.target.value)}>
                            <option value="">All Platforms</option>
                            {uniqueValues.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Type</label>
                        <select value={analyticsType} onChange={e => setAnalyticsType(e.target.value)}>
                            <option value="">All Types</option>
                            {uniqueValues.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>From Date</label>
                        <input type="date" value={analyticsStartDate} onChange={e => setAnalyticsStartDate(e.target.value)} />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input type="date" value={analyticsEndDate} onChange={e => setAnalyticsEndDate(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                {/* Row 1: Scatter Plot (Full Width) */}
                <div className="chart-card" style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Individual Test Performance</h3>
                    <div style={{ position: 'relative', height: '400px', width: '100%' }}>
                        <canvas id="chartScatter"></canvas>
                    </div>
                </div>

                {/* Row 2: Trend Line (Full Width) */}
                <div className="chart-card" style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Average Performance Trend</h3>
                    <div style={{ position: 'relative', height: '350px', width: '100%' }}>
                        <canvas id="chartTimeSeries"></canvas>
                    </div>
                </div>

                {/* Row 3: Distribution & Platform (Half Width) */}
                <div className="chart-card" style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Score Distribution</h3>
                    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                        <canvas id="chartHistogram"></canvas>
                    </div>
                </div>

                <div className="chart-card" style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Platform Breakdown</h3>
                    <div style={{ position: 'relative', height: '300px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <canvas id="chartPlatform"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Analytics = Analytics;
