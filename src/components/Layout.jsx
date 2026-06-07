import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Headphones, LogOut, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const Layout = ({ children }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const navLinkStyle = (path) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.5rem 0.85rem',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.9rem',
        fontWeight: 500,
        textDecoration: 'none',
        color: location.pathname === path ? 'white' : 'var(--text-primary)',
        background: location.pathname === path ? 'var(--primary)' : 'transparent',
        border: location.pathname === path ? 'none' : '1px solid var(--border)',
    });

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="layout">
            <header className="header">
                <div className="logo-section">
                    <img src={logo} alt="NyayADR Logo" className="logo-image" />
                    <div>
                        <h1 className="app-title">NyayADR</h1>
                        <p className="tagline">AI that Assimilates.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to="/intake" style={navLinkStyle('/intake')}>
                        <PlusCircle size={16} /> New case
                    </Link>
                    <Link to="/sessions" style={navLinkStyle('/sessions')}>
                        <Headphones size={16} /> All sessions
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
                        title="Sign out"
                    >
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </header>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
