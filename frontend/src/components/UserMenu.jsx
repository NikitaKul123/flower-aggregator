import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';

export default function UserMenu({
    displayName,
    avatarSrc,
    profilePath,
    onLogout
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition"
            >
                <span className="text-sm text-gray-600 hidden sm:inline">
                    Привет, <span className="text-pink-600 font-medium">{displayName}</span>
                </span>
                <Avatar src={avatarSrc} name={displayName} size="md" className="ring-2 ring-pink-200" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <p className="sm:hidden px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                        Привет, <span className="text-pink-600 font-medium">{displayName}</span>
                    </p>
                    <Link
                        to={profilePath}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600"
                    >
                        Профиль
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onLogout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600"
                    >
                        Выйти
                    </button>
                </div>
            )}
        </div>
    );
}
