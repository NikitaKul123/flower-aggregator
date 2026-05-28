import { mediaUrl, initials } from '../utils/media';

export default function Avatar({ src, name, size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-24 h-24 text-2xl'
    };
    const url = mediaUrl(src);

    return (
        <div
            className={`${sizes[size] || sizes.md} rounded-full overflow-hidden shrink-0 bg-pink-100 flex items-center justify-center font-semibold text-pink-700 border-2 border-white shadow-sm ${className}`}
        >
            {url ? (
                <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
                <span>{initials(name)}</span>
            )}
        </div>
    );
}
