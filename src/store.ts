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

export const currentPuffStateAtom = atom<boolean>(false);
// 纯派生原子：根据参数直接计算状态
export const puffStateAtom = atom<boolean>((get) => {
  const alienParams = get(alienParamsAtom);
  const envParams = get(environmentParamsAtom);

  // 计算愤怒分数
  const angerScore =
    0.7 * alienParams.anger + 0.3 * (100 - alienParams.patience);

  // 简单逻辑：愤怒分数低且外力小时为true（放气），否则为false（充气）
  return angerScore <= 40 && envParams.force < 70;
});

export interface TailBehavior {
  swingDelay: number;
  swingStep: number;
}

// 派生原子：计算尾巴行为
export const tailBehaviorAtom = atom<TailBehavior>((get) => {
  const alienParams = get(alienParamsAtom);
  const envParams = get(environmentParamsAtom);

  // 计算延迟因子 (基于能量、信任、困惑)
  const delayFactor =
    (1.0 - alienParams.energy / 100.0) * 0.5 +
    (1.0 - alienParams.trust / 100.0) * 0.3 +
    (alienParams.confusion / 100.0) * 0.2;

  const swingDelay = 2 * delayFactor;

  // 计算情绪因子 (基于快乐、好奇、社交)
  const emotionalFactor =
    (alienParams.happiness / 100.0) * 0.5 +
    (alienParams.curiosity / 100.0) * 0.3 +
    (alienParams.sociability / 100.0) * 0.2;

  // 计算力量因子
  const forceFactor = 1.0 / (1.0 + envParams.force / 50);

  // 计算摆动步长
  const newSwingStep = Math.floor(90 * emotionalFactor * forceFactor);
  const swingStep = newSwingStep >= 10 ? newSwingStep : 10;

  return {
    swingDelay,
    swingStep,
  };
});
