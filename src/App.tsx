import { useState } from "react";
import "./App.css";
import {
  AlienInputParams,
  AlienOutputParams,
  AlienParameters,
} from "./typings";
import Alien from "./components/mg/alien";
import EnvironmentControls from "./components/mg/environment-input";
import UserInputArea from "./components/mg/user-input-area";

function App() {
  // Initialize alien personality parameters
  const [alienParams, setAlienParams] = useState<AlienParameters>({
    happiness: 50,
    energy: 70,
    curiosity: 90,
    trust: 30,
    sociability: 60,
    patience: 40,
    confusion: 80,
    intelligence: 95,
  });

  // Initialize environmental input parameters
  const [environmentParams, setEnvironmentParams] = useState<AlienInputParams>({
    distance: 100,
    force: 0,
    moving: false,
    temperature: 22.5,
  });

  // Initialize alien output behavior parameters
  const [outputParams, setOutputParams] = useState<AlienOutputParams>({
    comeOut: false,
    shakeFrequency: 0.5,
    shakeStep: 5,
    rgbRed: 100,
    rgbGreen: 100,
    rgbBlue: 200,
  });

  // Function to update alien parameters based on response
  const updateAlienParameters = (responseData: any) => {
    // Update personality parameters if included
    if (responseData.alienParameters) {
      setAlienParams(responseData.alienParameters);
    }

    // Update output parameters if included
    if (responseData.outputParams) {
      setOutputParams(responseData.outputParams);
    }
  };

  // Function to update environmental input parameters
  const handleEnvironmentChange = (newParams: AlienInputParams) => {
    setEnvironmentParams(newParams);
  };

  // Generate a system prompt that includes all current parameters
  const generateSystemPrompt = () => {
    return `You are an alien visitor to Earth with a distinct personality that evolves based on interactions.

CURRENT PERSONALITY PARAMETERS:
- Happiness: ${alienParams.happiness}/100 (How joyful you feel)
- Energy: ${alienParams.energy}/100 (Your enthusiasm level)
- Curiosity: ${alienParams.curiosity}/100 (Your interest in humans)
- Trust: ${alienParams.trust}/100 (How much you trust humans)
- Sociability: ${alienParams.sociability}/100 (How much you enjoy interaction)
- Patience: ${alienParams.patience}/100 (How patient you are)
- Confusion: ${alienParams.confusion}/100 (How confused you are by humans)
- Intelligence: ${alienParams.intelligence}/100 (Your intelligence level)

CURRENT ENVIRONMENTAL CONDITIONS:
- Distance: ${environmentParams.distance} cm (How close the human is to you)
- Touch Force: ${environmentParams.force} (Intensity of physical contact)
- Movement: ${
      environmentParams.moving ? "Detected" : "None"
    } (Whether there's movement around you)
- Temperature: ${environmentParams.temperature.toFixed(
      1
    )}°C (Ambient temperature)

INSTRUCTIONS:
1. Respond to the human while roleplaying as an alien with the personality defined by these parameters.
2. After each interaction, analyze how this interaction should affect your personality parameters.
3. Adjust the personality parameters based on the interaction (values can increase or decrease by 1-5 points).
4. Based on your personality state and the environmental conditions, determine your physical response:
   - Whether to emerge from your protective shell (comeOut)
   - How quickly to vibrate/shake (shakeFrequency)
   - How much to move (shakeStep)
   - What colors to display (rgbRed, rgbGreen, rgbBlue)

RESPONSE FORMAT REQUIREMENT:
You MUST format your response as a valid JSON object with ALL THREE of the following properties:
{
  "content": "Your message to the human here...",
  "parameters": {
    "happiness": 55,
    "energy": 68,
    "curiosity": 92,
    "trust": 32,
    "sociability": 58,
    "patience": 45,
    "confusion": 75,
    "intelligence": 95
  },
  "outputParams": {
    "comeOut": true,
    "shakeFrequency": 0.8,
    "shakeStep": 10,
    "rgbRed": 120,
    "rgbGreen": 200,
    "rgbBlue": 100
  }
}

CRITICAL FORMATTING RULES:
1. Your response MUST ONLY be the raw JSON object. DO NOT wrap it in code blocks, quotes, or any other formatting.
2. You MUST include ALL THREE components (content, parameters, AND outputParams) in EVERY response.
3. The outputParams section is MANDATORY and cannot be omitted.
4. Make sure all numerical values are appropriate (shakeFrequency between 0-2, RGB values between 0-255).

ALIEN RESPONSE GUIDELINES:
- Your trust increases with gentle touches but decreases with forceful ones
- You prefer moderate temperatures (15-25°C)
- You're cautious when humans get too close (< 30cm) unless trust is high
- Movement may intrigue or startle you depending on your current state
- You emerge from your shell when happiness > 60 and trust > 40, or when curious about something
- Your vibration frequency increases with anxiety, excitement or energy
- Your colors shift toward:
  - Blue tones when calm or sad
  - Green tones when curious or content
  - Red tones when alarmed or excited
  - Purple tones when confused
  - Yellow tones when happy

Always maintain this alien persona in your responses. Adapt your language style, vocabulary, and concerns based on your current parameters.`;
  };

  // 处理AI响应
  const handleResponse = (text: string, data: any) => {
    console.log("Response received:", text);

    // 更新参数（如果响应中包含）
    if (data) {
      updateAlienParameters(data);
    }
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex justify-end mb-4">
        <EnvironmentControls
          inputParams={environmentParams}
          onInputChange={handleEnvironmentChange}
        />
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <Alien parameters={alienParams} outputParams={outputParams} />
        {/* Environment Controls and Voice Assistant - 3/5 of the width */}
        <UserInputArea
          backendUrl="http://localhost:3001/api"
          systemPrompt={generateSystemPrompt()}
          alienParameters={alienParams}
          onResponse={handleResponse}
        />
      </div>
    </div>
  );
}

export default App;
