import { useState } from "react";
import "./App.css";
import ShortAudioVoiceAssistant from "./components/mg/voice-assistance";
import Alien from "./components/mg/alien";

// Alien personality parameter interface
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

function App() {
  // Initialize alien parameters with default values
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

  // Function to update alien parameters based on response
  const updateAlienParameters = (responseData: any) => {
    if (responseData.alienParameters) {
      setAlienParams(responseData.alienParameters);
    }
  };

  // Generate a system prompt that includes the current alien parameters
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

INSTRUCTIONS:
1. Respond to the human while roleplaying as an alien with the personality defined by these parameters.
2. After each interaction, analyze how this interaction should affect your personality parameters.
3. Adjust the parameters based on the interaction (values can increase or decrease by 1-5 points).
4. Return the updated parameters in your response in a JSON format at the end, wrapped in [PARAMETERS_UPDATE] tags.

Example parameter update format:
[PARAMETERS_UPDATE]
{
  "happiness": 55,
  "energy": 68,
  "curiosity": 92,
  "trust": 32,
  "sociability": 58,
  "patience": 45,
  "confusion": 75,
  "intelligence": 95
}
[/PARAMETERS_UPDATE]

Always maintain this alien persona in your responses. Adapt your language style, vocabulary, and concerns based on your current parameters.`;
  };

  return (
    <div className="mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Alien Communication Interface
      </h1>
      <div className="flex gap-4">
        {/* Alien Parameters Display */}
        <Alien parameters={alienParams} />

        <ShortAudioVoiceAssistant
          backendUrl="http://localhost:3001"
          systemPrompt={generateSystemPrompt()}
          alienParameters={alienParams}
          onResponse={(text, data) => {
            console.log("Response received:", text);
            // Update parameters if included in response
            if (data) {
              updateAlienParameters(data);
            }
          }}
        />
      </div>
    </div>
  );
}

export default App;
