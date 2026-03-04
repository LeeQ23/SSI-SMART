import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Target, Users, LogOut, Clock, LineChart, LayoutGrid, Maximize, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === 'f' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                toggleFullscreen();
            }
        };

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-primary to-black text-white">
            {/* Sidebar */}
            <aside className="w-64 glass-panel m-4 flex flex-col">
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="SSI Logo" className="h-10 w-auto object-contain" />
                        <div className="font-bold text-lg tracking-wider">SSI SMART</div>
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        title={isFullscreen ? "Exit Fullscreen (f)" : "Enter Fullscreen (f)"}
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'}`}>
                        <LayoutGrid size={20} />
                        <span>{t('nav.overview')}</span>
                    </Link>

                    <Link to="/dashboard/1" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${location.pathname.startsWith('/dashboard') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'}`}>
                        <LayoutDashboard size={20} />
                        <span>{t('nav.detail_view')}</span>
                    </Link>

                    {user?.role === 'manager' && (
                        <>
                            <NavLink to="/history" className={({ isActive }) => `flex items-center space-x-3 p-3 rounded-lg transition-all ${isActive ? 'bg-accent text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <History size={20} />
                                <span>{t('nav.history')}</span>
                            </NavLink>
                            <NavLink to="/analytics" className={({ isActive }) => `flex items-center space-x-3 p-3 rounded-lg transition-all ${isActive ? 'bg-accent text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <LineChart size={20} />
                                <span>{t('nav.analytics')}</span>
                            </NavLink>
                            <Link to="/targets" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/targets') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'}`}>
                                <Target size={20} />
                                <span>{t('nav.targets')}</span>
                            </Link>
                            <Link to="/shifts" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/shifts') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'}`}>
                                <Clock size={20} />
                                <span>{t('nav.shifts')}</span>
                            </Link>
                            <Link to="/users" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/users') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'}`}>
                                <Users size={20} />
                                <span>{t('nav.users')}</span>
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-white/10 space-y-4">
                    <LanguageSwitcher />

                    <div className="px-4 text-sm text-gray-400">
                        Logged in as <span className="text-white font-semibold">{user?.username}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                        <LogOut size={18} />
                        <span>{t('nav.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 pl-0">
                <div className="h-full glass-panel p-6 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
