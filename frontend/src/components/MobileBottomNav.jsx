import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../config/navigation';
import { AlertTriangle, Menu, X } from 'lucide-react';
import DowntimeModal from './DowntimeModal';

const MobileBottomNav = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);

    const role = user?.role || 'operator';
    const allowedRoutes = ROUTES.filter(r => !r.isDivider && r.rolesAllowed.includes(role));

    // For managers, we show first 3 routes + FAB + Menu button
    // For operators, we show both routes + FAB
    const isManager = role === 'manager';
    const visibleRoutes = isManager ? allowedRoutes.slice(0, 3) : allowedRoutes;
    const overflowRoutes = isManager ? allowedRoutes.slice(3) : [];

    return (
        <>
            {/* Sliding Bottom Sheet for Extra Menu Items */}
            {isManager && (
                <div 
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsMenuOpen(false)}
                >
                    <div 
                        className={`absolute bottom-20 left-4 right-4 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-4 transition-transform duration-300 ${isMenuOpen ? 'translate-y-0' : 'translate-y-[120%]'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                            <h3 className="text-white font-bold">More Options</h3>
                            <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {overflowRoutes.map((route, idx) => {
                                const Icon = route.icon;
                                const label = t(route.labelKey);
                                return (
                                    <NavLink
                                        key={idx}
                                        to={route.path}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={({ isActive }) => `flex items-center gap-4 p-3 rounded-xl transition-colors ${isActive ? 'bg-accent/20 text-accent' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        <Icon size={20} />
                                        <span className="font-medium">{label}</span>
                                    </NavLink>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 w-full bg-primary/95 backdrop-blur-xl border-t border-white/10 z-[60] md:hidden pb-safe">
                <div className="flex items-center justify-around h-16 relative">
                    
                    {visibleRoutes.map((route, idx) => {
                        const Icon = route.icon;
                        const label = t(route.labelKey);
                        
                        // Push items away from the center FAB for spacing
                        const marginClass = isManager 
                            ? (idx === 1 ? 'mr-6' : idx === 2 ? 'ml-6' : '') 
                            : (idx === 0 ? 'mr-8' : 'ml-8');

                        return (
                            <NavLink
                                key={idx}
                                to={route.path}
                                className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${marginClass} ${isActive ? 'text-accent' : 'text-gray-400'}`}
                            >
                                <Icon size={20} className="mb-1" />
                                <span className="text-[10px] font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-1 text-center">
                                    {label}
                                </span>
                            </NavLink>
                        );
                    })}

                    {/* Central FAB for Downtime (The Operator-First Focus) */}
                    <button
                        onClick={() => setIsDowntimeModalOpen(true)}
                        className="absolute left-1/2 -top-5 -translate-x-1/2 w-14 h-14 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center text-white border-4 border-primary active:scale-95 transition-transform"
                    >
                        <AlertTriangle size={24} />
                    </button>

                    {/* Menu Button for Managers */}
                    {isManager && (
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${isMenuOpen ? 'text-accent' : 'text-gray-400'}`}
                        >
                            <Menu size={20} className="mb-1" />
                            <span className="text-[10px] font-medium tracking-tight">Menu</span>
                        </button>
                    )}
                </div>
            </nav>

            <DowntimeModal 
                isOpen={isDowntimeModalOpen} 
                onClose={() => setIsDowntimeModalOpen(false)} 
            />
        </>
    );
};

export default MobileBottomNav;
