import { apiFetch } from './client';

/**
 * Report user event to backend
 * @param {string} token - User auth token
 * @param {object} eventData - { userId, videoId, eventType, ctx, ts }
 */
export async function reportEvent(token, eventData) {
    if (!token) return;
    try {
        // We don't await the response body since we don't use it, 
        // but we await the fetch to catch network errors if needed.
        // For analytics, we usually want "fire and forget" or silent failure.
        await apiFetch('/api/events', token, {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    } catch (err) {
        // Silent fail for analytics to not disturb user experience
        console.warn('Event reporting failed:', err);
    }
}
