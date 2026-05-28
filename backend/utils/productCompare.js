/** Нормализация названия для сравнения букетов между магазинами */
export function normalizeProductName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Похожие названия (не только побайтовое совпадение) */
export function namesSimilar(a, b) {
    const na = normalizeProductName(a);
    const nb = normalizeProductName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;

    const wordsA = na.split(' ').filter(w => w.length > 2);
    const wordsB = nb.split(' ').filter(w => w.length > 2);
    if (!wordsA.length || !wordsB.length) return false;

    const setB = new Set(wordsB);
    const common = wordsA.filter(w => setB.has(w)).length;
    const ratio = common / Math.max(wordsA.length, wordsB.length);
    return ratio >= 0.5;
}
