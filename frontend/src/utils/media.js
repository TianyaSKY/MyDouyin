
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || "18081";
const MEDIA_BASE_URL =
    import.meta.env.VITE_MEDIA_BASE_URL || `http://localhost:${BACKEND_PORT}`;

/**
 * Resolves the absolute URL for a media resource (image/video).
 * @param {string} url - The raw URL from the API.
 * @returns {string} - The processed absolute URL.
 */
export const getCoverUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=No+Cover';

    // If it's already an absolute URL, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Resolves absolute URL for video/other media resources.
 * @param {string} url - The raw URL from API.
 * @returns {string} - Absolute media URL.
 */
export const getMediaUrl = (url) => {
    if (!url) return '';

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};
