import { AlienInputParams } from "@/typings";
import React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Bot } from "lucide-react";
import { Button } from "../ui/button";

interface EnvironmentControlsProps {
  inputParams: AlienInputParams;
  onInputChange: (newParams: AlienInputParams) => void;
}

const EnvironmentControls: React.FC<EnvironmentControlsProps> = ({
  inputParams,
  onInputChange,
}) => {
  // Handle individual parameter changes
  const handleParamChange = (
    paramName: keyof AlienInputParams,
    value: number | boolean
  ) => {
    onInputChange({
      ...inputParams,
      [paramName]: value,
    });
  };

  // Helper function to get description text based on parameter values
  const getDistanceDescription = (distance: number) => {
    if (distance < 10) return "Extremely close";
    if (distance < 30) return "Very close - intimate zone";
    if (distance < 100) return "Personal space";
    return "Distant observation";
  };

  const getForceDescription = (force: number) => {
    if (force === 0) return "No contact";
    if (force === 50) return "Medium touch";
    if (force === 100) return "Strong contact";

    // For slider values that aren't exactly 0, 50, or 100
    if (force < 25) return "Light touch";
    if (force < 75) return "Medium touch";
    return "Strong contact";
  };

  const getMotionDescription = (motion: number) => {
    if (motion === 0) return "No movement";
    if (motion < 30) return "Gentle movement";
    if (motion < 50) return "Moderate movement";
    return "Intense movement";
  };

  const getTemperatureDescription = (temp: number) => {
    if (temp < 5) return "Freezing";
    if (temp < 15) return "Cold";
    if (temp < 25) return "Comfortable";
    if (temp < 35) return "Warm";
    return "Hot";
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Bot />
          Alien Environment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Environmental Controls</DialogTitle>
          <DialogDescription>
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="distance">Distance</Label>
                  <span className="text-sm text-muted-foreground">
                    {inputParams.distance} cm
                  </span>
                </div>
                <Slider
                  id="distance"
                  min={0}
                  max={300}
                  step={1}
                  value={[inputParams.distance]}
                  onValueChange={(values) =>
                    handleParamChange("distance", values[0])
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {getDistanceDescription(inputParams.distance)}
                </p>
              </div>
              {/* Force/Touch Intensity */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="force">Touch Force</Label>
                  <span className="text-sm text-muted-foreground">
                    {inputParams.force}
                  </span>
                </div>
                <Slider
                  id="force"
                  min={0}
                  max={100}
                  step={50}
                  value={[inputParams.force]}
                  onValueChange={(values) =>
                    handleParamChange("force", values[0])
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {getForceDescription(inputParams.force)}
                </p>
              </div>
              {/* Motion Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="motion">Motion</Label>
                  <span className="text-sm text-muted-foreground">
                    {inputParams.motion}
                  </span>
                </div>
                <Slider
                  id="motion"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputParams.motion]}
                  onValueChange={(values) =>
                    handleParamChange("motion", values[0])
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {getMotionDescription(inputParams.motion)}
                </p>
              </div>
              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">Temperature</Label>
                  <span className="text-sm text-muted-foreground">
                    {inputParams.temperature.toFixed(1)}°C
                  </span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={40}
                  step={0.5}
                  value={[inputParams.temperature]}
                  onValueChange={(values) =>
                    handleParamChange("temperature", values[0])
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {getTemperatureDescription(inputParams.temperature)}
                </p>
              </div>
              <div>
                These settings simulate the physical environment around the
                alien
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default EnvironmentControls;
