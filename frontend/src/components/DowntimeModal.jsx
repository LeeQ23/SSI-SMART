import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Clock, Play, Square, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MachineSelector from './MachineSelector';

const DowntimeModal = ({ isOpen, onClose, initialMachineId }) => {
    const { t } = useTranslation();
    const [machineId, setMachineId] = useState(initialMachineId || 1);
    const [reason, setReason] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check for active downtime on mount or when machineId changes
    useEffect(() => {
        if (!isOpen) return;

        const checkActive = async () => {
            try {
                const res = await axios.get(`/api/downtime/active/${machineId}`);
                if (res.data) {
                    setIsActive(true);
                    setReason(res.data.reason);
                    setStartTime(new Date(res.data.start_time));
                } else {
                    setIsActive(false);
                    setReason('');
                    setStartTime(null);
                }
            } catch (err) {
                console.error("Error checking active downtime", err);
            }
        };

        checkActive();
    }, [isOpen, machineId]);

    // Stopwatch logic
    useEffect(() => {
        let interval = null;
        if (isActive && startTime) {
            interval = setInterval(() => {
                const now = new Date();
                setElapsedTime(Math.floor((now - startTime) / 1000));
            }, 1000);
        } else {
            setElapsedTime(0);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, startTime]);

    const handleStart = async () => {
        if (!reason.trim()) {
            setError("Please enter a reason for the downtime");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/downtime/start', { machine_id: machineId, reason });
            setIsActive(true);
            setStartTime(new Date());
        } catch (err) {
            setError("Failed to start downtime recording");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/downtime/end', { machine_id: machineId });
            setIsActive(false);
            setStartTime(null);
            setElapsedTime(0);
            setReason('');
            onClose(); // Close on finish
        } catch (err) {
            setError("Failed to end downtime recording");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatElapsedTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, y: 60, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 60, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="glass-panel w-full max-w-md p-6 relative z-10"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-accent/20 rounded-lg text-accent">
                                <Clock size={24} />
                            </div>
                            <h2 className="text-xl font-bold">{t('modals.manual_downtime', 'Manual Downtime')}</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                    {t('modals.select_machine', 'Select Machine')}
                                </label>
                                <MachineSelector
                                    selectedId={machineId}
                                    onChange={(id) => setMachineId(id)}
                                />
                                {isActive && <p className="text-[10px] text-accent mt-1 italic">{t('modals.selecting_another_machine', 'Selecting another machine will show its downtime status')}</p>}
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-accent">
                                    {t('modals.reason', 'Reason for Downtime')}
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    disabled={isActive}
                                    autoFocus={!isActive}
                                    placeholder={t('modals.reason_placeholder', 'e.g., Maintenance, Toilet Break, Tooling change...')}
                                    className={`glass-input w-full px-4 py-3 rounded-lg focus:ring-1 focus:ring-accent transition-all h-24 resize-none ${isActive ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            {isActive && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center space-y-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">{t('modals.active_duration', 'Active Duration')}</p>
                                    <p className="text-5xl font-mono font-bold text-accent drop-shadow-[0_0_10px_rgba(0,116,217,0.5)]">
                                        {formatElapsedTime(elapsedTime)}
                                    </p>
                                </div>
                            )}

                            <div className="pt-4">
                                {!isActive ? (
                                    <button
                                        onClick={handleStart}
                                        disabled={loading}
                                        className="w-full bg-accent hover:bg-accent/80 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
                                    >
                                        <Play size={20} fill="currentColor" />
                                        {t('modals.start_downtime', 'START DOWNTIME')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleFinish}
                                        disabled={loading}
                                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                                    >
                                        <Square size={20} fill="currentColor" />
                                        {t('modals.finish_downtime', 'FINISH DOWNTIME')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DowntimeModal;
