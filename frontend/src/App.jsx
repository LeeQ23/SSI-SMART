import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

import History from './pages/History';
import Analytics from './pages/Analytics';
import Overview from './pages/Overview';
import DowntimeHistory from './pages/DowntimeHistory';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';

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
                        <ErrorBoundary>
                            <Overview />
                        </ErrorBoundary>
                    </ProtectedRoute>
                } />
                <Route path="/dashboard/:machineId" element={
                    <ProtectedRoute>
                        <ErrorBoundary>
                            <Dashboard />
                        </ErrorBoundary>
                    </ProtectedRoute>
                } />
                {/* Placeholders for other routes */}
                <Route path="/history" element={<ProtectedRoute><ErrorBoundary><History /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><ErrorBoundary><Analytics /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/downtime-history" element={<ProtectedRoute><ErrorBoundary><DowntimeHistory /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><ErrorBoundary><Settings /></ErrorBoundary></ProtectedRoute>} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
