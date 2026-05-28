export const inputClass = (hasError = false) =>
    `w-full border rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-base focus:outline-none transition ${
        hasError
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-300 focus:border-pink-500'
    }`;

export const labelClass = 'block text-sm font-medium text-gray-700 mb-2';

export const cardClass = 'bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100';

export const pageTitleClass = 'text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900';

export const btnPrimary =
    'inline-flex items-center justify-center bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold rounded-xl sm:rounded-2xl hover:from-pink-700 hover:to-rose-700 transition disabled:opacity-70 disabled:cursor-not-allowed';

export const btnSecondary =
    'inline-flex items-center justify-center border border-gray-300 text-gray-700 font-medium rounded-xl sm:rounded-2xl hover:bg-gray-50 transition';

export const btnPink =
    'inline-flex items-center justify-center bg-pink-600 text-white font-medium rounded-xl hover:bg-pink-700 transition';

export const statusBadgeClass = (colorClass) =>
    `inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${colorClass}`;
