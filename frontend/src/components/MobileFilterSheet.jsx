import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { btnPrimary } from '../utils/ui';

export function FilterSlidersIcon({ className = 'w-5 h-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 6h16M4 12h10M4 18h6" strokeLinecap="round" />
            <circle cx="17" cy="6" r="2" fill="currentColor" stroke="none" />
            <circle cx="13" cy="12" r="2" fill="currentColor" stroke="none" />
            <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
    );
}

export const filterFieldClass =
    'w-full rounded-xl bg-gray-50 border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/25';

export default function MobileFilterSheet({
    open,
    onClose,
    title = 'Фильтры',
    children,
    onReset,
    showReset = false,
    applyLabel = 'Показать'
}) {
    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label={title}>
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/40"
                aria-label="Закрыть"
                onClick={onClose}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[88dvh] flex flex-col animate-[mobile-sheet-up_0.25s_ease-out]">
                <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
                        aria-label="Закрыть"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
                <div className="shrink-0 p-4 pt-2 border-t border-gray-100 flex flex-col gap-2 safe-area-bottom">
                    {showReset && onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="w-full py-3 text-sm font-medium text-pink-600"
                        >
                            Сбросить всё
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${btnPrimary} w-full py-3.5 rounded-2xl text-base`}
                    >
                        {applyLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
