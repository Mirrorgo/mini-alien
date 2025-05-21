interface AlienInputParams {
  distance: number; // Distance in cm
  force: number; // Touch force (relative value)
  motion: number;
  temperature: number; // Ambient temperature in °C
  areaTouched: "eyes" | "mouth" | "forehead" | "face" | "";
}

// Core personality parameters (existing)
interface AlienParameters {
  happiness: number;
  energy: number;
  curiosity: number;
  trust: number;
  sociability: number;
  patience: number;
  confusion: number;
  intelligence: number;
  anger: number;
}

// Combined parameters for the complete alien state
interface CompleteAlienState {
  personality: AlienParameters;
  input: AlienInputParams;
}

// Default values for initialization
const defaultAlienState: CompleteAlienState = {
  personality: {
    happiness: 50,
    energy: 70,
    curiosity: 90,
    trust: 30,
    sociability: 60,
    patience: 40,
    confusion: 80,
    intelligence: 95,
    anger: 10,
  },
  input: {
    distance: 100,
    force: 0,
    motion: 0,
    temperature: 22.5,
    areaTouched: "",
  },
};

export type {
  AlienParameters,
  AlienInputParams,
  CompleteAlienState,
  defaultAlienState,
};
