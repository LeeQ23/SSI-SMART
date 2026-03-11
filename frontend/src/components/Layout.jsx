import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Users, LogOut, Clock, LineChart, LayoutGrid, Maximize, Minimize, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import DowntimeModal from './DowntimeModal';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Fullscreen shortcut
            if (e.key.toLowerCase() === 'f' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                toggleFullscreen();
            }

            // Navigation Shortcuts (Alt + Number)
            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                switch (e.key) {
                    case '1': navigate('/'); break;
                    case '2': navigate('/dashboard/1'); break;
                    case '3': if (user?.role === 'manager') navigate('/history'); break;
                    case '4': if (user?.role === 'manager') navigate('/analytics'); break;
                    case 'd': case 'D': setIsDowntimeModalOpen(true); break;
                    case 'l': case 'L': handleLogout(); break;
                    default: break;
                }
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
    }, [user, navigate]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const NavItem = ({ to, icon: Icon, label, shortcut }) => (
        <NavLink
            to={to}
            className={({ isActive }) => `group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${isActive ? 'bg-accent text-white shadow-lg shadow-accent/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={22} strokeWidth={2} />

            {/* Tooltip */}
            <div className="absolute left-16 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:left-14 transition-all duration-300 z-50 shadow-2xl">
                <span className="flex items-center gap-3">
                    {label}
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-white/5 uppercase">Alt + {shortcut}</span>
                </span>
                {/* Arrow */}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-white/10 rotate-45" />
            </div>
        </NavLink>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-primary to-black text-white">
            {/* Ultra-Slim Sidebar (Antigravity Style) */}
            <aside className="w-20 glass-panel m-4 flex flex-col items-center py-6 shadow-2xl relative z-40 border border-white/5">
                <div className="mb-8 p-1">
                    <img src="/logo.png" alt="SSI Logo" className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(0,116,217,0.3)]" />
                </div>

                <nav className="flex-1 flex flex-col items-center gap-3 w-full">
                    <NavItem to="/" icon={LayoutGrid} label={t('nav.overview')} shortcut="1" />
                    <NavItem to="/dashboard/1" icon={LayoutDashboard} label={t('nav.detail_view')} shortcut="2" />

                    {user?.role === 'manager' && (
                        <>
                            <div className="w-8 h-[1px] bg-white/10 my-2" />
                            <NavItem to="/history" icon={History} label={t('nav.history')} shortcut="3" />
                            <NavItem to="/analytics" icon={LineChart} label={t('nav.analytics')} shortcut="4" />
                            <NavItem to="/downtime-history" icon={Clock} label="Downtime History" shortcut="H" />
                        </>
                    )}
                </nav>

                <div className="mt-auto flex flex-col items-center gap-4 w-full px-2">
                    <button
                        onClick={() => setIsDowntimeModalOpen(true)}
                        className="group relative flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all duration-300 border border-amber-500/20"
                    >
                        <AlertTriangle size={22} />
                        <div className="absolute left-16 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:left-14 transition-all duration-300 z-50 shadow-2xl">
                            <span className="flex items-center gap-3">
                                Manual Downtime
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-white/5 uppercase">Alt + D</span>
                            </span>
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-white/10 rotate-45" />
                        </div>
                    </button>

                    <LanguageSwitcher mini={true} />

                    <div className="w-8 h-[1px] bg-white/10" />

                    <button
                        onClick={handleLogout}
                        className="group relative flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all duration-300"
                    >
                        <LogOut size={22} />
                        <div className="absolute left-16 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:left-14 transition-all duration-300 z-50 shadow-2xl">
                            <span className="flex items-center gap-3">
                                {t('nav.logout')}
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-white/5 uppercase">Alt + L</span>
                            </span>
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-white/10 rotate-45" />
                        </div>
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="group relative flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-white transition-colors"
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        <div className="absolute left-14 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:left-12 transition-all duration-300 z-50">
                            {isFullscreen ? 'Windowed' : 'Fullscreen'} (F)
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-white/10 rotate-45" />
                        </div>
                    </button>

                    {/* User Profile Initial (Subtle hint) */}
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 text-[10px] font-bold text-accent uppercase tracking-tighter">
                        {user?.username?.substring(0, 2)}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-4">
                <div className="flex-1 glass-panel p-6 overflow-y-auto mb-4">
                    {children}
                </div>

                {/* Running Warning Text Marquee */}
                <div className="glass-panel py-2 px-4 bg-red-500/10 border-red-500/20 overflow-hidden flex items-center shrink-0">
                    <div className="animate-marquee inline-block">
                        <span className="text-sm font-bold text-red-400 uppercase tracking-[0.2em] px-4">
                            {t('common.abnormality_warning')}
                        </span>
                        <span className="text-sm font-bold text-red-400 uppercase tracking-[0.2em] px-4" aria-hidden="true">
                            {t('common.abnormality_warning')}
                        </span>
                        <span className="text-sm font-bold text-red-400 uppercase tracking-[0.2em] px-4" aria-hidden="true">
                            {t('common.abnormality_warning')}
                        </span>
                        <span className="text-sm font-bold text-red-400 uppercase tracking-[0.2em] px-4" aria-hidden="true">
                            {t('common.abnormality_warning')}
                        </span>
                    </div>
                </div>
            </main>

            <DowntimeModal
                isOpen={isDowntimeModalOpen}
                onClose={() => setIsDowntimeModalOpen(false)}
            />
        </div>
    );
};

export default Layout;
