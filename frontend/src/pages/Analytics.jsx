import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Search, Clock, Calendar, BarChart3 } from 'lucide-react';
import MachineSelector from '../components/MachineSelector';
import StatusTimelineChart from '../components/StatusTimelineChart';
import ErrorToast from '../components/ErrorToast';
import AnimatedNumber from '../components/AnimatedNumber';

const Analytics = () => {
    const { t } = useTranslation();
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [selectedMachine, setSelectedMachine] = useState('');
    
    const [page, setPage] = useState(1);
    
    // We only want to fetch when the user clicks "Analyze"
    const [shouldFetch, setShouldFetch] = useState(false);

    const { data, isLoading: loading, error, refetch } = useQuery({
        queryKey: ['analytics', start, end, selectedMachine, page],
        queryFn: async () => {
            const url = `/api/analytics?start=${start}&end=${end}${selectedMachine ? `&machine_id=${selectedMachine}` : ''}&page=${page}&limit=20`;
            const res = await axios.get(url);
            return res.data;
        },
        enabled: shouldFetch && !!start && !!end,
    });



    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };
    const setQuickDate = (type) => {
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        let s, e;
        if (type === 'today') {
            s = new Date(startOfToday);
            e = new Date(now);
        } else if (type === 'yesterday') {
            s = new Date(startOfToday.getTime() - 24 * 3600 * 1000);
            e = new Date(startOfToday.getTime() - 1000);
        } else if (type === 'this_week') {
            const day = startOfToday.getDay();
            const diff = startOfToday.getDate() - day + (day === 0 ? -6 : 1);
            startOfToday.setDate(diff);
            s = new Date(startOfToday);
            e = new Date(now);
        }
        
        const formatForInput = (d) => {
            const tzoffset = d.getTimezoneOffset() * 60000;
            return (new Date(d - tzoffset)).toISOString().slice(0, 16);
        };
        
        setStart(formatForInput(s));
        setEnd(formatForInput(e));
        setShouldFetch(true);
        setTimeout(() => refetch(), 0);
    };

    const handleAnalyze = (e) => {
        e.preventDefault();
        if (start && end) {
            setPage(1); // Reset to page 1 on new search
            setShouldFetch(true);
            setTimeout(() => refetch(), 0);
        }
    };


    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl font-bold text-white">{t('nav.analytics')}</h1>

            {/* Controls */}
            <div className="glass-panel p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={16} /> {t('analytics.quick_filters', 'Quick Filters:')}</span>
                    <button onClick={() => setQuickDate('today')} className="px-3 py-1 rounded-full text-xs font-bold border border-white/20 hover:border-accent hover:text-accent transition-colors">{t('analytics.today', 'Today')}</button>
                    <button onClick={() => setQuickDate('yesterday')} className="px-3 py-1 rounded-full text-xs font-bold border border-white/20 hover:border-accent hover:text-accent transition-colors">{t('analytics.yesterday', 'Yesterday')}</button>
                    <button onClick={() => setQuickDate('this_week')} className="px-3 py-1 rounded-full text-xs font-bold border border-white/20 hover:border-accent hover:text-accent transition-colors">{t('analytics.this_week', 'This Week')}</button>
                </div>
                
                <form onSubmit={handleAnalyze} className="flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider">{t('dashboard.machine')}</label>
                    <MachineSelector
                        selectedId={selectedMachine}
                        onChange={setSelectedMachine}
                        showAll={true}
                    />
                </div>
                <div>
                    <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider">{t('analytics.start_datetime', 'Start Date/Time')}</label>
                    <input
                        type="datetime-local"
                        value={start}
                        onChange={e => setStart(e.target.value)}
                        className="glass-input px-4 py-2 rounded-lg"
                        required
                    />
                </div>
                <div>
                    <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider">{t('analytics.end_datetime', 'End Date/Time')}</label>
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
            </div>

            {error && <ErrorToast message={error?.message} isRetrying={false} />}

            {!loading && !data && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <div className="p-6 bg-white/5 rounded-full mb-6">
                        <BarChart3 size={48} className="opacity-30" />
                    </div>
                    <p className="text-lg font-medium text-gray-400">{t('analytics.select_date', 'Select a date range and click Analyze')}</p>
                    <p className="text-sm text-gray-600 mt-1">{t('analytics.insights_appear_here', 'Production insights will appear here')}</p>
                </div>
            )}

            {loading ? (
                <div className="space-y-6 animate-pulse">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass-panel h-36 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                        </div>
                        <div className="glass-panel h-36 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" style={{animationDelay: '150ms'}}></div>
                        </div>
                        <div className="glass-panel h-36 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" style={{animationDelay: '300ms'}}></div>
                        </div>
                        <div className="glass-panel h-36 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" style={{animationDelay: '450ms'}}></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 glass-panel h-96 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" style={{animationDelay: '600ms'}}></div>
                        </div>
                        <div className="glass-panel h-96 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" style={{animationDelay: '750ms'}}></div>
                        </div>
                    </div>
                </div>
            ) : data && (
                <div className="space-y-6">
                    {/* Top Row: Metrics + Donut */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass-panel p-6 flex flex-col justify-center items-center relative overflow-hidden group hover:border-green-500/50 transition-colors">
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_10px_#10B981]"></div>
                            <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">{t('dashboard.good')}</h3>
                            <div className="text-5xl font-bold text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)] tabular-nums">
                                <AnimatedNumber value={data.metrics.good} />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                {data.metrics.good + data.metrics.ng > 0 
                                    ? ((data.metrics.good / (data.metrics.good + data.metrics.ng)) * 100).toFixed(1) 
                                    : '0.0'}% yield
                            </p>
                        </div>
                        <div className="glass-panel p-6 flex flex-col justify-center items-center relative overflow-hidden group hover:border-red-500/50 transition-colors">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_#EF4444]"></div>
                            <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">{t('dashboard.ng')}</h3>
                            <div className="text-5xl font-bold text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.4)] tabular-nums">
                                <AnimatedNumber value={data.metrics.ng} />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                {data.metrics.good + data.metrics.ng > 0 
                                    ? ((data.metrics.ng / (data.metrics.good + data.metrics.ng)) * 100).toFixed(1) 
                                    : '0.0'}% defect rate
                            </p>
                        </div>
                        <div className="glass-panel p-6 flex flex-col justify-center items-center relative overflow-hidden group hover:border-accent/50 transition-colors">
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-[0_0_10px_#60A5FA]"></div>
                            <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">{t('dashboard.oee')}</h3>
                            <div className="text-5xl font-bold text-accent drop-shadow-[0_0_15px_rgba(96,165,250,0.4)] tabular-nums">
                                <AnimatedNumber value={data.metrics.oee} decimals={1} suffix="%" />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                A:{data.metrics.availability || '—'}% · P:{data.metrics.performance || '—'}% · Q:{data.metrics.quality || '—'}%
                            </p>
                        </div>
                        
                        <div className="glass-panel p-4 flex flex-col items-center justify-center relative min-h-[140px]">
                            <h3 className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-2">{t('analytics.run_ratio', 'RUN RATIO')}</h3>
                            <div className="h-24 w-full relative mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Running', value: Number(data.metrics.runTime) || 1 }, // Ensure it renders if 0
                                                { name: 'Downtime', value: Number(data.metrics.downTime) }
                                            ]}
                                            cx="50%"
                                            cy="100%"
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={0}
                                            dataKey="value"
                                            stroke="none"
                                            isAnimationActive={true}
                                        >
                                            <Cell fill="#10B981" />
                                            <Cell fill={Number(data.metrics.downTime) > 0 ? "#EF4444" : "transparent"} />
                                        </Pie>
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const val = payload[0].payload.name === 'Running' && Number(data.metrics.runTime) === 0 ? 0 : payload[0].value;
                                                    return (
                                                        <div className="bg-gray-900/95 border border-white/10 p-2 rounded shadow-xl text-xs backdrop-blur-md">
                                                            <span className="text-gray-300">{payload[0].name}: </span>
                                                            <span className="font-bold text-white tabular-nums">{formatTime(val)}</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center label */}
                                <div className="absolute bottom-0 w-full flex flex-col items-center justify-center pointer-events-none pb-1">
                                    <span className="text-2xl font-bold text-white tabular-nums drop-shadow-md">
                                        {data.metrics.runTime + data.metrics.downTime > 0
                                            ? Math.round((data.metrics.runTime / (data.metrics.runTime + data.metrics.downTime)) * 100)
                                            : 0}%
                                    </span>
                                </div>
                            </div>
                            {/* Running & Downtime totals in hh:mm:ss */}
                            <div className="w-full mt-2 space-y-1 text-[10px] font-mono tracking-wide">
                                <div className="flex justify-between items-center">
                                    <span className="text-green-400 flex items-center gap-1">
                                        <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                        Running
                                    </span>
                                    <span className="text-green-300 font-bold tabular-nums">{formatTime(data.metrics.runTime)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-red-400 flex items-center gap-1">
                                        <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                                        Downtime
                                    </span>
                                    <span className="text-red-300 font-bold tabular-nums">{formatTime(data.metrics.downTime)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Timeline + Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Timeline */}
                        <div className="glass-panel p-6 lg:col-span-2 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                                    <Clock size={18} className="text-accent" /> {t('dashboard.status')}
                                </h3>
                                <div className="flex gap-4 text-xs font-bold tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                                    <span className="text-green-400">RUN: <AnimatedNumber value={data.metrics.runTime} isTime={true} /></span>
                                    <span className="text-white/20">|</span>
                                    <span className="text-red-400">DOWN: <AnimatedNumber value={data.metrics.downTime} isTime={true} /></span>
                                </div>
                            </div>
                            <div className="flex-1 min-h-[300px]">
                                <StatusTimelineChart
                                    timeline={data.timeline}
                                    startRange={start}
                                    endRange={end}
                                    height={300}
                                />
                            </div>
                        </div>

                        {/* Downtime Events List */}
                        <div className="glass-panel flex flex-col overflow-hidden max-h-[500px]">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('analytics.downtime_log', 'Downtime Log')}</h3>
                                <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold tabular-nums">
                                    {data.pagination?.totalEvents || data.downtimeEvents?.length || 0} {t('analytics.total_events', 'Total Events')}
                                </span>
                            </div>
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-black/20 text-gray-400 uppercase text-[9px] font-bold tracking-widest sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="p-3">{t('dashboard.time', 'Time')}</th>
                                            <th className="p-3">{t('modals.reason', 'Reason')}</th>
                                            <th className="p-3 text-right">{t('analytics.status', 'Status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.downtimeEvents?.map((d, idx) => (
                                            <tr key={idx} className="hover:bg-white/10 transition-colors group">
                                                <td className="p-3 text-gray-300">
                                                    <div className="font-mono text-white group-hover:text-accent transition-colors">
                                                        {new Date(d.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="text-[9px] text-gray-500 mt-0.5">
                                                        {new Date(d.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-300">{d.reason}</div>
                                                    <div className="text-[10px] text-accent/70 mt-0.5 font-mono">{d.machine_code}</div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    {d.end_time ? (
                                                        <span className="text-[10px] text-gray-500 font-mono">{t('analytics.resolved', 'Resolved')}</span>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                            </span>
                                                            <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider">{t('analytics.ongoing', 'Ongoing')}</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!data.downtimeEvents || data.downtimeEvents.length === 0) && (
                                            <tr>
                                                <td colSpan="3" className="p-8 text-center text-gray-500 italic">
                                                    {t('analytics.no_downtime', 'No downtime recorded.')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            {data.pagination && data.pagination.totalPages > 1 && (
                                <div className="p-3 border-t border-white/10 flex justify-between items-center bg-black/20">
                                    <span className="text-[10px] text-gray-400 font-mono tracking-widest">
                                        SHOWING {(data.pagination.currentPage - 1) * 20 + 1}-{Math.min(data.pagination.currentPage * 20, data.pagination.totalEvents)} OF {data.pagination.totalEvents}
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                                            disabled={page === data.pagination.totalPages}
                                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
