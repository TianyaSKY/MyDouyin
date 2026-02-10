-- MySQL Schema for Douyin MVP

CREATE DATABASE IF NOT EXISTS douyin;
USE douyin;

-- 1. User Profile
CREATE TABLE IF NOT EXISTS user_profile (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL COMMENT 'BCrypt hashed password',
    nickname VARCHAR(64) NULL COMMENT 'Display name',
    avatar_url VARCHAR(512) NULL COMMENT 'Avatar image URL',
    long_vec JSON NULL COMMENT 'User interest vector for long-term recall',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Video Metadata
CREATE TABLE IF NOT EXISTS video (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    author_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    tags JSON NULL COMMENT 'List of tags or VARCHAR(512)',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '0: Review, 1: Published, 2: Deleted',
    cover_url VARCHAR(512) NULL,
    video_url VARCHAR(512) NOT NULL COMMENT 'MinIO URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_author (author_id),
    INDEX idx_created_at (created_at)
);

-- 3. Video Stats Daily (Aggregated counters)
-- In production, this might be written from Redis to DB periodically
CREATE TABLE IF NOT EXISTS video_stats_daily (
    video_id BIGINT NOT NULL,
    date DATE NOT NULL,
    impr_cnt INT DEFAULT 0,
    click_cnt INT DEFAULT 0,
    like_cnt INT DEFAULT 0,
    finish_cnt INT DEFAULT 0,
    watch_time_sum BIGINT DEFAULT 0 COMMENT 'Total watch time in ms',
    PRIMARY KEY (video_id, date)
);

-- 4. User Event (Raw interaction logs for training)
CREATE TABLE IF NOT EXISTS user_event (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    video_id BIGINT NOT NULL,
    event_type ENUM('impr', 'click', 'like', 'finish', 'share') NOT NULL,
    watch_ms INT DEFAULT 0,
    ctx JSON NULL COMMENT 'Context: device, entry_point, timestamp',
    ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_video (user_id, video_id),
    INDEX idx_ts (ts)
);

-- 5. File Asset (for hash instant upload)
CREATE TABLE IF NOT EXISTS file_asset (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    file_hash VARCHAR(64) NOT NULL COMMENT 'MD5(32) or SHA-256(64) hex',
    file_size BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    video_url VARCHAR(512) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_file_hash (file_hash)
);
