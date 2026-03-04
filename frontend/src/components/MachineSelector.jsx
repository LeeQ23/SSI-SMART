import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MachineSelector = ({ selectedId, onChange, showAll = false }) => {
    const { t } = useTranslation();
    const [machines, setMachines] = useState([]);

    useEffect(() => {
        const fetchMachines = async () => {
            try {
                const res = await axios.get('/api/machines');
                setMachines(res.data);
            } catch (err) {
                console.error("Error fetching machines", err);
            }
        };
        fetchMachines();
    }, []);

    return (
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-lg border border-white/10">
            <Settings size={18} className="text-accent" />
            <select
                value={selectedId || ''}
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent text-white border-none focus:ring-0 cursor-pointer text-sm font-medium pr-8"
            >
                {showAll && <option value="" className="bg-primary">{t('dashboard.all_machines')}</option>}
                {machines.map((m) => (
                    <option key={m.id} value={m.id} className="bg-primary">
                        {m.code} ({m.type})
                    </option>
                ))}
            </select>
        </div>
    );
};

export default MachineSelector;
