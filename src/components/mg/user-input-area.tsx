import { useState, useEffect, useRef } from "react";
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
  content: string;
  success: boolean;
  error?: string;
  transcript?: string;
  alienParameters?: {
    happiness: number;
    energy: number;
    curiosity: number;
    trust: number;
    sociability: number;
    patience: number;
    confusion: number;
    intelligence: number;
  };
  outputParams?: {
    comeOut: boolean;
    shakeFrequency: number;
    shakeStep: number;
    rgbRed: number;
    rgbGreen: number;
    rgbBlue: number;
  };
  [key: string]: any;
}

// Alien parameters interface
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

// Props interface
interface ShortAudioVoiceAssistantProps {
  backendUrl: string; // Base URL for backend API
  onResponse?: (text: string, data?: any) => void; // Optional response callback
  systemPrompt: string; // System prompt from App.tsx
  alienParameters?: AlienParameters; // Current alien parameters
}

export function UserInputArea({
  backendUrl,
  onResponse,
  systemPrompt,
  alienParameters,
}: ShortAudioVoiceAssistantProps) {
  // State variables
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isVoiceInputEnabled, setIsVoiceInputEnabled] =
    useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Audio recording related
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Toggle voice input mode
  const toggleVoiceInput = () => {
    setIsVoiceInputEnabled(!isVoiceInputEnabled);
    // If turning off voice input while recording, stop recording
    if (isVoiceInputEnabled && isRecording) {
      stopRecording();
    }
    // Clear any error messages when toggling
    setErrorMessage("");
  };

  // Start recording
  const startRecording = async (): Promise<void> => {
    // Reset states
    setIsRecording(true);
    audioChunksRef.current = [];
    setErrorMessage(""); // Clear any error messages

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder instance
      // Using audio/mp3 mimetype if supported, otherwise fallback to audio/webm
      const mimeType = MediaRecorder.isTypeSupported("audio/mp3")
        ? "audio/mp3"
        : "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording
      mediaRecorder.start();
      console.log("Recording started with mime type:", mimeType);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsRecording(false);
      setErrorMessage(
        "Unable to access microphone. Please check permissions and try again."
      );
    }
  };

  // Stop recording and process audio
  const stopRecording = async (): Promise<void> => {
    if (!mediaRecorderRef.current) {
      return;
    }

    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        setIsRecording(false);
        setIsProcessing(true);

        // Set up onstop handler before stopping
        mediaRecorderRef.current.onstop = async () => {
          try {
            // Create audio blob from recorded chunks
            const audioBlob = new Blob(audioChunksRef.current, {
              type: MediaRecorder.isTypeSupported("audio/mp3")
                ? "audio/mp3"
                : "audio/webm",
            });

            // Process the audio to get transcript
            const transcription = await processAudioToText(audioBlob);
            // Set transcript to text input field instead of sending to model
            setTextInput(transcription);
            setIsProcessing(false);
            resolve();
          } catch (error) {
            console.error("Error processing audio:", error);
            setIsProcessing(false);
            setErrorMessage(
              "Failed to convert speech to text. Please try again or type your message."
            );
            resolve();
          }

          // Stop all tracks in the stream
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream
              .getTracks()
              .forEach((track) => track.stop());
          }
        };

        // Stop recording
        mediaRecorderRef.current.stop();
      } else {
        setIsProcessing(false);
        resolve();
      }
    });
  };

  // Convert audio to text only (doesn't send to model)
  const processAudioToText = async (audioBlob: Blob): Promise<string> => {
    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.mp3");

      // Include system prompt
      formData.append("systemPrompt", systemPrompt);

      // Include current alien parameters
      if (alienParameters) {
        formData.append("alienParameters", JSON.stringify(alienParameters));
      }

      // Send to backend API
      const response = await fetch(`${backendUrl}/process-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Request failed");
      }

      const data = (await response.json()) as ChatResponse;

      // Return the transcript
      if (data.transcript) {
        return data.transcript;
      } else {
        throw new Error("No transcript returned");
      }
    } catch (error) {
      console.error("Error processing audio to text:", error);
      throw error;
    }
  };

  // Handle sending message to the model
  const handleSendMessage = async () => {
    if (!textInput.trim()) return;

    setIsProcessing(true);
    setResponse("");
    setErrorMessage(""); // Clear any previous errors

    try {
      // Process the text input
      await processTextInput(textInput);
      // Clear text input after successful processing
      setTextInput("");
    } catch (error) {
      console.error("Error processing text:", error);
      setErrorMessage("Error processing your message. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Process text input
  const processTextInput = async (text: string): Promise<ChatResponse> => {
    try {
      // Prepare request data
      const requestData = {
        text,
        systemPrompt: systemPrompt,
        alienParameters: alienParameters || null,
      };

      // Send to backend API
      const response = await fetch(`${backendUrl}/process-text`, {
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

      // Set the response
      setResponse(data.content);

      // If callback provided, execute it
      if (onResponse) {
        onResponse(data.content, data);
      }

      return data;
    } catch (error) {
      console.error("Error processing text:", error);
      setResponse("");
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

  // Cleanup function
  useEffect(() => {
    return () => {
      // Stop recording if component unmounts while recording
      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
        mediaRecorderRef.current = null;
      }
    };
  }, [isRecording]);

  return (
    <Card className="w-full border border-purple-300 bg-gradient-to-br from-indigo-900 to-purple-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-center text-green-400">
          Alien Communication Device
        </CardTitle>

        {/* Improved voice toggle button with better hover styles */}
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
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Text input area */}
        <div className="space-y-2 relative">
          <Textarea
            placeholder="Type your message to the alien..."
            className="h-32 bg-black/50 border-green-500 text-green-400 font-mono focus:border-green-400 focus:ring-green-400"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing || isRecording}
          />

          {/* Voice controls - only shown when voice input is enabled */}
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
              Alien response will appear here...
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSendMessage}
          className="bg-green-600 hover:bg-green-500 text-white border border-green-400"
          disabled={isProcessing || isRecording || !textInput.trim()}
        >
          <Send size={16} className="mr-2" />
          Send Message
        </Button>
      </CardFooter>
    </Card>
  );
}

export default UserInputArea;
