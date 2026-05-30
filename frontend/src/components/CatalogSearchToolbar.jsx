import { btnSecondary } from '../utils/ui';
import MobileFilterSheet, { FilterSlidersIcon } from './MobileFilterSheet';

export default function CatalogSearchToolbar({
    searchTerm,
    onSearchChange,
    searchPlaceholder = 'Поиск…',
    activeFiltersCount = 0,
    mobileFiltersOpen,
    onOpenMobileFilters,
    onCloseMobileFilters,
    filtersOpen,
    onToggleFilters,
    filterFields,
    onResetFilters,
    showReset = false,
    applyLabel = 'Показать',
    desktopExtra,
    sortSelect,
    mobileAccessory = null
}) {
    return (
        <>
            <div className="sm:hidden mb-4 space-y-2">
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1 min-w-0">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden>
                            🔍
                        </span>
                        <input
                            type="search"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full rounded-2xl bg-gray-100 border-0 pl-10 pr-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onOpenMobileFilters}
                        className={`relative shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl transition ${
                            activeFiltersCount > 0
                                ? 'bg-pink-50 text-pink-600 ring-1 ring-pink-200'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                        aria-label="Фильтры"
                    >
                        <FilterSlidersIcon />
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                </div>
                {mobileAccessory}
            </div>

            <div className="hidden sm:block bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 sm:mb-8">
                <div className="flex flex-row gap-3 flex-wrap">
                    <input
                        type="search"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="flex-1 min-w-[200px] border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                    />
                    {sortSelect}
                    {desktopExtra}
                    <button
                        type="button"
                        onClick={onToggleFilters}
                        className={`${btnSecondary} px-5 py-2.5 text-sm shrink-0 relative`}
                    >
                        {filtersOpen ? 'Скрыть' : 'Фильтры'}
                        {activeFiltersCount > 0 && (
                            <span className="ml-1.5 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-pink-600 text-white text-[10px] items-center justify-center">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                </div>
                {filtersOpen && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        {filterFields}
                        {showReset && onResetFilters && (
                            <button
                                type="button"
                                onClick={onResetFilters}
                                className="mt-4 text-sm text-pink-600 hover:text-pink-700 font-medium"
                            >
                                Сбросить фильтры
                            </button>
                        )}
                    </div>
                )}
            </div>

            <MobileFilterSheet
                open={mobileFiltersOpen}
                onClose={onCloseMobileFilters}
                onReset={onResetFilters}
                showReset={showReset && activeFiltersCount > 0}
                applyLabel={applyLabel}
            >
                {filterFields}
            </MobileFilterSheet>
        </>
    );
}
