import React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate } from "remotion";

export const FONT_STACK =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export const GRADIENT =
  "linear-gradient(90deg, #fe2c55 0%, #ff7a59 45%, #25f4ee 100%)";

function interpolateClamped(
  frame: number,
  range: [number, number],
  output: [number, number],
): number;
function interpolateClamped(
  frame: number,
  range: [number, number],
  output: [string, string],
): string;
function interpolateClamped(
  frame: number,
  range: [number, number],
  output: [number, number] | [string, string],
): number | string {
  return interpolate(frame, range, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  }) as number | string;
}

export type SceneProps = {
  durationInFrames: number;
};

type SceneBgProps = {
  children?: React.ReactNode;
};

export const SceneBg: React.FC<SceneBgProps> = ({ children }) => {
  return (
    <AbsoluteFill
      name="Background"
      style={{
        backgroundColor: "#0a0a0f",
        fontFamily: FONT_STACK,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(254,44,85,0.20), transparent 62%)",
          top: -320,
          right: -220,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,244,238,0.14), transparent 62%)",
          bottom: -360,
          left: -240,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

type EyebrowProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const Eyebrow: React.FC<EyebrowProps> = ({ children, style }) => {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 22px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        backgroundColor: "rgba(255,255,255,0.05)",
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: 8,
        color: "rgba(255,255,255,0.72)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

type ChipProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const Chip: React.FC<ChipProps> = ({ children, style }) => {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 24px",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.16)",
        fontSize: 24,
        fontWeight: 600,
        color: "#fff",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

type GradientTextProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  style,
}) => {
  return (
    <span
      style={{
        backgroundImage: GRADIENT,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

type SlideInProps = {
  children: React.ReactNode;
  name: string;
  frame: number;
  fps: number;
  /** frames after scene start before the element starts animating */
  delay?: number;
  /** direction of entry */
  from?: "left" | "right" | "up";
  style?: React.CSSProperties;
};

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  name,
  frame,
  fps,
  delay = 0,
  from = "up",
  style,
}) => {
  const start = delay * fps;
  const distance = from === "up" ? 60 : from === "left" ? -120 : 120;
  const opacity = interpolateClamped(frame, [start, start + fps], [0, 1]);
  const offset = interpolateClamped(
    frame,
    [start, start + fps],
    [`${distance}px`, "0px"],
  );
  const translate = from === "up" ? `0px ${offset}` : `${offset} 0px`;

  return (
    <Interactive.Div
      name={name}
      style={{
        opacity,
        translate,
        ...style,
      }}
    >
      {children}
    </Interactive.Div>
  );
};
