package com.douyin.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.FileAsset;

public interface FileAssetService extends IService<FileAsset> {

    FileAsset getByFileHash(String fileHash);
}
