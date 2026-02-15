import React, { useState, useRef, useEffect } from 'react';
import SparkMD5 from 'spark-md5';
import { Upload, X, Check, Loader2, FileVideo, Image as ImageIcon, AtSign, Hash } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { initUpload, uploadChunk, completeUpload, uploadCover, CHUNK_SIZE } from '../../api/upload';
import { createVideo } from '../../api/video';

const UploadModal = ({ isOpen, onClose }) => {
    const { token, user } = useAuthContext();
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const dropZoneRef = useRef(null);

    // State
    const [file, setFile] = useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const [tags, setTags] = useState(''); // New state for tags
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);


    // Upload State
    const [status, setStatus] = useState('idle'); // idle, hashing, uploading, processing, success, error
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // Cleanup object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
            if (coverPreview && coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
        };
    }, [videoPreviewUrl, coverPreview]);

    if (!isOpen) return null;

    const processFile = (selectedFile) => {
        if (!selectedFile) return;
        if (selectedFile.type.indexOf('video/') !== 0) {
            setErrorMsg('请选择有效的视频文件 (MP4, WebM等)');
            return;
        }

        // Clean up previous
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

        const url = URL.createObjectURL(selectedFile);
        setFile(selectedFile);
        setVideoPreviewUrl(url);
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, "").substring(0, 50));
        setErrorMsg('');
        setStatus('idle');
        setProgress(0);
    };

    const handleFileSelect = (e) => {
        processFile(e.target.files[0]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleCoverSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            setCoverFile(selectedFile);
            const url = URL.createObjectURL(selectedFile);
            setCoverPreview(url);
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
                setProgress(Math.round((currentChunk / chunks) * 10));
            }

            loadNext();
        });
    };

    const handleUpload = async () => {
        if (!file || !title.trim()) {
            setErrorMsg('请填写完整的作品信息');
            return;
        }

        if (!coverFile) {
            setErrorMsg('请上传封面图片');
            return;
        }

        try {
            setStatus('hashing');
            const fileHash = await calculateHash(file);

            setStatus('uploading');
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

            // 1. Init
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
                    setProgress(Math.round(10 + ((i + 1) / totalChunks) * 80));
                    continue;
                }
                const start = i * CHUNK_SIZE;
                const end = Math.min(file.size, start + CHUNK_SIZE);
                const chunk = file.slice(start, end);
                await uploadChunk(token, uploadId, i, chunk);
                setProgress(Math.round(10 + ((i + 1) / totalChunks) * 80));
            }

            // 3. Complete
            setStatus('processing');
            const completeData = await completeUpload(token, {
                uploadId,
                fileName: file.name,
                fileHash,
                fileSize: file.size,
                totalChunks
            });
            setProgress(95);

            // 4. Upload Cover
            let finalCoverUrl = completeData.videoUrl + "?x-oss-process=video/snapshot,t_1000,f_jpg";
            if (coverFile) {
                try {
                    finalCoverUrl = await uploadCover(token, coverFile);
                } catch (coverErr) {
                    console.error("Cover upload failed", coverErr);
                }
            }

            // 5. Create Record
            const tagList = tags.split(/[\s,，]+/).filter(t => t.trim());
            await createVideo(token, {
                authorId: user.userId,
                title: title,
                videoUrl: completeData.videoUrl,
                coverUrl: finalCoverUrl,
                tags: tagList
            });

            setStatus('success');
            setProgress(100);
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1500);

        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || '发布失败，请重试');
        }
    };

    const reset = () => {
        setFile(null);
        setVideoPreviewUrl(null);
        setVideoPreviewUrl(null);
        setTitle('');
        setDescription('');
        setTags('');
        setCoverFile(null);
        setCoverPreview(null);
        setStatus('idle');
        setProgress(0);
        setErrorMsg('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all duration-300">
            <div className={`bg-[#161823] w-full ${file ? 'max-w-5xl h-[80vh]' : 'max-w-lg h-auto'} transition-all duration-500 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-800`}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        <Upload className="mr-2" size={20} /> 发布作品
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    <div className="flex flex-col md:flex-row h-full">

                        {/* Left: Preview & Cover (Acts as uploader if no file) */}
                        <div className="w-full md:w-[320px] bg-black/40 border-r border-gray-800 p-6 flex flex-col items-center overflow-y-auto custom-scrollbar">
                            {!file ? (
                                <div
                                    className="w-full h-full flex flex-col items-center justify-center bg-[#252836] hover:bg-[#2d3042] rounded-xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="video/*"
                                    />

                                    <div className="w-16 h-16 bg-[#3b3e52] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg relative z-10">
                                        <Upload size={28} className="text-gray-400 group-hover:text-white transition-colors" />
                                    </div>

                                    <h3 className="text-sm font-bold text-gray-300 group-hover:text-white mb-1 transition-colors relative z-10">点击或拖拽上传视频</h3>
                                    <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors relative z-10">支持 MP4, WebM</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-xs text-gray-400 font-medium mb-3 self-start w-full flex justify-between">
                                        <span>预览 & 封面</span>
                                        <button onClick={reset} className="text-blue-400 hover:underline">重新上传</button>
                                    </div>

                                    <div className="aspect-[9/16] w-full bg-black rounded-lg overflow-hidden shadow-lg border border-gray-800 relative group">
                                        {videoPreviewUrl && (
                                            <video
                                                src={videoPreviewUrl}
                                                className="w-full h-full object-contain"
                                                controls
                                                muted
                                            />
                                        )}
                                    </div>

                                    <div className="mt-6 w-full">
                                        <label className="text-xs text-gray-400 mb-2 block">
                                            设置封面 <span className="text-red-500">*</span>
                                        </label>
                                        <div
                                            onClick={() => coverInputRef.current?.click()}
                                            className="w-full aspect-video bg-gray-800 rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors relative overflow-hidden group"
                                        >
                                            {coverPreview ? (
                                                <>
                                                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <span className="text-white text-xs">更换封面</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon size={20} className="text-gray-500 mb-1" />
                                                    <span className="text-xs text-gray-500">点击上传封面</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                ref={coverInputRef}
                                                onChange={handleCoverSelect}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right: Form Info */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                            <div className={`max-w-2xl mx-auto space-y-6 ${!file ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}`}>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">作品标题 <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-[#252836] border border-gray-700 rounded-md p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-500"
                                            placeholder="给作品起个好标题..."
                                            maxLength={50}
                                        />
                                        <span className="absolute right-3 top-3.5 text-xs text-gray-500">{title.length}/50</span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">作品描述</label>
                                    <div className="relative bg-[#252836] border border-gray-700 rounded-md p-3">
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full bg-transparent border-none text-white focus:ring-0 outline-none min-h-[120px] resize-none placeholder-gray-500 text-sm"
                                            placeholder="添加合适的话题和描述，让更多人看到..."
                                            maxLength={500}
                                        />
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                                            <div className="flex space-x-2 text-gray-400">
                                                <button className="hover:text-white flex items-center text-xs"><Hash size={14} className="mr-1" /> 话题</button>
                                                <button className="hover:text-white flex items-center text-xs"><AtSign size={14} className="mr-1" /> 好友</button>
                                            </div>
                                            <span className="text-xs text-gray-500">{description.length}/500</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">标签</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Hash size={16} className="text-gray-500" />
                                        </div>
                                        <input
                                            type="text"
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                            className="w-full bg-[#252836] border border-gray-700 rounded-md py-3 pl-10 pr-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-500"
                                            placeholder="输入标签，用空格或逗号分隔..."
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Footer Action Area */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#161823] border-t border-gray-800 flex items-center justify-between z-10">
                                <div className="flex-1 mr-8">
                                    {status !== 'idle' && (
                                        <div className="w-full">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>{status === 'success' ? '完成' : status === 'error' ? '失败' : '上传中...'}</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${status === 'error' ? 'bg-red-500' : 'bg-[#FE2C55]'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {errorMsg && <p className="text-red-500 text-sm mt-1">{errorMsg}</p>}
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={!file || (status !== 'idle' && status !== 'error')}
                                        className={`px-8 py-2.5 rounded-md text-sm font-medium text-white transition-all shadow-lg
                                            ${status === 'success' ? 'bg-green-500' : 'bg-[#FE2C55] hover:bg-[#E6284D]'}
                                            ${(!file || (status !== 'idle' && status !== 'error')) ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {status === 'idle' || status === 'error' ? '发布' :
                                            status === 'success' ? '发布成功' :
                                                <span className="flex items-center"><Loader2 className="animate-spin mr-2" size={16} /> 发布中</span>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default UploadModal;
