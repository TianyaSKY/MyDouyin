import { apiFetch } from "./client";

/**
 * Step 1: Initialize multi-part upload
 */
export async function initUpload(token, { fileName, fileHash, fileSize, totalChunks, chunkSize }) {
  const resp = await apiFetch("/api/videos/upload/init", token, {
    method: "POST",
    body: JSON.stringify({ fileName, fileHash, fileSize, totalChunks, chunkSize }),
  });
  if (!resp.ok) throw new Error(`Init upload failed: ${resp.status}`);
  const json = await resp.json();
  return json.data;
}

/**
 * Step 2: Upload a single chunk
 */
export async function uploadChunk(token, { uploadId, chunkIndex, chunk }) {
  const formData = new FormData();
  formData.append("chunk", chunk);

  const resp = await apiFetch(`/api/videos/upload/chunk?uploadId=${uploadId}&chunkIndex=${chunkIndex}`, token, {
    method: "POST",
    body: formData,
    // Note: Fetch with FormData should NOT have Content-Type header manually set to application/json
    // The client.js likely handles headers, I need to check if it forces JSON.
  });
  if (!resp.ok) throw new Error(`Chunk ${chunkIndex} upload failed: ${resp.status}`);
  const json = await resp.json();
  return json.data;
}

/**
 * Step 3: Complete upload
 */
export async function completeUpload(token, { uploadId, fileName, fileHash, fileSize, totalChunks }) {
  const resp = await apiFetch("/api/videos/upload/complete", token, {
    method: "POST",
    body: JSON.stringify({ uploadId, fileName, fileHash, fileSize, totalChunks }),
  });
  if (!resp.ok) throw new Error(`Complete upload failed: ${resp.status}`);
  const json = await resp.json();
  return json.data;
}

/**
 * Step 4: Create video record
 */
export async function createVideo(token, { authorId, title, tags, videoUrl, coverUrl }) {
  const resp = await apiFetch("/api/videos", token, {
    method: "POST",
    body: JSON.stringify({
      authorId,
      title,
      tags: tags || ["推荐"],
      videoUrl,
      coverUrl: coverUrl || "",
      status: "PUBLISHED"
    }),
  });
  if (!resp.ok) throw new Error(`Create video record failed: ${resp.status}`);
  const json = await resp.json();
  return json.data;
}
