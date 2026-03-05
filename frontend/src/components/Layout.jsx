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
    const [isCollapsed, setIsCollapsed] = useState(false);

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
            <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out glass-panel m-4 flex flex-col relative`}>
                <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-white/10`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img src="/logo.png" alt="SSI Logo" className="h-8 w-auto min-w-[32px] object-contain" />
                        {!isCollapsed && <div className="font-bold text-lg tracking-wider whitespace-nowrap">SSI SMART</div>}
                    </div>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 bg-accent p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <LayoutGrid size={14} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>

                <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
                    <Link to="/" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${isCollapsed ? 'justify-center' : ''}`} title={t('nav.overview')}>
                        <LayoutGrid size={22} className="min-w-[22px]" />
                        {!isCollapsed && <span className="whitespace-nowrap">{t('nav.overview')}</span>}
                    </Link>

                    <Link to="/dashboard/1" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${location.pathname.startsWith('/dashboard') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${isCollapsed ? 'justify-center' : ''}`} title={t('nav.detail_view')}>
                        <LayoutDashboard size={22} className="min-w-[22px]" />
                        {!isCollapsed && <span className="whitespace-nowrap">{t('nav.detail_view')}</span>}
                    </Link>

                    {user?.role === 'manager' && (
                        <>
                            <div className={`my-4 border-t border-white/5 ${isCollapsed ? 'mx-2' : ''}`} />
                            <NavLink to="/history" className={({ isActive }) => `flex items-center gap-4 p-3 rounded-lg transition-all ${isActive ? 'bg-accent text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`} title={t('nav.history')}>
                                <History size={22} className="min-w-[22px]" />
                                {!isCollapsed && <span className="whitespace-nowrap">{t('nav.history')}</span>}
                            </NavLink>
                            <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-4 p-3 rounded-lg transition-all ${isActive ? 'bg-accent text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`} title={t('nav.analytics')}>
                                <LineChart size={22} className="min-w-[22px]" />
                                {!isCollapsed && <span className="whitespace-nowrap">{t('nav.analytics')}</span>}
                            </NavLink>
                            <Link to="/targets" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/targets') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${isCollapsed ? 'justify-center' : ''}`} title={t('nav.targets')}>
                                <Target size={22} className="min-w-[22px]" />
                                {!isCollapsed && <span className="whitespace-nowrap">{t('nav.targets')}</span>}
                            </Link>
                            <Link to="/shifts" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/shifts') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${isCollapsed ? 'justify-center' : ''}`} title={t('nav.shifts')}>
                                <Clock size={22} className="min-w-[22px]" />
                                {!isCollapsed && <span className="whitespace-nowrap">{t('nav.shifts')}</span>}
                            </Link>
                            <Link to="/users" className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${isActive('/users') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-white/5 text-gray-300'} ${isCollapsed ? 'justify-center' : ''}`} title={t('nav.users')}>
                                <Users size={22} className="min-w-[22px]" />
                                {!isCollapsed && <span className="whitespace-nowrap">{t('nav.users')}</span>}
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-3 border-t border-white/10 space-y-4">
                    <div className={`flex ${isCollapsed ? 'justify-center' : 'px-1'}`}>
                        <LanguageSwitcher mini={isCollapsed} />
                    </div>

                    {!isCollapsed && (
                        <div className="px-3 text-xs text-gray-400">
                            {t('nav.logged_in') || 'Logged in as'} <span className="text-white font-semibold block truncate">{user?.username}</span>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                        title={t('nav.logout')}
                    >
                        <LogOut size={22} className="min-w-[22px]" />
                        {!isCollapsed && <span className="whitespace-nowrap">{t('nav.logout')}</span>}
                    </button>

                    {!isCollapsed && (
                        <button
                            onClick={toggleFullscreen}
                            className="w-full flex items-center justify-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white border border-white/5"
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
