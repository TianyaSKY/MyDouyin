import { apiFetch } from "./client";

/**
 * Step 1: 初始化上传会话（秒传判定 + 断点续传状态）
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
 * Step 2: 上传单个分片
 */
export async function uploadChunk(token, { uploadId, chunkIndex, chunk }) {
  const formData = new FormData();
  formData.append("chunk", chunk);

  const resp = await apiFetch(`/api/videos/upload/chunk?uploadId=${uploadId}&chunkIndex=${chunkIndex}`, token, {
    method: "POST",
    body: formData,
    // FormData 请求不能手动指定 application/json；
    // client.js 已在 body 是 FormData 时跳过默认 JSON Content-Type。
  });
  if (!resp.ok) throw new Error(`Chunk ${chunkIndex} upload failed: ${resp.status}`);
  const json = await resp.json();
  return json.data;
}

/**
 * Step 3: 通知服务端完成上传（合并 + 完整性校验）
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
 * Step 4: 创建视频业务记录（绑定最终 videoUrl）
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
