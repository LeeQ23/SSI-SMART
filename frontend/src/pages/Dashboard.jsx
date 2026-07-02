import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import MachineSelector from '../components/MachineSelector';
import StatusTimelineChart from '../components/StatusTimelineChart';
import ErrorToast from '../components/ErrorToast';
import LogoLoader from '../components/LogoLoader';
import ProductionProgressChart from '../components/ProductionProgressChart';
import { AlertTriangle, Settings } from 'lucide-react';
import DowntimeModal from '../components/DowntimeModal';
import EditSessionModal from '../components/EditSessionModal';
import AnimatedNumber from '../components/AnimatedNumber';
import { useAuth } from '../context/AuthContext';
import { createSocketConnection } from '../utils/socket';

const DigitalClock = ({ formatDateDisplay }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeStr = formatDateDisplay(currentTime); // "dd/mm/yyyy HH:MM"
    const timePart = timeStr.split(' ')[1] || ''; // "HH:MM"
    const [hh, mm] = timePart.split(':');
    const datePart = timeStr.split(' ')[0] || ''; // "dd/mm/yyyy"

    return (
        <div className="text-right">
            <p className="text-lg md:text-2xl font-mono font-bold text-white leading-none mt-1 tabular-nums">
                {hh}<span className="animate-pulse">:</span>{mm}
            </p>
            <p className="text-[9px] md:text-[10px] text-gray-500 font-mono mt-0.5">{datePart}</p>
        </div>
    );
};

const Dashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { machineId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const queryClient = useQueryClient();
    const currentMachineId = machineId || 1;

    const { data, isLoading: loading, error, refetch } = useQuery({
        queryKey: ['dashboard', currentMachineId],
        queryFn: async () => {
            const res = await axios.get(`/api/dashboard?machine_id=${currentMachineId}`);
            return res.data;
        },
        refetchInterval: 300000, // Sync every 5 minutes (ultra-lightweight) to ensure shift changes update
    });

    useEffect(() => {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        const newSocket = createSocketConnection();
        setSocket(newSocket);

        newSocket.on('machine_update', (update) => {
            if (update.machine_id == currentMachineId) {
                // Optimistically update the React Query cache
                queryClient.setQueryData(['dashboard', currentMachineId], prev => {
                    if (!prev) return prev;
                    
                    const newGood = update.good !== undefined ? Math.max(prev.good, update.good) : prev.good;
                    const newNg = update.ng !== undefined ? Math.max(prev.ng, update.ng) : prev.ng;
                    
                    return {
                        ...prev,
                        current: update.current !== undefined ? update.current : prev.current,
                        state: update.state || prev.state,
                        good: newGood,
                        ng: newNg
                    };
                });
            }
        });

        newSocket.on('data_updated', (update) => {
            if (update.machine_id == currentMachineId && update.major_change) {
                refetch();
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [machineId]);


    const oeeData = useMemo(() => {
        if (!data) return [];
        return [
            { name: 'OEE', value: parseFloat(data.oee) },
            { name: 'Remaining', value: 100 - parseFloat(data.oee) }
        ];
    }, [data?.oee]);

    const COLORS = ['#0074D9', '#1a3a5a'];

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    const formatDateDisplay = (date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        const hh = date.getHours().toString().padStart(2, '0');
        const mm = date.getMinutes().toString().padStart(2, '0');
        return `${d}/${m}/${y} ${hh}:${mm}`;
    };

    if (loading && !data) return <LogoLoader />;

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="text-danger text-xl font-bold">Connection Error</div>
                <p className="text-gray-400">Unable to fetch dashboard data. Retrying...</p>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors"
                >
                    Retry Now
                </button>
            </div>
        );
    }

    if (!data || data.noActiveSession) return (
        <div className="flex flex-col items-center justify-center p-20 gap-6">
            <div className="text-white text-xl text-center">
                {t('dashboard.no_active_session', 'No active production session found for this machine.')}
                <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest font-normal">{t('dashboard.please_start_session', 'Please start a new session to begin tracking performance.')}</p>
            </div>
            
            {user?.role === 'manager' && (
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-8 py-4 bg-accent text-white rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                    <Settings size={20} />
                    {t('dashboard.start_production_session', 'START PRODUCTION SESSION')}
                </button>
            )}

            <EditSessionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentData={null}
                machineId={machineId || 1}
                onSessionCaptured={() => refetch()}
            />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Top Info Header Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:flex xl:flex-nowrap gap-3 md:gap-4">
                <div className="glass-panel-raised p-3 md:p-4 border-l-4 border-l-accent flex flex-col justify-center col-span-1 xl:flex-[1.5] xl:min-w-[140px]">
                    <h3 className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.product_id', 'PRODUCT ID')}</h3>
                    <div className="text-base md:text-xl font-black text-white">{data.product_id || '-'}</div>
                </div>
                <div className="glass-panel p-3 md:p-4 flex flex-col justify-center col-span-1 xl:flex-1 xl:min-w-[100px]">
                    <h3 className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.lot_number', 'LOT NUMBER')}</h3>
                    <div className="text-sm md:text-lg font-bold text-gray-200">{data.lot_number || '-'}</div>
                </div>
                <div className="glass-panel p-3 md:p-4 flex flex-col justify-center col-span-1 xl:flex-1 xl:min-w-[100px]">
                    <h3 className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.target', 'TARGET')}</h3>
                    <div className="text-sm md:text-lg font-bold text-accent tabular-nums">{data.target}</div>
                </div>
                <div className="glass-panel p-3 md:p-4 flex flex-col justify-center col-span-1 xl:flex-1 xl:min-w-[100px]">
                    <h3 className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.shift', 'SHIFT')}</h3>
                    <div className="text-sm md:text-lg font-bold text-gray-200">{data.shift}</div>
                </div>
                <div className="glass-panel p-3 md:p-4 flex flex-col justify-center relative overflow-hidden col-span-2 md:col-span-1 xl:flex-[2.5] xl:min-w-[220px]">
                    <h3 className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.machine_id', 'MACHINE')}</h3>
                    <MachineSelector
                         selectedId={machineId || 1}
                         onChange={(id) => navigate(`/dashboard/${id}`)}
                         className="bg-transparent border-none p-0 h-auto text-base md:text-xl font-bold text-white w-full outline-none focus:ring-0"
                    />
                </div>
                <div className="glass-panel p-3 md:p-4 flex flex-col justify-center col-span-1 xl:flex-[1.5] xl:min-w-[140px]">
                    <h3 className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.operator', 'OPERATOR')}</h3>
                    <div className="text-sm md:text-lg font-bold text-gray-200 truncate">{data.operator}</div>
                </div>
                <div className="glass-panel-recessed p-3 md:p-4 flex flex-col justify-center items-end bg-black/20 col-span-1 md:col-span-1 xl:flex-[1.5] xl:min-w-[140px] xl:shrink-0">
                    <h3 className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.system_time', 'SYSTEM TIME')}</h3>
                    <DigitalClock formatDateDisplay={formatDateDisplay} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total OK & NG Side-by-Side on Mobile, Stacked on Desktop */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:space-y-4 md:gap-0">
                    <div className="glass-panel p-3 md:p-4 flex flex-col items-center justify-center relative overflow-hidden group h-[110px] md:h-[120px]">
                        <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-wider mb-1">{t('dashboard.total_ok', 'TOTAL OK')}</h3>
                        <div className="flex items-baseline justify-center gap-2 mt-1 md:mt-2">
                            <div className="text-3xl md:text-5xl font-bold text-success leading-none drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] tabular-nums">
                                <AnimatedNumber value={data.good} />
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel p-3 md:p-4 flex flex-col items-center justify-center relative overflow-hidden group h-[110px] md:h-[120px]">
                        <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <XCircle className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-wider mb-1">{t('dashboard.total_ng', 'TOTAL NG')}</h3>
                        <div className="flex items-baseline justify-center gap-2 mt-1 md:mt-2">
                            <div className="text-3xl md:text-5xl font-bold text-danger leading-none drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] tabular-nums">
                                <AnimatedNumber value={data.ng} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress % Box */}
                <div className="glass-panel p-4 md:p-6 flex flex-col items-center justify-center bg-accent/5 ring-1 ring-accent/20 h-[200px] md:h-[236px]">
                    <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-widest mb-2 md:mb-4">{t('dashboard.progress', 'PRODUCTION PROGRESS %')}</h3>
                    <div className="text-4xl md:text-7xl font-black text-white drop-shadow-md tabular-nums">
                        <AnimatedNumber value={data.target > 0 ? ((data.good / data.target) * 100) : 0} decimals={1} suffix="%" />
                    </div>
                    <div className="w-full bg-white/5 h-3 md:h-4 rounded-full mt-4 md:mt-6 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ${
                                (data.target > 0 ? ((data.good / data.target) * 100) : 0) >= 80 ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                (data.target > 0 ? ((data.good / data.target) * 100) : 0) >= 50 ? 'bg-warning shadow-[0_0_10px_rgba(255,220,0,0.5)]' :
                                'bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                            }`}
                            style={{ width: `${data.target > 0 ? Math.min((data.good / data.target) * 100, 100) : 0}%` }}
                        />
                    </div>
                </div>

                {/* Combined OEE, Cycle Time & A/P/Q */}
                <div className="glass-panel lg:col-span-2 overflow-hidden flex flex-col h-auto md:h-[236px] bg-white/[0.02]">
                    <div className="flex-1 flex items-center p-3 md:p-4 gap-2 md:gap-4">
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('dashboard.oee')}</h3>
                            <div className="h-24 md:h-28 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={oeeData}
                                            cx="50%"
                                            cy="100%"
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={0}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            <Cell key="cell-0" fill={
                                                Number(data.oee) >= 85 ? '#10b981' : 
                                                Number(data.oee) >= 60 ? '#f59e0b' : 
                                                '#ef4444'
                                            } />
                                            <Cell key="cell-1" fill="#1e293b" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute bottom-0 w-full flex flex-col items-center justify-center pointer-events-none pb-1 md:pb-2">
                                     <span className={`text-xl md:text-3xl font-black tabular-nums drop-shadow-md ${
                                         Number(data.oee) >= 85 ? 'text-success' : 
                                         Number(data.oee) >= 60 ? 'text-warning' : 
                                         'text-danger'
                                     }`}>
                                         {Number(data.oee).toFixed(1)}%
                                     </span>
                                </div>
                            </div>
                        </div>
                        <div className="w-px h-20 md:h-24 bg-white/10" />
                        <div className="flex-1 text-center">
                             {(() => {
                                 const act = Number(data.avgCycleTime);
                                 const tgt = Number(data.targetCycleTime || 12.0);
                                 const colorClass = act <= tgt ? 'text-success' : (act <= tgt * 1.2 ? 'text-warning' : 'text-danger');
                                 return (
                                     <>
                                         <Clock className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 ${colorClass} opacity-50`} />
                                         <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-1">{t('dashboard.cycle_time')}</h3>
                                         <div className={`text-2xl md:text-4xl font-bold tabular-nums ${colorClass}`}>
                                             {act.toFixed(1)}s
                                         </div>
                                         <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 uppercase tabular-nums">Target: {tgt.toFixed(1)}s</div>
                                     </>
                                 );
                             })()}
                        </div>
                    </div>
                    {/* A/P/Q Linear Bullet Bars */}
                    <div className="bg-black/20 border-t border-white/10 p-2 md:p-3 space-y-1 md:space-y-1.5 flex flex-col justify-center flex-1">
                        {/* Availability */}
                        <div className="flex items-center gap-3">
                             <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-tighter w-16 md:w-20 text-right">{t('dashboard.availability', 'Availability')}</span>
                             <div className="flex-1 bg-white/5 h-2 md:h-3 rounded-full relative overflow-hidden">
                                 <div className="absolute left-[85%] top-0 bottom-0 w-0.5 bg-white/50 z-10" />
                                 <div className="bg-emerald-400 h-full shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all" style={{ width: `${data.availability}%` }}></div>
                             </div>
                             <span className="text-[9px] md:text-[10px] font-mono text-emerald-400 w-8 md:w-10">{data.availability}%</span>
                        </div>
                        {/* Performance */}
                        <div className="flex items-center gap-3">
                             <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-tighter w-16 md:w-20 text-right">{t('dashboard.performance', 'Performance')}</span>
                             <div className="flex-1 bg-white/5 h-2 md:h-3 rounded-full relative overflow-hidden">
                                 <div className="absolute left-[85%] top-0 bottom-0 w-0.5 bg-white/50 z-10" />
                                 <div className="bg-blue-400 h-full shadow-[0_0_8px_rgba(96,165,250,0.5)] transition-all" style={{ width: `${data.performance}%` }}></div>
                             </div>
                             <span className="text-[9px] md:text-[10px] font-mono text-blue-400 w-8 md:w-10">{data.performance}%</span>
                        </div>
                        {/* Quality */}
                        <div className="flex items-center gap-3">
                             <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-tighter w-16 md:w-20 text-right">{t('dashboard.quality', 'Quality')}</span>
                             <div className="flex-1 bg-white/5 h-2 md:h-3 rounded-full relative overflow-hidden">
                                 <div className="absolute left-[85%] top-0 bottom-0 w-0.5 bg-white/50 z-10" />
                                 <div className="bg-purple-400 h-full shadow-[0_0_8px_rgba(192,132,252,0.5)] transition-all" style={{ width: `${data.quality}%` }}></div>
                             </div>
                             <span className="text-[9px] md:text-[10px] font-mono text-purple-400 w-8 md:w-10">{data.quality}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2/3 Production Progress Chart */}
                <div className="glass-panel p-4 md:p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            {t('dashboard.production_progress')}
                        </h3>
                        <div className="flex gap-4 text-[10px] uppercase font-bold">
                            <span className="text-green-400">● Good</span>
                            <span className="text-red-400">● NG</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar pb-4">
                        <div className="min-w-[600px]">
                            <ProductionProgressChart
                                events={data.productionEvents}
                                target={data.target}
                                shiftName={data.shift}
                            />
                        </div>
                    </div>
                    <div className="mt-6 border-t border-white/5" />
                </div>

                {/* 1/3 Status Timeline Card */}
                <div className="glass-panel p-4 md:p-6">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <h3 className="text-lg md:text-xl font-bold">{t('dashboard.status')}</h3>
                        <div className={`px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${data.state === 'running' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${data.state === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="font-bold uppercase tracking-widest text-[8px]">{data.state}</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar pb-4">
                        <div className="min-w-[600px]">
                            <StatusTimelineChart
                                timeline={data.timeline}
                                productionEvents={data.productionEvents}
                                height={200}
                            />
                        </div>
                    </div>
                    <div className="space-y-3 md:space-y-4 mt-6 md:mt-8">
                        {/* Run/Down Ratio Visual Bar */}
                        <div className="w-full h-2 bg-white/5 rounded-full flex overflow-hidden">
                            <div 
                                className="h-full bg-success transition-all duration-1000" 
                                style={{ width: `${(data.runningTime / (data.runningTime + data.downtime || 1)) * 100}%` }} 
                            />
                            <div 
                                className="h-full bg-danger transition-all duration-1000" 
                                style={{ width: `${(data.downtime / (data.runningTime + data.downtime || 1)) * 100}%` }} 
                            />
                        </div>
                        <div className="flex items-center justify-between p-2.5 md:p-3 bg-white/5 rounded">
                            <span className="text-xs md:text-sm text-gray-400 uppercase tracking-tighter">{t('dashboard.running')}</span>
                            <span className="text-base md:text-lg font-bold text-success tabular-nums">
                                {formatTime(data.runningTime)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 md:p-3 bg-white/5 rounded">
                            <span className="text-xs md:text-sm text-gray-400 uppercase tracking-tighter">{t('dashboard.downtime')}</span>
                            <span className="text-base md:text-lg font-bold text-danger tabular-nums">
                                {formatTime(data.downtime)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {error && <ErrorToast message={error.message} />}

            {/* Mobile Inline Actions (Elegant Placement) */}
            <div className="md:hidden mt-8 mb-4">
                {user?.role === 'manager' && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full py-3 bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,116,217,0.1)]"
                    >
                        <Settings size={20} />
                        {t('dashboard.edit_session', 'Edit Current Session')}
                    </button>
                )}
            </div>

            {/* Floating Action Buttons - Desktop Only */}
            <div className="fixed bottom-6 right-6 z-50 hidden md:flex flex-col gap-3">
                {user?.role === 'manager' && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-14 h-14 bg-accent hover:bg-blue-600 text-white rounded-full shadow-lg shadow-accent/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                        title={t('dashboard.edit_session', 'Edit Session')}
                    >
                        <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                )}
                <button
                    onClick={() => setIsDowntimeModalOpen(true)}
                    className="w-14 h-14 bg-warning hover:bg-yellow-500 text-black rounded-full shadow-lg shadow-warning/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                    title={t('dashboard.record_manual_downtime', 'Record Manual Downtime')}
                >
                    <AlertTriangle size={24} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            <DowntimeModal
                isOpen={isDowntimeModalOpen}
                onClose={() => setIsDowntimeModalOpen(false)}
                initialMachineId={machineId || 1}
            />

            <EditSessionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentData={data}
                machineId={machineId || 1}
                onSessionCaptured={refetch}
            />
        </div>
    );
};

export default Dashboard;
