import { AlienInputParams } from "@/typings";
import React from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
    if (distance < 30) return "Very close - intimate zone";
    if (distance < 100) return "Personal space";
    return "Distant observation";
  };

  const getForceDescription = (force: number) => {
    if (force === 0) return "No contact";
    if (force < 30) return "Gentle touch";
    if (force < 70) return "Moderate pressure";
    return "Firm contact";
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
      <DialogTrigger>
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
                  step={1}
                  value={[inputParams.force]}
                  onValueChange={(values) =>
                    handleParamChange("force", values[0])
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {getForceDescription(inputParams.force)}
                </p>
              </div>
              {/* Movement Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="moving">Movement Detected</Label>
                  <p className="text-xs text-muted-foreground">
                    {inputParams.moving
                      ? "Movement detected"
                      : "Still environment"}
                  </p>
                </div>
                <Switch
                  id="moving"
                  checked={inputParams.moving}
                  onCheckedChange={(checked) =>
                    handleParamChange("moving", checked)
                  }
                />
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
                  min={-10}
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
