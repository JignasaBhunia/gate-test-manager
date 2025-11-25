window.AppComponents = window.AppComponents || {};
window.AppComponents.Header = function Header(props) {
    const { openAddModal, toggleDark, settings, setShowSyncModal, user, onSignIn, onSignOut } = props;
    return (
        <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
                <h1>GATE Test Manager</h1>
                <p className="subtitle">Track and analyze your GATE CSE 2026 preparation progress</p>
            </div>
            <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <button className="btn-secondary" onClick={openAddModal}>➕ Add Test</button>
                <button className="btn-secondary" onClick={toggleDark}>{settings?.dark ? '🌙 Dark' : '🌤 Light'}</button>
                <button className="btn-secondary" onClick={() => setShowSyncModal(true)} style={{background: settings?.syncEnabled ? '#c6f6d5' : undefined}}>{settings?.syncEnabled ? '🔁 Sync On' : '🔁 Sync'}</button>
                {user ? (
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        {user.photoURL && <img src={user.photoURL} alt="me" style={{width:28,height:28,borderRadius:14}} />}
                        <span style={{fontWeight:600}}>{user.displayName || (user.email||'User')}</span>
                        <button className="btn-secondary" onClick={onSignOut}>Sign out</button>
                    </div>
                ) : (
                    <button className="btn-primary" onClick={onSignIn}>Sign in with Google</button>
                )}
            </div>
        </header>
    );
};
