import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, X, Save, ShieldCheck, AlertCircle } from 'lucide-react';

const EditSessionModal = ({ isOpen, onClose, currentData, machineId, onSessionCaptured }) => {
    const [step, setStep] = useState('password'); // 'password' | 'form'
    const [password, setPassword] = useState('');
    const [formData, setFormData] = useState({
        product_id: '',
        lot_number: '',
        target_qty: '',
        shift_name: '',
        operator_name: '',
        operator_nim: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setStep('password');
            setPassword('');
            setError(null);
            if (currentData) {
                setFormData({
                    product_id: currentData.product_id || '',
                    lot_number: currentData.lot_number || '',
                    target_qty: currentData.target || '',
                    shift_name: currentData.shift || '',
                    operator_name: currentData.operator || '',
                    operator_nim: currentData.operator_nim || ''
                });
            }
        }
    }, [isOpen, currentData]);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (password === 'admin123') {
            setStep('form');
            setError(null);
        } else {
            setError('Incorrect password');
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.product_id || !formData.target_qty || !formData.shift_name || !formData.operator_name || !formData.operator_nim || !formData.lot_number) {
            setError('All fields must be filled');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await axios.post('/api/session/edit', {
                password,
                machine_id: machineId,
                ...formData
            });
            onSessionCaptured();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update session');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-accent/20 rounded-lg text-accent">
                        <Settings size={24} />
                    </div>
                    <h2 className="text-xl font-bold">Update Parameters</h2>
                </div>

                {step === 'password' ? (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-3 mb-4">
                            <ShieldCheck className="text-amber-500 mt-0.5" size={18} />
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                                Updating active parameters requires technician authorization. Please enter the administration password to proceed.
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Administration Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password..."
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-accent hover:bg-accent/80 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
                        >
                            UNLOCk PARAMETERS
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Product ID</label>
                                <input
                                    type="text"
                                    value={formData.product_id}
                                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="e.g., SI-283"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Lot Number</label>
                                <input
                                    type="text"
                                    value={formData.lot_number}
                                    onChange={(e) => setFormData({...formData, lot_number: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="e.g., L-10293"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Target Qty</label>
                                <input
                                    type="number"
                                    value={formData.target_qty}
                                    onChange={(e) => setFormData({...formData, target_qty: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="4320"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Shift Name</label>
                                <input
                                    type="text"
                                    value={formData.shift_name}
                                    onChange={(e) => setFormData({...formData, shift_name: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="Morning"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Operator Name</label>
                                <input
                                    type="text"
                                    value={formData.operator_name}
                                    onChange={(e) => setFormData({...formData, operator_name: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="Operator Name"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Operator NIM</label>
                                <input
                                    type="text"
                                    value={formData.operator_nim}
                                    onChange={(e) => setFormData({...formData, operator_nim: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="NIM / ID"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-success hover:bg-success/80 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'UPDATING...' : 'UPDATE PARAMETERS'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EditSessionModal;
