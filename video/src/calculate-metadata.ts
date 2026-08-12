import { staticFile } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { getAudioDuration } from "./get-audio-duration";

export const FPS = 30;
export const SCENE_COUNT = 5;
/** frames of fade transition between scenes */
export const TRANSITION_DURATION = 15;
/** quiet tail after each voiceover, >= TRANSITION_DURATION so speech never overlaps */
export const SCENE_PADDING_FRAMES = 18;

export type IntroVideoProps = {
  sceneDurations: number[];
};

export const calculateMetadata: CalculateMetadataFunction<IntroVideoProps> =
  async ({ props }) => {
    const sceneDurations = await Promise.all(
      Array.from(
        { length: SCENE_COUNT },
        (_, i) =>
          getAudioDuration(staticFile(`voiceover/scene-0${i + 1}.wav`)),
      ),
    );

    const durations = sceneDurations.map(
      (seconds) => Math.ceil(seconds * FPS) + SCENE_PADDING_FRAMES,
    );

    const totalDuration =
      durations.reduce((sum, d) => sum + d, 0) -
      (SCENE_COUNT - 1) * TRANSITION_DURATION;

    return {
      durationInFrames: totalDuration,
      props: { ...props, sceneDurations: durations },
      defaultOutName: "intro",
    };
  };
