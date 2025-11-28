
const Header = ({ user, currentView, setCurrentView, theme, toggleTheme, handleSignOut, setShowAddTestModal }) => {
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
                <button className="btn-primary" onClick={() => setShowAddTestModal(true)}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>add</span>
                    Add Test
                </button>
                <button className="btn-secondary" onClick={toggleTheme}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                    {theme === 'light' ? 'Dark' : 'Light'}
                </button>
                
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                        {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{user.displayName}</span>
                        <button className="btn-secondary" onClick={handleSignOut} style={{ padding: '8px 16px' }}>Sign out</button>
                    </div>
                )}
            </div>
        </header>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Header = Header;
