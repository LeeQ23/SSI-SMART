import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(username, password);
        if (success) {
            navigate('/');
        } else {
            setError('Invalid credentials'); // Error from Context/API could also be localized if needed
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-black p-4">
            <div className="w-full max-w-md glass-panel p-8">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="SSI Logo" className="h-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white">{t('login.welcome')}</h1>
                    <p className="text-gray-400">{t('login.subtitle')}</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('login.username')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg glass-input focus:ring-2 focus:ring-accent transition-all"
                            placeholder={t('login.username')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('login.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg glass-input focus:ring-2 focus:ring-accent transition-all"
                            placeholder={t('login.password')}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-accent hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
                    >
                        {t('login.signin')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
