package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.FileAsset;
import com.douyin.mapper.FileAssetMapper;
import com.douyin.service.FileAssetService;
import org.springframework.stereotype.Service;

@Service
public class FileAssetServiceImpl extends ServiceImpl<FileAssetMapper, FileAsset>
        implements FileAssetService {

    @Override
    public FileAsset getByFileHash(String fileHash) {
        return getOne(new LambdaQueryWrapper<FileAsset>()
                .eq(FileAsset::getFileHash, fileHash)
                .last("LIMIT 1"));
    }
}
