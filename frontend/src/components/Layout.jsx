import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Users, LogOut, Clock, LineChart, LayoutGrid, Maximize, Minimize, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import DowntimeModal from './DowntimeModal';
import MobileBottomNav from './MobileBottomNav';
import { ROUTES } from '../config/navigation';
import { createSocketConnection } from '../utils/socket';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);
    const [downtimeMachines, setDowntimeMachines] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

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
                    case '5': if (user?.role === 'manager') navigate('/settings'); break;
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

    useEffect(() => {
        const socket = createSocketConnection();
        
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        
        socket.on('machine_update', (update) => {
            if (update.state === 'downtime') {
                setDowntimeMachines(prev => {
                    if (!prev.find(m => m.id === update.machine_id)) {
                        return [...prev, { id: update.machine_id, time: new Date() }];
                    }
                    return prev;
                });
            } else {
                setDowntimeMachines(prev => prev.filter(m => m.id !== update.machine_id));
            }
        });
        
        return () => {
            socket.disconnect();
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
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-primary to-black text-white relative flex-col md:flex-row">
            {/* Global Connection Header Bar */}
            <div className={`absolute top-0 left-0 w-full h-[2px] z-50 ${isConnected ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-danger animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />

            {/* Mobile Top Header (Antigravity Style) */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-primary/95 backdrop-blur-xl border-b border-white/10 z-40 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="SSI Logo" className="h-8 w-auto object-contain drop-shadow-[0_0_8px_rgba(0,116,217,0.3)]" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-tight">{user?.username}</span>
                        <span className="text-[9px] text-accent uppercase tracking-wider font-semibold leading-none">{user?.role}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <LanguageSwitcher mini />
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 text-red-400 active:bg-red-500/20 transition-all border border-red-500/20 active:scale-95"
                        title={t('nav.logout')}
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            {/* Ultra-Slim Sidebar (Antigravity Style) - Desktop Only */}
            <aside className={`hidden md:flex w-20 glass-panel m-4 flex-col items-center py-6 shadow-2xl relative z-40 transition-all duration-500 ${isFullscreen ? 'border-accent/30 shadow-[0_0_30px_rgba(0,116,217,0.1)]' : 'border-white/5'}`}>
                <div className="mb-8 p-1">
                    <img src="/logo.png" alt="SSI Logo" className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(0,116,217,0.3)]" />
                </div>

                <nav className="flex-1 flex flex-col items-center gap-3 w-full">
                    {ROUTES.map((route, idx) => {
                        if (route.isDivider) {
                            if (!route.rolesAllowed.includes(user?.role || 'operator')) return null;
                            return <div key={idx} className="w-8 h-[1px] bg-white/10 my-2" />;
                        }

                        if (!route.rolesAllowed.includes(user?.role || 'operator')) return null;

                        return (
                            <NavItem 
                                key={idx}
                                to={route.path} 
                                icon={route.icon} 
                                label={t(route.labelKey) !== route.labelKey ? t(route.labelKey) : route.labelKey} 
                                shortcut={route.shortcut} 
                            />
                        );
                    })}
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

                    <LanguageSwitcher mini />

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
                    <div className="group relative w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 text-[10px] font-bold text-accent uppercase tracking-tighter cursor-pointer hover:bg-accent/30 transition-colors">
                        {user?.username?.substring(0, 2)}
                        
                        {/* User Popover */}
                        <div className="absolute left-14 bottom-0 p-4 bg-gray-900 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:left-12 transition-all duration-300 z-50 min-w-[200px]">
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Logged In As</p>
                            <p className="text-white font-bold text-lg leading-tight">{user?.username}</p>
                            <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${user?.role === 'manager' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                <span className="text-xs text-gray-300 uppercase tracking-wider">{user?.role}</span>
                            </div>
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-white/10 rotate-45" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-3 pb-24 md:p-4">
                <div className="flex-1 glass-panel p-4 md:p-6 overflow-y-auto mb-4 custom-scrollbar">
                    {children}
                </div>

                {/* Specific Downtime Alert Bar */}
                {downtimeMachines.length > 0 && (
                    <div className="glass-panel py-3 px-6 bg-danger/10 border-danger/30 flex items-center justify-between shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <div className="flex items-center gap-4">
                            <AlertTriangle className="text-danger animate-pulse" size={20} />
                            <span className="text-sm font-bold text-white tracking-wide">
                                ⚠️ Machine <span className="text-danger font-mono bg-danger/20 px-2 py-0.5 rounded mx-1">M{downtimeMachines[0].id}</span> is DOWN
                            </span>
                            <span className="text-xs text-gray-400 border-l border-white/20 pl-4">
                                Please check immediately or record manual downtime reason.
                            </span>
                        </div>
                        {downtimeMachines.length > 1 && (
                            <span className="text-xs bg-danger/20 text-danger px-2 py-1 rounded font-bold">
                                +{downtimeMachines.length - 1} OTHER(S) DOWN
                            </span>
                        )}
                    </div>
                )}
            </main>

            <DowntimeModal
                isOpen={isDowntimeModalOpen}
                onClose={() => setIsDowntimeModalOpen(false)}
            />

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
};

export default Layout;
