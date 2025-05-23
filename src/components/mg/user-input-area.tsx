import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Mic, MicOff, Send, AlertCircle, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
// Import Jotai for state management
import { atom, useAtom } from "jotai";
import { environmentParamsAtom, envParamsChangedAtom } from "@/store";
import { ChatResponse } from "@/typings";

// Create a Jotai atom for the communication counter
export const communicationCountAtom = atom(0);

// API response interface

// Props interface
interface UserInputAreaProps {
  backendUrl: string; // Base URL for backend API
  onResponse?: (text: string, data?: any) => void; // Optional response callback
}

// Connection info interface for Deepgram
interface DeepgramConnectionInfo {
  url: string;
  protocol: string[];
  options: {
    encoding: string;
    sample_rate: number;
    language: string;
    model: string;
    smart_format: boolean;
    punctuate: boolean;
    interim_results: boolean;
    [key: string]: any;
  };
}

// Declare WebSpeechAPI interfaces for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// KeepAlive timer interval (ms)
const KEEP_ALIVE_INTERVAL = 10000; // 10 seconds
// Polling interval (ms)
const POLLING_INTERVAL = 1000; // 1 second

export function UserInputArea({ backendUrl, onResponse }: UserInputAreaProps) {
  const [envParamsChanged] = useAtom(envParamsChangedAtom);
  const [environmentParams] = useAtom(environmentParamsAtom);

  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceInputEnabled, setIsVoiceInputEnabled] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [audioState, setAudioState] = useState({ path: null, id: 0 });
  const audioRef = useRef(new Audio());
  const lastPlayedAudioIdRef = useRef(0);
  const [errorMessage, setErrorMessage] = useState("");

  // Jotai communication counter state
  const [, setCommunicationCount] = useAtom(communicationCountAtom);

  // State for polling mechanism
  const lastSequenceRef = useRef<number>(0);
  const isFirstLoadRef = useRef<boolean>(true);

  const pollingIntervalRef = useRef<number | null>(null);
  const awaitingResponseRef = useRef<boolean>(false);

  const websocketRef = useRef<WebSocket | null>(null);
  const streamingActiveRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Current displayed text (combines current text input and interim transcript)
  const displayedText =
    textInput + (interimTranscript ? interimTranscript : "");

  // Polling initialization
  useEffect(() => {
    // Start polling when component mounts
    startPolling();

    // Stop polling when component unmounts
    return () => {
      stopPolling();
    };
  }, []);

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

        // If there's text, update response text
        if (data.text) {
          setResponse(data.text);
        }

        if (data.audio && data.audio.path && data.audio.id > audioState.id) {
          // Update audio state
          setAudioState({
            path: data.audio.path,
            id: data.audio.id,
          });

          // If this is a new audio ID and greater than the last played ID
          // AND it's not the first load, then play audio
          if (
            data.audio.id > lastPlayedAudioIdRef.current &&
            !isFirstLoadRef.current
          ) {
            // Play new audio
            playAudio(data.audio.path);
            // Update last played ID
            lastPlayedAudioIdRef.current = data.audio.id;
          } else if (isFirstLoadRef.current) {
            // On first load, just update the last played ID without playing
            lastPlayedAudioIdRef.current = data.audio.id;
          }
        }

        // Execute parameter update callback
        if (onResponse) {
          onResponse(data.text || "", data);
        }

        // Mark that first load is complete
        isFirstLoadRef.current = false;
      } else {
        console.log("No new data, skipping UI update");
      }
    } catch (error) {
      console.error("Polling error:", error);
      errorMessage ||
        setErrorMessage("Connection error: Unable to update alien state");
    } finally {
      awaitingResponseRef.current = false;
    }
  };

  const playAudio = (path: string) => {
    // If audio is currently playing, stop it first
    if (!audioRef.current.paused) {
      audioRef.current.pause();
    }

    // Set new audio source and play
    audioRef.current.src = backendUrl + path;
    audioRef.current.play().catch((err) => {
      console.error("Audio playback failed:", err);
    });
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

    // Close audio context and disconnect nodes
    if (processorRef.current && sourceRef.current && audioContextRef.current) {
      try {
        processorRef.current.disconnect();
        sourceRef.current.disconnect();
        if (analyserRef.current) analyserRef.current.disconnect();
        audioContextRef.current.close();
      } catch (err) {
        console.error("Error closing audio context:", err);
      }
    }

    // Clear references
    processorRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;

    // Clear keep-alive interval
    if (keepAliveIntervalRef.current) {
      window.clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    // Close WebSocket connection
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        // Try to gracefully close by sending a close message
        try {
          websocketRef.current.send(JSON.stringify({ type: "CloseStream" }));

          // Wait briefly to allow the server to process the close message
          setTimeout(() => {
            if (
              websocketRef.current &&
              websocketRef.current.readyState === WebSocket.OPEN
            ) {
              websocketRef.current.close();
            }
            websocketRef.current = null;
          }, 300);
        } catch (err) {
          console.error("Error sending close message:", err);

          // Fallback to direct close
          if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
          }
        }
      } else {
        websocketRef.current = null;
      }
    }

    // Reset recording state
    streamingActiveRef.current = false;
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupResources();
      stopPolling();
    };
  }, []);

  // Reset interim transcript when starting recording
  useEffect(() => {
    if (isRecording) {
      setInterimTranscript("");
    }
  }, [isRecording]);

  const handleDeepgramResult = (message: MessageEvent) => {
    try {
      const result = JSON.parse(message.data);

      // For debugging
      console.log("Deepgram result:", result);

      // Check if contains channel data
      if (
        result.channel &&
        result.channel.alternatives &&
        result.channel.alternatives.length > 0
      ) {
        const transcript = result.channel.alternatives[0].transcript;

        // Only process if there's transcript content
        if (transcript && transcript.trim() !== "") {
          if (result.is_final) {
            // For final results, append to text input directly
            setTextInput((prev) => prev + transcript);
            setInterimTranscript("");
          } else {
            // For interim results, only update the interim transcript state
            setInterimTranscript(transcript);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing Deepgram result:", error);
    }
  };

  // Send a keep-alive message to Deepgram to prevent timeout
  const sendKeepAlive = () => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      try {
        websocketRef.current.send(JSON.stringify({ type: "KeepAlive" }));
        console.log("Sent keep-alive message");
      } catch (error) {
        console.error("Error sending keep-alive message:", error);
      }
    }
  };

  // Start Deepgram recording
  const startDeepgramRecording = async () => {
    // Guard against multiple concurrent startDeepgramRecording calls
    if (isRecording || streamingActiveRef.current) {
      console.log("Already recording, ignoring startDeepgramRecording call");
      return;
    }

    setIsRecording(true);
    streamingActiveRef.current = true;
    setErrorMessage("");

    try {
      // Get connection info from backend
      const response = await fetch(`${backendUrl}/api/get-deepgram-url`);

      if (!response.ok) {
        throw new Error("Failed to get Deepgram connection info");
      }

      const connectionInfo: DeepgramConnectionInfo = await response.json();
      console.log("Deepgram connection info:", connectionInfo);

      // Get microphone access with desired constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Create WebSocket connection to Deepgram
      // Use the protocol array for authentication
      websocketRef.current = new WebSocket(
        connectionInfo.url,
        connectionInfo.protocol
      );

      websocketRef.current.onopen = () => {
        console.log("Deepgram WebSocket connection established");

        // Set up keep-alive interval
        keepAliveIntervalRef.current = window.setInterval(
          sendKeepAlive,
          KEEP_ALIVE_INTERVAL
        );

        // Now we can start processing audio
        setupAudioProcessing(stream);
      };

      websocketRef.current.onmessage = handleDeepgramResult;

      websocketRef.current.onerror = (error) => {
        console.error("Deepgram WebSocket error:", error);
        setErrorMessage(
          "Speech recognition service connection error, please try again later"
        );
        stopRecording();
      };

      websocketRef.current.onclose = (event) => {
        console.log(
          `Deepgram WebSocket closed: code=${event.code}, reason=${event.reason}`
        );
        streamingActiveRef.current = false;

        // If this wasn't triggered by stopRecording, update UI state
        if (isRecording) {
          setIsRecording(false);
        }

        // Clear keep-alive interval
        if (keepAliveIntervalRef.current) {
          window.clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }

        // Show error message for unexpected closes
        if (event.code !== 1000) {
          setErrorMessage(
            `Connection closed: ${event.reason || "Unknown reason"}`
          );
        }
      };
    } catch (error: any) {
      console.error("Failed to start Deepgram speech recognition:", error);
      setIsRecording(false);
      streamingActiveRef.current = false;
      setErrorMessage(
        `Unable to access microphone or connect to speech recognition service: ${error.message}`
      );
    }
  };

  // Set up audio processing for streaming to Deepgram
  const setupAudioProcessing = (stream: MediaStream) => {
    try {
      // Create audio context with correct sample rate
      const audioContext = new AudioContext({
        sampleRate: 16000, // Deepgram works best with 16kHz audio
      });
      audioContextRef.current = audioContext;

      // Create source node from the stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create analyzer node for monitoring audio levels
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 1024;

      // Create script processor for handling audio data
      // Use an optimal buffer size for speech (128-4096)
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      // Connect the audio processing chain
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      // Set up audio processing event
      processor.onaudioprocess = (e) => {
        if (!streamingActiveRef.current || !websocketRef.current) return;

        // Get raw PCM audio data from the buffer
        const inputData = e.inputBuffer.getChannelData(0);

        // Check if this is silence
        if (isAudioBufferSilent(inputData)) {
          // Skip sending silent frames to reduce bandwidth
          return;
        }

        // Convert to 16-bit PCM - Deepgram expects 16kHz 16-bit mono PCM
        const pcmData = convertFloat32ToInt16(inputData);

        // Send to Deepgram API if connection is open
        if (
          websocketRef.current &&
          websocketRef.current.readyState === WebSocket.OPEN
        ) {
          try {
            websocketRef.current.send(pcmData.buffer);
          } catch (err) {
            console.error("Error sending audio data:", err);
          }
        }
      };
    } catch (error: any) {
      console.error("Error setting up audio processing:", error);
      setErrorMessage("Error setting up audio processing: " + error.message);

      // Try to clean up on error
      stopRecording();
    }
  };

  // Unified entry point for starting recording
  const startRecording = async () => {
    if (isRecording) return; // Prevent multiple start calls
    await startDeepgramRecording();
  };

  // Stop Deepgram streaming recording
  const stopDeepgramRecording = async (): Promise<void> => {
    return new Promise<void>((resolve) => {
      // Reset recording state
      setIsRecording(false);
      streamingActiveRef.current = false;

      // Give Deepgram a little time to send final results
      setTimeout(() => {
        // Clean up resources, don't manually add temporary text
        cleanupResources();
        resolve();
      }, 300);
    });
  };

  // Unified entry point for stopping recording
  const stopRecording = async (): Promise<void> => {
    if (!isRecording) return; // Prevent stop when not recording
    await stopDeepgramRecording();
  };

  // Check if audio buffer is silent (to avoid sending empty data)
  function isAudioBufferSilent(buffer: Float32Array): boolean {
    // Calculate RMS (root mean square) of the buffer
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);

    // Consider silent if RMS is below threshold
    return rms < 0.01;
  }

  // Float32Array to Int16Array conversion (Deepgram requires 16-bit PCM)
  function convertFloat32ToInt16(buffer: Float32Array) {
    const length = buffer.length;
    const result = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      // Convert -1.0 ~ 1.0 float to -32768 ~ 32767 integer
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return result;
  }

  // Toggle voice input mode
  const toggleVoiceInput = () => {
    // If currently enabled, disable and stop recording if active
    if (isVoiceInputEnabled) {
      if (isRecording) {
        stopRecording();
      }
      setIsVoiceInputEnabled(false);
    } else {
      // Enable voice input
      setIsVoiceInputEnabled(true);
    }

    // Clear any error messages when toggling
    setErrorMessage("");
  };

  // Handle sending message to model using polling approach
  const handleSendMessage = async () => {
    // Don't allow empty messages
    if (!textInput.trim()) {
      return;
    }

    // Clear errors
    setErrorMessage("");

    try {
      // Send the message with changed flag
      const response = await fetch(`${backendUrl}/api/alien`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "web",
          sound: "language",
          text: textInput,
          params: environmentParams,
          changed: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = (await response.json()) as ChatResponse;

      // Update sequence number if available
      if (data.sequence) {
        lastSequenceRef.current = data.sequence;
      }

      // Clear text input after successful send
      setTextInput("");

      // Increment communication counter
      setCommunicationCount((prev) => prev + 1);

      // Next poll will get the new state automatically
    } catch (error: any) {
      console.error("Error sending message:", error);
      setErrorMessage(`Failed to send message: ${error.message}`);
    }
  };

  // Handle sending environment changes
  useEffect(() => {
    // Only send if there are actual changes and not during initial render
    if (envParamsChanged) {
      (async () => {
        try {
          // Make environment update API call
          const response = await fetch(`${backendUrl}/api/alien`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: "web",
              params: environmentParams,
              changed: true,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to update environment parameters");
          }

          const data = (await response.json()) as ChatResponse;

          // Update sequence number if available
          if (data.sequence) {
            lastSequenceRef.current = data.sequence;
          }

          // Increment communication counter for environment changes
        } catch (error: any) {
          console.error("Error updating environment:", error);
          setErrorMessage(`Failed to update environment: ${error.message}`);
        }
      })();
    }
  }, [environmentParams, envParamsChanged]);

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Force a poll refresh
  const handleForceRefresh = () => {
    pollAlienState();
  };

  return (
    <Card className="col-span-4 border border-purple-300 bg-gradient-to-br from-indigo-900 to-purple-900">
      <CardHeader className="flex justify-between items-center pb-2">
        {/* Voice input toggle button */}
        {isVoiceInputEnabled ? (
          <Button
            onClick={toggleVoiceInput}
            className="bg-green-600 hover:bg-green-500 text-white border border-green-400"
          >
            <Mic size={16} className="mr-2" />
            Voice Input Enabled
          </Button>
        ) : (
          <Button
            onClick={toggleVoiceInput}
            className="bg-gray-800 hover:bg-green-800 text-green-400 hover:text-green-300 border border-green-500"
          >
            <Mic size={16} className="mr-2" />
            Enable Voice Input
          </Button>
        )}

        {/* Refresh button */}
        <Button
          onClick={handleForceRefresh}
          className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400"
          title="Force refresh status"
        >
          <RefreshCw size={16} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Text input area */}
        <div className="space-y-2 relative">
          <Textarea
            placeholder="Enter your message to the alien..."
            className="h-32 bg-black/50 border-green-500 text-green-400 font-mono focus:border-green-400 focus:ring-green-400"
            value={displayedText}
            onChange={(e) => !isRecording && setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRecording}
          />

          {/* Show interim transcript styling */}
          {isRecording && interimTranscript && (
            <div className="absolute bottom-2 right-2">
              <span className="text-xs text-gray-400">Listening...</span>
            </div>
          )}

          {/* Voice controls - only show when voice input is enabled */}
          {isVoiceInputEnabled && (
            <div className="mt-2 flex justify-center">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="bg-green-600 hover:bg-green-500 text-white border border-green-400"
                >
                  <Mic size={16} className="mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-500 text-white border border-red-400"
                >
                  <MicOff size={16} className="mr-2" />
                  Stop Recording
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error message display */}
        {errorMessage && (
          <div className="flex items-center p-2 bg-red-900/50 border border-red-500 rounded-md">
            <AlertCircle size={16} className="text-red-400 mr-2" />
            <span className="text-red-300 text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Recording indicator - only show when actually recording */}
        {isRecording && (
          <div className="flex items-center justify-center h-8 bg-black/30 rounded-md border border-green-500">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-green-400 text-sm">Recording...</span>
          </div>
        )}

        {/* Response display area */}
        <div className="h-32 overflow-y-auto p-3 bg-black/70 rounded-md border border-purple-500 text-purple-300 font-mono">
          {response ? (
            <p>{response}</p>
          ) : (
            <p className="text-purple-600">
              Alien responses will appear here...
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSendMessage}
          className="bg-green-600 hover:bg-green-500 text-white border border-green-400"
          disabled={isRecording || !textInput.trim()}
        >
          <Send size={16} className="mr-2" />
          Send Message
        </Button>
      </CardFooter>
    </Card>
  );
}

export default UserInputArea;
