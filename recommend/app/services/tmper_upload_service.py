"""
七牛云文件上传服务
"""

from __future__ import annotations

import os
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import quote, urlsplit

from qiniu import Auth, put_file_v2

from app.core.config import settings


class QiniuUploadService:
    """封装对七牛云对象存储的上传调用。"""

    @staticmethod
    def _validate_settings() -> None:
        required = {
            "QINIU_ACCESS_KEY": settings.QINIU_ACCESS_KEY,
            "QINIU_SECRET_KEY": settings.QINIU_SECRET_KEY,
            "QINIU_BUCKET_NAME": settings.QINIU_BUCKET_NAME,
            "QINIU_PUBLIC_BASE_URL": settings.QINIU_PUBLIC_BASE_URL,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise ValueError(f"Missing required Qiniu settings: {', '.join(missing)}")

    @staticmethod
    def _build_public_url(key: str) -> str:
        base_url = settings.QINIU_PUBLIC_BASE_URL.strip()
        if not base_url:
            raise ValueError("QINIU_PUBLIC_BASE_URL is empty")

        parsed = urlsplit(base_url)
        if not parsed.scheme:
            base_url = f"https://{base_url.lstrip('/')}"

        base_url = base_url.rstrip("/")
        return f"{base_url}/{quote(key, safe='/')}"

    @staticmethod
    def _build_storage_key(filename: str, key: Optional[str] = None) -> str:
        if key and key.strip():
            return key.strip()

        suffix = Path(filename).suffix
        temp_name = uuid.uuid4().hex
        prefix = settings.QINIU_KEY_PREFIX.strip("/")
        if prefix:
            return f"{prefix}/{temp_name}{suffix}"
        return f"{temp_name}{suffix}"

    def upload_local_file(
        self, local_file: Path, key: Optional[str] = None
    ) -> Dict[str, Any]:
        self._validate_settings()
        if not local_file.exists() or not local_file.is_file():
            raise ValueError(f"Local file not found: {local_file}")

        storage_key = self._build_storage_key(local_file.name, key)
        auth = Auth(settings.QINIU_ACCESS_KEY, settings.QINIU_SECRET_KEY)
        token = auth.upload_token(settings.QINIU_BUCKET_NAME)
        ret, info = put_file_v2(token, storage_key, str(local_file))

        if info.status_code != 200:
            raise ValueError(
                f"Qiniu upload failed: status={info.status_code} error={info.text_body}"
            )

        return {
            "key": ret.get("key", storage_key),
            "hash": ret.get("hash"),
            "url": self._build_public_url(ret.get("key", storage_key)),
        }

    def upload_file(
        self,
        filename: str,
        content: bytes,
        content_type: str,
        key: Optional[str] = None,
    ) -> Dict[str, Any]:
        del content_type
        if not content:
            raise ValueError("Upload content cannot be empty")

        suffix = Path(filename).suffix
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(content)
                temp_path = Path(temp_file.name)
            return self.upload_local_file(temp_path, key=key)
        finally:
            if temp_path and temp_path.exists():
                os.remove(temp_path)


qiniu_upload_service = QiniuUploadService()
# 兼容旧引用，后续可移除
tmper_upload_service = qiniu_upload_service
