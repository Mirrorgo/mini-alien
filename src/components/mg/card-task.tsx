// TaskCard.tsx
import { AlienInputParams, AlienParameters } from "@/typings";
import { useAtom } from "jotai";
import { useState, useEffect } from "react";
import { communicationCountAtom } from "./user-input-area";
import { currentEmotionAtom } from "@/store";

// Task type definition
export interface Task {
  id: number;
  completed: boolean;
  points: number;
  icon: string; // Icon identifier
  hints?: string[]; // Array of hints - up to 2
}

interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: number) => void;
  alienParams: AlienParameters;
  inputParams: AlienInputParams;
}

export const TaskCard = ({
  task,
  onComplete,
  alienParams,
  inputParams,
}: TaskCardProps) => {
  const [hintLevel, setHintLevel] = useState<number>(0); // 0: no hint, 1: first hint, 2: second hint
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [animateCompletion, setAnimateCompletion] = useState<boolean>(false);

  const [communicationCount] = useAtom(communicationCountAtom);

  const [currentEmotion] = useAtom(currentEmotionAtom);
  const emoji = currentEmotion.name;

  // Monitor parameters for automatic task completion
  useEffect(() => {
    console.log("Current emoji:", emoji);
    if (task.id === 1 && emoji === "happy") {
      handleTaskComplete();
    }
    if (task.id === 2 && emoji === "mad") {
      handleTaskComplete();
    }
    if (task.id === 3 && emoji === "confused") {
      handleTaskComplete();
    }
    if (task.id === 4 && emoji === "sleepy") {
      handleTaskComplete();
    }
    if (task.id === 5 && emoji === "scared") {
      handleTaskComplete();
    }
    // 0-500
    if (task.id === 6 && inputParams.distance < 30) {
      handleTaskComplete();
    }
    if (task.id === 7 && inputParams.motion > 0) {
      handleTaskComplete();
    }
    if (task.id === 8 && communicationCount >= 5) {
      handleTaskComplete();
    }
    if (task.id === 9 && inputParams.temperature > 30) {
      handleTaskComplete();
    }
  }, [alienParams, inputParams, task.id, emoji]);

  // Handle manual or automatic task completion with animation
  const handleTaskComplete = () => {
    if (task.completed) return;

    setAnimateCompletion(true);
    // Delay the actual completion to allow for animation
    setTimeout(() => {
      onComplete?.(task.id);
      setAnimateCompletion(false);
    }, 600);
  };

  const handleClick = () => {
    if (task.completed) return;

    // Add a subtle "click" feedback effect
    const element = document.getElementById(`task-${task.id}`);
    if (element) {
      element.classList.add("scale-95");
      setTimeout(() => element.classList.remove("scale-95"), 150);
    }

    // Toggle hint level (0 -> 1 -> 2 -> 1 -> 2...)
    if (!isRevealed) {
      setIsRevealed(true);
      setHintLevel(1);
    } else if (hintLevel < 2 && task.hints && task.hints.length > hintLevel) {
      setHintLevel(hintLevel + 1);
    }
  };

  if (task.completed || animateCompletion) {
    // Completed task display with enhanced visuals
    return (
      <div
        id={`task-${task.id}`}
        className={`flex border rounded-lg shadow-sm transition-all duration-500 
          ${animateCompletion ? "bg-white scale-105" : "bg-green-50"} 
          border-green-200 hover:bg-green-100 hover:shadow overflow-hidden group`}
      >
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div
              className={`w-7 h-7 flex items-center justify-center rounded-full 
              ${
                animateCompletion ? "animate-ping bg-green-300" : "bg-green-200"
              } 
              text-green-700 text-sm transition-all duration-300`}
            >
              {task.icon}
            </div>
            <span className="text-xs font-semibold text-green-600 group-hover:scale-110 transition-transform duration-200">
              +{task.points} pts
            </span>
          </div>
        </div>
        <div className="w-1/4 bg-green-200 flex items-center justify-center border-l border-green-300 group-hover:bg-green-300 transition-colors duration-300">
          <span
            className={`text-xs font-medium text-green-800 
            ${animateCompletion ? "animate-bounce" : ""}`}
          >
            {animateCompletion ? "Awesome!" : "Done ✓"}
          </span>
        </div>
      </div>
    );
  }

  if (!isRevealed) {
    // Hidden task (not revealed yet) with pulse animation
    return (
      <div
        id={`task-${task.id}`}
        onClick={handleClick}
        className="flex items-center justify-center border rounded-lg p-6 h-full shadow-sm 
          cursor-pointer bg-slate-100 hover:bg-slate-200 hover:shadow 
          transition-all duration-300 relative overflow-hidden group"
      >
        <div
          className="absolute inset-0 bg-blue-100 opacity-0 group-hover:opacity-10 
          transition-opacity duration-500 rounded-lg"
        ></div>
        <div
          className="w-10 h-10 flex items-center justify-center rounded-full 
          bg-blue-100 text-blue-600 text-xl group-hover:scale-110 
          transition-all duration-300 group-hover:shadow-md relative"
        >
          <span
            className="absolute -inset-1 rounded-full bg-blue-200 animate-pulse opacity-0 
            group-hover:opacity-70"
          ></span>
          <span className="relative">?</span>
        </div>
      </div>
    );
  }

  // Revealed task with hints - FIXED to prevent disappearing text on hover
  return (
    <div
      id={`task-${task.id}`}
      onClick={handleClick}
      className="flex flex-col border rounded-lg p-3 shadow-sm transition-all duration-300 
        bg-white hover:shadow-md cursor-pointer group relative overflow-hidden"
    >
      {/* Subtle background effect on hover - moved below the content so it doesn't affect text visibility */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 
        group-hover:opacity-100 transition-opacity duration-500 -z-10"
      ></div>

      <div className="relative flex gap-4 items-center mb-2">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-full 
          bg-blue-100 text-blue-600 text-sm group-hover:scale-110 
          transition-transform duration-200"
        >
          {task.icon}
        </div>
        <div
          className="text-xs font-semibold text-purple-600 group-hover:text-purple-700
          transition-colors duration-200"
        >
          {task.points} pts
        </div>
      </div>

      {hintLevel > 0 && task.hints && task.hints[0] && (
        <div className="relative z-10">
          <p
            className="text-blue-600 text-xs mb-2 bg-blue-50 p-2 rounded 
            border-l-2 border-blue-300 transition-all duration-300 transform-gpu"
          >
            <span className="font-medium">Hint 1:</span> {task.hints[0]}
          </p>
        </div>
      )}

      {hintLevel === 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setHintLevel(2);
          }}
          className="text-xs mb-2 h-10 bg-slate-100 hover:bg-slate-200 
          transition-all duration-300 p-1 rounded flex items-center justify-center
          group-hover:bg-blue-100 cursor-pointer z-10"
        >
          <div
            className="w-5 h-5 flex items-center justify-center rounded-full 
            bg-blue-200 text-blue-600 text-sm group-hover:animate-pulse"
          >
            ?
          </div>
          <span className="ml-2 text-slate-500 group-hover:text-blue-600">
            Reveal next hint
          </span>
        </div>
      )}

      {hintLevel > 1 && task.hints && task.hints[1] && (
        <div className="relative animate-fadeIn z-10">
          <p
            className="text-purple-600 text-xs mb-2 bg-purple-50 p-2 rounded 
            border-l-2 border-purple-300 transition-all duration-300"
          >
            <span className="font-medium">Hint 2:</span> {task.hints[1]}
          </p>
        </div>
      )}
    </div>
  );
};

const initialTasks: Task[] = [
  // happy alien emoji
  {
    id: 1,
    completed: false,
    points: 10,
    icon: "😊",
    hints: ["Gentle or moderate stroking", "Friendly communication"],
  },
  // angry alien emoji
  {
    id: 2,
    completed: false,
    points: 15,
    icon: "😠",
    hints: ["Press firmly", "Provoke it with words"],
  },
  // confused alien emoji
  {
    id: 3,
    completed: false,
    points: 20,
    icon: "🤔",
    hints: [
      "Say something strange during communication",
      "Continue to do some strange things",
    ],
  },
  // sleepy alien emoji
  {
    id: 4,
    completed: false,
    points: 25,
    icon: "😴",
    hints: [
      "No communication for a long time",
      "Make it feel bored (lower energy and patience)",
    ],
  },
  // scare alien emoji
  {
    id: 5,
    completed: false,
    points: 30,
    icon: "😱",
    hints: ["Intimidating communication", "Shake Feelien vigorously"],
  },
  // distance is too close
  {
    id: 6,
    completed: false,
    points: 35,
    icon: "👥",
    hints: ["Move closer", "Move even closer"],
  },
  // ismoving
  {
    id: 7,
    completed: false,
    points: 40,
    icon: "🍼",
    hints: ["Pick up Feelien", "Shake Feelien a little"],
  },
  // 5 communications
  {
    id: 8,
    completed: false,
    points: 45,
    icon: "💬",
    hints: ["Communicate once", "Communicate a few more times"],
  },
  // temperature changed
  {
    id: 9,
    completed: false,
    points: 40,
    icon: "🌡️",
    hints: ["Stroke it", "Rub your hands and then stroke it"],
  },
];

const GameTasksInterface = ({
  alienParams,
  inputParams,
}: {
  alienParams: AlienParameters;
  inputParams: AlienInputParams;
}) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const [showPointsAnimation, setShowPointsAnimation] =
    useState<boolean>(false);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);

  // Handle task completion with animation
  const handleCompleteTask = (taskId: number) => {
    // Find the task to get its points
    const completedTask = tasks.find((task) => task.id === taskId);
    if (!completedTask) return;

    // Update task state
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );

    // Show points animation
    setEarnedPoints(completedTask.points);
    setShowPointsAnimation(true);

    // Update total points with delay for animation
    setTimeout(() => {
      setTotalPoints((prev) => prev + completedTask.points);
      setShowPointsAnimation(false);
    }, 1000);
  };

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-4 relative">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <span className="text-blue-500 mr-2">👽</span>
          Alien Interaction Missions
        </h2>

        <div className="flex items-center gap-3">
          <div
            className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full
            border border-blue-200 font-medium"
          >
            {completedTasksCount}/{tasks.length}
          </div>
          <div className="relative">
            {showPointsAnimation && (
              <div
                className="absolute -top-8 left-0 w-full text-center text-green-500 font-bold
                animate-bounce text-sm"
              >
                +{earnedPoints}
              </div>
            )}
            <div
              className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full 
              font-semibold border border-purple-200 transition-all duration-300
              hover:shadow-inner hover:bg-purple-200"
            >
              {totalPoints} pts
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={handleCompleteTask}
            alienParams={alienParams}
            inputParams={inputParams}
          />
        ))}
      </div>
    </div>
  );
};

export default GameTasksInterface;
