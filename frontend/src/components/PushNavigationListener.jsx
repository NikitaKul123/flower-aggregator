import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Переход по клику на push (сообщение от service worker) */
export default function PushNavigationListener() {
    const navigate = useNavigate();

    useEffect(() => {
        const onMessage = (event) => {
            const { type, path } = event.data || {};
            if (type === 'PUSH_NAVIGATE' && path) {
                navigate(path);
            }
        };

        navigator.serviceWorker?.addEventListener('message', onMessage);
        return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
    }, [navigate]);

    return null;
}
