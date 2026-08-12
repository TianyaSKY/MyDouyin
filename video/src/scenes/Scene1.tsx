import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { Eyebrow, GradientText, SceneBg, SlideIn } from "./shared";
import type { SceneProps } from "./shared";

export const Scene1: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneBg>
      <Audio
        src={staticFile("voiceover/scene-01.wav")}
        durationInFrames={durationInFrames}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <SlideIn name="Eyebrow" frame={frame} fps={fps} delay={0.1}>
          <Eyebrow>PROJECT INTRO</Eyebrow>
        </SlideIn>
        <SlideIn name="Title" frame={frame} fps={fps} delay={0.3}>
          <GradientText
            style={{
              fontSize: 150,
              fontWeight: 800,
              letterSpacing: 6,
            }}
          >
            SKYDouyin
          </GradientText>
        </SlideIn>
        <SlideIn name="Subtitle" frame={frame} fps={fps} delay={0.55}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: "rgba(255,255,255,0.88)",
              letterSpacing: 2,
            }}
          >
            面向短视频场景的全栈 MVP 项目
          </div>
        </SlideIn>
        <SlideIn name="Footer" frame={frame} fps={fps} delay={0.8}>
          <div
            style={{
              marginTop: 32,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 3,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            React · Spring Boot · PyTorch · Milvus
          </div>
        </SlideIn>
      </AbsoluteFill>
    </SceneBg>
  );
};
