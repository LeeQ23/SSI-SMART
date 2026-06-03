import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Activity, CheckCircle, XCircle, Zap, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ErrorToast from '../components/ErrorToast';

import LogoLoader from '../components/LogoLoader';

// Maximum expected current draw (Amps) for the micro progress bar scale
const MAX_CURRENT_AMPS = 5;

const Overview = () => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const errorRef = useRef(null);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const fetchMachines = async () => {
        try {
            const res = await axios.get('/api/dashboard/all');
            setMachines(res.data);
            setLoading(false);
            setError(null);
            errorRef.current = null;
        } catch (err) {
            console.error("Error fetching machines overview", err);
            setError("Sync error");
            errorRef.current = "Sync error";
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
            if (errorRef.current) {
                fetchMachines();
            }
        }, 3000);

        return () => {
            socket.close();
            clearInterval(retryInterval);
        };
    }, []);

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
                        className={`p-4 rounded-xl cursor-pointer hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden border backdrop-blur-md ${
                            m.state === 'running' 
                                ? 'bg-success/5 border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                : 'bg-danger/5 border-danger/30 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-pulse-slow'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors">{m.code}</h3>
                                <p className="text-xs text-gray-400 uppercase tracking-widest">{m.type}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${m.state === 'running' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                                }`}>
                                {m.state}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-black/20 border border-white/5 p-2 rounded">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Good</p>
                                <p className="text-xl font-bold text-success tabular-nums">
                                    {m.good}
                                </p>
                            </div>
                            <div className="bg-black/20 border border-white/5 p-2 rounded">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">NG</p>
                                <p className="text-xl font-bold text-danger tabular-nums">
                                    {m.ng}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                            <div className="flex items-center gap-2" title={`${Number(m.current).toFixed(2)} A`}>
                                <Zap size={14} className={m.state === 'running' ? 'text-warning animate-pulse' : 'text-gray-600'} />
                                <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                                    <div 
                                        className={`h-full transition-all duration-500 ${m.state === 'running' ? 'bg-warning shadow-[0_0_8px_rgba(255,220,0,0.8)]' : 'bg-gray-600'}`} 
                                        style={{ width: `${Math.min((Number(m.current) / MAX_CURRENT_AMPS) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="group-hover:translate-x-1 group-hover:text-accent font-bold transition-all flex items-center gap-1">
                                Details <span>→</span>
                            </div>
                        </div>

                        {/* Background subtle glow when running */}
                        {m.state === 'running' && (
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-success/20 blur-[40px] rounded-full pointer-events-none" />
                        )}
                    </div>
                ))}
            </div>

            {error && <ErrorToast message={error} />}
        </div>
    );
};

export default Overview;
