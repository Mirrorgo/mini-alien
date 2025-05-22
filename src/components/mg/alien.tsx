import { currentEmotionAtom } from "@/store";
import { AlienParameters } from "@/typings";
import { useAtom } from "jotai";
import { FC, useRef } from "react";
import "./Alien.css"; // Import CSS file

// Props for the enhanced alien component
interface EnhancedAlienProps {
  parameters: AlienParameters;
}

// Helper function to determine color based on parameter value
const getParamColor = (value: number) => {
  if (value > 75) return "bg-green-500";
  if (value > 50) return "bg-blue-500";
  if (value > 25) return "bg-yellow-500";
  return "bg-red-500";
};

// Helper to get the text color for parameters
const getParamTextColor = (value: number) => {
  if (value > 75) return "text-green-500";
  if (value > 50) return "text-blue-500";
  if (value > 25) return "text-yellow-500";
  return "text-red-500";
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
  | "intelligence"
  | "anger";

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
    anger: [
      "Calm and composed",
      "Slightly irritated",
      "Visibly annoyed and agitated",
      "Extremely angry and hostile",
    ],
  };

  const index = Math.min(Math.floor(value / 25), 3);
  return descriptions[name][index];
};

const Alien: FC<EnhancedAlienProps> = ({ parameters }) => {
  const alienRef = useRef<HTMLDivElement>(null);
  const [currentEmotion] = useAtom(currentEmotionAtom);

  // Function to render a parameter bar with circuit connection
  const renderParameterBar = (name: ParameterName, value: number) => {
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const barColor = getParamColor(value);
    const textColor = getParamTextColor(value);
    const description = getParameterDescription(name, value);

    return (
      <div className="mb-2 relative" key={name}>
        {/* Parameter Details */}
        <div className="flex justify-between items-center mb-1 pl-6 pr-2">
          <span className={`text-xs font-medium ${textColor} truncate`}>
            {formattedName}
          </span>
          <span className={`text-xs font-medium ${textColor} flex-shrink-0`}>
            {value}/100
          </span>
        </div>
        <div className="pl-6 pr-2">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`${barColor} h-2 rounded-full transition-all duration-500 relative`}
              style={{ width: `${value}%` }}
            >
              <div className={`pulse-dot ${barColor}`}></div>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1 pl-6 pr-2 leading-tight">
          {description}
        </div>
      </div>
    );
  };

  // Render the alien visualization
  const renderAlienVisualization = () => {
    const emoji = currentEmotion.emoji;

    return (
      <div
        ref={alienRef}
        className="transition-all duration-300 flex flex-col items-center justify-center relative h-full"
      >
        {/* Circuit board background */}
        <div className="circuit-board"></div>

        {/* Base/Shell */}
        <div className="w-32 h-32 rounded-full bg-gray-900 flex items-center justify-center relative z-10 border-2 shadow-lg">
          <div className="w-28 h-28 rounded-full flex items-center justify-center alien-core transition-all duration-500 bg-black">
            <div className="text-4xl">{emoji}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full p-4 bg-black text-green-400 rounded-lg border border-green-500 font-mono relative overflow-hidden flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold border-b border-green-800 pb-2">
          Feelien
        </h2>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Alien Visualization */}
        <div className="w-1/3 flex items-center justify-center pr-2 relative flex-shrink-0">
          {renderAlienVisualization()}
        </div>

        {/* Right: Parameter Bars */}
        <div className="w-2/3 pl-2 flex flex-col justify-center overflow-y-auto overflow-x-hidden min-w-0">
          <div className="space-y-1">
            {Object.entries(parameters).map(([name, value]) =>
              renderParameterBar(name as ParameterName, value)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alien;
