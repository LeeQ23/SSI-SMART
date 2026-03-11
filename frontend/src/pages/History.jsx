import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Download, MessageSquare, RefreshCw } from 'lucide-react';
import MachineSelector from '../components/MachineSelector';
import LogoLoader from '../components/LogoLoader';
import ErrorToast from '../components/ErrorToast';

const History = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingComment, setEditingComment] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(25);
  const [hasMore, setHasMore] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('date');
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

      // If we got fewer records than the limit, we've reached the end
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

  const downloadCSV = () => {
    const headers = ['Date', 'Shift', 'Good', 'NG', 'Runtime', 'Downtime', 'OEE %', 'Total Signals'];
    const csvContent = [
      headers.join(','),
      ...history.map(row => [
        new Date(row.date).toLocaleDateString(),
        row.shift_name,
        row.good,
        row.ng,
        `"${formatDuration(row.runTime)}"`,
        `"${formatDuration(row.downTime)}"`,
        `"${row.oee}%"`,
        row.log_count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleCommentClick = (row) => {
    setEditingComment(row);
    setCommentText(''); // Usually you'd fetch existing comment here if available
  };

  const saveComment = async () => {
    if (!editingComment) return;
    try {
      await axios.post('/api/history/comment', {
        shift_date: new Date(editingComment.date).toISOString().split('T')[0],
        shift_id: editingComment.shift_id,
        comment: commentText
      });
      setEditingComment(null);
      alert('Comment saved!');
    } catch (error) {
      alert('Failed to save comment');
    }
  };

  if (loading && history.length === 0) return <LogoLoader />;

  return (
    <div className="space-y-6 relative">
      {editingComment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-white">Add Comment</h3>
            <p className="text-sm text-gray-400 mb-4">
              {new Date(editingComment.date).toLocaleDateString()} - {editingComment.shift_name}
            </p>
            <textarea
              className="w-full h-32 glass-input p-3 rounded-lg mb-4 text-white"
              placeholder="Enter shift notes, operator name, or downtime reasons..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingComment(null)}
                className="px-4 py-2 rounded hover:bg-white/10 text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveComment}
                className="px-4 py-2 bg-accent rounded hover:bg-blue-600 text-white font-bold"
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Production History</h1>
        <div className="flex flex-wrap items-center gap-4 text-white">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">{t('dashboard.machine')}</span>
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors whitespace-nowrap text-sm font-bold"
          >
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 uppercase text-xs font-bold tracking-widest border-b border-white/10">
              <tr>
                <th className="p-4">{t('dashboard.machine')}</th>
                <th
                  className="p-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('date')}
                >
                  Date {sortField === 'date' && (sortDir === 'ASC' ? '▲' : '▼')}
                </th>
                <th className="p-4">Shift</th>
                <th
                  className="p-4 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('good')}
                >
                  Good {sortField === 'good' && (sortDir === 'ASC' ? '▲' : '▼')}
                </th>
                <th
                  className="p-4 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('ng')}
                >
                  NG {sortField === 'ng' && (sortDir === 'ASC' ? '▲' : '▼')}
                </th>
                <th className="p-4 text-center">Running</th>
                <th className="p-4 text-center">Downtime</th>
                <th className="p-4 text-center">OEE %</th>
                <th className="p-4 text-center">Signals</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {history.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <span className="px-2 py-1 rounded bg-accent/10 text-accent text-xs font-mono border border-accent/20">
                      {row.machine_code || 'M1'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                      {row.shift_name}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-green-400 text-center">{row.good}</td>
                  <td className="p-4 font-mono text-red-400 text-center">{row.ng}</td>
                  <td className="p-4 font-mono text-blue-300 text-center">{formatDuration(row.runTime)}</td>
                  <td className="p-4 font-mono text-amber-500 text-center">{formatDuration(row.downTime)}</td>
                  <td className="p-4 font-mono text-blue-300 text-center font-bold">{row.oee}%</td>
                  <td className="p-4 text-gray-500 text-center text-xs">{row.log_count}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleCommentClick(row)}
                      className="text-gray-500 hover:text-white transition-colors"
                      title="Add Comment"
                    >
                      <MessageSquare size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {history.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500 italic text-sm">No history data available for this selection.</div>
        )}
      </div>

      {hasMore && history.length > 0 && (
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

      {error && <ErrorToast />}
    </div>
  );
};

export default History;
