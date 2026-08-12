import React from "react";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { TRANSITION_DURATION } from "./calculate-metadata";
import type { IntroVideoProps } from "./calculate-metadata";

const timing = linearTiming({ durationInFrames: TRANSITION_DURATION });
const transition = (
  <TransitionSeries.Transition presentation={fade()} timing={timing} />
);

export const IntroVideo: React.FC<IntroVideoProps> = ({ sceneDurations }) => {
  const [d1, d2, d3, d4, d5] = sceneDurations;

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={d1} name="Scene1">
        <Scene1 durationInFrames={d1} />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={d2} name="Scene2">
        <Scene2 durationInFrames={d2} />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={d3} name="Scene3">
        <Scene3 durationInFrames={d3} />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={d4} name="Scene4">
        <Scene4 durationInFrames={d4} />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={d5} name="Scene5">
        <Scene5 durationInFrames={d5} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
