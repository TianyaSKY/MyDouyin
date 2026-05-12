-- MySQL Schema for Douyin MVP

CREATE DATABASE IF NOT EXISTS douyin;
USE douyin;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '加密后的密码',
    nickname VARCHAR(64) NULL COMMENT '昵称',
    is_admin TINYINT(1) NOT NULL COMMENT '是否为管理员',
    avatar_url VARCHAR(512) NULL COMMENT '头像URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) COMMENT '用户主表';

-- 2. Videos
CREATE TABLE IF NOT EXISTS videos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '视频ID',
    author_id BIGINT NOT NULL COMMENT '作者ID',
    title VARCHAR(255) NOT NULL COMMENT '视频标题',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态(0:审核中, 1:已发布, 2:已删除)',
    cover_url VARCHAR(512) NULL COMMENT '封面图URL',
    video_url VARCHAR(512) NOT NULL COMMENT '视频文件URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_author (author_id),
    INDEX idx_created_at (created_at)
) COMMENT '视频元数据表';

-- 3. Video Tags
CREATE TABLE IF NOT EXISTS video_tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    video_id BIGINT NOT NULL COMMENT '视频ID',
    tag_name VARCHAR(64) NOT NULL COMMENT '标签名',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '标签顺序',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_video_tag (video_id, tag_name),
    INDEX idx_video_id (video_id),
    INDEX idx_tag_name (tag_name)
) COMMENT '视频标签表';

-- 4. Video Daily Stats (Aggregated counters)
-- In production, this might be written from Redis to DB periodically
CREATE TABLE IF NOT EXISTS video_daily_stats (
    video_id BIGINT NOT NULL COMMENT '视频ID',
    date DATE NOT NULL COMMENT '统计日期',
    impr_cnt INT DEFAULT 0 COMMENT '曝光次数',
    click_cnt INT DEFAULT 0 COMMENT '点击次数',
    like_cnt INT DEFAULT 0 COMMENT '点赞次数',
    finish_cnt INT DEFAULT 0 COMMENT '完播次数',
    share_cnt INT DEFAULT 0 COMMENT '分享次数',
    comment_cnt INT DEFAULT 0 COMMENT '评论次数',
    watch_time_sum BIGINT DEFAULT 0 COMMENT '总观看时长(毫秒)',
    PRIMARY KEY (video_id, date)
) COMMENT '视频每日统计表';

-- 5. User Events (Raw interaction logs for training)
CREATE TABLE IF NOT EXISTS user_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    video_id BIGINT NOT NULL COMMENT '视频ID',
    event_type ENUM('impr', 'click', 'like', 'finish', 'share', 'leave', 'comment') NOT NULL COMMENT '事件类型(曝光, 点击, 点赞, 完播, 分享, 离开, 评论)',
    watch_ms INT DEFAULT 0 COMMENT '观看时长(毫秒)',
    ctx JSON NULL COMMENT '上下文信息(设备, 入口, 时间戳等)',
    ts DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '事件发生时间',
    INDEX idx_user_video (user_id, video_id),
    INDEX idx_ts (ts)
) COMMENT '用户行为日志表';

-- 6. User-Video Relation State (source of truth for idempotent like/favorite actions)
CREATE TABLE IF NOT EXISTS user_video_relations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    video_id BIGINT NOT NULL COMMENT '视频ID',
    action_type ENUM('like', 'favorite') NOT NULL COMMENT '行为类型',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态(1:生效, 0:取消)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_user_video_relation (user_id, video_id, action_type),
    INDEX idx_user_action_status (user_id, action_type, status),
    INDEX idx_video_action_status (video_id, action_type, status),
    INDEX idx_updated_at (updated_at)
) COMMENT '用户-视频关系状态表(幂等真相表)';

-- 7. Media Files (for hash instant upload)
CREATE TABLE IF NOT EXISTS media_files (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    file_hash VARCHAR(64) NOT NULL COMMENT '文件哈希值(MD5/SHA-256)',
    file_size BIGINT NOT NULL COMMENT '文件大小',
    file_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
    video_url VARCHAR(512) NOT NULL COMMENT '视频存储URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_file_hash (file_hash)
) COMMENT '媒体文件登记表(用于秒传)';

-- 8. Video Comments
CREATE TABLE IF NOT EXISTS video_comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '评论ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    video_id BIGINT NOT NULL COMMENT '视频ID',
    content VARCHAR(500) NOT NULL COMMENT '评论内容',
    parent_id BIGINT NULL DEFAULT NULL COMMENT '父评论ID(回复)',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态(1:正常, 0:已删除)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_video_id (video_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_created_at (created_at)
) COMMENT '视频评论表';

-- 9. User Comment Preferences (recommend writes back)
CREATE TABLE IF NOT EXISTS user_comment_preferences (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    video_id BIGINT NOT NULL COMMENT '视频ID',
    comment_id BIGINT NOT NULL COMMENT '评论ID',
    preference_score DOUBLE NOT NULL DEFAULT 0.0 COMMENT '喜好程度(0-1)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_comment (user_id, video_id, comment_id),
    INDEX idx_user_video (user_id, video_id)
) COMMENT '用户评论偏好表(推荐系统回写)';

-- 插入数据
-- 插入管理员用户 密码在此项目的默认密钥hash 登录使用admin123

INSERT IGNORE INTO users(user_id,username,password,nickname,is_admin)
VALUES
(1,'default_admin','$2a$10$NWTWuFxkkuKkuSDADiuCDeBsr0NKol9XCMjwsD8rNatW3y09hPcnG','默认管理员',1),
(2,'default_user','$2a$10$NWTWuFxkkuKkuSDADiuCDeBsr0NKol9XCMjwsD8rNatW3y09hPcnG','默认用户',0);
