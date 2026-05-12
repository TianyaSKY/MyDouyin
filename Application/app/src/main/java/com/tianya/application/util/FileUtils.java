package com.tianya.application.util;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Utility for file hashing and metadata extraction from content URIs.
 */
public class FileUtils {

    public static final int CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

    /**
     * Compute MD5 hash of a content URI file.
     */
    public static String computeMD5(Context context, Uri uri) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("MD5");
            InputStream is = context.getContentResolver().openInputStream(uri);
            if (is == null) throw new IOException("Cannot open input stream");

            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                digest.update(buffer, 0, bytesRead);
            }
            is.close();

            byte[] md5Bytes = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : md5Bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IOException("MD5 algorithm not available", e);
        }
    }

    /**
     * Get file size from content URI.
     */
    public static long getFileSize(Context context, Uri uri) {
        Cursor cursor = context.getContentResolver().query(uri, null, null, null, null);
        if (cursor != null) {
            try {
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                cursor.moveToFirst();
                if (sizeIndex >= 0) {
                    return cursor.getLong(sizeIndex);
                }
            } finally {
                cursor.close();
            }
        }
        return -1;
    }

    /**
     * Get display file name from content URI.
     */
    public static String getFileName(Context context, Uri uri) {
        Cursor cursor = context.getContentResolver().query(uri, null, null, null, null);
        if (cursor != null) {
            try {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                cursor.moveToFirst();
                if (nameIndex >= 0) {
                    return cursor.getString(nameIndex);
                }
            } finally {
                cursor.close();
            }
        }
        return "video.mp4";
    }

    /**
     * Read a specific chunk from a content URI.
     * @return byte array of the chunk, or null if beyond file end.
     */
    public static byte[] readChunk(Context context, Uri uri, int chunkIndex) throws IOException {
        InputStream is = context.getContentResolver().openInputStream(uri);
        if (is == null) throw new IOException("Cannot open input stream");

        try {
            long skipBytes = (long) chunkIndex * CHUNK_SIZE;
            long skipped = 0;
            while (skipped < skipBytes) {
                long s = is.skip(skipBytes - skipped);
                if (s <= 0) break;
                skipped += s;
            }

            byte[] buffer = new byte[CHUNK_SIZE];
            int totalRead = 0;
            int bytesRead;
            while (totalRead < CHUNK_SIZE &&
                    (bytesRead = is.read(buffer, totalRead, CHUNK_SIZE - totalRead)) != -1) {
                totalRead += bytesRead;
            }

            if (totalRead == 0) return null;
            if (totalRead < CHUNK_SIZE) {
                byte[] trimmed = new byte[totalRead];
                System.arraycopy(buffer, 0, trimmed, 0, totalRead);
                return trimmed;
            }
            return buffer;
        } finally {
            is.close();
        }
    }

    public static int calculateTotalChunks(long fileSize) {
        return (int) Math.ceil((double) fileSize / CHUNK_SIZE);
    }
}
