package com.douyin.service.impl;

import com.douyin.entity.dto.UploadCompleteRequest;
import com.douyin.entity.dto.UploadCompleteResponse;
import com.douyin.entity.dto.UploadInitRequest;
import com.douyin.entity.dto.UploadInitResponse;
import com.douyin.entity.FileAsset;
import com.douyin.service.FileAssetService;
import com.douyin.service.VideoUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class VideoUploadServiceImpl implements VideoUploadService {

    private final FileAssetService fileAssetService;

    @Value("${app.upload.base-dir:storage}")
    private String baseDir;

    @Value("${app.upload.temp-dir:tmp}")
    private String tempDirName;

    @Value("${app.upload.video-dir:videos}")
    private String videoDirName;

    @Value("${app.upload.url-prefix:/uploads/videos/}")
    private String urlPrefix;

    @Override
    public UploadInitResponse initUpload(UploadInitRequest request) {
        String normalizedHash = normalizeAndValidateHash(request.getFileHash());
        String uploadId = buildUploadId(normalizedHash, request.getFileSize(), request.getTotalChunks());

        FileAsset existing = fileAssetService.getByFileHash(normalizedHash);
        UploadInitResponse response = new UploadInitResponse();
        response.setUploadId(uploadId);
        if (existing != null) {
            response.setInstantUpload(true);
            response.setUploadedChunks(List.of());
            response.setVideoUrl(existing.getVideoUrl());
            return response;
        }

        response.setInstantUpload(false);
        response.setUploadedChunks(scanUploadedChunks(uploadId));
        return response;
    }

    @Override
    public void uploadChunk(String uploadId, Integer chunkIndex, MultipartFile chunk) {
        validateUploadId(uploadId);
        if (chunkIndex == null || chunkIndex < 0) {
            throw new RuntimeException("chunkIndex must be >= 0");
        }
        if (chunk == null || chunk.isEmpty()) {
            throw new RuntimeException("chunk cannot be empty");
        }

        Path uploadDir = getTempRoot().resolve(uploadId);
        Path chunkPath = uploadDir.resolve(chunkIndex + ".part");
        try {
            Files.createDirectories(uploadDir);
            if (Files.exists(chunkPath) && Files.size(chunkPath) == chunk.getSize()) {
                return;
            }
            chunk.transferTo(chunkPath);
        } catch (IOException ex) {
            throw new RuntimeException("failed to save chunk", ex);
        }
    }

    @Override
    public UploadCompleteResponse completeUpload(UploadCompleteRequest request) {
        String normalizedHash = normalizeAndValidateHash(request.getFileHash());
        String expectedUploadId = buildUploadId(normalizedHash, request.getFileSize(), request.getTotalChunks());
        if (!expectedUploadId.equals(request.getUploadId())) {
            throw new RuntimeException("uploadId does not match file metadata");
        }

        FileAsset existing = fileAssetService.getByFileHash(normalizedHash);
        if (existing != null) {
            UploadCompleteResponse response = new UploadCompleteResponse();
            response.setFileHash(normalizedHash);
            response.setVideoUrl(existing.getVideoUrl());
            return response;
        }

        Path uploadDir = getTempRoot().resolve(request.getUploadId());
        ensureAllChunksExist(uploadDir, request.getTotalChunks());

        Path mergedFile = uploadDir.resolve("merged.tmp");
        try {
            mergeChunks(uploadDir, request.getTotalChunks(), mergedFile);
            long mergedSize = Files.size(mergedFile);
            if (mergedSize != request.getFileSize()) {
                throw new RuntimeException("merged file size mismatch");
            }

            String mergedHash = calculateFileHash(mergedFile, normalizedHash.length());
            if (!normalizedHash.equals(mergedHash)) {
                throw new RuntimeException("file hash mismatch");
            }

            String extension = safeExtension(request.getFileName());
            String finalName = normalizedHash + extension;
            Path videoDir = getVideoRoot();
            Path finalPath = videoDir.resolve(finalName);
            Files.createDirectories(videoDir);
            if (!Files.exists(finalPath)) {
                Files.move(mergedFile, finalPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String videoUrl = normalizeUrlPrefix(urlPrefix) + finalName;
            saveAsset(normalizedHash, request.getFileSize(), request.getFileName(), videoUrl);
            deleteDirectoryQuietly(uploadDir);

            UploadCompleteResponse response = new UploadCompleteResponse();
            response.setFileHash(normalizedHash);
            response.setVideoUrl(videoUrl);
            return response;
        } catch (IOException ex) {
            throw new RuntimeException("failed to complete upload", ex);
        }
    }

    private List<Integer> scanUploadedChunks(String uploadId) {
        Path uploadDir = getTempRoot().resolve(uploadId);
        if (!Files.exists(uploadDir)) {
            return List.of();
        }
        List<Integer> indexes = new ArrayList<>();
        try (Stream<Path> stream = Files.list(uploadDir)) {
            stream.filter(Files::isRegularFile)
                    .map(Path::getFileName)
                    .map(Path::toString)
                    .filter(name -> name.endsWith(".part"))
                    .forEach(name -> {
                        String indexText = name.substring(0, name.length() - 5);
                        try {
                            indexes.add(Integer.parseInt(indexText));
                        } catch (NumberFormatException ignored) {
                            // Ignore unknown files.
                        }
                    });
        } catch (IOException ex) {
            throw new RuntimeException("failed to read uploaded chunks", ex);
        }
        indexes.sort(Integer::compareTo);
        return indexes;
    }

    private void ensureAllChunksExist(Path uploadDir, int totalChunks) {
        if (!Files.exists(uploadDir)) {
            throw new RuntimeException("upload session does not exist");
        }
        for (int i = 0; i < totalChunks; i++) {
            Path chunkPath = uploadDir.resolve(i + ".part");
            if (!Files.exists(chunkPath)) {
                throw new RuntimeException("missing chunk: " + i);
            }
        }
    }

    private void mergeChunks(Path uploadDir, int totalChunks, Path mergedFile) throws IOException {
        try (OutputStream output = Files.newOutputStream(mergedFile,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE)) {
            for (int i = 0; i < totalChunks; i++) {
                Path chunkPath = uploadDir.resolve(i + ".part");
                Files.copy(chunkPath, output);
            }
        }
    }

    private void saveAsset(String fileHash, long fileSize, String fileName, String videoUrl) {
        FileAsset asset = new FileAsset();
        asset.setFileHash(fileHash);
        asset.setFileSize(fileSize);
        asset.setFileName(fileName);
        asset.setVideoUrl(videoUrl);
        try {
            fileAssetService.save(asset);
        } catch (DuplicateKeyException ex) {
            // Another request completed first; treat as success.
        }
    }

    private String calculateFileHash(Path filePath, int hashLength) {
        String algorithm;
        if (hashLength == 32) {
            algorithm = "MD5";
        } else if (hashLength == 64) {
            algorithm = "SHA-256";
        } else {
            throw new RuntimeException("unsupported fileHash length");
        }
        try (InputStream inputStream = Files.newInputStream(filePath)) {
            MessageDigest digest = MessageDigest.getInstance(algorithm);
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return toHex(digest.digest());
        } catch (IOException | NoSuchAlgorithmException ex) {
            throw new RuntimeException("failed to calculate file hash", ex);
        }
    }

    private String normalizeAndValidateHash(String hash) {
        if (hash == null || hash.isBlank()) {
            throw new RuntimeException("fileHash cannot be blank");
        }
        String normalized = hash.trim().toLowerCase(Locale.ROOT);
        if (!normalized.matches("^[a-f0-9]{32}$") && !normalized.matches("^[a-f0-9]{64}$")) {
            throw new RuntimeException("fileHash must be MD5(32) or SHA-256(64) hex");
        }
        return normalized;
    }

    private String safeExtension(String fileName) {
        if (fileName == null) {
            return ".mp4";
        }
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return ".mp4";
        }
        String extension = fileName.substring(dot).toLowerCase(Locale.ROOT);
        if (!extension.matches("^\\.[a-z0-9]{1,10}$")) {
            return ".mp4";
        }
        return extension;
    }

    private String normalizeUrlPrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return "/uploads/videos/";
        }
        return prefix.endsWith("/") ? prefix : prefix + "/";
    }

    private String buildUploadId(String fileHash, long fileSize, int totalChunks) {
        return fileHash + "_" + fileSize + "_" + totalChunks;
    }

    private void validateUploadId(String uploadId) {
        if (uploadId == null || uploadId.isBlank()) {
            throw new RuntimeException("uploadId cannot be blank");
        }
        if (!uploadId.matches("^[a-f0-9]{32,64}_[0-9]+_[0-9]+$")) {
            throw new RuntimeException("invalid uploadId");
        }
    }

    private Path getBaseRoot() {
        return Paths.get(baseDir).toAbsolutePath().normalize();
    }

    private Path getTempRoot() {
        return getBaseRoot().resolve(tempDirName);
    }

    private Path getVideoRoot() {
        return getBaseRoot().resolve(videoDirName);
    }

    private String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format("%02x", value));
        }
        return builder.toString();
    }

    private void deleteDirectoryQuietly(Path directory) {
        if (!Files.exists(directory)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(directory)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Ignore cleanup failures.
                }
            });
        } catch (IOException ignored) {
            // Ignore cleanup failures.
        }
    }
}
