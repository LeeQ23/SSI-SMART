import LogoLoader from '../components/LogoLoader';

const History = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingComment, setEditingComment] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();

    const retryInterval = setInterval(() => {
      if (error) {
        fetchHistory();
      }
    }, 10000);

    return () => clearInterval(retryInterval);
  }, [selectedMachine, error]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/history${selectedMachine ? `?machine_id=${selectedMachine}` : ''}`);
      setHistory(res.data);
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error fetching history", error);
      setError("Sync error");
      setLoading(false);
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
    setCommentText('');
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
            <h3 className="text-xl font-bold mb-4">Add Comment</h3>
            <p className="text-sm text-gray-400 mb-4">
              {new Date(editingComment.date).toLocaleDateString()} - {editingComment.shift_name}
            </p>
            <textarea
              className="w-full h-32 glass-input p-3 rounded-lg mb-4"
              placeholder="Enter shift notes, operator name, or downtime reasons..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingComment(null)}
                className="px-4 py-2 rounded hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={saveComment}
                className="px-4 py-2 bg-accent rounded hover:bg-blue-600"
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Production History</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">{t('dashboard.machine')}</span>
          <MachineSelector
            selectedId={selectedMachine}
            onChange={setSelectedMachine}
            showAll={true}
          />
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-4">{t('dashboard.machine')}</th>
              <th className="p-4">Date</th>
              <th className="p-4">Shift</th>
              <th className="p-4 text-center">Good Produced</th>
              <th className="p-4 text-center">No Good (NG)</th>
              <th className="p-4 text-center">Running Time</th>
              <th className="p-4 text-center">Downtime</th>
              <th className="p-4 text-center">OEE %</th>
              <th className="p-4 text-center">Total Signals</th>
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
                <td className="p-4">{new Date(row.date).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold">
                    {row.shift_name}
                  </span>
                </td>
                <td className="p-4 font-mono text-green-400 text-center">{row.good}</td>
                <td className="p-4 font-mono text-red-400 text-center">{row.ng}</td>
                <td className="p-4 font-mono text-blue-300 text-center">{formatDuration(row.runTime)}</td>
                <td className="p-4 font-mono text-amber-500 text-center">{formatDuration(row.downTime)}</td>
                <td className="p-4 font-mono text-blue-300 text-center">{row.oee}%</td>
                <td className="p-4 text-gray-400 text-center">{row.log_count}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleCommentClick(row)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Add Comment"
                  >
                    <MessageSquare size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && (
          <div className="p-8 text-center text-gray-500">No history data available.</div>
        )}
      </div>

      {error && <ErrorToast />}
    </div>
  );
};

export default History;
