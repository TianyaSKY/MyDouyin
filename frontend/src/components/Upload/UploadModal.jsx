import React, { useState, useRef } from 'react';
import SparkMD5 from 'spark-md5';
import { Upload, X, Check, Loader2, FileVideo, Image as ImageIcon } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { initUpload, uploadChunk, completeUpload, uploadCover, CHUNK_SIZE } from '../../api/upload';
import { createVideo } from '../../api/video';

const UploadModal = ({ isOpen, onClose }) => {
    const { token, user } = useAuthContext();
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, hashing, uploading, processing, success, error
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type.indexOf('video/') !== 0) {
                setErrorMsg('请选择视频文件');
                return;
            }
            setFile(selectedFile);
            setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")); // Default title to filename
            setErrorMsg('');
            setStatus('idle');
            setProgress(0);
        }
    };

    const handleCoverSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            setCoverFile(selectedFile);
            setCoverPreview(URL.createObjectURL(selectedFile));
        }
    };

    const calculateHash = (file) => {
        return new Promise((resolve, reject) => {
            const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
            const chunks = Math.ceil(file.size / CHUNK_SIZE);
            let currentChunk = 0;
            const spark = new SparkMD5.ArrayBuffer();
            const fileReader = new FileReader();

            fileReader.onload = function (e) {
                spark.append(e.target.result);
                currentChunk++;

                if (currentChunk < chunks) {
                    loadNext();
                } else {
                    resolve(spark.end());
                }
            };

            fileReader.onerror = function () {
                reject('Hash calculation failed');
            };

            function loadNext() {
                const start = currentChunk * CHUNK_SIZE;
                const end = ((start + CHUNK_SIZE) >= file.size) ? file.size : start + CHUNK_SIZE;
                fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
                // Update hashing progress (approx 10% of total process)
                setProgress(Math.round((currentChunk / chunks) * 10));
            }

            loadNext();
        });
    };

    const handleUpload = async () => {
        if (!file || !title.trim()) {
            setErrorMsg('请选择文件并填写标题');
            return;
        }

        try {
            setStatus('hashing');
            const fileHash = await calculateHash(file);

            setStatus('uploading');
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

            // 1. Init Upload
            const initData = await initUpload(token, {
                fileName: file.name,
                fileHash,
                fileSize: file.size,
                totalChunks
            });

            const { uploadId, uploadedChunks } = initData;
            const alreadyUploaded = new Set(uploadedChunks || []);

            // 2. Upload Chunks
            for (let i = 0; i < totalChunks; i++) {
                if (alreadyUploaded.has(i)) {
                    // Skip uploaded chunks
                    const percent = Math.round(10 + ((i + 1) / totalChunks) * 80);
                    setProgress(percent);
                    continue;
                }

                const start = i * CHUNK_SIZE;
                const end = Math.min(file.size, start + CHUNK_SIZE);
                const chunk = file.slice(start, end);

                await uploadChunk(token, uploadId, i, chunk);

                // Progress from 10% to 90%
                const percent = Math.round(10 + ((i + 1) / totalChunks) * 80);
                setProgress(percent);
            }

            // 3. Complete Upload
            setStatus('processing');
            const completeData = await completeUpload(token, {
                uploadId,
                fileName: file.name,
                fileHash,
                fileSize: file.size,
                totalChunks
            });
            setProgress(95);

            // 4. Upload Cover (if selected)
            let finalCoverUrl = completeData.videoUrl + "?x-oss-process=video/snapshot,t_1000,f_jpg";
            if (coverFile) {
                try {
                    finalCoverUrl = await uploadCover(token, coverFile);
                } catch (coverErr) {
                    console.error("Cover upload failed, using default", coverErr);
                }
            }

            // 5. Create Video Record
            await createVideo(token, {
                authorId: user.userId, // Although backend can infer from token, sometimes explicit ID helps
                title: title,
                videoUrl: completeData.videoUrl,
                coverUrl: finalCoverUrl,
                tags: []
            });

            setStatus('success');
            setProgress(100);
            setTimeout(() => {
                onClose();
                // Ideally trigger feed refresh here
                window.location.reload(); // Simple refresh for now
            }, 1500);

        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || '上传失败，请重试');
        }
    };

    const reset = () => {
        setFile(null);
        setTitle('');
        setCoverFile(null);
        setCoverPreview(null);
        setStatus('idle');
        setProgress(0);
        setErrorMsg('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 w-full max-w-md rounded-2xl p-6 border border-gray-800 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Upload className="mr-2" size={20} /> 发布作品
                </h2>

                {!file ? (
                    <div
                        className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-gray-800/50 transition-all h-64"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <FileVideo size={32} />
                        </div>
                        <p className="text-gray-300 font-medium">点击选择视频</p>
                        <p className="text-gray-500 text-xs mt-2">支持 MP4, WebM (最大 500MB)</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="video/*"
                        />
                        {errorMsg && <p className="text-red-500 text-sm mt-4">{errorMsg}</p>}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center overflow-hidden">
                                <FileVideo size={20} className="text-blue-400 mr-2 flex-shrink-0" />
                                <span className="text-white text-sm truncate mr-2">{file.name}</span>
                            </div>
                            <button onClick={reset} className="text-gray-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <div>
                            <label className="text-gray-400 text-xs block mb-1">作品标题</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-gray-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="请输入标题..."
                                maxLength={50}
                            />
                        </div>

                        <div>
                            <label className="text-gray-400 text-xs block mb-1">封面设置 (可选)</label>
                            <div
                                onClick={() => coverInputRef.current?.click()}
                                className="w-full h-32 bg-gray-800 rounded-lg border border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-700/50 transition-colors overflow-hidden relative"
                            >
                                {coverPreview ? (
                                    <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-500">
                                        <ImageIcon size={24} className="mb-2" />
                                        <span className="text-xs">点击上传封面</span>
                                    </div>
                                )}
                                {coverPreview && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <p className="text-white text-xs">点击更换</p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={coverInputRef}
                                onChange={handleCoverSelect}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {status !== 'idle' && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>{status === 'hashing' ? '计算校验...' : status === 'uploading' ? '上传中...' : status === 'processing' ? '处理中...' : status === 'success' ? '发布成功' : '准备就绪'}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

                        <button
                            onClick={handleUpload}
                            disabled={status !== 'idle' && status !== 'error'}
                            className={`w-full py-3 rounded-xl text-white font-bold flex items-center justify-center transition-all mt-4 
                                ${status === 'success' ? 'bg-green-500 hover:bg-green-600 scale-105' : 'bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'}
                            `}
                        >
                            {status === 'idle' || status === 'error' ? (
                                '立即发布'
                            ) : status === 'success' ? (
                                <div className="flex items-center animate-bounce">
                                    <Check size={20} className="mr-2" /> 发布成功
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <Loader2 size={20} className="animate-spin mr-2" />
                                    <span>{status === 'hashing' ? '校验中...' : '上传中...'}</span>
                                </div>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadModal;
