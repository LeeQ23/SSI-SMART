import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [localSettings, setLocalSettings] = useState({});
    const [successMsg, setSuccessMsg] = useState('');

    const { data: settings, isLoading, error } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await axios.get('/api/settings');
            return res.data;
        }
    });

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const mutation = useMutation({
        mutationFn: async (newSettings) => {
            const res = await axios.put('/api/settings', newSettings);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['settings']);
            setSuccessMsg('Settings updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    });

    const handleChange = (key, value) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        mutation.mutate(localSettings);
    };

    if (user?.role !== 'manager') {
        return (
            <div className="p-6">
                <div className="bg-red-900/20 border border-red-500 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="text-red-500" />
                    <span className="text-red-200">You do not have permission to view this page.</span>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="p-6 text-white">Loading settings...</div>;
    if (error) return <div className="p-6 text-red-400">Failed to load settings.</div>;

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-8">
                <SettingsIcon className="w-8 h-8 text-accent" />
                <h1 className="text-3xl font-bold text-white">System Settings</h1>
            </div>

            <form onSubmit={handleSave} className="glass-panel p-6 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-300 font-bold mb-2">Current Threshold (Amps)</label>
                        <p className="text-sm text-gray-400 mb-2">The minimum current reading required to consider a machine as "Running". Default is 0.5.</p>
                        <input 
                            type="number" 
                            step="0.01"
                            className="glass-input w-full md:w-1/3 px-4 py-2 rounded-lg"
                            value={localSettings.CURRENT_THRESHOLD || ''}
                            onChange={(e) => handleChange('CURRENT_THRESHOLD', parseFloat(e.target.value))}
                            required
                        />
                    </div>
                    <div className="pt-4 border-t border-white/10">
                        <label className="block text-gray-300 font-bold mb-2">Ideal Cycle Time (Seconds)</label>
                        <p className="text-sm text-gray-400 mb-2">The ideal time it takes to produce one part. Used to calculate OEE Performance. Default is 12.</p>
                        <input 
                            type="number" 
                            step="0.1"
                            className="glass-input w-full md:w-1/3 px-4 py-2 rounded-lg"
                            value={localSettings.IDEAL_CYCLE_TIME || ''}
                            onChange={(e) => handleChange('IDEAL_CYCLE_TIME', parseFloat(e.target.value))}
                            required
                        />
                    </div>
                </div>

                {successMsg && (
                    <div className="text-green-400 font-bold bg-green-500/10 p-3 rounded-lg inline-block">
                        {successMsg}
                    </div>
                )}

                <div className="pt-6">
                    <button 
                        type="submit" 
                        disabled={mutation.isPending}
                        className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {mutation.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
