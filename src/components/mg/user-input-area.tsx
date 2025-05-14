import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Mic, MicOff, Loader2, Send, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// API response interface
interface ChatResponse {
  text: string;
  success?: boolean;
  error?: string;
  transcript?: string;
  alien?: {
    happiness: number;
    energy: number;
    curiosity: number;
    trust: number;
    sociability: number;
    patience: number;
    confusion: number;
    intelligence: number;
  };
  output?: {
    comeOut: boolean;
    shakeFrequency: number;
    shakeStep: number;
    rgbRed: number;
    rgbGreen: number;
    rgbBlue: number;
  };
  [key: string]: any;
}

// Environment parameters interface
interface AlienInputParams {
  distance: number;
  force: number;
  moving: boolean;
  temperature: number;
}

// Props interface
interface ShortAudioVoiceAssistantProps {
  backendUrl: string; // Base URL for backend API
  onResponse?: (text: string, data?: any) => void; // Optional response callback
  environmentParams: AlienInputParams; // Current environment parameters
  envParamsChanged: boolean; // Whether environment parameters have changed
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

export function UserInputArea({
  backendUrl,
  onResponse,
  environmentParams,
  envParamsChanged,
}: ShortAudioVoiceAssistantProps) {
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceInputEnabled, setIsVoiceInputEnabled] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    setIsProcessing(true);

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

        setIsProcessing(false);
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
      setIsProcessing(false);
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
      // 重置录音状态
      setIsRecording(false);
      streamingActiveRef.current = false;
      setIsProcessing(true);

      // 给Deepgram一小段时间发送最终结果
      setTimeout(() => {
        // 清理资源，不手动添加临时文本
        cleanupResources();
        setIsProcessing(false);
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

  // Handle sending message to model - using new unified endpoint
  const handleSendMessage = async () => {
    // Prevent multiple concurrent sends
    if (isProcessing) return;

    // Allow sending empty input to get current state
    // Only need validation if there is non-empty input
    if (textInput.trim() !== "") {
      setIsProcessing(true);
      setResponse("");
      setErrorMessage(""); // Clear any previous errors
    }

    try {
      // Process text input (can be empty)
      const result = await processAlienInteraction(textInput);

      // Only clear text input box if there was actual input content
      if (textInput.trim() !== "") {
        setTextInput("");
      }

      // Display message if response includes one
      if (result && result.text && result.text !== "") {
        setResponse(result.text);
      }
    } catch (error) {
      console.error("Error processing text:", error);
      setErrorMessage("Error processing your message. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Use new unified alien API endpoint with debounce
  const processAlienInteraction = async (
    text: string
  ): Promise<ChatResponse> => {
    try {
      // Prepare request data (only optional parameters)
      const requestData: any = {};
      const hasText = text && text.trim() !== "";

      requestData.params = environmentParams;

      if (hasText) {
        requestData.text = text;
        requestData.changed = true;
      }

      if (envParamsChanged || hasText) {
        requestData.changed = true;
      }

      // Send to unified backend API endpoint
      const response = await fetch(`${backendUrl}/api/alien`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Request failed");
      }

      const data = (await response.json()) as ChatResponse;

      // Execute callback if provided
      if (onResponse && data) {
        onResponse(data.text || "", data);
      }

      return data;
    } catch (error) {
      console.error("Error interacting with alien:", error);
      throw error;
    }
  };

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full border border-purple-300 bg-gradient-to-br from-indigo-900 to-purple-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-center text-green-400">
          Alien Communication Device
        </CardTitle>

        <div className="flex items-center gap-2">
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
        </div>
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
            disabled={isProcessing || isRecording}
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
                  disabled={isProcessing}
                >
                  <Mic size={16} className="mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-500 text-white border border-red-400"
                  disabled={isProcessing}
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

        {/* Recording/processing indicator */}
        {(isRecording || isProcessing) && (
          <div className="flex items-center justify-center h-8 bg-black/30 rounded-md border border-green-500">
            <Loader2 className="h-4 w-4 animate-spin text-green-400 mr-2" />
            <span className="text-green-400 text-sm">
              {isRecording ? "Recording..." : "Processing..."}
            </span>
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
          disabled={isProcessing || isRecording}
        >
          <Send size={16} className="mr-2" />
          Send Message
        </Button>
      </CardFooter>
    </Card>
  );
}

export default UserInputArea;
