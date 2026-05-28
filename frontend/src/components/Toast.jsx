import { useEffect } from 'react';

function Toast({ message, type = 'info', link, onClose, onNavigate, offset = 0 }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 6000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor =
        type === 'success' ? 'bg-green-600' :
        type === 'info' ? 'bg-pink-600' : 'bg-amber-600';

    const handleClick = () => {
        if (link && onNavigate) {
            onNavigate(link);
            onClose();
        }
    };

    return (
        <div
            role={link ? 'button' : undefined}
            tabIndex={link ? 0 : undefined}
            onClick={link ? handleClick : undefined}
            onKeyDown={link ? (e) => e.key === 'Enter' && handleClick() : undefined}
            style={{ top: `${16 + offset}px` }}
            className={`fixed left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[100] ${bgColor} text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-slide-in ${
                link ? 'cursor-pointer hover:brightness-110 transition-all sm:w-full' : 'sm:w-full'
            }`}
        >
            <div className="text-xl sm:text-2xl shrink-0">
                {type === 'success' ? '✅' : type === 'info' ? '💬' : '📦'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">{message}</p>
                {link && (
                    <p className="text-xs text-white/80 mt-1">Нажмите, чтобы открыть</p>
                )}
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="text-white/70 hover:text-white text-xl leading-none shrink-0"
            >
                ×
            </button>
        </div>
    );
}

export default Toast;
