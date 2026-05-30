/** Фиксированная панель действий над нижней навигацией (скрыта на lg+). */
export function MobileStickyBar({ children, className = '' }) {
    return (
        <div className={`mobile-sticky-bar lg:hidden ${className}`.trim()} role="region" aria-label="Действия">
            <div className="mobile-sticky-bar__inner">{children}</div>
        </div>
    );
}
