-- MySQL Schema for Douyin MVP

CREATE DATABASE IF NOT EXISTS douyin;
USE douyin;

-- 1. User Profile
CREATE TABLE IF NOT EXISTS user_profile (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '加密后的密码',
    nickname VARCHAR(64) NULL COMMENT '昵称',
    avatar_url VARCHAR(512) NULL COMMENT '头像URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) COMMENT '用户个人资料表（向量已迁移到 Milvus）';

-- 2. Video Metadata
CREATE TABLE IF NOT EXISTS video (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '视频ID',
    author_id BIGINT NOT NULL COMMENT '作者ID',
    title VARCHAR(255) NOT NULL COMMENT '视频标题',
    tags JSON NULL COMMENT '视频标签',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态(0:审核中, 1:已发布, 2:已删除)',
    cover_url VARCHAR(512) NULL COMMENT '封面图URL',
    video_url VARCHAR(512) NOT NULL COMMENT '视频文件URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_author (author_id),
    INDEX idx_created_at (created_at)
) COMMENT '视频元数据表';

-- 3. Video Stats Daily (Aggregated counters)
-- In production, this might be written from Redis to DB periodically
CREATE TABLE IF NOT EXISTS video_stats_daily (
    video_id BIGINT NOT NULL COMMENT '视频ID',
    date DATE NOT NULL COMMENT '统计日期',
    impr_cnt INT DEFAULT 0 COMMENT '曝光次数',
    click_cnt INT DEFAULT 0 COMMENT '点击次数',
    like_cnt INT DEFAULT 0 COMMENT '点赞次数',
    finish_cnt INT DEFAULT 0 COMMENT '完播次数',
    share_cnt INT DEFAULT 0 COMMENT '分享次数',
    watch_time_sum BIGINT DEFAULT 0 COMMENT '总观看时长(毫秒)',
    PRIMARY KEY (video_id, date)
) COMMENT '视频每日统计表';

-- 4. User Event (Raw interaction logs for training)
CREATE TABLE IF NOT EXISTS user_event (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    video_id BIGINT NOT NULL COMMENT '视频ID',
    event_type ENUM('impr', 'click', 'like', 'finish', 'share', 'leave') NOT NULL COMMENT '事件类型(曝光, 点击, 点赞, 完播, 分享, 离开)',
    watch_ms INT DEFAULT 0 COMMENT '观看时长(毫秒)',
    ctx JSON NULL COMMENT '上下文信息(设备, 入口, 时间戳等)',
    ts DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '事件发生时间',
    INDEX idx_user_video (user_id, video_id),
    INDEX idx_ts (ts)
) COMMENT '用户行为日志表';

-- 5. User-Video Action State (source of truth for idempotent like/share/follow actions)
CREATE TABLE IF NOT EXISTS user_video_action (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    video_id BIGINT NOT NULL COMMENT '视频ID',
    action_type ENUM('like', 'favorite') NOT NULL COMMENT '行为类型',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态(1:生效, 0:取消)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_user_video_action (user_id, video_id, action_type),
    INDEX idx_user_action_status (user_id, action_type, status),
    INDEX idx_video_action_status (video_id, action_type, status),
    INDEX idx_updated_at (updated_at)
) COMMENT '用户-视频行为状态表(幂等真相表)';

-- 6. File Asset (for hash instant upload)
CREATE TABLE IF NOT EXISTS file_asset (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    file_hash VARCHAR(64) NOT NULL COMMENT '文件哈希值(MD5/SHA-256)',
    file_size BIGINT NOT NULL COMMENT '文件大小',
    file_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
    video_url VARCHAR(512) NOT NULL COMMENT '视频存储URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_file_hash (file_hash)
) COMMENT '文件资源表(用于秒传)';
