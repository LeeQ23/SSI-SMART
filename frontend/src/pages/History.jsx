import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, User, Package, Calendar } from 'lucide-react';
import MachineSelector from '../components/MachineSelector';
import LogoLoader from '../components/LogoLoader';
import ErrorToast from '../components/ErrorToast';

const History = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(25);
  const [hasMore, setHasMore] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('start_time');
  const [sortDir, setSortDir] = useState('DESC');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        limit,
        orderBy: sortField,
        orderDir: sortDir
      });
      if (selectedMachine) queryParams.append('machine_id', selectedMachine);
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);

      const res = await axios.get(`/api/history?${queryParams.toString()}`);
      setHistory(res.data);
      setHasMore(res.data.length === limit);
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error fetching history", error);
      setError("Sync error");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const retryInterval = setInterval(() => {
      if (error) fetchHistory();
    }, 3000);
    return () => clearInterval(retryInterval);
  }, [selectedMachine, error, limit, startDate, endDate, sortField, sortDir]);

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

  const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return '0s';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    let res = '';
    if (h > 0) res += `${h}h `;
    if (m > 0 || h > 0) res += `${m}m `;
    res += `${s}s`;
    return res;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  const downloadCSV = () => {
    const headers = ['Start Time', 'End Time', 'Machine', 'Product ID', 'Operator', 'Shift', 'Good', 'NG', 'OEE %'];
    const csvContent = [
      headers.join(','),
      ...history.map(row => [
        `"${formatDateTime(row.start_time)}"`,
        `"${formatDateTime(row.end_time)}"`,
        row.machine_code,
        row.product_id,
        row.operator_name,
        row.shift_name,
        row.good_count,
        row.ng_count,
        `"${row.oee}%"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading && history.length === 0) return <LogoLoader />;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="text-accent" size={32} />
            {t('history.title', 'Production History')}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-white">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm whitespace-nowrap">{t('dashboard.machine')}</span>
            <MachineSelector
              selectedId={selectedMachine}
              onChange={setSelectedMachine}
              showAll={true}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">From</span>
            <input
              type="date"
              className="glass-input p-2 rounded text-sm text-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">To</span>
            <input
              type="date"
              className="glass-input p-2 rounded text-sm text-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={fetchHistory}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading && history.length > 0 ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-6 py-2 bg-success hover:bg-success/80 rounded-xl transition-all whitespace-nowrap text-sm font-bold shadow-lg shadow-success/10"
          >
            <Download size={18} /> EXPORT CSV
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-white/5 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-white/10">
              <tr>
                <th className="p-4">Machine</th>
                <th
                  className="p-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('start_time')}
                >
                  Session Start {sortField === 'start_time' && (sortDir === 'ASC' ? '▲' : '▼')}
                </th>
                <th className="p-4">Shift</th>
                <th className="p-4">Product ID</th>
                <th className="p-4">Operator</th>
                <th className="p-4 text-center">Good</th>
                <th className="p-4 text-center">NG</th>
                <th className="p-4 text-center">Duration</th>
                <th className="p-4 text-center text-accent">OEE %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`transition-colors group ${
                    Number(row.oee) < 50 
                      ? 'bg-danger/10 hover:bg-danger/20 border-l-2 border-l-danger' 
                      : Number(row.oee) < 80 
                        ? 'bg-warning/5 hover:bg-warning/10 border-l-2 border-l-warning'
                        : 'hover:bg-accent/5 border-l-2 border-l-transparent'
                  }`}
                >
                  <td className="p-4">
                    <span className="px-2 py-1 rounded bg-accent/10 text-accent text-xs font-mono border border-accent/20">
                      {row.machine_code}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-white text-sm font-medium">{formatDateTime(row.start_time)}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5 font-mono uppercase">Ends: {formatDateTime(row.end_time)}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase border border-blue-500/20">
                      {row.shift_name}
                    </span>
                  </td>
                  <td className="p-4">
                     <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Package size={14} className="text-gray-500" />
                        {row.product_id}
                     </div>
                  </td>
                  <td className="p-4">
                     <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-white font-medium">
                            <User size={14} className="text-accent/60" />
                            {row.operator_name}
                        </div>
                        <div className="text-[10px] text-gray-500 ml-5">{row.operator_nim}</div>
                     </div>
                  </td>
                  <td className="p-4 font-mono text-success text-center font-bold text-base tabular-nums">{row.good_count}</td>
                  <td className="p-4 font-mono text-danger text-center font-bold text-base tabular-nums">{row.ng_count}</td>
                  <td className="p-4 font-mono text-gray-400 text-center text-xs">
                     {formatDuration(row.running_duration_sec + row.downtime_duration_sec)}
                  </td>
                  <td className="p-4 text-center">
                    <div className={`inline-flex items-center justify-center border rounded-lg px-3 py-1 font-bold font-mono ${
                        Number(row.oee) >= 80 
                            ? 'bg-success/10 border-success/20 text-success' 
                            : Number(row.oee) >= 50
                                ? 'bg-warning/10 border-warning/20 text-warning'
                                : 'bg-danger/10 border-danger/20 text-danger shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    }`}>
                        {row.oee}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {history.length === 0 && !loading && (
          <div className="p-20 text-center flex flex-col items-center gap-4 text-gray-500">
             <div className="p-4 bg-white/5 rounded-full">
                <Calendar size={48} className="opacity-20" />
             </div>
             <p className="italic text-sm">No production sessions found matching the filters.</p>
          </div>
        )}
      </div>

      {hasMore && history.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-10 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-bold text-gray-300 hover:text-white disabled:opacity-50 tracking-widest text-xs"
          >
            {loading ? 'LOADING...' : 'LOAD MORE DATA'}
          </button>
        </div>
      )}

      {error && <ErrorToast message={error} />}
    </div>
  );
};

export default History;
