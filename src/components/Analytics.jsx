
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

    // Robust Date Parser
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        // Try ISO first
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        
        // Try DD-MM-YYYY or DD/MM/YYYY
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
            // Assume DD-MM-YYYY
            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    };

    // Filter tests based on all criteria
    const filteredTests = React.useMemo(() => {
        return tests.filter(t => {
            if (analyticsSubject && t.subject !== analyticsSubject) return false;
            if (analyticsPlatform && t.platform !== analyticsPlatform) return false;
            if (analyticsType && t.type !== analyticsType) return false;
            
            const tDate = parseDate(t.date);
            if (analyticsStartDate) {
                const sDate = new Date(analyticsStartDate);
                if (!tDate || tDate < sDate) return false;
            }
            if (analyticsEndDate) {
                const eDate = new Date(analyticsEndDate);
                if (!tDate || tDate > eDate) return false;
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
                            backgroundColor: 'rgba(103, 80, 164, 0.7)', // Material Primary
                            borderRadius: 4,
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Number of Tests' }, grid: { display: false } },
                            x: { title: { display: true, text: 'Percentage Range' }, grid: { display: false } }
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
                                '#6750A4', '#B3261E', '#7D5260', '#625B71', '#601410', '#49454F', '#21005D', '#31111D'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'right', labels: { usePointStyle: true } }
                        }
                    }
                });
            }

            // 3. Time Series Chart (Avg Performance)
            const dateAgg = {};
            filteredTests.forEach(t => {
                const d = parseDate(t.date);
                if (!d) return;

                let key;
                if (analyticsAggregate === 'week') {
                    const firstDay = new Date(d);
                    firstDay.setDate(d.getDate() - d.getDay());
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
                            borderColor: '#6750A4',
                            backgroundColor: 'rgba(103, 80, 164, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#6750A4'
                        }]
                    },
                    options: {
                        responsive: true,
                        interaction: { mode: 'index', intersect: false },
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { title: { display: true, text: 'Date' }, grid: { display: false } },
                            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Average Percentage' }, grid: { color: '#E7E0EC' } }
                        }
                    }
                });
            }

            // 4. Scatter Plot (Individual Test Performance)
            const scatterData = filteredTests
                .map(t => {
                    const d = parseDate(t.date);
                    if (!d || t.percentMarks === undefined || t.percentMarks === null) return null;
                    return {
                        x: d,
                        y: parseFloat(t.percentMarks),
                        testName: t.name,
                        platform: t.platform,
                        marks: `${t.marks_obtained} / ${t.marks}`
                    };
                })
                .filter(Boolean);

            const ctxScatter = document.getElementById('chartScatter')?.getContext('2d');
            if (ctxScatter) {
                if (analyticsRefs.current.scatter) analyticsRefs.current.scatter.destroy();
                analyticsRefs.current.scatter = new Chart(ctxScatter, {
                    type: 'scatter',
                    data: {
                        datasets: [{
                            label: 'Test Result',
                            data: scatterData,
                            backgroundColor: '#B3261E',
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
                                title: { display: true, text: 'Date' },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                max: 100,
                                title: { display: true, text: 'Percentage' },
                                grid: { color: '#E7E0EC' }
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
            <div className="controls card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="section-title">Analytics Dashboard</h2>
                    <div className="filter-group">
                        <label>Aggregate Trend By</label>
                        <select value={analyticsAggregate} onChange={e => setAnalyticsAggregate(e.target.value)} style={{ width: '150px' }}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                </div>

                <div className="filters-grid">
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

            <div className="charts-grid">
                {/* Row 1: Scatter Plot (Full Width) */}
                <div className="chart-card full-width">
                    <h3 className="chart-title">Individual Test Performance</h3>
                    <div className="chart-wrapper-lg">
                        <canvas id="chartScatter"></canvas>
                    </div>
                </div>

                {/* Row 2: Trend Line (Full Width) */}
                <div className="chart-card full-width">
                    <h3 className="chart-title">Average Performance Trend</h3>
                    <div className="chart-wrapper-md">
                        <canvas id="chartTimeSeries"></canvas>
                    </div>
                </div>

                {/* Row 3: Distribution & Platform (Half Width) */}
                <div className="chart-card">
                    <h3 className="chart-title">Score Distribution</h3>
                    <div className="chart-wrapper-sm">
                        <canvas id="chartHistogram"></canvas>
                    </div>
                </div>

                <div className="chart-card">
                    <h3 className="chart-title">Platform Breakdown</h3>
                    <div className="chart-wrapper-sm flex-center">
                        <canvas id="chartPlatform"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Analytics = Analytics;
