import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Search } from 'lucide-react';
import MachineSelector from '../components/MachineSelector';
import StatusTimelineChart from '../components/StatusTimelineChart';
import ErrorToast from '../components/ErrorToast';

const Analytics = () => {
    const { t } = useTranslation();
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [selectedMachine, setSelectedMachine] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    const fetchAnalytics = async (e) => {
        e.preventDefault();
        setLoading(true);
        setProgress(0);
        setError('');
        setData(null);

        // Simulated progress interval
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev;
                // Slow down as it approaches 95%
                const step = prev < 60 ? 10 : prev < 80 ? 5 : 1;
                return prev + step;
            });
        }, 150);

        try {
            const url = `/api/analytics?start=${start}&end=${end}${selectedMachine ? `&machine_id=${selectedMachine}` : ''}`;
            const res = await axios.get(url);
            clearInterval(interval);
            setProgress(100);

            // Short delay to show 100% before rendering
            setTimeout(() => {
                setData(res.data);
                setLoading(false);
            }, 300);
        } catch (error) {
            clearInterval(interval);
            console.error("Error fetching analytics", error);
            setError("Failed to load analytics data. Please check your connection or try a different date range.");
            setLoading(false);
        }
    };


    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl font-bold text-white">{t('nav.analytics')}</h1>

            {/* Controls */}
            <form onSubmit={fetchAnalytics} className="glass-panel p-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider">{t('dashboard.machine')}</label>
                    <MachineSelector
                        selectedId={selectedMachine}
                        onChange={setSelectedMachine}
                        showAll={true}
                    />
                </div>
                <div>
                    <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider">Start Date/Time</label>
                    <input
                        type="datetime-local"
                        value={start}
                        onChange={e => setStart(e.target.value)}
                        className="glass-input px-4 py-2 rounded-lg"
                        required
                    />
                </div>
                <div>
                    <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider">End Date/Time</label>
                    <input
                        type="datetime-local"
                        value={end}
                        onChange={e => setEnd(e.target.value)}
                        className="glass-input px-4 py-2 rounded-lg"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="relative bg-accent hover:bg-blue-600 px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 overflow-hidden min-w-[140px] justify-center"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="absolute inset-0 bg-blue-700/50"></div>
                            <div
                                className="absolute inset-y-0 left-0 bg-blue-400 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                            <span className="relative z-10 flex items-center gap-2 text-sm text-white drop-shadow-md">
                                <Search size={16} className="animate-spin" />
                                {t('common.analyzing') || 'Processing...'}
                            </span>
                        </>
                    ) : (
                        <>
                            <Search size={18} />
                            Analyze
                        </>
                    )}
                </button>
            </form>

            {error && <ErrorToast />}

            {data && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-8"
                >
                    {/* Metrics Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div variants={itemVariants} className="glass-panel p-6 text-center">
                            <h3 className="text-gray-400 text-sm uppercase mb-2">{t('dashboard.good')}</h3>
                            <p className="text-4xl font-bold text-green-400">
                                {data.metrics.good}
                            </p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="glass-panel p-6 text-center">
                            <h3 className="text-gray-400 text-sm uppercase mb-2">{t('dashboard.ng')}</h3>
                            <p className="text-4xl font-bold text-red-400">
                                {data.metrics.ng}
                            </p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="glass-panel p-6 text-center">
                            <h3 className="text-gray-400 text-sm uppercase mb-2">{t('dashboard.oee')}</h3>
                            <p className="text-4xl font-bold text-accent">
                                {Number(data.metrics.oee).toFixed(1)}%
                            </p>
                        </motion.div>
                    </div>

                    {/* Timeline Chart */}
                    <motion.div variants={itemVariants} className="glass-panel p-6">
                        <h3 className="text-xl font-bold text-white mb-4">{t('dashboard.status')}</h3>
                        <StatusTimelineChart
                            timeline={data.timeline}
                            productionEvents={data.productionEvents}
                            showEvents={false}
                        />

                        <div className="flex gap-8 mt-10 justify-center">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 uppercase tracking-tighter mb-1">{t('dashboard.running')}</span>
                                <span className="text-xl font-bold text-green-400">
                                    {formatTime(data.metrics.runTime)}
                                </span>
                            </div>
                            <div className="flex flex-col items-center border-l border-white/10 pl-8">
                                <span className="text-xs text-gray-400 uppercase tracking-tighter mb-1">{t('dashboard.downtime')}</span>
                                <span className="text-xl font-bold text-red-400">
                                    {formatTime(data.metrics.downTime)}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Downtime Events List (New) */}
                    <motion.div variants={itemVariants} className="glass-panel overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white">Downtime Events in Period</h3>
                            <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">
                                {data.downtimeEvents?.length || 0} Events
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                                    <tr>
                                        <th className="p-3">Machine</th>
                                        <th className="p-3">Start</th>
                                        <th className="p-3">End</th>
                                        <th className="p-3">Reason</th>
                                        <th className="p-3">Operator</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {data.downtimeEvents?.map((d, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-mono font-bold border border-accent/20">
                                                    {d.machine_code}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-300">
                                                {new Date(d.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-3 text-gray-300">
                                                {d.end_time
                                                    ? new Date(d.end_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                                    : <span className="text-accent italic">Ongoing</span>
                                                }
                                            </td>
                                            <td className="p-3 text-gray-400 italic font-medium">{d.reason}</td>
                                            <td className="p-3 text-gray-400">{d.operator_name || 'System'}</td>
                                        </tr>
                                    ))}
                                    {(!data.downtimeEvents || data.downtimeEvents.length === 0) && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-gray-500 italic">
                                                No specific downtime events recorded in this timeframe.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default Analytics;
