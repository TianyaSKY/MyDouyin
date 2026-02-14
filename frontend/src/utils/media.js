
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

    // If relative, prepend the backend base URL
    // Note: In Vite proxy, /api is proxies, but /uploads might not be if it's served statically by backend
    // on the same port.
    // However, usually we can just use the relative path if it's same origin,
    // BUT user specifically asked to fix parsing, and provided localhost:18081 examples.
    // Let's assume we want to point to the backend directly if it's independent,
    // OR just return the relative path if the dev server proxies it.
    // Given the previous context, let's prepend the localhost:18081 for safety if it's missing,
    // OR if we rely on proxy, just ensure it starts with /.

    // Simplest approach for "parsing":
    return `http://localhost:18081${url.startsWith('/') ? '' : '/'}${url}`;
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

    return `http://localhost:18081${url.startsWith('/') ? '' : '/'}${url}`;
};
