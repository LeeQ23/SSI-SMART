import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Activity, CheckCircle, XCircle, Zap, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ErrorToast from '../components/ErrorToast';

import LogoLoader from '../components/LogoLoader';

const Overview = () => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const fetchMachines = async () => {
        try {
            const res = await axios.get('/api/dashboard/all');
            setMachines(res.data);
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("Error fetching machines overview", err);
            setError("Sync error");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();

        const socket = io();

        socket.on('machine_update', (update) => {
            setMachines(prev => prev.map(m =>
                m.id === update.machine_id ? { ...m, state: update.state, current: update.current } : m
            ));
        });

        socket.on('signal_event', (event) => {
            setMachines(prev => prev.map(m => {
                if (m.id === event.machine_id) {
                    return {
                        ...m,
                        good: event.type === 'good' ? m.good + 1 : m.good,
                        ng: event.type === 'ng' ? m.ng + 1 : m.ng
                    };
                }
                return m;
            }));
        });

        socket.on('data_updated', () => {
            fetchMachines();
        });

        const retryInterval = setInterval(() => {
            if (error) {
                fetchMachines();
            }
        }, 10000);

        return () => {
            socket.close();
            clearInterval(retryInterval);
        };
    }, [error]);

    if (loading && machines.length === 0) return <LogoLoader />;
    // Removed early error return

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <LayoutGrid className="text-accent" />
                    Machine Overview Grid
                </h1>
                <div className="text-sm text-gray-400">
                    Monitoring {machines.length} Machines
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {machines.map((m) => (
                    <div
                        key={m.id}
                        onClick={() => navigate(`/dashboard/${m.id}`)}
                        className={`glass-panel p-4 cursor-pointer hover:border-accent/50 transition-all group relative overflow-hidden ${m.state === 'running' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors">{m.code}</h3>
                                <p className="text-xs text-gray-400 uppercase tracking-widest">{m.type}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${m.state === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {m.state}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-white/5 p-2 rounded">
                                <p className="text-[10px] text-gray-400 uppercase">Good</p>
                                <p className="text-lg font-bold text-green-400">
                                    {m.good}
                                </p>
                            </div>
                            <div className="bg-white/5 p-2 rounded">
                                <p className="text-[10px] text-gray-400 uppercase">NG</p>
                                <p className="text-lg font-bold text-red-400">
                                    {m.ng}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Zap size={12} className={m.state === 'running' ? 'text-yellow-400 animate-pulse' : ''} />
                                {Number(m.current).toFixed(2)} A
                            </div>
                            <div className="group-hover:translate-x-1 transition-transform">
                                Details →
                            </div>
                        </div>

                        {/* Background subtle glow when running */}
                        {m.state === 'running' && (
                            <div className="absolute -right-4 -top-4 w-12 h-12 bg-green-500/10 blur-2xl rounded-full" />
                        )}
                    </div>
                ))}
            </div>

            {error && <ErrorToast />}
        </div>
    );
};

export default Overview;
