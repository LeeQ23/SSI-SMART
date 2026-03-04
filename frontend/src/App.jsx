import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

import History from './pages/History';
import Targets from './pages/Targets';
import Users from './pages/Users';
import Shifts from './pages/Shifts';
import Analytics from './pages/Analytics';
import Overview from './pages/Overview';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    return <Layout>{children}</Layout>;
};

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <Overview />
                    </ProtectedRoute>
                } />
                <Route path="/dashboard/:machineId" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                {/* Placeholders for other routes */}
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/targets" element={<ProtectedRoute><Targets /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/shifts" element={<ProtectedRoute><Shifts /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
