// src/store.ts
import { atom } from "jotai";
import { AlienParameters, AlienInputParams } from "./typings";

// 表情情绪类型定义
export type EmotionType =
  | "happy"
  | "sad"
  | "curious"
  | "sleepy"
  | "confused"
  | "mad"
  | "scared";

export interface EmotionInfo {
  name: EmotionType;
  score: number;
  emoji: string;
}

// Alien parameters atom
export const alienParamsAtom = atom<AlienParameters>({
  happiness: 50,
  energy: 70,
  curiosity: 90,
  trust: 30,
  sociability: 60,
  patience: 40,
  confusion: 80,
  intelligence: 95,
  anger: 10,
});

// Environment parameters atom
export const environmentParamsAtom = atom<AlienInputParams>({
  distance: 100,
  force: 0,
  motion: 0,
  temperature: 22.5,
  areaTouched: "",
});

export const backendEnabledAtom = atom(false);

// Flag to track if environment parameters have changed
export const envParamsChangedAtom = atom<boolean>(false);

// Flag to track if a message is being processed
export const isProcessingMessageAtom = atom<boolean>(false);

// 派生原子：根据alienParams计算当前情绪
export const currentEmotionAtom = atom<EmotionInfo>((get) => {
  const alienParams = get(alienParamsAtom);

  let happyScore =
    0.5 * alienParams.happiness +
    0.3 * alienParams.trust +
    0.2 * alienParams.energy;
  let sadScore =
    0.5 * (100 - alienParams.happiness) +
    0.3 * (100 - alienParams.trust) +
    0.2 * (100 - alienParams.energy);
  let curiousScore =
    0.5 * alienParams.curiosity +
    0.3 * alienParams.intelligence +
    0.2 * alienParams.energy;
  let sleepyScore =
    0.7 * (100 - alienParams.energy) + 0.3 * alienParams.patience;
  let confusedScore =
    0.6 * alienParams.confusion + 0.4 * (100 - alienParams.intelligence);
  let madScore =
    0.3 * (100 - alienParams.patience) +
    0.5 * alienParams.anger +
    0.2 * (100 - alienParams.trust);
  let scaredScore =
    0.3 * (100 - alienParams.trust) +
    0.5 * (100 - alienParams.sociability) +
    0.1 * (100 - alienParams.energy) +
    0.1 * (100 - alienParams.happiness);

  // Create an array of scores with their corresponding emotions
  const emotions: EmotionInfo[] = [
    { name: "happy", score: happyScore, emoji: "😊" },
    { name: "sad", score: sadScore, emoji: "😢" },
    { name: "curious", score: curiousScore, emoji: "🧐" },
    { name: "sleepy", score: sleepyScore, emoji: "😴" },
    { name: "confused", score: confusedScore, emoji: "🤔" },
    { name: "mad", score: madScore, emoji: "😠" },
    { name: "scared", score: scaredScore, emoji: "😱" },
  ];

  // Sort emotions by score in descending order
  emotions.sort((a, b) => b.score - a.score);

  // Return the emotion with the highest score
  return emotions[0];
});
