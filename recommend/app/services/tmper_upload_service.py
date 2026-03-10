"""
Tmper 文件上传服务
"""
from typing import Any, Dict

import requests

from app.core.config import settings


class TmperUploadService:
    """封装对 tmper 文件上传接口的调用。"""

    def upload_file(
        self,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> Dict[str, Any]:
        files = {
            "file": (filename, content, content_type),
        }

        response = requests.post(
            settings.TMPER_UPLOAD_URL,
            files=files,
            timeout=120,
        )
        response.raise_for_status()
        return response.json()


tmper_upload_service = TmperUploadService()

