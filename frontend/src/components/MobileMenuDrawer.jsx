import { useEffect } from 'react';
import { createPortal } from 'react-dom';

function MobileMenuDrawer({ open, onClose, title = 'Меню', children }) {
    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="mobile-drawer-root" role="dialog" aria-modal="true" aria-label={title}>
            <button
                type="button"
                className="mobile-drawer-backdrop"
                aria-label="Закрыть меню"
                onClick={onClose}
            />
            <aside className="mobile-drawer-panel">
                <div className="mobile-drawer-header">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button
                        type="button"
                        className="mobile-drawer-close"
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        ✕
                    </button>
                </div>
                <nav className="mobile-drawer-body">{children}</nav>
            </aside>
        </div>,
        document.body
    );
}

export default MobileMenuDrawer;
