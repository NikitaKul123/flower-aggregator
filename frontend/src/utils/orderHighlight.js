/** Стили подсветки «новое» — как у непрочитанных уведомлений */
export function orderCardHighlightClass(isHighlighted) {
    return isHighlighted
        ? 'border-l-4 border-red-500 bg-red-50'
        : 'border-l-4 border-transparent';
}

export function orderRowHighlightClass(isHighlighted) {
    return isHighlighted ? 'bg-red-50' : '';
}

export function orderTitleHighlightClass(isHighlighted) {
    return isHighlighted ? 'text-red-600' : '';
}
