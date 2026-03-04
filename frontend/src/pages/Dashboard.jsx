import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import MachineSelector from '../components/MachineSelector';
import StatusTimelineChart from '../components/StatusTimelineChart';
import AnimatedNumber from '../components/AnimatedNumber';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [error, setError] = useState(null);
    const { t } = useTranslation();
    const { machineId } = useParams();
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const res = await axios.get(`/api/dashboard?machine_id=${machineId || 1}`);
            setData(res.data);
            setLoading(false);
            setError(null);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
            setLoading(false);
            setError("Failed to connect to machine backend. Please check connection.");
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

        return () => {
            newSocket.close();
        };
    }, [machineId]); // Re-run when machineId changes


    if (loading) return <div className="text-white text-center p-10">Loading Dashboard...</div>;
    if (error) return <div className="text-red-500 text-center p-10 font-bold">{error}</div>;
    if (!data) return <div className="text-white text-center p-10">No data available.</div>;


    const oeeData = [
        { name: 'OEE', value: parseFloat(data.oee) },
        { name: 'Remaining', value: 100 - parseFloat(data.oee) }
    ];
    const COLORS = ['#0074D9', '#1a3a5a'];

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        Production Dashboard
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Shift: <span className="text-accent font-semibold">{data.shift}</span> | Target: {data.target}
                    </p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <MachineSelector
                        selectedId={machineId || 1}
                        onChange={(id) => navigate(`/dashboard/${id}`)}
                    />
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${data.state === 'running' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                        <div className={`w-3 h-3 rounded-full ${data.state === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="font-bold uppercase tracking-wider text-sm">{data.state}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-panel p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle size={64} />
                    </div>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">{t('dashboard.good')}</h3>
                    <div className="text-5xl font-bold text-success">
                        <AnimatedNumber value={data.good} />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Units</div>
                </div>

                <div className="glass-panel p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <XCircle size={64} />
                    </div>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">{t('dashboard.ng')}</h3>
                    <div className="text-5xl font-bold text-danger">
                        <AnimatedNumber value={data.ng} />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Units</div>
                </div>

                <div className="glass-panel p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} />
                    </div>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">{t('dashboard.cycle_time')}</h3>
                    <div className="text-5xl font-bold text-warning">
                        <AnimatedNumber value={data.avgCycleTime} decimals={1} suffix="s" />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{t('dashboard.target')}: 2.0s</div>
                </div>

                <div className="glass-panel p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={64} />
                    </div>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">{t('dashboard.current')}</h3>
                    <div className="text-5xl font-bold text-accent">
                        <AnimatedNumber value={data.current} decimals={2} suffix="A" />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{t('dashboard.threshold')}: 0.5A</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-panel p-6 flex flex-col items-center justify-center">
                    <h3 className="text-xl font-bold mb-4">{t('dashboard.oee')}</h3>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={oeeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
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
                                <Tooltip contentStyle={{ backgroundColor: '#001F3F', borderColor: '#003366', color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold">
                                <AnimatedNumber value={data.oee} decimals={1} suffix="%" />
                            </span>
                            <span className="text-xs text-gray-400">{t('dashboard.efficiency')}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 w-full mt-4 text-center text-sm">
                        <div>
                            <div className="text-gray-400">{t('dashboard.availability')}</div>
                            <div className="font-bold">
                                <AnimatedNumber value={data.availability} decimals={1} suffix="%" />
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">{t('dashboard.performance')}</div>
                            <div className="font-bold">
                                <AnimatedNumber value={data.performance} decimals={1} suffix="%" />
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">{t('dashboard.quality')}</div>
                            <div className="font-bold">
                                <AnimatedNumber value={data.quality} decimals={1} suffix="%" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 lg:col-span-2">
                    <h3 className="text-xl font-bold mb-6">{t('dashboard.status')}</h3>

                    <StatusTimelineChart
                        timeline={data.timeline}
                        productionEvents={data.productionEvents}
                        height={240}
                    />

                    <div className="flex gap-8 mt-10 justify-center">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-400 uppercase tracking-tighter mb-1">{t('dashboard.running')}</span>
                            <span className="text-xl font-bold text-green-400">
                                <AnimatedNumber value={data.runningTime} isTime={true} />
                            </span>
                        </div>
                        <div className="flex flex-col items-center border-l border-white/10 pl-8">
                            <span className="text-xs text-gray-400 uppercase tracking-tighter mb-1">{t('dashboard.downtime')}</span>
                            <span className="text-xl font-bold text-red-400">
                                <AnimatedNumber value={data.downtime} isTime={true} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
