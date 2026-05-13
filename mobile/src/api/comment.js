import { apiFetch } from './client';

/**
 * Get paginated comments for a video
 */
export async function getVideoComments(token, videoId, current = 1, size = 20) {
  const resp = await apiFetch(
    `/api/comments/video/${videoId}?current=${current}&size=${size}`,
    token
  );
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '获取评论失败');
  }
  return json.data;
}

/**
 * Get comment count for a video
 */
export async function getCommentCount(token, videoId) {
  const resp = await apiFetch(`/api/comments/video/${videoId}/count`, token);
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '获取评论数失败');
  }
  return json.data;
}

/**
 * Post a new comment
 */
export async function postComment(token, videoId, content, parentId = null) {
  const body = { videoId, content };
  if (parentId) body.parentId = parentId;

  const resp = await apiFetch('/api/comments', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '发送评论失败');
  }
  return json.data;
}

/**
 * Get replies for a comment
 */
export async function getCommentReplies(token, commentId, current = 1, size = 20) {
  const resp = await apiFetch(
    `/api/comments/${commentId}/replies?current=${current}&size=${size}`,
    token
  );
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '获取回复失败');
  }
  return json.data;
}

/**
 * Delete a comment
 */
export async function deleteComment(token, commentId) {
  const resp = await apiFetch(`/api/comments/${commentId}`, token, {
    method: 'DELETE',
  });
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '删除评论失败');
  }
  return json.data;
}
