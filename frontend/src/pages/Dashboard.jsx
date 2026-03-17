import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
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

const DigitalClock = ({ formatDateDisplay }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <p className="text-2xl font-mono font-bold text-white leading-none mt-1">
            {formatDateDisplay(currentTime)}
        </p>
    );
};

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [error, setError] = useState(null);
    const { t } = useTranslation();
    const { machineId } = useParams();
    const navigate = useNavigate();
    const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            const res = await axios.get(`/api/dashboard?machine_id=${machineId || 1}`);
            setData(res.data);
            setLoading(false);
            setError(null);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
            setLoading(false);
            setError("Sync error");
        }
    };


    useEffect(() => {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        const newSocket = io();
        setSocket(newSocket);

        fetchData();

        newSocket.on('machine_update', (update) => {
            if (update.machine_id == (machineId || 1)) {
                fetchData();
            }
        });

        newSocket.on('data_updated', (update) => {
            if (update.machine_id == (machineId || 1)) {
                fetchData();
            }
        });

        const retryInterval = setInterval(() => {
            if (error) {
                fetchData();
            }
        }, 3000);

        return () => {
            newSocket.close();
            clearInterval(retryInterval);
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
                    onClick={fetchData}
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
                No active production session found for this machine.
                <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest font-normal">Please start a new session to begin tracking performance.</p>
            </div>
            
            <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-8 py-4 bg-accent text-white rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-accent/20 active:scale-95 transition-all"
            >
                <Settings size={20} />
                START PRODUCTION SESSION
            </button>

            <EditSessionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentData={null}
                machineId={machineId || 1}
                onSessionCaptured={fetchData}
            />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Top Info Header Row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="glass-panel p-3 border-l-2 border-l-accent flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Product ID</p>
                    <p className="text-2xl font-bold text-white leading-none mt-1">{data.product_id}</p>
                </div>
                <div className="glass-panel p-3 flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Target</p>
                    <p className="text-2xl font-bold text-white leading-none mt-1">{data.target}</p>
                </div>
                <div className="glass-panel p-3 border-l-2 border-l-accent/50 flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Shift</p>
                    <p className="text-2xl font-bold text-accent leading-none mt-1">{data.shift}</p>
                </div>
                <div className="glass-panel p-3 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Machine ID</p>
                    <MachineSelector
                        selectedId={machineId || 1}
                        onChange={(id) => navigate(`/dashboard/${id}`)}
                        className="bg-transparent border-none p-0 h-auto text-2xl font-bold text-white text-center w-full"
                    />
                </div>
                <div className="glass-panel p-3 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Operator</p>
                    <p className="text-lg font-bold text-white leading-none mt-1">{data.operator}</p>
                    <p className="text-xs text-gray-400 mt-1">{data.operator_nim}</p>
                </div>
                <div className="glass-panel p-3 bg-accent/5 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">DATE & TIME</p>
                    <DigitalClock formatDateDisplay={formatDateDisplay} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total OK & NG Stacked */}
                <div className="space-y-4">
                    <div className="glass-panel p-4 flex flex-col items-center justify-center relative overflow-hidden group h-[120px]">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-1">TOTAL OK</h3>
                        <div className="text-5xl font-bold text-success leading-none">
                            {data.good}
                        </div>
                    </div>
                    <div className="glass-panel p-4 flex flex-col items-center justify-center relative overflow-hidden group h-[120px]">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <XCircle size={32} />
                        </div>
                        <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-1">TOTAL NG</h3>
                        <div className="text-5xl font-bold text-danger leading-none">
                            {data.ng}
                        </div>
                    </div>
                </div>

                {/* Progress % Box */}
                <div className="glass-panel p-6 flex flex-col items-center justify-center bg-accent/5 ring-1 ring-accent/20 h-[236px]">
                    <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-4">PRODUCTION PROGRESS %</h3>
                    <div className="text-7xl font-black text-white drop-shadow-md">
                        {((data.good / data.target) * 100).toFixed(1)}%
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full mt-6 overflow-hidden">
                        <div
                            className="bg-accent h-full transition-all duration-1000 shadow-[0_0_10px_#0074D9]"
                            style={{ width: `${Math.min((data.good / data.target) * 100, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Combined OEE, Cycle Time & A/P/Q */}
                <div className="glass-panel lg:col-span-2 overflow-hidden flex flex-col h-[236px] bg-white/[0.02]">
                    <div className="flex-1 flex items-center p-4 gap-4">
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('dashboard.oee')}</h3>
                            <div className="h-28 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={oeeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={55}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {oeeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-bold">{Number(data.oee).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-px h-24 bg-white/10" />
                        <div className="flex-1 text-center">
                            <Clock size={24} className="mx-auto mb-2 text-warning opacity-50" />
                            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-1">{t('dashboard.cycle_time')}</h3>
                            <div className="text-4xl font-bold text-warning">
                                {Number(data.avgCycleTime).toFixed(1)}s
                            </div>
                            <div className="text-xs text-gray-500 mt-1 uppercase">Target: 12.0s</div>
                        </div>
                    </div>
                    {/* A/P/Q percentages row */}
                    <div className="bg-white/5 border-t border-white/10 grid grid-cols-3 py-3 text-center">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Availability</p>
                            <p className="text-lg font-bold text-white">{data.availability}%</p>
                        </div>
                        <div className="border-x border-white/10">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Performance</p>
                            <p className="text-lg font-bold text-white">{data.performance}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Quality</p>
                            <p className="text-lg font-bold text-white">{data.quality}%</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2/3 Production Progress Chart */}
                <div className="glass-panel p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            {t('dashboard.production_progress')}
                        </h3>
                        <div className="flex gap-4 text-[10px] uppercase font-bold">
                            <span className="text-green-400">● Good</span>
                            <span className="text-red-400">● NG</span>
                        </div>
                    </div>
                    <ProductionProgressChart
                        events={data.productionEvents}
                        target={data.target}
                        shiftName={data.shift}
                    />
                    <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="w-full py-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl border border-accent/20 transition-all flex items-center justify-center gap-2 font-bold group"
                        >
                            <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                            EDIT SESSION (Product, Operator, Shift)
                        </button>
                        <button
                            onClick={() => setIsDowntimeModalOpen(true)}
                            className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl border border-amber-500/20 transition-all flex items-center justify-center gap-2 font-bold group"
                        >
                            <AlertTriangle size={18} className="group-hover:scale-110 transition-transform" />
                            RECORD MANUAL DOWNTIME (Alt + D)
                        </button>
                    </div>
                </div>

                {/* 1/3 Status Timeline Card */}
                <div className="glass-panel p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">{t('dashboard.status')}</h3>
                        <div className={`px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${data.state === 'running' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${data.state === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="font-bold uppercase tracking-widest text-[8px]">{data.state}</span>
                        </div>
                    </div>
                    <StatusTimelineChart
                        timeline={data.timeline}
                        productionEvents={data.productionEvents}
                        height={200}
                    />
                    <div className="space-y-4 mt-8">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                            <span className="text-sm text-gray-400 uppercase tracking-tighter">{t('dashboard.running')}</span>
                            <span className="text-lg font-bold text-green-400">
                                {formatTime(data.runningTime)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                            <span className="text-sm text-gray-400 uppercase tracking-tighter">{t('dashboard.downtime')}</span>
                            <span className="text-lg font-bold text-red-400">
                                {formatTime(data.downtime)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {error && <ErrorToast />}

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
                onSessionCaptured={fetchData}
            />
        </div>
    );
};

export default Dashboard;
