import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { isSuperAdminUser } from '../utils/roles';

export default function SuperAdminAuthGate({ children }) {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center text-gray-500">
                Загрузка…
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/super-admin/login" replace />;
    }

    if (!isSuperAdminUser(user)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
