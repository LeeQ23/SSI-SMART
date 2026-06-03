import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LogoLoader from '../components/LogoLoader';
import ErrorToast from '../components/ErrorToast';

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

    if (isLoading) return <LogoLoader />;
    if (error) return <div className="p-6"><ErrorToast message={error.message || 'Failed to load settings'} /></div>;

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-8">
                <SettingsIcon className="w-8 h-8 text-accent" />
                <h1 className="text-3xl font-bold text-white">System Settings</h1>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="glass-panel p-6 space-y-8">
                    <div className="relative group">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 transition-colors group-focus-within:text-accent">
                            Current Threshold (Amps)
                        </label>
                        <input 
                            type="number" 
                            step="0.01"
                            className="glass-input w-full md:w-1/3 px-4 py-3 rounded-lg text-lg font-bold font-mono text-white transition-all focus:ring-1 focus:ring-accent"
                            value={localSettings.CURRENT_THRESHOLD || ''}
                            onChange={(e) => handleChange('CURRENT_THRESHOLD', parseFloat(e.target.value))}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2 max-w-md">The minimum current reading required to consider a machine as "Running". Default is 0.5.</p>
                    </div>

                    <div className="pt-6 border-t border-white/10 relative group">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 transition-colors group-focus-within:text-accent">
                            Ideal Cycle Time (Seconds)
                        </label>
                        <input 
                            type="number" 
                            step="0.1"
                            className="glass-input w-full md:w-1/3 px-4 py-3 rounded-lg text-lg font-bold font-mono text-white transition-all focus:ring-1 focus:ring-accent"
                            value={localSettings.IDEAL_CYCLE_TIME || ''}
                            onChange={(e) => handleChange('IDEAL_CYCLE_TIME', parseFloat(e.target.value))}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2 max-w-md">The ideal time it takes to produce one part. Used to calculate OEE Performance. Default is 12.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        type="submit" 
                        disabled={mutation.isPending}
                        className="bg-accent hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-accent/20"
                    >
                        <Save className="w-5 h-5" />
                        {mutation.isPending ? 'SAVING...' : 'SAVE SETTINGS'}
                    </button>
                    
                    {successMsg && (
                        <div className="text-success font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            {successMsg}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Settings;
