import LogoLoader from '../components/LogoLoader';

const Shifts = () => {
    const { t } = useTranslation();
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            const res = await axios.get('/api/shifts');
            setShifts(res.data);
        } catch (error) {
            console.error("Error fetching shifts", error);
            setMessage(`Failed to load shifts: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id, start, end) => {
        try {
            await axios.put(`/api/shifts/${id}`, { start_time: start, end_time: end });
            setMessage(t('shifts.success'));
            setTimeout(() => setMessage(''), 3000);
            fetchShifts();
        } catch (error) {
            setMessage(t('shifts.error'));
        }
    };

    if (loading) return <LogoLoader />;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">{t('shifts.title')}</h1>

            {message && (
                <div className={`p-3 rounded mb-4 text-center ${message.includes('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {shifts.map((shift) => (
                    <div key={shift.id} className="glass-panel p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent/20 rounded-full text-accent">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{shift.name} Shift</h3>
                                <p className="text-gray-400 text-sm">ID: {shift.id}</p>
                            </div>
                        </div>

                        <form
                            className="flex items-center gap-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                handleUpdate(shift.id, formData.get('start'), formData.get('end'));
                            }}
                        >
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('shifts.start_time')}</label>
                                <input
                                    name="start"
                                    type="time"
                                    defaultValue={shift.start_time}
                                    step="1"
                                    className="glass-input px-3 py-2 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('shifts.end_time')}</label>
                                <input
                                    name="end"
                                    type="time"
                                    defaultValue={shift.end_time}
                                    step="1"
                                    className="glass-input px-3 py-2 rounded"
                                />
                            </div>
                            <button
                                type="submit"
                                className="mt-5 p-2 bg-accent hover:bg-blue-600 rounded text-white transition-colors"
                                title={t('shifts.save')}
                            >
                                <Save size={20} />
                            </button>
                        </form>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Shifts;
