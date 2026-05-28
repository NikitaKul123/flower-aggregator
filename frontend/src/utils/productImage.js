import { mediaUrl } from './media';

export function productImageUrl(product) {
    if (!product) return '';
    const raw = product.image || product.images?.[0];
    return mediaUrl(raw) || '';
}

export function productImageList(product) {
    if (!product) return [];
    const list = product.images?.length
        ? product.images
        : product.image
            ? [product.image]
            : [];
    return list.map(mediaUrl).filter(Boolean);
}
