window.AppComponents = window.AppComponents || {};
window.AppComponents.Table = function Table(props) {
    const { metrics, filters, uniqueValues, handleFilterChange, clearFilters, pickRandomTest, setShowAnalyticsModal, downloadCSV, filteredTests, editingCell, setEditingCell, handleCellEdit, updateTestStatus, openEditModal, deleteTest } = props;

    return (
        <>
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-label">Total Tests</div>
                    <div className="metric-value">{metrics.total}</div>
                </div>
                <div className="metric-card pending">
                    <div className="metric-label">Pending</div>
                    <div className="metric-value">{metrics.pending}</div>
                </div>
                <div className="metric-card completed">
                    <div className="metric-label">Completed</div>
                    <div className="metric-value">{metrics.completed}</div>
                </div>
                <div className="metric-card average">
                    <div className="metric-label">Average Score</div>
                    <div className="metric-value">{metrics.avgScore}</div>
                </div>
            </div>

            <div className="controls">
                <div className="filters">
                    <div className="filter-group">
                        <label>Platform</label>
                        <select value={filters.platform} onChange={e => handleFilterChange('platform', e.target.value)}>
                            <option value="">All Platforms</option>
                            {uniqueValues.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Subject</label>
                        <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)}>
                            <option value="">All Subjects</option>
                            {uniqueValues.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Type</label>
                        <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
                            <option value="">All Types</option>
                            {uniqueValues.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Status</label>
                        <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                            <option value="">All Status</option>
                            {uniqueValues.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Search</label>
                        <input 
                            type="text" 
                            placeholder="Search tests..." 
                            value={filters.search}
                            onChange={e => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                </div>
                <div className="actions">
                    <button className="btn-primary" onClick={pickRandomTest}>🎲 Pick Random Test</button>
                    <button className="btn-primary" onClick={() => setShowAnalyticsModal(true)}>📊 Analytics</button>
                    <button className="btn-secondary" onClick={downloadCSV}>📥 Download CSV</button>
                    <button className="btn-secondary" onClick={clearFilters}>🔄 Clear Filters</button>
                </div>
            </div>

            <div className="table-container">
                {filteredTests.length === 0 ? (
                    <div className="empty-state">
                        <p>No tests found matching your filters</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Platform</th>
                                <th>Test Name</th>
                                <th>Subject</th>
                                <th>Type</th>
                                <th>Q</th>
                                <th>Marks</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Obtained</th>
                                <th>Potential</th>
                                <th>% Marks</th>
                                <th>Percentile</th>
                                <th>Rank</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTests.map(test => (
                                <tr key={test.id}>
                                    <td style={{fontSize:12, color:'var(--muted)'}}>{String(test.id).slice(0,12)}</td>
                                    <td>{test.platform}</td>
                                    <td style={{fontWeight:700}}>{test.name}</td>
                                    <td>{test.subject}</td>
                                    <td>{test.type}</td>
                                    <td>{test.questions}</td>
                                    <td>{test.marks}</td>
                                    <td>{test.time}m</td>
                                    <td>
                                        <select 
                                            value={test.status}
                                            onChange={e => updateTestStatus(test.id, e.target.value)}
                                            style={{ 
                                                padding: '6px 10px', 
                                                borderRadius: '6px', 
                                                border: '1px solid #e2e8f0',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="Not Started">Not Started</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Test Given">Test Given</option>
                                            <option value="Analysis Pending">Analysis Pending</option>
                                            <option value="Analysis Done">Analysis Done</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </td>
                                    <td 
                                        className="editable-cell"
                                        onClick={() => setEditingCell({ id: test.id, field: 'marks_obtained' })}
                                    >
                                        {editingCell?.id === test.id && editingCell?.field === 'marks_obtained' ? (
                                            <input 
                                                type="number" 
                                                defaultValue={test.marks_obtained}
                                                onBlur={e => handleCellEdit(test.id, 'marks_obtained', e.target.value)}
                                                autoFocus
                                            />
                                        ) : (
                                            test.marks_obtained || '-'
                                        )}
                                    </td>
                                    <td 
                                        className="editable-cell"
                                        onClick={() => setEditingCell({ id: test.id, field: 'potential_marks' })}
                                    >
                                        {editingCell?.id === test.id && editingCell?.field === 'potential_marks' ? (
                                            <input 
                                                type="number" 
                                                defaultValue={test.potential_marks}
                                                onBlur={e => handleCellEdit(test.id, 'potential_marks', e.target.value)}
                                                autoFocus
                                            />
                                        ) : (
                                            test.potential_marks || '-'
                                        )}
                                    </td>
                                    <td>
                                        {test.percentMarks !== undefined && test.percentMarks !== '' ? `${test.percentMarks}%` : '-'}
                                    </td>
                                    <td>
                                        {test.percentile || '-'}
                                    </td>
                                    <td 
                                        className="editable-cell"
                                        onClick={() => setEditingCell({ id: test.id, field: 'rank' })}
                                    >
                                        {editingCell?.id === test.id && editingCell?.field === 'rank' ? (
                                            <input 
                                                type="text" 
                                                defaultValue={test.rank}
                                                onBlur={e => handleCellEdit(test.id, 'rank', e.target.value)}
                                                autoFocus
                                            />
                                        ) : (
                                            test.rank || '-'
                                        )}
                                    </td>
                                    <td style={{ display: 'flex', gap: 8 }}>
                                        <button 
                                            className="btn-secondary" 
                                            onClick={() => openEditModal(test)}
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            className="btn-secondary"
                                            onClick={() => deleteTest(test.id)}
                                            style={{ padding: '6px 12px', fontSize: '12px', background: '#fed7d7' }}
                                        >
                                            🗑 Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};
