import "./App.css";
import { AlienInputParams, AlienParameters } from "./typings";
import Alien from "./components/mg/alien";
import EnvironmentControls from "./components/mg/environment-input";
import UserInputArea from "./components/mg/user-input-area";
import { Button } from "./components/ui/button";
import GameTasksInterface from "./components/mg/card-task";
import { useAtom } from "jotai";
import {
  alienParamsAtom,
  backendEnabledAtom,
  environmentParamsAtom,
  envParamsChangedAtom,
  isProcessingMessageAtom,
} from "./store";
import { Switch } from "./components/ui/switch";
import { Label } from "./components/ui/label";

function App() {
  const [alienParams, setAlienParams] = useAtom(alienParamsAtom);
  const [environmentParams, setEnvironmentParams] = useAtom(
    environmentParamsAtom
  );
  const [, setEnvParamsChanged] = useAtom(envParamsChangedAtom);
  const [isProcessingMessage, setIsProcessingMessage] = useAtom(
    isProcessingMessageAtom
  );
  // Use the global atom for backend communication state
  const [isBackendEnabled, setIsBackendEnabled] = useAtom(backendEnabledAtom);

  // Backend URL
  // const backendUrl = "http://localhost:3001";
  const backendUrl = "http://server.unimelb.top:3001";

  const handleResetAlien = async () => {
    // Skip if backend communication is disabled
    if (!isBackendEnabled) return;

    setIsProcessingMessage(true);

    const response = await fetch(`${backendUrl}/api/alien`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "web",
        reset: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      updateAlienParameters(data);
    }

    setIsProcessingMessage(false);
  };

  const handleVocalization = async () => {
    // Skip if backend communication is disabled
    if (!isBackendEnabled) return;

    setIsProcessingMessage(true);
    const response = await fetch(`${backendUrl}/api/alien`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "web",
        sound: "vocalization",
        params: environmentParams,
        changed: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      updateAlienParameters(data);
    }

    setIsProcessingMessage(false);
  };

  // Update alien parameters function
  const updateAlienParameters = (responseData: {
    alien?: AlienParameters;
    isPending?: boolean;
  }) => {
    // Update alien parameters if included
    if (responseData.alien) {
      setAlienParams(responseData.alien);
    }

    // Update processing state based on server's response
    if (responseData.isPending !== undefined) {
      setIsProcessingMessage(responseData.isPending);
    }
  };

  // Update environment parameters function
  const handleEnvironmentChange = (newParams: AlienInputParams) => {
    setEnvironmentParams(newParams);
    setEnvParamsChanged(true);
  };

  // Handle AI response
  const handleResponse = (text: string, data: any) => {
    console.log("Response received:", text);

    // Update parameters (if included in response)
    if (data) {
      updateAlienParameters(data);
    }

    // Reset environment change flag
    setEnvParamsChanged(false);
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex justify-end gap-3 mb-4 items-center">
        {/* Add Switch component with label */}
        <div className="flex items-center space-x-2">
          <Switch
            id="backend-mode"
            checked={isBackendEnabled}
            onCheckedChange={setIsBackendEnabled}
          />
          <Label htmlFor="backend-mode">Enable Backend Communication</Label>
        </div>
        <Button
          onClick={handleVocalization}
          disabled={isProcessingMessage || !isBackendEnabled}
        >
          Vocalization
        </Button>
        <Button
          onClick={handleResetAlien}
          disabled={isProcessingMessage || !isBackendEnabled}
        >
          Reset Alien
        </Button>
        <EnvironmentControls
          inputParams={environmentParams}
          onInputChange={handleEnvironmentChange}
        />
      </div>
      <div className="mb-6">
        <GameTasksInterface
          alienParams={alienParams}
          inputParams={environmentParams}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <Alien parameters={alienParams} />
        {/* Environment controls and voice assistant - occupies 3/5 width */}
        {isBackendEnabled && (
          <UserInputArea backendUrl={backendUrl} onResponse={handleResponse} />
        )}
      </div>
    </div>
  );
}

export default App;
