const Sidebar = ({ currentView, setCurrentView, toggleDark, settings, onSignOut, user }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-icon">
                    <span className="material-icons">school</span>
                </div>
                <span className="logo-text">GTM</span>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map(item => (
                    <button 
                        key={item.id} 
                        className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => setCurrentView(item.id)}
                    >
                        <span className="material-icons">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item" onClick={toggleDark}>
                    <span className="material-icons">{settings.dark ? 'light_mode' : 'dark_mode'}</span>
                    {settings.dark ? 'Light Mode' : 'Dark Mode'}
                </button>
                {user && (
                    <button className="nav-item" onClick={onSignOut}>
                        <span className="material-icons">logout</span>
                        Logout
                    </button>
                )}
            </div>
        </aside>
    );
};

window.AppComponents = window.AppComponents || {};
window.AppComponents.Sidebar = Sidebar;
