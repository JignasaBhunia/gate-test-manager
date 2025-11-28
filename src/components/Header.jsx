

const Header = ({ 
    user, 
    currentView, 
    setCurrentView, 
    toggleDark, 
    settings, 
    onSignOut, 
    openAddModal, 
    onSignIn, 
    setShowSyncModal,
    onExport,
    onImport,
    onImportCSV,
    onReset,
    onBulkEdit
}) => {
    return (
        <header>
            <div>
                <h1>GATE Test Manager</h1>
                <div className="subtitle">Track and analyze your GATE CSE 2026 preparation progress</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                    className={currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setCurrentView('dashboard')}
                >
                    <span className="material-icons" style={{ fontSize: '18px' }}>dashboard</span>
                    Dashboard
                </button>
                <button 
                    className={currentView === 'analytics' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setCurrentView('analytics')}
                >
                    <span className="material-icons" style={{ fontSize: '18px' }}>analytics</span>
                    Analytics
                </button>
                <button className="btn-primary" onClick={openAddModal}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>add</span>
                    Add Test
                </button>
                
                <button className="btn-secondary" onClick={() => setShowSyncModal(true)}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>sync</span>
                    Sync
                </button>

                {/* Data Dropdown */}
                <div className="dropdown">
                    <button className="btn-secondary">
                        <span className="material-icons" style={{ fontSize: '18px' }}>dataset</span>
                        Data
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
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item" onClick={onReset} style={{ color: 'var(--md-sys-color-error)' }}>
                            <span className="material-icons" style={{ color: 'var(--md-sys-color-error)' }}>restart_alt</span> Reset to Default
                        </button>
                    </div>
                </div>

                <button className="btn-secondary" onClick={toggleDark}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>{settings?.dark ? 'light_mode' : 'dark_mode'}</span>
                    {settings?.dark ? 'Light' : 'Dark'}
                </button>
                
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                        {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{user.displayName}</span>
                        <button className="btn-secondary" onClick={onSignOut} style={{ padding: '8px 16px' }}>Sign out</button>
                    </div>
                ) : (
                    <button className="btn-primary" onClick={onSignIn} style={{ marginLeft: '8px' }}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>login</span>
                        Sign In
                    </button>
                )}
            </div>
        </header>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Header = Header;

