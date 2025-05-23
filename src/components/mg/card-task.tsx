// TaskCard.tsx - 修复NEXT按钮显示逻辑
import { AlienInputParams, AlienParameters } from "@/typings";
import { useAtom } from "jotai";
import { useState, useEffect } from "react";
import { communicationCountAtom } from "./user-input-area";
import { currentEmotionAtom, currentPuffStateAtom } from "@/store";

// Task type definition
export interface Task {
  id: number;
  completed: boolean;
  points: number;
  icon: string;
  hints?: string[];
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
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [animateCompletion, setAnimateCompletion] = useState<boolean>(false);

  const [communicationCount] = useAtom(communicationCountAtom);
  const [currentEmotion] = useAtom(currentEmotionAtom);
  const emoji = currentEmotion.name;
  const [currentPuffState] = useAtom(currentPuffStateAtom);

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
    if (task.id === 4 && currentPuffState === true) {
      handleTaskComplete();
    }
    if (task.id === 5 && emoji === "scared") {
      handleTaskComplete();
    }
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

  const handleTaskComplete = () => {
    if (task.completed) return;

    setAnimateCompletion(true);
    setTimeout(() => {
      onComplete?.(task.id);
      setAnimateCompletion(false);
    }, 600);
  };

  const handleClick = () => {
    if (task.completed) return;

    const element = document.getElementById(`task-${task.id}`);
    if (element) {
      element.classList.add("scale-95");
      setTimeout(() => element.classList.remove("scale-95"), 150);
    }

    if (!isRevealed) {
      setIsRevealed(true);
      setHintLevel(1);
    } else if (hintLevel < 2 && task.hints && task.hints.length > hintLevel) {
      setHintLevel(hintLevel + 1);
    }
  };

  // 检查是否有第二个提示
  const hasSecondHint = task.hints && task.hints.length > 1 && task.hints[1];

  // 调整卡片高度以适应网格布局
  const cardHeight = "h-45"; // 减小高度以适应更多卡片

  if (task.completed || animateCompletion) {
    return (
      <div
        id={`task-${task.id}`}
        className={`relative flex ${cardHeight} border-2 rounded-lg shadow-lg transition-all duration-700 overflow-hidden group
          ${
            animateCompletion
              ? "bg-gradient-to-br from-green-500/20 to-cyan-500/20 border-cyan-400 scale-105 shadow-cyan-400/50"
              : "bg-gradient-to-br from-green-800/40 to-green-600/30 border-green-400/70"
          } 
          hover:shadow-green-400/40 hover:shadow-xl backdrop-blur-sm`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-r from-green-400/5 to-cyan-400/5 
          ${animateCompletion ? "animate-pulse" : ""}`}
        ></div>

        <div className="relative flex-1 p-2 flex flex-col justify-between z-10">
          <div className="flex justify-between items-start">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm
                transition-all duration-500 relative overflow-hidden
                ${
                  animateCompletion
                    ? "bg-gradient-to-br from-cyan-300 to-green-300 text-gray-900 animate-bounce shadow-lg"
                    : "bg-gradient-to-br from-green-400/90 to-green-300/90 text-green-900 shadow-md"
                }`}
            >
              <div className="absolute inset-1 bg-white/30 rounded-full"></div>
              <span className="relative z-10">{task.icon}</span>
            </div>
            <div
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold
              ${
                animateCompletion
                  ? "bg-gradient-to-r from-cyan-400 to-green-400 text-gray-900 animate-pulse"
                  : "bg-gradient-to-r from-green-400/30 to-green-300/30 text-green-200 border border-green-400/50"
              }
              transition-all duration-300 group-hover:scale-110`}
            >
              +{task.points}
            </div>
          </div>
          <div className="mt-auto">
            <div className="text-xs text-green-300/80 font-mono">
              M_{task.id.toString().padStart(2, "0")}
            </div>
          </div>
        </div>

        <div
          className="relative w-16 bg-gradient-to-b from-green-400/40 to-green-600/40 
          flex flex-col items-center justify-center border-l-2 border-green-400/70 backdrop-blur-sm"
        >
          <div
            className={`text-xs font-bold text-green-100 text-center
            ${animateCompletion ? "animate-bounce" : ""}`}
          >
            {animateCompletion ? "SUCCESS" : "DONE"}
          </div>
          <div className="text-xs text-green-200/60 mt-1">✓</div>
          <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!isRevealed) {
    return (
      <div
        id={`task-${task.id}`}
        onClick={handleClick}
        className={`relative flex items-center justify-center ${cardHeight} border-2 rounded-lg 
          cursor-pointer transition-all duration-500 overflow-hidden group
          bg-gradient-to-br from-gray-800/60 to-purple-900/40 border-purple-500/50
          hover:border-purple-400/70 hover:shadow-purple-400/30 hover:shadow-xl backdrop-blur-sm`}
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent 
          translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"
        ></div>

        <div
          className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-400/10 
          transition-all duration-500 rounded-lg"
        ></div>

        <div className="relative flex flex-col items-center">
          <div
            className="w-10 h-10 flex items-center justify-center rounded-full 
            bg-gradient-to-br from-purple-500/30 to-purple-700/20 text-purple-300 text-xl
            group-hover:scale-125 transition-all duration-500 group-hover:shadow-purple-400/50 
            group-hover:shadow-lg border border-purple-400/40 mb-1"
          >
            <span>?</span>
            <div className="absolute inset-0 border border-purple-400/20 rounded-full animate-ping"></div>
          </div>
        </div>

        <div className="absolute top-2 left-2 w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-2 right-2 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-300"></div>
        <div className="absolute bottom-2 left-2 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-2 right-2 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
      </div>
    );
  }

  return (
    <div
      id={`task-${task.id}`}
      onClick={handleClick}
      className={`relative flex flex-col ${cardHeight} border-2 rounded-lg p-2 transition-all duration-500 
        cursor-pointer group overflow-hidden backdrop-blur-sm
        bg-gradient-to-br from-gray-800/80 to-blue-900/60 border-blue-400/60
        hover:border-cyan-400/80 hover:shadow-cyan-400/30 hover:shadow-xl`}
    >
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, cyan 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, blue 1px, transparent 1px)`,
            backgroundSize: "12px 12px",
          }}
        ></div>
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent 
        translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1500"
      ></div>

      <div className="relative flex justify-between items-start mb-1 z-10">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-full text-sm
          bg-gradient-to-br from-blue-400/90 to-cyan-400/70 text-blue-900
          group-hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden"
        >
          <div className="absolute inset-1 bg-white/30 rounded-full"></div>
          <span className="relative z-10">{task.icon}</span>
        </div>
        <div
          className="px-1.5 py-0.5 rounded-full text-xs font-bold
          bg-gradient-to-r from-purple-400/30 to-blue-400/30 text-cyan-300 
          border border-cyan-400/50 group-hover:border-cyan-300/70
          transition-all duration-300 group-hover:scale-105"
        >
          {task.points}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-400/30 min-h-0">
        {hintLevel > 0 && task.hints && task.hints[0] && (
          <div className="relative z-10 mb-1">
            <div
              className="relative p-1.5 rounded border border-blue-400/40 
              bg-gradient-to-r from-blue-500/15 to-cyan-500/15 backdrop-blur-sm"
            >
              <div
                className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-3 
                bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"
              ></div>

              <p className="text-blue-300 text-xs leading-tight pl-1">
                {task.hints[0]}
              </p>
            </div>
          </div>
        )}

        {/* 只有在有第二个提示且当前显示第一个提示时才显示NEXT按钮 */}
        {hintLevel === 1 && hasSecondHint && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setHintLevel(2);
            }}
            className="relative z-10 mb-1 p-1.5 rounded cursor-pointer
              bg-gradient-to-r from-purple-500/15 to-purple-400/15 
              border border-purple-400/40 hover:border-purple-300/60
              transition-all duration-300 group/hint"
          >
            <div className="flex items-center">
              <div
                className="w-3 h-3 flex items-center justify-center rounded-full 
                bg-gradient-to-br from-purple-400/70 to-purple-600/50 text-purple-200 text-xs 
                group-hover/hint:scale-110 transition-all duration-300"
              >
                ?
              </div>
              <span
                className="ml-1 text-purple-300 text-xs
                group-hover/hint:text-purple-200 transition-colors duration-300"
              >
                NEXT
              </span>
            </div>
          </div>
        )}

        {hintLevel > 1 && task.hints && task.hints[1] && (
          <div className="relative z-10 animate-fadeIn">
            <div
              className="relative p-1.5 rounded border border-purple-400/40 
              bg-gradient-to-r from-purple-500/15 to-pink-500/15 backdrop-blur-sm"
            >
              <div
                className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-3 
                bg-gradient-to-b from-purple-400 to-pink-400 rounded-full animate-pulse"
              ></div>

              <p className="text-purple-300 text-xs leading-tight pl-1">
                {task.hints[1]}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-1">
        <div className="text-xs text-cyan-300/60 font-mono">
          M_{task.id.toString().padStart(2, "0")}
        </div>
      </div>

      <div className="absolute top-1 right-1 flex gap-1">
        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-500"></div>
      </div>
    </div>
  );
};

// Initial tasks data
const initialTasks: Task[] = [
  {
    id: 1,
    completed: false,
    points: 10,
    icon: "😊",
    hints: [
      "Show warmth through friendly interaction",
      "Try gentle touches and kind words",
    ],
  },
  {
    id: 2,
    completed: false,
    points: 15,
    icon: "😠",
    hints: [
      "Apply strong pressure when touching",
      "Use challenging or provocative language",
    ],
  },
  {
    id: 3,
    completed: false,
    points: 10,
    icon: "🤔",
    hints: ["Communicate something unexpected"],
  },
  {
    id: 4,
    completed: false,
    points: 15,
    icon: "🎈",
    hints: ["Make Feelien angry", "Increase the pressure gradually"],
  },
  {
    id: 5,
    completed: false,
    points: 10,
    icon: "😱",
    hints: ["Pick up Feelien", "Shake Feelien vigorously"],
  },
  {
    id: 6,
    completed: false,
    points: 10,
    icon: "👥",
    hints: ["Get physically closer to Feelien"],
  },
  {
    id: 7,
    completed: false,
    points: 10,
    icon: "🍼",
    hints: ["Pick up Feelien", "Shake Feelien a little"],
  },
  {
    id: 8,
    completed: false,
    points: 10,
    icon: "💬",
    hints: ["Continue talking with Feelien"],
  },
  {
    id: 9,
    completed: false,
    points: 10,
    icon: "🌡️",
    hints: [
      "Touch Feelien with your hands",
      "Warm your hands first, then make contact",
    ],
  },
];

// Main GameTasksInterface Component - 关键优化点
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

  const handleCompleteTask = (taskId: number) => {
    const completedTask = tasks.find((task) => task.id === taskId);
    if (!completedTask) return;

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );

    setEarnedPoints(completedTask.points);
    setShowPointsAnimation(true);

    setTimeout(() => {
      setTotalPoints((prev) => prev + completedTask.points);
      setShowPointsAnimation(false);
    }, 1000);
  };

  return (
    <div
      className="col-span-8 relative overflow-hidden rounded-xl border-2 border-cyan-400/30 
      bg-gradient-to-br from-black via-gray-900/80 to-gray-800/60 backdrop-blur-lg shadow-2xl
      h-full flex flex-col"
    >
      {/* 背景装饰 */}
      <div className="h-full absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(90deg, cyan 1px, transparent 1px),
              linear-gradient(0deg, cyan 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      <div
        className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent 
        animate-pulse"
      ></div>
      <div
        className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent 
        animate-pulse delay-1000"
      ></div>

      {/* 主要内容区域 */}
      <div className="h-full relative z-10 p-4 flex-1 flex flex-col">
        {/* Header - 固定高度 */}
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <div className="flex items-center">
            <span className="text-xl mr-2 animate-pulse">👽</span>
            <div className="flex flex-col">
              <h2
                className="text-lg font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 
                bg-clip-text text-transparent tracking-wide"
              >
                ALIEN INTERACTION
              </h2>
              <span className="text-xs font-mono text-cyan-400/70 tracking-wider">
                MISSION_PROTOCOLS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress 指示器 */}
            <div
              className="px-2 py-1.5 rounded-full border border-blue-400/40 
              bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm"
            >
              <div className="text-xs font-mono text-blue-300 tracking-wider text-center">
                {completedTasksCount}/{tasks.length}
              </div>
              <div className="mt-1 w-10 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-1000"
                  style={{
                    width: `${(completedTasksCount / tasks.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Points 显示 */}
            <div className="relative">
              {showPointsAnimation && (
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 
                  text-green-400 font-bold text-sm animate-bounce z-20"
                >
                  +{earnedPoints}
                </div>
              )}
              <div
                className="px-2 py-1.5 rounded-full border border-purple-400/40 
                bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm"
              >
                <div
                  className="text-sm font-bold text-center bg-gradient-to-r from-purple-300 to-pink-300 
                  bg-clip-text text-transparent"
                >
                  {totalPoints} Points
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 任务网格 - 可滚动区域 */}
        <div className="flex-1 overflow-y-hidden min-h-0">
          <div className="grid grid-cols-3 gap-3 pb-2">
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
      </div>
    </div>
  );
};

export default GameTasksInterface;
