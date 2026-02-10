package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("file_asset")
public class FileAsset {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String fileHash;

    private Long fileSize;

    private String fileName;

    private String videoUrl;

    private LocalDateTime createdAt;
}
