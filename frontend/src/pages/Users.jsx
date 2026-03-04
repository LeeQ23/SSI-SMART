import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Users = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator' });
    const [loading, setLoading] = useState(true);

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
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/users', newUser);
            setNewUser({ username: '', password: '', role: 'operator' });
            fetchUsers();
            alert(t('users.success'));
        } catch (error) {
            alert(t('users.error'));
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('users.title')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add User Form */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <UserPlus size={20} className="text-accent" /> {t('users.add_new')}
                    </h2>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('users.username')}</label>
                            <input
                                type="text"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                className="w-full px-3 py-2 rounded glass-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('users.password')}</label>
                            <input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className="w-full px-3 py-2 rounded glass-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">{t('users.role')}</label>
                            <select
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                className="w-full px-3 py-2 rounded glass-input bg-gray-900"
                            >
                                <option value="operator">{t('users.operator')}</option>
                                <option value="manager">{t('users.manager')}</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full py-2 bg-accent rounded hover:bg-blue-600 transition-colors">
                            {t('users.create')}
                        </button>
                    </form>
                </div>

                {/* User List */}
                <div className="glass-panel lg:col-span-2 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 uppercase text-xs">
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
                                        <button className="text-red-400 hover:text-red-300 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
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
