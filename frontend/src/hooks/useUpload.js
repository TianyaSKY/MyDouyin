import { useState } from "react";
import SparkMD5 from "spark-md5";
import { completeUpload, createVideo, initUpload, uploadChunk } from "../api/upload";

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

async function calculateFileHash(file) {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    const size = file.size;
    let offset = 0;

    reader.onload = (e) => {
      spark.append(e.target.result);
      offset += e.target.result.byteLength;

      if (offset < size) {
        readNext();
      } else {
        resolve(spark.end());
      }
    };

    reader.onerror = () => {
      reject(new Error("文件读取失败"));
    };

    function readNext() {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    }

    readNext();
  });
}

export function useUpload({ token, authUser }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleUpload = async (file, title) => {
    if (!file || !token || !authUser) return;

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const fileSize = file.size;
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      const fileName = file.name;
      
      // Calculate real MD5 hash
      const fileHash = await calculateFileHash(file);

      // 1. Init
      const { uploadId, uploadedChunks = [], videoUrl: existingUrl, instantUpload } = await initUpload(token, {
        fileName,
        fileHash,
        fileSize,
        totalChunks,
        chunkSize: CHUNK_SIZE,
      });

      let finalVideoUrl = existingUrl;

      if (!instantUpload) {
        // 2. Upload Chunks
        const uploadedIndices = new Set(uploadedChunks);
        for (let i = 0; i < totalChunks; i++) {
          if (uploadedIndices.has(i)) {
            setProgress(Math.round(((i + 1) / totalChunks) * 100));
            continue;
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunk = file.slice(start, end);

          await uploadChunk(token, { uploadId, chunkIndex: i, chunk });
          setProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        // 3. Complete
        const completeData = await completeUpload(token, {
          uploadId,
          fileName,
          fileHash,
          fileSize,
          totalChunks,
        });
        finalVideoUrl = completeData.videoUrl;
      }

      // 4. Create Video Entry
      await createVideo(token, {
        authorId: authUser.userId,
        title: title || fileName,
        tags: ["推荐"],
        videoUrl: finalVideoUrl,
        coverUrl: "", // Optional cover
      });

      alert("视频上传成功！");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { handleUpload, uploading, progress, error };
}
