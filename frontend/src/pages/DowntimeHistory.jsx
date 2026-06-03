import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Clock, Calendar, Hash, User, MessageSquare, Download, RefreshCw } from 'lucide-react';
import MachineSelector from '../components/MachineSelector';
import LogoLoader from '../components/LogoLoader';
import ErrorToast from '../components/ErrorToast';

const DowntimeHistory = () => {
    const { t } = useTranslation();
    const [downtimes, setDowntimes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [limit, setLimit] = useState(25);
    const [hasMore, setHasMore] = useState(true);
    const [selectedMachine, setSelectedMachine] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortField, setSortField] = useState('start_time');
    const [sortDir, setSortDir] = useState('DESC');

    const fetchDowntimes = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/downtimes?limit=${limit}${selectedMachine ? `&machine_id=${selectedMachine}` : ''}${startDate ? `&start_date=${startDate}` : ''}${endDate ? `&end_date=${endDate}` : ''}&orderBy=${sortField}&orderDir=${sortDir}`);
            setDowntimes(res.data);
            if (res.data.length < limit) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("Error fetching downtimes", err);
            setError("Failed to load downtime history");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDowntimes();
    }, [limit, selectedMachine, startDate, endDate, sortField, sortDir]);

    const handleLoadMore = () => {
        setLimit(prev => prev + 25);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => (prev === 'DESC' ? 'ASC' : 'DESC'));
        } else {
            setSortField(field);
            setSortDir('DESC');
        }
    };

    const formatDuration = (start, end) => {
        if (!end) return 'Ongoing';
        const duration = Math.floor((new Date(end) - new Date(start)) / 1000);
        const h = Math.floor(duration / 3600);
        const m = Math.floor((duration % 3600) / 60);
        const s = duration % 60;

        const parts = [];
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        parts.push(`${s}s`);
        return parts.join(' ');
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const downloadCSV = () => {
        const headers = ['Machine', 'Start Time', 'End Time', 'Duration', 'Operator', 'Reason'];
        const csvContent = [
            headers.join(','),
            ...downtimes.map(d => [
                d.machine_code,
                new Date(d.start_time).toLocaleString(),
                d.end_time ? new Date(d.end_time).toLocaleString() : 'Active',
                `"${formatDuration(d.start_time, d.end_time)}"`,
                d.operator_name || 'System',
                `"${d.reason.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `downtime_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading && downtimes.length === 0) return <LogoLoader />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <Clock className="text-accent" />
                    Downtime History
                </h1>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">{t('dashboard.machine')}</span>
                        <MachineSelector
                            selectedId={selectedMachine}
                            onChange={setSelectedMachine}
                            showAll={true}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-white">
                        <span className="text-gray-400 text-sm">From</span>
                        <input
                            type="date"
                            className="glass-input p-2 rounded text-sm text-white bg-white/5 border-white/10"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-white">
                        <span className="text-gray-400 text-sm">To</span>
                        <input
                            type="date"
                            className="glass-input p-2 rounded text-sm text-white bg-white/5 border-white/10"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchDowntimes}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 text-white"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-6 py-2 bg-success hover:bg-success/80 rounded-xl transition-all whitespace-nowrap text-sm font-bold shadow-lg shadow-success/10"
                    >
                        <Download size={18} /> EXPORT CSV
                    </button>
                </div>
            </div>

            {error && <ErrorToast message={error} />}

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 uppercase text-xs font-bold tracking-widest border-b border-white/10">
                            <tr>
                                <th
                                    className="p-4 cursor-pointer hover:text-white transition-colors"
                                    onClick={() => handleSort('machine_code')}
                                >
                                    Machine {sortField === 'machine_code' && (sortDir === 'ASC' ? '▲' : '▼')}
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:text-white transition-colors"
                                    onClick={() => handleSort('start_time')}
                                >
                                    Start Time {sortField === 'start_time' && (sortDir === 'ASC' ? '▲' : '▼')}
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:text-white transition-colors"
                                    onClick={() => handleSort('end_time')}
                                >
                                    End Time {sortField === 'end_time' && (sortDir === 'ASC' ? '▲' : '▼')}
                                </th>
                                <th className="p-4">Duration</th>
                                <th className="p-4">Operator</th>
                                <th className="p-4">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {downtimes.map((d) => (
                                <tr key={d.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {!d.end_time && <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
                                            <span className="px-2 py-1 rounded bg-accent/10 text-accent text-xs font-mono font-bold border border-accent/20">
                                                {d.machine_code}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-gray-300">
                                        {formatDate(d.start_time)}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-gray-300">
                                        {d.end_time ? formatDate(d.end_time) : <span className="text-accent italic font-bold">Currently Active</span>}
                                    </td>
                                    <td className="p-4 text-sm">
                                        <span className={`font-mono font-bold ${d.end_time ? 'text-gray-400' : 'text-accent'}`}>
                                            {formatDuration(d.start_time, d.end_time)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <User size={14} />
                                            {d.operator_name || 'System'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-start gap-2 max-w-xs">
                                            <MessageSquare size={14} className="mt-1 text-gray-500 shrink-0" />
                                            <span className="text-sm text-gray-300 italic">{d.reason}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {downtimes.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                        <Calendar size={48} className="text-gray-700" />
                        <div className="text-gray-500 font-medium">No downtime events recorded yet.</div>
                    </div>
                )}
            </div>

            {hasMore && downtimes.length > 0 && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-bold text-gray-300 hover:text-white disabled:opacity-50"
                    >
                        {loading ? 'LOADING...' : 'LOAD MORE DATA'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DowntimeHistory;
