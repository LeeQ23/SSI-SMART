import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MachineSelector from '../components/MachineSelector';

const Targets = () => {
    const { t } = useTranslation();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetQty, setTargetQty] = useState(1000);
    const [orderName, setOrderName] = useState('');
    const [selectedMachine, setSelectedMachine] = useState('1'); // Default to machine 1
    const [message, setMessage] = useState('');
    const [targets, setTargets] = useState([]);

    useEffect(() => {
        fetchTargets();
    }, []);

    const fetchTargets = async () => {
        try {
            const res = await axios.get('/api/targets');
            setTargets(res.data);
        } catch (error) {
            console.error("Error fetching targets");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/targets', {
                date,
                target_qty: targetQty,
                order_name: orderName,
                machine_id: selectedMachine
            });
            setMessage(t('targets.success'));
            fetchTargets();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(t('targets.error'));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('targets.confirm'))) return;
        try {
            await axios.delete(`/api/targets/${id}`);
            fetchTargets();
        } catch (error) {
            alert('Error deleting target');
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">{t('targets.title')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="glass-panel p-8">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Plus size={20} className="text-accent" /> {t('targets.set_daily')}
                    </h2>

                    {message && (
                        <div className={`p-3 rounded mb-4 text-center ${message.includes('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Machine</label>
                            <MachineSelector
                                selectedId={selectedMachine}
                                onChange={setSelectedMachine}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('targets.date')}</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg glass-input focus:ring-2 focus:ring-accent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('targets.order_name')}</label>
                            <input
                                type="text"
                                value={orderName}
                                onChange={(e) => setOrderName(e.target.value)}
                                placeholder="e.g. PO-2024-001"
                                className="w-full px-4 py-3 rounded-lg glass-input focus:ring-2 focus:ring-accent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('targets.quantity')}</label>
                            <input
                                type="number"
                                value={targetQty}
                                onChange={(e) => setTargetQty(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg glass-input focus:ring-2 focus:ring-accent transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-accent hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={20} /> {t('targets.save')}
                        </button>
                    </form>
                </div>

                <div className="glass-panel lg:col-span-2 p-6">
                    <h2 className="text-xl font-semibold mb-4">{t('targets.recent')}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="p-3">Machine</th>
                                    <th className="p-3">{t('targets.table.date')}</th>
                                    <th className="p-3">{t('targets.table.order')}</th>
                                    <th className="p-3">{t('targets.table.target')}</th>
                                    <th className="p-3">{t('targets.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {targets.map((tItem) => (
                                    <tr key={tItem.id} className="hover:bg-white/5">
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold font-mono">
                                                {tItem.machine_code || 'M1'}
                                            </span>
                                        </td>
                                        <td className="p-3">{new Date(tItem.date).toLocaleDateString()}</td>
                                        <td className="p-3">{tItem.order_name}</td>
                                        <td className="p-3 font-mono text-accent">{tItem.target_qty}</td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => handleDelete(tItem.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                {t('targets.delete')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Targets;
