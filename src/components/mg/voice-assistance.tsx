import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";

// API response interface
interface ChatResponse {
  content: string;
  success: boolean;
  error?: string;
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
  backendUrl?: string; // Base URL for backend API
  onResponse?: (text: string, data?: any) => void; // Optional response callback
  systemPrompt?: string; // System prompt for the LLM
  alienParameters?: AlienParameters; // Current alien parameters
}

export function ShortAudioVoiceAssistant({
  backendUrl,
  onResponse,
  systemPrompt,
  alienParameters,
}: ShortAudioVoiceAssistantProps) {
  // State variables
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Audio recording related
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Start recording
  const startRecording = async (): Promise<void> => {
    // Reset states
    setIsRecording(true);
    setTranscript("");
    setResponse("");
    audioChunksRef.current = [];

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

            await processAudioFile(audioBlob);
            setIsProcessing(false);
            resolve();
          } catch (error) {
            console.error("Error processing audio:", error);
            setIsProcessing(false);
            setResponse("Error processing audio. Please try again.");
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

  // Process audio file with backend
  const processAudioFile = async (audioBlob: Blob): Promise<ChatResponse> => {
    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.mp3");

      // Include system prompt if provided
      if (systemPrompt) {
        formData.append("systemPrompt", systemPrompt);
      }

      // Include current alien parameters
      if (alienParameters) {
        formData.append("alienParameters", JSON.stringify(alienParameters));
      }

      // Send to backend API
      const response = await fetch(`${backendUrl}/api/process-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Request failed");
      }

      const data = (await response.json()) as ChatResponse;

      // Update transcript and response
      if (data.transcript) {
        setTranscript(data.transcript);
      }

      // Process the response to extract parameters if they exist
      let cleanedResponse = data.content || "";
      const paramRegex =
        /\[PARAMETERS_UPDATE\]([\s\S]*?)\[\/PARAMETERS_UPDATE\]/;
      const match = cleanedResponse.match(paramRegex);

      if (match) {
        try {
          // Extract and parse the parameters JSON
          const paramsJson = match[1].trim();
          const updatedParams = JSON.parse(paramsJson);

          // Remove the parameters section from the displayed response
          cleanedResponse = cleanedResponse.replace(paramRegex, "").trim();

          // Update the response with the cleaned version
          data.content = cleanedResponse;

          // Add the parsed parameters to the data object
          data.alienParameters = updatedParams;
        } catch (e) {
          console.error("Error parsing parameters:", e);
        }
      }

      // Set the cleaned response
      setResponse(cleanedResponse);

      // If callback provided, execute it with cleaned response and data
      if (onResponse) {
        onResponse(cleanedResponse, data);
      }

      return data;
    } catch (error) {
      console.error("Error processing audio:", error);
      setResponse(
        "Sorry, an error occurred while processing your request. Please try again."
      );
      throw error;
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
      <CardHeader>
        <CardTitle className="text-center text-green-400">
          Alien Communication Device
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transcription display area */}
        <div className="h-32 overflow-y-auto p-3 bg-black/50 rounded-md border border-green-500 text-green-400 font-mono">
          {transcript ? (
            <p>{transcript}</p>
          ) : (
            <p className="text-green-600">
              {isRecording
                ? "Recording human speech patterns..."
                : "Click the button below to begin communication..."}
            </p>
          )}
        </div>

        {/* Response display area */}
        <div className="h-32 overflow-y-auto p-3 bg-black/70 rounded-md border border-purple-500 text-purple-300 font-mono">
          {isProcessing ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-green-400" />
              <span className="ml-2 text-green-400">
                Processing alien translation...
              </span>
            </div>
          ) : response ? (
            <p>{response}</p>
          ) : (
            <p className="text-purple-600">
              Alien response will appear here...
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            variant="default"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            disabled={isProcessing}
          >
            <Mic size={16} />
            Begin Transmission
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="flex items-center gap-2"
            disabled={isProcessing}
          >
            <MicOff size={16} />
            End Transmission
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ShortAudioVoiceAssistant;
