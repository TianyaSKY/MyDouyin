import { MEDIA_BASE_URL } from '../constants/config';

/**
 * Replace localhost URLs with the configured MEDIA_BASE_URL host.
 * The backend's toPublicUrl() converts paths to http://localhost:8081/...
 * but localhost is unreachable from mobile devices / emulators.
 */
const fixLocalhostUrl = (url) => {
  if (!url) return url;
  // Extract the host part from MEDIA_BASE_URL (e.g. "http://10.0.2.2:8081")
  // and replace any localhost references in the URL
  if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) {
    try {
      const parsed = new URL(url);
      const base = new URL(MEDIA_BASE_URL);
      parsed.hostname = base.hostname;
      parsed.port = base.port;
      parsed.protocol = base.protocol;
      return parsed.toString();
    } catch {
      // Fallback: simple string replacement
      return url
        .replace(/^https?:\/\/localhost(:\d+)?/, MEDIA_BASE_URL);
    }
  }
  return url;
};

/**
 * Resolves the absolute URL for a cover image.
 */
export const getCoverUrl = (url) => {
  if (!url) return null;

  // Already an absolute URL — fix localhost if needed
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return fixLocalhostUrl(url);
  }

  // Relative path — prepend MEDIA_BASE_URL
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Resolves absolute URL for video/other media resources.
 */
export const getMediaUrl = (url) => {
  if (!url) return '';

  // Already an absolute URL — fix localhost if needed
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return fixLocalhostUrl(url);
  }

  // Relative path — prepend MEDIA_BASE_URL
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Format count display like Douyin (e.g., 1.2w for 12000)
 */
export const formatCount = (count) => {
  if (!count && count !== 0) return '0';
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + 'w';
  }
  return String(count);
};

/**
 * Format relative time in Chinese
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN');
};
