window.AppComponents = window.AppComponents || {};
window.AppComponents.Table = function Table(props) {
    const { metrics, filters, uniqueValues, handleFilterChange, clearFilters, pickRandomTest, downloadCSV, filteredTests, editingCell, setEditingCell, handleCellEdit, updateTestStatus, openEditModal, deleteTest, visibleColumns, toggleColumn, allColumns } = props;
    const [showColumnMenu, setShowColumnMenu] = React.useState(false);

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

                    <button className="btn-secondary" onClick={downloadCSV}>📥 Download CSV</button>
                    <div style={{ position: 'relative' }}>
                        <button className="btn-secondary" onClick={() => setShowColumnMenu(!showColumnMenu)}>👁 Columns</button>
                        {showColumnMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '12px',
                                zIndex: 10,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                minWidth: '200px',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px'
                            }}>
                                {allColumns.map(col => (
                                    <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: col.locked ? 'not-allowed' : 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col.id)}
                                            onChange={() => toggleColumn(col.id)}
                                            disabled={col.locked}
                                        />
                                        {col.label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
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
                                {visibleColumns.includes('id') && <th>ID</th>}
                                {visibleColumns.includes('platform') && <th>Platform</th>}
                                {visibleColumns.includes('name') && <th>Test Name</th>}
                                {visibleColumns.includes('subject') && <th>Subject</th>}
                                {visibleColumns.includes('type') && <th>Type</th>}
                                {visibleColumns.includes('questions') && <th>Q</th>}
                                {visibleColumns.includes('marks') && <th>Marks</th>}
                                {visibleColumns.includes('time') && <th>Time</th>}
                                {visibleColumns.includes('status') && <th>Status</th>}
                                {visibleColumns.includes('marks_obtained') && <th>Obtained</th>}
                                {visibleColumns.includes('potential_marks') && <th>Potential</th>}
                                {visibleColumns.includes('percentMarks') && <th>% Marks</th>}
                                {visibleColumns.includes('percentile') && <th>Percentile</th>}
                                {visibleColumns.includes('rank') && <th>Rank</th>}
                                {visibleColumns.includes('actions') && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTests.map(test => (
                                <tr
                                    key={test.id}
                                    onClick={() => openEditModal(test)}
                                    style={{ cursor: 'pointer' }}
                                    title="Click to view/edit details"
                                >
                                    {visibleColumns.includes('id') && <td style={{ fontSize: 12, color: 'var(--muted)' }}>{String(test.id).slice(0, 12)}</td>}
                                    {visibleColumns.includes('platform') && <td>{test.platform}</td>}
                                    {visibleColumns.includes('name') && <td style={{ fontWeight: 700 }}>{test.name}</td>}
                                    {visibleColumns.includes('subject') && <td>{test.subject}</td>}
                                    {visibleColumns.includes('type') && <td>{test.type}</td>}
                                    {visibleColumns.includes('questions') && <td>{test.questions}</td>}
                                    {visibleColumns.includes('marks') && <td>{test.marks}</td>}
                                    {visibleColumns.includes('time') && <td>{test.time}</td>}
                                    {visibleColumns.includes('status') && (
                                        <td onClick={e => e.stopPropagation()}>
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
                                    )}
                                    {visibleColumns.includes('marks_obtained') && <td>{test.marks_obtained}</td>}
                                    {visibleColumns.includes('potential_marks') && <td>{test.potential_marks}</td>}
                                    {visibleColumns.includes('percentMarks') && (
                                        <td>
                                            {test.percentMarks !== undefined && test.percentMarks !== '' ? `${test.percentMarks}%` : '-'}
                                        </td>
                                    )}
                                    {visibleColumns.includes('percentile') && <td>{test.percentile}</td>}
                                    {visibleColumns.includes('rank') && <td>{test.rank}</td>}
                                    {visibleColumns.includes('actions') && (
                                        <td style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
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
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};
