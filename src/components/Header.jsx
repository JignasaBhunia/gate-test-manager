const Header = ({ 
    user, 
    openAddModal, 
    onSignIn, 
    setShowSyncModal,
    onExport,
    onImport,
    onImportCSV,
    onReset,
    onBulkEdit,
    onImportSeed,
    onSignOut
}) => {
    return (
        <div className="top-bar">
            <div>
                <h1 className="page-title">Dashboard</h1>
                <div className="subtitle" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Welcome back, track your progress</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <span className="material-icons">add</span>
                    Add Test
                </button>
                
                <button className="btn btn-secondary" onClick={() => setShowSyncModal(true)}>
                    <span className="material-icons">sync</span>
                    Sync
                </button>

                {/* Data Dropdown */}
                <div className="dropdown">
                    <button className="btn btn-secondary">
                        <span className="material-icons">dataset</span>
                        Data
                        <span className="material-icons" style={{ fontSize: '18px', marginLeft: '4px' }}>expand_more</span>
                    </button>
                    <div className="dropdown-menu">
                        <button className="dropdown-item" onClick={onExport}>
                            <span className="material-icons">download</span> Export JSON
                        </button>
                        <label className="dropdown-item">
                            <span className="material-icons">upload</span> Import JSON
                            <input type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
                        </label>
                        <label className="dropdown-item">
                            <span className="material-icons">table_view</span> Import CSV
                            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={onImportCSV} />
                        </label>
                        <button className="dropdown-item" onClick={onBulkEdit}>
                            <span className="material-icons">edit_note</span> Bulk Edit
                        </button>
                        <button className="dropdown-item" onClick={onImportSeed}>
                            <span className="material-icons">cloud_download</span> Import Seed Data
                        </button>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item" onClick={onReset} style={{ color: 'var(--danger)' }}>
                            <span className="material-icons" style={{ color: 'var(--danger)' }}>restart_alt</span> Reset to Default
                        </button>
                    </div>
                </div>
                
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
                        ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {user.displayName ? user.displayName[0] : 'U'}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>{user.displayName}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={onSignOut}>Sign out</span>
                        </div>
                    </div>
                ) : (
                    <button className="btn btn-primary" onClick={onSignIn} style={{ marginLeft: '8px' }}>
                        <span className="material-icons">login</span>
                        Sign In
                    </button>
                )}
            </div>
        </div>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Header = Header;
