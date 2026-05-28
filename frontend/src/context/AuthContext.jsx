import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const isShop = user?.role === 'SHOP_ADMIN';
    const isUser = user?.role === 'USER';
    const isCourier = user?.role === 'COURIER';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

    // ================= INIT =================
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);

                setToken(storedToken);
                setUser(parsedUser);
            } catch (e) {
                console.error('Auth parse error');

                localStorage.removeItem('token');
                localStorage.removeItem('user');

                setToken(null);
                setUser(null);

                delete axios.defaults.headers.common['Authorization'];
            }
        } else {
            setToken(null);
            setUser(null);

            delete axios.defaults.headers.common['Authorization'];
        }

        setLoading(false);
    }, []);

    // ================= LOGIN =================
    const login = (newToken, userData) => {
        // 🧹 ВСЕГДА полностью очищаем старую сессию
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        delete axios.defaults.headers.common['Authorization'];

        // 💾 сохраняем новую сессию
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));

        setToken(newToken);
        setUser(userData);

        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    // ================= LOGOUT =================
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setToken(null);
        setUser(null);

        delete axios.defaults.headers.common['Authorization'];
    };

    const updateUser = (partial) => {
        setUser(prev => {
            if (!prev) return prev;
            const next = { ...prev, ...partial };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
        });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                updateUser,
                loading,
                isShop,
                isUser,
                isCourier,
                isSuperAdmin
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};