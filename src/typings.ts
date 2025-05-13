interface AlienInputParams {
  distance: number; // Distance in cm
  force: number; // Touch force (relative value)
  moving: boolean; // Whether there's movement detected
  temperature: number; // Ambient temperature in °C
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
}

// Output behavior parameters
interface AlienOutputParams {
  comeOut: boolean; // Whether alien emerges from shell
  shakeFrequency: number; // Vibration frequency in Hz
  shakeStep: number; // Movement amplitude in degrees
  rgbRed: number; // Red component (0-255)
  rgbGreen: number; // Green component (0-255)
  rgbBlue: number; // Blue component (0-255)
}

// Combined parameters for the complete alien state
interface CompleteAlienState {
  personality: AlienParameters;
  input: AlienInputParams;
  output: AlienOutputParams;
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
  },
  input: {
    distance: 100,
    force: 0,
    moving: false,
    temperature: 22.5,
  },
  output: {
    comeOut: false,
    shakeFrequency: 0.5,
    shakeStep: 5,
    rgbRed: 100,
    rgbGreen: 100,
    rgbBlue: 200,
  },
};

export type {
  AlienParameters,
  AlienInputParams,
  AlienOutputParams,
  CompleteAlienState,
  defaultAlienState,
};
