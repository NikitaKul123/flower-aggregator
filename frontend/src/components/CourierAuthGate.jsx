import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function CourierAuthGate({ children }) {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center text-gray-500">
                Загрузка…
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/courier/login" replace />;
    }

    if (user.role !== 'COURIER') {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default CourierAuthGate;
