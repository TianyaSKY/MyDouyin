import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { Chip, Eyebrow, GradientText, SceneBg, SlideIn } from "./shared";
import type { SceneProps } from "./shared";

export const Scene5: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneBg>
      <Audio
        src={staticFile("voiceover/scene-05.wav")}
        durationInFrames={durationInFrames}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 34,
        }}
      >
        <SlideIn name="Eyebrow" frame={frame} fps={fps} delay={0.1}>
          <Eyebrow>TECH STACK</Eyebrow>
        </SlideIn>
        <SlideIn
          name="Chips"
          frame={frame}
          fps={fps}
          delay={0.3}
          from="up"
          style={{ display: "flex", gap: 18 }}
        >
          <Chip style={{ fontSize: 28, padding: "14px 30px" }}>React</Chip>
          <Chip style={{ fontSize: 28, padding: "14px 30px" }}>
            Spring Boot
          </Chip>
          <Chip style={{ fontSize: 28, padding: "14px 30px" }}>PyTorch</Chip>
          <Chip style={{ fontSize: 28, padding: "14px 30px" }}>Milvus</Chip>
        </SlideIn>
        <SlideIn name="Thanks" frame={frame} fps={fps} delay={0.55}>
          <GradientText
            style={{
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: 10,
              marginTop: 20,
            }}
          >
            谢谢观看
          </GradientText>
        </SlideIn>
        <SlideIn name="Footer" frame={frame} fps={fps} delay={0.8}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 3,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            从召回、排序到分发的完整推荐链路
          </div>
        </SlideIn>
      </AbsoluteFill>
    </SceneBg>
  );
};
