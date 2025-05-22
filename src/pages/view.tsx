import Alien from "@/components/mg/alien";
import { Button } from "@/components/ui/button";
import { alienParamsAtom, backendEnabledAtom } from "@/store";
import { ChatResponse } from "@/typings";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Wifi, WifiOff, BotMessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POLLING_INTERVAL = 1000; // 1 second

const View = () => {
  const navigate = useNavigate();
  const awaitingResponseRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  // const backendUrl = "http://localhost:3001";
  const backendUrl = "https://server.unimelb.top/alien";
  const [isBackendEnabled, setIsBackendEnabled] = useAtom(backendEnabledAtom);

  const [alienParams, setAlienParams] = useAtom(alienParamsAtom);
  const lastSequenceRef = useRef<number>(0);
  const pollingIntervalRef = useRef<number | null>(null);

  const recognitionRef = useRef<any>(null);

  const pollAlienState = async () => {
    try {
      // If already waiting for a response, skip
      if (awaitingResponseRef.current) {
        return;
      }

      awaitingResponseRef.current = true;

      const response = await fetch(`${backendUrl}/api/alien`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "web",
          changed: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Polling request failed");
      }

      const data = (await response.json()) as ChatResponse;

      const isNewData =
        data.sequence && data.sequence > lastSequenceRef.current;

      // Only update UI when there's new data
      if (isNewData) {
        console.log("Found new data, updating UI");

        if (data.sequence) {
          lastSequenceRef.current = data.sequence;
        }

        // Update parameters (if included in response)
        if (data.alien) {
          setAlienParams(data.alien);
        }
      } else {
        console.log("No new data, skipping UI update");
      }

      // Always update processing state based on server's pending status
    } catch (error) {
      console.error("Polling error:", error);
    } finally {
      awaitingResponseRef.current = false;
    }
  };

  // Start the polling mechanism
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      return; // Already polling
    }

    // Set up polling interval
    pollingIntervalRef.current = window.setInterval(() => {
      pollAlienState();
    }, POLLING_INTERVAL);

    // Initial poll immediately
    pollAlienState();
  };

  // Stop the polling mechanism
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Cleanup function for resources
  const cleanupResources = () => {
    // Stop any active streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop browser speech recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping speech recognition:", err);
      }
      recognitionRef.current = null;
    }
  };

  // Navigate to settings/control page
  const handleNavigateToSettings = () => {
    navigate("/");
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupResources();
      stopPolling();
    };
  }, []);

  // Polling initialization - only start if backend is enabled
  useEffect(() => {
    if (isBackendEnabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isBackendEnabled]);

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          onClick={handleNavigateToSettings}
          size="icon"
          variant="default"
          className="rounded-full transition-all duration-200 hover:scale-110 bg-blue-500 hover:bg-blue-600 text-white"
          title="Communication Panel"
        >
          <BotMessageSquare className="h-5 w-5" />
        </Button>

        {/* WiFi Toggle Button */}
        <Button
          onClick={() => setIsBackendEnabled(!isBackendEnabled)}
          size="icon"
          variant={isBackendEnabled ? "default" : "outline"}
          className={`rounded-full transition-all duration-200 hover:scale-110 ${
            isBackendEnabled
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-white hover:bg-gray-100 text-gray-600 border-gray-300"
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

      {/* Main content */}
      <div className="w-full h-full">
        <Alien parameters={alienParams} />
      </div>
    </div>
  );
};

export default View;
