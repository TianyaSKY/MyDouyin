import React from "react";
import { Composition, Folder } from "remotion";
import { IntroVideo } from "./IntroVideo";
import { calculateMetadata, FPS } from "./calculate-metadata";
import type { IntroVideoProps } from "./calculate-metadata";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

const DEFAULT_SCENE_DURATION = 240;
const DEFAULT_PROPS: IntroVideoProps = {
  sceneDurations: Array(5).fill(DEFAULT_SCENE_DURATION),
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        durationInFrames={30 * 40}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calculateMetadata}
      />
      <Folder name="IntroVideo-Scenes">
        <Composition
          id="Scene1"
          component={Scene1}
          durationInFrames={DEFAULT_SCENE_DURATION}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ durationInFrames: DEFAULT_SCENE_DURATION }}
        />
        <Composition
          id="Scene2"
          component={Scene2}
          durationInFrames={DEFAULT_SCENE_DURATION}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ durationInFrames: DEFAULT_SCENE_DURATION }}
        />
        <Composition
          id="Scene3"
          component={Scene3}
          durationInFrames={DEFAULT_SCENE_DURATION}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ durationInFrames: DEFAULT_SCENE_DURATION }}
        />
        <Composition
          id="Scene4"
          component={Scene4}
          durationInFrames={DEFAULT_SCENE_DURATION}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ durationInFrames: DEFAULT_SCENE_DURATION }}
        />
        <Composition
          id="Scene5"
          component={Scene5}
          durationInFrames={DEFAULT_SCENE_DURATION}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ durationInFrames: DEFAULT_SCENE_DURATION }}
        />
      </Folder>
    </>
  );
};
