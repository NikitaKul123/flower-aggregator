import { Link } from 'react-router-dom';

/**
 * @param {{ label: string, to?: string }[]} items
 */
export default function Breadcrumbs({ items }) {
    if (!items?.length) return null;

    return (
        <nav aria-label="Хлебные крошки" className="mb-6 sm:mb-8">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-500">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5 min-w-0">
                            {index > 0 && (
                                <span className="text-gray-300 select-none" aria-hidden>
                                    /
                                </span>
                            )}
                            {item.to && !isLast ? (
                                <Link
                                    to={item.to}
                                    state={item.state}
                                    className="text-pink-600 hover:text-pink-700 hover:underline truncate max-w-[200px] sm:max-w-xs"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    className={`truncate max-w-[220px] sm:max-w-md ${
                                        isLast ? 'text-gray-800 font-medium' : ''
                                    }`}
                                    aria-current={isLast ? 'page' : undefined}
                                >
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
