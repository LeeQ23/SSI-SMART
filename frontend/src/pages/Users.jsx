import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { UserPlus, Trash2 } from 'lucide-react';
import LogoLoader from '../components/LogoLoader';

const Users = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator' });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            setUsers(res.data);
            setLoading(false);
        } catch (error) {
            console.error(t('users.error'), error);
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/users', newUser);
            setNewUser({ username: '', password: '', role: 'operator' });
            fetchUsers();
            setMessage({ text: t('users.success'), type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            setMessage({ text: t('users.error'), type: 'error' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        }
    };

    const confirmDelete = async (id, username) => {
        try {
            await axios.delete(`/api/users/${id}`);
            fetchUsers();
            setMessage({ text: `User "${username}" deleted.`, type: 'success' });
            setDeleteConfirmId(null);
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            setMessage({ text: 'Failed to delete user.', type: 'error' });
            setDeleteConfirmId(null);
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        }
    };

    if (loading) return <LogoLoader />;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('users.title')}</h1>

            {message.text && (
                <div className={`p-3 rounded text-center text-sm font-bold ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add User Form */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <UserPlus size={20} className="text-accent" /> {t('users.add_new')}
                    </h2>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="group">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-accent">{t('users.username')}</label>
                            <input
                                type="text"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                className="glass-input w-full px-4 py-3 rounded-lg focus:ring-1 focus:ring-accent"
                                required
                            />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-accent">{t('users.password')}</label>
                            <input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className="glass-input w-full px-4 py-3 rounded-lg focus:ring-1 focus:ring-accent"
                                required
                            />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-accent">{t('users.role')}</label>
                            <select
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                className="glass-input w-full px-4 py-3 rounded-lg focus:ring-1 focus:ring-accent appearance-none bg-gray-900"
                            >
                                <option value="operator">{t('users.operator')}</option>
                                <option value="manager">{t('users.manager')}</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full py-3 bg-accent hover:bg-blue-600 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/20 uppercase tracking-widest text-sm">
                            {t('users.create')}
                        </button>
                    </form>
                </div>

                {/* User List */}
                <div className="glass-panel lg:col-span-2 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-white/10">
                            <tr>
                                <th className="p-4">{t('users.table.username')}</th>
                                <th className="p-4">{t('users.table.role')}</th>
                                <th className="p-4">{t('users.table.created_at')}</th>
                                <th className="p-4">{t('users.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-white/5">
                                    <td className="p-4 font-medium">{u.username}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'manager' ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                            {u.role === 'manager' ? t('users.manager').toUpperCase() : t('users.operator').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        {deleteConfirmId === u.id ? (
                                            <div className="flex items-center gap-2 bg-red-500/20 p-1.5 rounded-lg border border-red-500/30 animate-in fade-in zoom-in duration-200">
                                                <span className="text-[10px] font-bold text-red-300 px-2 uppercase tracking-widest">Are you sure?</span>
                                                <button 
                                                    onClick={() => confirmDelete(u.id, u.username)}
                                                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition-colors"
                                                >
                                                    Yes
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setDeleteConfirmId(u.id)}
                                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Users;
