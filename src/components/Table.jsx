
const Table = ({ 
    tests = [], 
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
    toggleColumn,
    allColumns,
    editingCell,
    setEditingCell,
    onCellEdit
}) => {
    const [showColumnModal, setShowColumnModal] = React.useState(false);

    const handleKeyDown = (e, testId, colId) => {
        if (e.key === 'Enter') {
            onCellEdit(testId, colId, e.target.value);
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Completed': return 'status-completed';
            case 'Pending': return 'status-pending';
            case 'Not Started': return 'status-not-started';
            case 'Analysis Pending': return 'status-analysis-pending';
            case 'Analysis Done': return 'status-analysis-done';
            default: return 'status-pending';
        }
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
            <div className="controls" style={{ marginBottom: '24px' }}>
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

                <div className="actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={pickRandomTest}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>shuffle</span>
                        Pick Random
                    </button>
                    <button className="btn btn-secondary" onClick={downloadCSV}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>download</span>
                        Download CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowColumnModal(true)}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>view_column</span>
                        Columns
                    </button>
                    <button className="btn btn-secondary" onClick={clearFilters}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>clear_all</span>
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {tests.length === 0 ? (
                    <div className="empty-state" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <span className="material-icons" style={{ fontSize: '48px', color: 'var(--text-light)', marginBottom: '16px' }}>assignment</span>
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
                                    {allColumns.filter(col => visibleColumns.includes(col.id)).map(col => {
                                        const isEditing = editingCell && editingCell.testId === test.id && editingCell.field === col.id;
                                        return (
                                            <td key={col.id} onClick={() => !col.locked && setEditingCell({ testId: test.id, field: col.id })} style={{ cursor: col.locked ? 'default' : 'pointer' }}>
                                                {isEditing ? (
                                                    <input 
                                                        className="inline-edit-input"
                                                        autoFocus
                                                        defaultValue={test[col.id]}
                                                        onBlur={(e) => onCellEdit(test.id, col.id, e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, test.id, col.id)}
                                                    />
                                                ) : (
                                                    col.id === 'status' ? (
                                                        <span className={`status-badge ${getStatusClass(test.status)}`}>
                                                            {test[col.id]}
                                                        </span>
                                                    ) : (
                                                        test[col.id]
                                                    )
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="btn btn-secondary" 
                                                onClick={(e) => { e.stopPropagation(); onEdit(test); }}
                                                style={{ padding: '6px 12px', minWidth: 'auto', fontSize: '12px' }}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="btn btn-secondary" 
                                                onClick={(e) => { e.stopPropagation(); onDelete(test.id); }}
                                                style={{ padding: '6px 12px', minWidth: 'auto', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '12px' }}
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                        {allColumns.map(col => (
                            <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', background: 'var(--bg-input)' }}>
                                <input 
                                    type="checkbox" 
                                    checked={visibleColumns.includes(col.id)} 
                                    onChange={() => toggleColumn(col.id)}
                                    style={{ width: 'auto', margin: 0 }}
                                />
                                {col.label}
                            </label>
                        ))}
                    </div>
                    <div className="modal-actions">
                        <button className="btn btn-primary" onClick={() => setShowColumnModal(false)}>Done</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Table = Table;
