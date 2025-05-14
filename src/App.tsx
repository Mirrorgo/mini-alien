import { useState, useEffect } from "react";
import "./App.css";
import {
  AlienInputParams,
  AlienOutputParams,
  AlienParameters,
} from "./typings";
import Alien from "./components/mg/alien";
import EnvironmentControls from "./components/mg/environment-input";
import UserInputArea from "./components/mg/user-input-area";

function App() {
  // 外星人参数状态
  const [alienParams, setAlienParams] = useState<AlienParameters>({
    happiness: 50,
    energy: 70,
    curiosity: 90,
    trust: 30,
    sociability: 60,
    patience: 40,
    confusion: 80,
    intelligence: 95,
  });

  // 初始化环境输入参数
  const [environmentParams, setEnvironmentParams] = useState<AlienInputParams>({
    distance: 100,
    force: 0,
    moving: false,
    temperature: 22.5,
  });

  // 外星人输出行为参数
  const [outputParams, setOutputParams] = useState<AlienOutputParams>({
    comeOut: false,
    shakeFrequency: 0.5,
    shakeStep: 5,
    rgbRed: 100,
    rgbGreen: 100,
    rgbBlue: 200,
  });

  // 追踪环境参数是否已更改
  const [envParamsChanged, setEnvParamsChanged] = useState<boolean>(false);

  // 后端URL
  const backendUrl = "http://localhost:3001";

  // 在组件挂载时从后端获取外星人状态
  useEffect(() => {
    // 从后端获取当前外星人状态
    const fetchAlienState = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/alien`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changed: false,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.alien) {
              setAlienParams(data.alien);
            }
            if (data.output) {
              setOutputParams(data.output);
            }
          }
        }
      } catch (error) {
        console.error("获取外星人状态出错:", error);
      }
    };

    // 立即获取状态
    fetchAlienState();
  }, [backendUrl]);

  // 更新外星人参数函数
  const updateAlienParameters = (responseData: any) => {
    // 如果包含外星人参数则更新
    if (responseData.alien) {
      setAlienParams(responseData.alien);
    }

    // 如果包含输出参数则更新
    if (responseData.output) {
      setOutputParams(responseData.output);
    }
  };

  // 更新环境参数的函数
  const handleEnvironmentChange = (newParams: AlienInputParams) => {
    setEnvironmentParams(newParams);
    setEnvParamsChanged(true);
  };

  // 处理AI响应
  const handleResponse = (text: string, data: any) => {
    console.log("Response received:", text);

    // 更新参数（如果响应中包含）
    if (data) {
      updateAlienParameters(data);
    }

    // 重置环境更改标志
    setEnvParamsChanged(false);
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex justify-end mb-4">
        <EnvironmentControls
          inputParams={environmentParams}
          onInputChange={handleEnvironmentChange}
        />
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <Alien parameters={alienParams} outputParams={outputParams} />
        {/* 环境控制和语音助手 - 占宽度的3/5 */}
        <UserInputArea
          backendUrl={backendUrl}
          environmentParams={environmentParams}
          envParamsChanged={envParamsChanged}
          onResponse={handleResponse}
        />
      </div>
    </div>
  );
}

export default App;
