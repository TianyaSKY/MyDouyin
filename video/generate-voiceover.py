"""Generate scene voiceover WAVs via MIMO API TTS.

Idempotent: re-running regenerates all 5 WAVs. Requires MIMO_API_KEY.
Usage: MIMO_API_KEY=<key> .venv/bin/python generate-voiceover.py
"""

import base64
import os
import pathlib
import sys

from openai import OpenAI

VOICE = "Chloe"  # MIMO voice name; swap if Chinese delivery is off
FORMAT = "wav"
TONE_PROMPT = "清晰、自然的解说语调，语速适中，语调自信、有感染力。"

SCENES = [
    {
        "id": "scene-01",
        "text": "大家好，欢迎来到 Douyin —— 面向短视频场景的全栈 MVP 项目。",
    },
    {
        "id": "scene-02",
        "text": "沉浸式 Feed 流，热门召回与向量召回融合，推荐你感兴趣的视频。",
    },
    {
        "id": "scene-03",
        "text": "大文件分片上传、断点续传，发布后自动生成向量入库 Milvus。",
    },
    {
        "id": "scene-04",
        "text": "新用户选择兴趣标签，初始化兴趣向量，解决推荐冷启动。",
    },
    {
        "id": "scene-05",
        "text": "React、Spring Boot、PyTorch 与 Milvus 构建完整推荐链路，谢谢观看。",
    },
]


def main() -> None:
    if not os.environ.get("MIMO_API_KEY"):
        print("缺少环境变量 MIMO_API_KEY")
        sys.exit(1)

    client = OpenAI(
        api_key=os.environ["MIMO_API_KEY"],
        base_url="https://api.xiaomimimo.com/v1",
    )
    out_dir = pathlib.Path("public/voiceover")
    out_dir.mkdir(parents=True, exist_ok=True)

    for scene in SCENES:
        try:
            completion = client.chat.completions.create(
                model="mimo-v2.5-tts",
                messages=[
                    {"role": "user", "content": TONE_PROMPT},
                    {"role": "assistant", "content": scene["text"]},
                ],
                audio={"format": FORMAT, "voice": VOICE},
            )
            audio = base64.b64decode(completion.choices[0].message.audio.data)
        except Exception as exc:  # network / auth / schema errors
            print(f"生成 {scene['id']} 失败: {exc!r}")
            sys.exit(1)
        (out_dir / f"{scene['id']}.wav").write_bytes(audio)
        print("已生成", scene["id"])


if __name__ == "__main__":
    main()
