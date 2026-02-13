import { apiFetch } from './client';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export async function initUpload(token, { fileName, fileHash, fileSize, totalChunks }) {
    const resp = await apiFetch('/api/videos/upload/init', token, {
        method: 'POST',
        body: JSON.stringify({
            fileName,
            fileHash,
            fileSize,
            chunkSize: CHUNK_SIZE,
            totalChunks
        })
    });

    const json = await resp.json();
    if (json.code !== 200) {
        throw new Error(json.message || '初始化上传失败');
    }
    return json.data;
}

export async function uploadChunk(token, uploadId, chunkIndex, chunkBlob) {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex);
    formData.append('chunk', chunkBlob);

    const resp = await apiFetch('/api/videos/upload/chunk', token, {
        method: 'POST',
        body: formData
    });

    const json = await resp.json();
    if (json.code !== 200) {
        throw new Error(json.message || `分片 ${chunkIndex} 上传失败`);
    }
    return json.data;
}

export async function completeUpload(token, { uploadId, fileName, fileHash, fileSize, totalChunks }) {
    const resp = await apiFetch('/api/videos/upload/complete', token, {
        method: 'POST',
        body: JSON.stringify({
            uploadId,
            fileName,
            fileHash,
            fileSize,
            totalChunks
        })
    });

    const json = await resp.json();
    if (json.code !== 200) {
        throw new Error(json.message || '合并文件失败');
    }
    return json.data;
}

export async function uploadCover(token, file) {
    const formData = new FormData();
    formData.append('file', file);

    const resp = await apiFetch('/api/videos/upload/cover', token, {
        method: 'POST',
        body: formData
    });

    const json = await resp.json();
    if (json.code !== 200) {
        throw new Error(json.message || '封面上传失败');
    }
    return json.data;
}
