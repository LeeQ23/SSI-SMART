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
    const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed for elegance
    const [isHovered, setIsHovered] = useState(false);

    // Sidebar is expanded if specifically explicitly not collapsed OR if being hovered
    const showExpanded = !isCollapsed || isHovered;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === 'f' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                toggleFullscreen();
            }
            if (e.key.toLowerCase() === 'b' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setIsCollapsed(prev => !prev);
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
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`${showExpanded ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out glass-panel m-4 flex flex-col relative group/sidebar shadow-2xl overflow-hidden`}
            >
                <div className={`p-4 flex items-center ${showExpanded ? 'justify-between' : 'justify-center'} border-b border-white/10`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img src="/logo.png" alt="SSI Logo" className="h-8 w-auto min-w-[32px] object-contain" />
                        {showExpanded && <div className="font-bold text-lg tracking-wider whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">SSI SMART</div>}
                    </div>
                    {showExpanded && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover/sidebar:opacity-100"
                            title={isCollapsed ? "Pin Sidebar" : "Unpin Sidebar"}
                        >
                            <LayoutGrid size={14} className={isCollapsed ? 'text-gray-500' : 'text-accent'} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
                    <Link to="/" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${showExpanded ? '' : 'justify-center'}`} title={t('nav.overview')}>
                        <LayoutGrid size={22} className="min-w-[22px]" />
                        {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.overview')}</span>}
                    </Link>

                    <Link to="/dashboard/1" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${location.pathname.startsWith('/dashboard') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${showExpanded ? '' : 'justify-center'}`} title={t('nav.detail_view')}>
                        <LayoutDashboard size={22} className="min-w-[22px]" />
                        {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.detail_view')}</span>}
                    </Link>

                    {user?.role === 'manager' && (
                        <>
                            <div className={`my-4 border-t border-white/5 ${showExpanded ? '' : 'mx-2'}`} />
                            <NavLink to="/history" className={({ isActive }) => `flex items-center gap-4 p-3 rounded-lg transition-all ${isActive ? 'bg-accent text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${showExpanded ? '' : 'justify-center'}`} title={t('nav.history')}>
                                <History size={22} className="min-w-[22px]" />
                                {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.history')}</span>}
                            </NavLink>
                            <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-4 p-3 rounded-lg transition-all ${isActive ? 'bg-accent text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${showExpanded ? '' : 'justify-center'}`} title={t('nav.analytics')}>
                                <LineChart size={22} className="min-w-[22px]" />
                                {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.analytics')}</span>}
                            </NavLink>
                            <Link to="/targets" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/targets') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${showExpanded ? '' : 'justify-center'}`} title={t('nav.targets')}>
                                <Target size={22} className="min-w-[22px]" />
                                {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.targets')}</span>}
                            </Link>
                            <Link to="/shifts" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/shifts') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${showExpanded ? '' : 'justify-center'}`} title={t('nav.shifts')}>
                                <Clock size={22} className="min-w-[22px]" />
                                {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.shifts')}</span>}
                            </Link>
                            <Link to="/users" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/users') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${showExpanded ? '' : 'justify-center'}`} title={t('nav.users')}>
                                <Users size={22} className="min-w-[22px]" />
                                {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.users')}</span>}
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-3 border-t border-white/10 space-y-4">
                    <div className={`flex ${showExpanded ? 'px-1' : 'justify-center'}`}>
                        <LanguageSwitcher mini={!showExpanded} />
                    </div>

                    {showExpanded && (
                        <div className="px-3 text-xs text-gray-400 animate-in fade-in duration-500">
                            {t('nav.logged_in') || 'Logged in as'} <span className="text-white font-semibold block truncate">{user?.username}</span>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ${showExpanded ? '' : 'justify-center'}`}
                        title={t('nav.logout')}
                    >
                        <LogOut size={22} className="min-w-[22px]" />
                        {showExpanded && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{t('nav.logout')}</span>}
                    </button>

                    {showExpanded && (
                        <button
                            onClick={toggleFullscreen}
                            className="w-full flex items-center justify-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500"
                            title={isFullscreen ? "Exit Fullscreen (f)" : "Enter Fullscreen (f)"}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                            <span className="text-xs uppercase tracking-widest">{isFullscreen ? 'Windowed' : 'Fullscreen'}</span>
                        </button>
                    )}
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
