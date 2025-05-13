import { AlienOutputParams, AlienParameters } from "@/typings";
import React, { useEffect, useRef } from "react";

// Props for the enhanced alien component
interface EnhancedAlienProps {
  parameters: AlienParameters;
  outputParams: AlienOutputParams;
}

// Helper function to determine color based on parameter value
const getParamColor = (value: number) => {
  if (value > 75) return "bg-green-500";
  if (value > 50) return "bg-blue-500";
  if (value > 25) return "bg-yellow-500";
  return "bg-red-500";
};

// Helper function to determine alien mood emoji
const getMoodEmoji = (happiness: number) => {
  if (happiness > 75) return "😁";
  if (happiness > 50) return "🙂";
  if (happiness > 25) return "😐";
  return "☹️";
};

// Helper to get RGB color string
const getRgbString = (r: number, g: number, b: number) => {
  return `rgb(${r}, ${g}, ${b})`;
};

// Define a type for the valid parameter names
type ParameterName =
  | "happiness"
  | "energy"
  | "curiosity"
  | "trust"
  | "sociability"
  | "patience"
  | "confusion"
  | "intelligence";

// Helper to get description for each parameter
const getParameterDescription = (name: ParameterName, value: number) => {
  const descriptions: Record<ParameterName, string[]> = {
    happiness: [
      "Extremely unhappy with current situation",
      "Somewhat displeased",
      "Generally content",
      "Extremely joyful and satisfied",
    ],
    energy: [
      "Almost lethargic, minimal movement",
      "Conserving energy, moves slowly",
      "Active and alert",
      "Highly energetic and animated",
    ],
    curiosity: [
      "Disinterested in surroundings",
      "Mildly interested in new things",
      "Actively exploring and questioning",
      "Extremely fascinated by everything",
    ],
    trust: [
      "Extremely suspicious of humans",
      "Cautious about intentions",
      "Generally trusting",
      "Completely trusts humans",
    ],
    sociability: [
      "Prefers isolation from humans",
      "Tolerates brief interactions",
      "Enjoys company and conversation",
      "Seeks out extended social contact",
    ],
    patience: [
      "Very impatient, easily frustrated",
      "Limited patience for delays",
      "Generally patient",
      "Extremely patient, rarely hurried",
    ],
    confusion: [
      "Understands human customs well",
      "Some confusion about human behavior",
      "Frequently baffled by humans",
      "Completely bewildered by Earth culture",
    ],
    intelligence: [
      "Basic analytical abilities",
      "Above average problem solving",
      "Highly intelligent",
      "Super-intelligent, far beyond humans",
    ],
  };

  const index = Math.min(Math.floor(value / 25), 3);
  return descriptions[name][index];
};

const Alien: React.FC<EnhancedAlienProps> = ({ parameters, outputParams }) => {
  const alienRef = useRef<HTMLDivElement>(null);

  // Animation effect for shaking based on output parameters
  useEffect(() => {
    const alienElement = alienRef.current;
    if (!alienElement) return;

    // Only animate if the alien is shaking
    if (outputParams.shakeFrequency > 0) {
      let startTime: number;
      let animationFrameId: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;

        // Calculate shake based on frequency and step
        const angle =
          Math.sin(
            elapsed * 0.001 * outputParams.shakeFrequency * Math.PI * 2
          ) * outputParams.shakeStep;

        alienElement.style.transform = `rotate(${angle}deg)`;

        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrameId);
        alienElement.style.transform = "rotate(0deg)";
      };
    }
  }, [outputParams.shakeFrequency, outputParams.shakeStep]);

  // Function to render a parameter bar
  const renderParameterBar = (name: ParameterName, value: number) => {
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const barColor = getParamColor(value);
    const description = getParameterDescription(name, value);

    return (
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">{formattedName}</span>
          <span className="text-sm font-medium">{value}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div
            className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
            style={{ width: `${value}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      </div>
    );
  };

  // Render the alien visualization
  const renderAlienVisualization = () => {
    const rgbColor = getRgbString(
      outputParams.rgbRed,
      outputParams.rgbGreen,
      outputParams.rgbBlue
    );

    return (
      <div
        ref={alienRef}
        className="transition-all duration-300"
        style={{
          transform: "rotate(0deg)",
          transformOrigin: "center bottom",
        }}
      >
        {/* Base/Shell */}
        <div className="w-24 h-24 mx-auto rounded-full bg-gray-700 flex items-center justify-center">
          {/* Alien (only visible if comeOut is true) */}
          {outputParams.comeOut ? (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: rgbColor }}
            >
              <div className="text-3xl">
                {getMoodEmoji(parameters.happiness)}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">dormant</div>
          )}
        </div>

        {/* "Antenna" or sensor */}
        <div className="w-2 h-8 mx-auto bg-gray-500"></div>
      </div>
    );
  };

  // Render output parameters display
  const renderOutputParams = () => {
    return (
      <div className="mt-4 border-t border-green-800">
        <h3 className="text-sm font-bold mb-2">Physical Response</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Status: {outputParams.comeOut ? "Emerged" : "Hidden"}</div>
          <div>Vibration: {outputParams.shakeFrequency.toFixed(1)} Hz</div>
          <div>Amplitude: {outputParams.shakeStep}°</div>
          <div>
            Color:
            <span
              className="inline-block w-4 h-4 ml-1 rounded-full"
              style={{
                backgroundColor: getRgbString(
                  outputParams.rgbRed,
                  outputParams.rgbGreen,
                  outputParams.rgbBlue
                ),
              }}
            ></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-black text-green-400 rounded-lg border border-green-500 font-mono">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Alien Parameters</h2>
      </div>

      {renderAlienVisualization()}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(parameters).map(([name, value]) =>
          renderParameterBar(name as ParameterName, value)
        )}
      </div>

      {renderOutputParams()}

      <div className="mt-4 pt-2 border-t border-green-800 text-xs">
        <div>
          Status: {parameters.happiness > 50 ? "Cooperative" : "Cautious"}
        </div>
        <div>Last Updated: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default Alien;
