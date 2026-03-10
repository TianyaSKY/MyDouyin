"""
文件上传 API 路由
"""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.services import qiniu_upload_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["upload"])


@router.post("/upload/file")
async def upload_file(file: UploadFile = File(...)):
    """
    直传文件到七牛云并返回外网访问链接。
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="上传文件不能为空")

        filename = file.filename or "upload.bin"
        content_type = file.content_type or "application/octet-stream"
        result = await run_in_threadpool(
            qiniu_upload_service.upload_file,
            filename,
            content,
            content_type,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file to qiniu: {e}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {e}")
