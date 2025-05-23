import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import EnvironmentControls from "@/components/mg/environment-input";
import GameTasksInterface from "@/components/mg/card-task";
import UserInputArea from "@/components/mg/user-input-area";
import {
  alienParamsAtom,
  backendEnabledAtom,
  environmentParamsAtom,
  envParamsChangedAtom,
  isProcessingMessageAtom,
} from "@/store";
import { AlienInputParams, AlienParameters } from "@/typings";
import { Icon, Settings, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { faceAlien } from "@lucide/lab";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const [alienParams, setAlienParams] = useAtom(alienParamsAtom);
  const [environmentParams, setEnvironmentParams] = useAtom(
    environmentParamsAtom
  );
  const [, setEnvParamsChanged] = useAtom(envParamsChangedAtom);
  const [isProcessingMessage, setIsProcessingMessage] = useAtom(
    isProcessingMessageAtom
  );
  const [isBackendEnabled, setIsBackendEnabled] = useAtom(backendEnabledAtom);
  const [showSettingsButtons, setShowSettingsButtons] = useState(false);

  const backendUrl = "https://server.unimelb.top/alien";
  // const backendUrl = "http://localhost:3001";

  const handleResetAlien = async () => {
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

  const updateAlienParameters = (responseData: {
    alien?: AlienParameters;
    isPending?: boolean;
    input?: AlienInputParams;
  }) => {
    if (responseData.alien) {
      setAlienParams(responseData.alien);
    }

    if (responseData.isPending !== undefined) {
      setIsProcessingMessage(responseData.isPending);
    }
    if (responseData.input) {
      setEnvironmentParams(responseData.input);
    }
  };

  const handleEnvironmentChange = (newParams: AlienInputParams) => {
    setEnvironmentParams(newParams);
    setEnvParamsChanged(true);
  };

  const handleResponse = (text: string, data: any) => {
    console.log("Response received:", text);

    if (data) {
      updateAlienParameters(data);
    }

    setEnvParamsChanged(false);
  };

  return (
    <div className="bg-black p-4 h-screen max-h-screen grid grid-cols-12 gap-6">
      <GameTasksInterface
        alienParams={alienParams}
        inputParams={environmentParams}
      />
      <div className="flex flex-col col-span-4 h-full">
        <div className="flex justify-end gap-3 mb-4 items-center">
          <div
            className="relative flex items-center gap-3"
            onMouseEnter={() => setShowSettingsButtons(true)}
            onMouseLeave={() => setShowSettingsButtons(false)}
          >
            <div
              className={`flex items-center gap-3 transition-all duration-300 ease-in-out ${
                showSettingsButtons
                  ? "opacity-100 translate-x-0 pointer-events-auto"
                  : "opacity-0 translate-x-6 pointer-events-none"
              }`}
            >
              <Button
                onClick={handleVocalization}
                disabled={isProcessingMessage || !isBackendEnabled}
                className="whitespace-nowrap bg-purple-600 hover:bg-purple-500 border border-purple-400/50"
              >
                Vocalization
              </Button>
              <Button
                onClick={handleResetAlien}
                disabled={isProcessingMessage || !isBackendEnabled}
                className="whitespace-nowrap bg-orange-600 hover:bg-orange-500 border border-orange-400/50"
              >
                Reset
              </Button>

              <EnvironmentControls
                inputParams={environmentParams}
                onInputChange={handleEnvironmentChange}
              />
            </div>

            <Button
              size="icon"
              variant="default"
              className="rounded-full transition-all duration-300 ease-in-out hover:scale-110 
                  bg-red-600 hover:bg-red-500 text-white border border-red-400/50"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <Button
            size="icon"
            variant="default"
            className="rounded-full transition-all duration-200 hover:scale-110 
                bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50"
            title="Dashboard Panel"
            onClick={() => {
              navigate("/view");
            }}
          >
            <Icon iconNode={faceAlien} />
          </Button>

          <Button
            onClick={() => setIsBackendEnabled(!isBackendEnabled)}
            size="icon"
            variant={isBackendEnabled ? "default" : "outline"}
            className={`rounded-full transition-all duration-200 hover:scale-110 ${
              isBackendEnabled
                ? "bg-green-600 hover:bg-green-500 text-white border border-green-400/50"
                : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600"
            }`}
            title={
              isBackendEnabled
                ? "Connected - Click to Disconnect"
                : "Disconnected - Click to Connect"
            }
          >
            {isBackendEnabled ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="flex-1">
          {isBackendEnabled && (
            <UserInputArea
              backendUrl={backendUrl}
              onResponse={handleResponse}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
