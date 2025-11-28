
const Table = ({ 
    tests, 
    onEdit, 
    onDelete, 
    filters, 
    handleFilterChange, 
    uniqueValues, 
    metrics, 
    clearFilters, 
    downloadCSV, 
    pickRandomTest,
    visibleColumns,
    setVisibleColumns,
    allColumns
}) => {
    const [showColumnModal, setShowColumnModal] = React.useState(false);

    const toggleColumn = (colId) => {
        const newCols = visibleColumns.includes(colId)
            ? visibleColumns.filter(id => id !== colId)
            : [...visibleColumns, colId];
        setVisibleColumns(newCols);
    };

    return (
        <div>
            {/* Metrics Grid */}
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
                    <div className="metric-label">Average %</div>
                    <div className="metric-value">{metrics.avgPercent}%</div>
                </div>
            </div>

            {/* Controls & Filters */}
            <div className="controls">
                <div className="filters-grid">
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
                    <div className="filter-group">
                        <label>From Date</label>
                        <input 
                            type="date" 
                            value={filters.startDate} 
                            onChange={e => handleFilterChange('startDate', e.target.value)} 
                        />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input 
                            type="date" 
                            value={filters.endDate} 
                            onChange={e => handleFilterChange('endDate', e.target.value)} 
                        />
                    </div>
                </div>

                <div className="actions">
                    <button className="btn-primary" onClick={pickRandomTest}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>shuffle</span>
                        Pick Random
                    </button>
                    <button className="btn-secondary" onClick={downloadCSV}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>download</span>
                        Download CSV
                    </button>
                    <button className="btn-secondary" onClick={() => setShowColumnModal(true)}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>view_column</span>
                        Columns
                    </button>
                    <button className="btn-secondary" onClick={clearFilters}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>clear_all</span>
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {tests.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-icons" style={{ fontSize: '48px', color: 'var(--md-sys-color-outline)' }}>assignment</span>
                        <p>No tests found matching your filters.</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                {allColumns.filter(col => visibleColumns.includes(col.id)).map(col => (
                                    <th key={col.id}>{col.label}</th>
                                ))}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tests.map(test => (
                                <tr key={test.id}>
                                    {allColumns.filter(col => visibleColumns.includes(col.id)).map(col => (
                                        <td key={col.id}>
                                            {col.id === 'status' ? (
                                                <span style={{ 
                                                    padding: '4px 12px', 
                                                    borderRadius: '16px', 
                                                    fontSize: '12px', 
                                                    fontWeight: '500',
                                                    backgroundColor: test.status === 'Completed' ? '#E8F5E9' : test.status === 'Pending' ? '#FFF3E0' : '#FFEBEE',
                                                    color: test.status === 'Completed' ? '#1B5E20' : test.status === 'Pending' ? '#E65100' : '#B71C1C'
                                                }}>
                                                    {test[col.id]}
                                                </span>
                                            ) : (
                                                test[col.id]
                                            )}
                                        </td>
                                    ))}
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="btn-secondary" 
                                                onClick={() => onEdit(test)}
                                                style={{ padding: '6px 12px', minWidth: 'auto' }}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="btn-secondary" 
                                                onClick={() => onDelete(test.id)}
                                                style={{ padding: '6px 12px', minWidth: 'auto', color: 'var(--md-sys-color-error)', borderColor: 'var(--md-sys-color-error)' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Column Visibility Modal */}
            <div className={`modal ${showColumnModal ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal')) setShowColumnModal(false); }}>
                <div className="modal-content">
                    <h2>Customize Columns</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {allColumns.map(col => (
                            <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={visibleColumns.includes(col.id)} 
                                    onChange={() => toggleColumn(col.id)}
                                    style={{ width: 'auto' }}
                                />
                                {col.label}
                            </label>
                        ))}
                    </div>
                    <div className="modal-actions">
                        <button className="btn-primary" onClick={() => setShowColumnModal(false)}>Done</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Table = Table;
