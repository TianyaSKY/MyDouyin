import React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { Chip, Eyebrow, SceneBg, SlideIn } from "./shared";
import type { SceneProps } from "./shared";

export const Scene3: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneBg>
      <Audio
        src={staticFile("voiceover/scene-03.wav")}
        durationInFrames={durationInFrames}
      />
      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 70,
          padding: "0 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: 730,
          }}
        >
          <SlideIn name="Eyebrow" frame={frame} fps={fps} delay={0.1}>
            <Eyebrow>极速发布</Eyebrow>
          </SlideIn>
          <SlideIn name="Title" frame={frame} fps={fps} delay={0.25}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: 1,
              }}
            >
              大文件极速发布
            </div>
          </SlideIn>
          <SlideIn name="Subtitle" frame={frame} fps={fps} delay={0.4}>
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              分片上传 · 断点续传，
              <br />
              发布后向量自动入库 Milvus。
            </div>
          </SlideIn>
          <SlideIn
            name="Chips"
            frame={frame}
            fps={fps}
            delay={0.6}
            from="up"
            style={{ display: "flex", gap: 16, marginTop: 12 }}
          >
            <Chip>分片上传</Chip>
            <Chip>断点续传</Chip>
            <Chip>Milvus 入库</Chip>
          </SlideIn>
        </div>
        <SlideIn
          name="Screenshot"
          frame={frame}
          fps={fps}
          delay={0.35}
          from="right"
        >
          <CanvasImage
            src={staticFile("assets/screenshot_upload.png")}
            style={{
              width: 900,
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
            }}
          />
        </SlideIn>
      </AbsoluteFill>
    </SceneBg>
  );
};
