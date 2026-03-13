package com.douyin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.douyin.entity.Video;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface VideoMapper extends BaseMapper<Video> {

    @Select("""
            SELECT v.*
            FROM videos v
            JOIN users u ON u.user_id = v.author_id
            WHERE v.status = 1
              AND u.is_admin = 1
            ORDER BY v.created_at DESC, v.id DESC
            """)
    List<Video> selectPublishedByAdmin();
}
