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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// 语音识别模式
type SpeechRecognitionMode = "default" | "xfyun";

export function UserInputArea({
  backendUrl,
  onResponse,
  systemPrompt,
  alienParameters,
}: ShortAudioVoiceAssistantProps) {
  // State variables
  // 移除 streamingText 状态变量
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isVoiceInputEnabled, setIsVoiceInputEnabled] =
    useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [speechRecognitionMode, setSpeechRecognitionMode] =
    useState<SpeechRecognitionMode>("default");
  // 删除这一行: const [streamingText, setStreamingText] = useState<string>("");

  // 修改 handleXfyunResult 函数
  const handleXfyunResult = (result: any) => {
    // 检查必要的数据存在
    if (!result.data || !result.data.result) return;

    const resultData = result.data.result;

    // 记录收到的数据结构，帮助调试
    console.log("讯飞返回数据:", resultData);

    // 处理动态修正情况
    if (resultData.pgs === "rpl") {
      // 替换模式 - 需要替换之前的文本
      if (
        resultData.rg &&
        Array.isArray(resultData.rg) &&
        resultData.rg.length === 2
      ) {
        // 由于移除了 streamingText，直接处理词语结果
        processXfyunWords(resultData.ws);
      }
    } else if (resultData.pgs === "apd") {
      // 追加模式
      processXfyunWords(resultData.ws);
    } else {
      // 处理没有 pgs 字段的情况
      processXfyunWords(resultData.ws);
    }

    // 如果是最后一个结果，开始新的识别段落
    if (result.data.status === 2) {
      // 添加一个换行，表示新的识别段落开始
      setTextInput((prev) => prev + "\n");

      // 发送一个新的开始帧来重新启动识别
      restartXfyunRecognition();
    }
  };

  // 修改 processXfyunWords 函数
  const processXfyunWords = (words: any[]) => {
    if (!Array.isArray(words)) {
      console.warn("words 不是数组:", words);
      return;
    }

    let text = "";
    for (const word of words) {
      if (word.cw && Array.isArray(word.cw)) {
        for (const cw of word.cw) {
          if (cw.w) {
            text += cw.w;
          }
        }
      }
    }

    // 检查是否有内容
    if (text) {
      console.log("识别到的文本:", text);

      // 直接更新文本输入框的内容
      setTextInput((prev) => {
        console.log("输入框更新前:", prev);
        const newText = prev + text;
        console.log("输入框更新后:", newText);
        return newText;
      });
    }
  };

  // 修改 startXfyunRecording 函数
  const startXfyunRecording = async () => {
    setIsRecording(true);
    streamingActiveRef.current = true;
    // 删除这一行: setStreamingText("");
    setErrorMessage("");

    try {
      // 获取麦克风音频流
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 创建WebSocket连接
      websocketRef.current = await createXfyunWebSocket();

      if (!websocketRef.current) {
        throw new Error("无法创建WebSocket连接");
      }

      // 创建音频处理器
      const audioContext = new AudioContext();
      const audioInput = audioContext.createMediaStreamSource(stream);
      const recorder = audioContext.createScriptProcessor(16384, 1, 1);

      // 连接音频处理链
      audioInput.connect(recorder);
      recorder.connect(audioContext.destination);

      // 设置音频处理事件
      recorder.onaudioprocess = (e) => {
        if (!streamingActiveRef.current || !websocketRef.current) return;

        // 获取PCM数据
        const buffer = e.inputBuffer.getChannelData(0);
        const pcmData = convertFloat32ToInt16(buffer);

        // 将PCM数据转为Base64编码
        const base64Audio = arrayBufferToBase64(pcmData.buffer);

        // 发送到讯飞API
        if (websocketRef.current.readyState === WebSocket.OPEN) {
          websocketRef.current.send(
            JSON.stringify({
              data: {
                status: 1, // 中间帧
                format: "audio/L16;rate=16000",
                encoding: "raw",
                audio: base64Audio,
              },
            })
          );
        }
      };

      // 保存引用，用于后续清理
      mediaRecorderRef.current = {
        stream,
        stop: () => {
          // 自定义stop方法，用于停止所有资源
          recorder.disconnect();
          audioInput.disconnect();
          audioContext.close();
          stream.getTracks().forEach((track) => track.stop());

          // 发送结束帧
          if (
            websocketRef.current &&
            websocketRef.current.readyState === WebSocket.OPEN
          ) {
            websocketRef.current.send(
              JSON.stringify({
                data: {
                  status: 2, // 最后一帧
                },
              })
            );
          }
        },
      } as any;
    } catch (error) {
      console.error("启动讯飞语音识别失败:", error);
      setIsRecording(false);
      streamingActiveRef.current = false;
      setErrorMessage("无法启动麦克风或连接语音识别服务");
    }
  };

  // 修改 restartXfyunRecognition 函数，没有直接对 streamingText 的引用，所以不需要修改

  // Audio recording related
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);
  const streamingActiveRef = useRef<boolean>(false);

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

  // 创建讯飞WebSocket连接并处理认证
  const createXfyunWebSocket = async (): Promise<WebSocket | null> => {
    try {
      // TODO: 实际项目中，应该从后端获取签名，不应在前端暴露API密钥
      // 这里简化处理，假设后端提供了一个获取已签名URL的接口
      const response = await fetch(`${backendUrl}/api/get-xfyun-url`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("获取讯飞API连接URL失败");
      }

      const { signedUrl } = await response.json();

      // 创建WebSocket连接
      const ws = new WebSocket(signedUrl);

      // 设置WebSocket事件处理器
      ws.onopen = () => {
        console.log("讯飞WebSocket连接已建立");

        // 发送握手参数
        const handshakeData = JSON.stringify({
          common: {
            app_id: "c5a2c718", // 应从后端获取，这里仅作示例
          },
          business: {
            language: "zh_cn",
            domain: "iat",
            accent: "mandarin",
            dwa: "wpgs", // 开启动态修正
            ptt: 1, // 开启标点符号
            rlang: "zh-cn", // 简体中文
          },
          data: {
            status: 0, // 第一帧音频
            format: "audio/L16;rate=16000",
            encoding: "raw",
            audio: "", // 第一帧可以不发送音频数据
          },
        });

        ws.send(handshakeData);
      };

      ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);

          // 处理讯飞返回的结果
          if (result.code === 0 && result.data) {
            handleXfyunResult(result);
          } else if (result.code !== 0) {
            console.error("讯飞API返回错误:", result);
            setErrorMessage(`讯飞API错误: ${result.message || "未知错误"}`);
          }
        } catch (error) {
          console.error("解析讯飞返回数据出错:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("讯飞WebSocket错误:", error);
        setErrorMessage("语音识别服务连接错误，请稍后重试");
      };

      ws.onclose = () => {
        console.log("讯飞WebSocket连接已关闭");
        streamingActiveRef.current = false;
      };

      return ws;
    } catch (error) {
      console.error("创建讯飞WebSocket连接失败:", error);
      setErrorMessage("无法连接到语音识别服务，请检查网络连接");
      return null;
    }
  };
  // 重新启动讯飞识别，不中断录音
  const restartXfyunRecognition = () => {
    // 如果WebSocket连接已关闭，则重新创建
    if (
      !websocketRef.current ||
      websocketRef.current.readyState !== WebSocket.OPEN
    ) {
      createXfyunWebSocket().then((ws) => {
        websocketRef.current = ws;
      });
      return;
    }

    // 如果WebSocket连接仍然活跃，发送新的握手帧
    if (websocketRef.current.readyState === WebSocket.OPEN) {
      const handshakeData = JSON.stringify({
        common: {
          app_id: "c5a2c718", // 应从后端获取，这里仅作示例
        },
        business: {
          language: "zh_cn",
          domain: "iat",
          accent: "mandarin",
          dwa: "wpgs", // 开启动态修正
          ptt: 1, // 开启标点符号
          rlang: "zh-cn", // 简体中文
          vad_eos: 5000, // 设置更长的静音容忍时间，单位毫秒
        },
        data: {
          status: 0, // 第一帧音频
          format: "audio/L16;rate=16000",
          encoding: "raw",
          audio: "", // 第一帧可以不发送音频数据
        },
      });

      websocketRef.current.send(handshakeData);
    }
  };

  // Float32Array转Int16Array (讯飞要求16位PCM)
  function convertFloat32ToInt16(buffer: Float32Array) {
    const length = buffer.length;
    const result = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      // 将-1.0 ~ 1.0的浮点数转换为-32768 ~ 32767的整数
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return result;
  }

  // ArrayBuffer转Base64
  function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const binaryString = bytes.reduce(
      (acc, byte) => acc + String.fromCharCode(byte),
      ""
    );
    return btoa(binaryString);
  }

  // 原来的 Start recording 方法
  const startDefaultRecording = async (): Promise<void> => {
    // 重置状态
    setIsRecording(true);
    audioChunksRef.current = [];
    setErrorMessage(""); // 清除任何错误消息

    try {
      // 请求麦克风访问权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 创建 MediaRecorder 实例
      // 如果支持使用 audio/mp3 mimetype，否则回退到 audio/webm
      const mimeType = MediaRecorder.isTypeSupported("audio/mp3")
        ? "audio/mp3"
        : "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // 处理数据可用事件
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 开始录音
      mediaRecorder.start();
      console.log("Recording started with mime type:", mimeType);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsRecording(false);
      setErrorMessage("无法访问麦克风。请检查权限并重试。");
    }
  };

  // 开始录音的统一入口
  const startRecording = async () => {
    if (speechRecognitionMode === "xfyun") {
      await startXfyunRecording();
    } else {
      await startDefaultRecording();
    }
  };

  // 原来的停止录音并处理音频
  const stopDefaultRecording = async (): Promise<void> => {
    if (!mediaRecorderRef.current) {
      return;
    }

    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        setIsRecording(false);
        setIsProcessing(true);

        // 在停止前设置onstop处理程序
        mediaRecorderRef.current.onstop = async () => {
          try {
            // 从录制的数据块创建音频Blob
            const audioBlob = new Blob(audioChunksRef.current, {
              type: MediaRecorder.isTypeSupported("audio/mp3")
                ? "audio/mp3"
                : "audio/webm",
            });

            // 处理音频以获取转录
            const transcription = await processAudioToText(audioBlob);
            // 将转录设置到文本输入字段而不是发送到模型
            setTextInput(transcription);
            setIsProcessing(false);
            resolve();
          } catch (error) {
            console.error("Error processing audio:", error);
            setIsProcessing(false);
            setErrorMessage("语音转文字失败。请重试或直接输入您的消息。");
            resolve();
          }

          // 停止流中的所有轨道
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream
              .getTracks()
              .forEach((track) => track.stop());
          }
        };

        // 停止录音
        mediaRecorderRef.current.stop();
      } else {
        setIsProcessing(false);
        resolve();
      }
    });
  };

  // 停止讯飞流式录音
  const stopXfyunRecording = async (): Promise<void> => {
    return new Promise<void>((resolve) => {
      setIsRecording(false);
      streamingActiveRef.current = false;

      // 停止音频采集
      if (
        mediaRecorderRef.current &&
        typeof mediaRecorderRef.current.stop === "function"
      ) {
        mediaRecorderRef.current.stop();
      }

      // 发送结束帧
      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        // 发送一个明确的结束帧，表示用户主动结束
        websocketRef.current.send(
          JSON.stringify({
            data: {
              status: 2, // 最后一帧
            },
          })
        );

        // 稍等一下再关闭连接，确保服务器有时间处理最后的数据
        setTimeout(() => {
          if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
          }
          resolve();
        }, 500);
      } else {
        websocketRef.current = null;
        resolve();
      }

      mediaRecorderRef.current = null;
    });
  };

  // 停止录音的统一入口
  const stopRecording = async (): Promise<void> => {
    if (speechRecognitionMode === "xfyun") {
      await stopXfyunRecording();
    } else {
      await stopDefaultRecording();
    }
  };

  // 转换音频为文本（仅限默认模式）
  const processAudioToText = async (audioBlob: Blob): Promise<string> => {
    try {
      // 创建FormData来发送音频文件
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.mp3");

      // 包含系统提示
      formData.append("systemPrompt", systemPrompt);

      // 包含当前外星人参数
      if (alienParameters) {
        formData.append("alienParameters", JSON.stringify(alienParameters));
      }

      // 发送到后端API
      const response = await fetch(`${backendUrl}/api/process-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Request failed");
      }

      const data = (await response.json()) as ChatResponse;

      // 返回转录
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

  // 处理发送消息到模型
  const handleSendMessage = async () => {
    if (!textInput.trim()) return;

    setIsProcessing(true);
    setResponse("");
    setErrorMessage(""); // 清除任何先前的错误

    try {
      // 处理文本输入
      await processTextInput(textInput);
      // 成功处理后清除文本输入
      setTextInput("");
    } catch (error) {
      console.error("Error processing text:", error);
      setErrorMessage("处理您的消息时出错。请重试。");
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理文本输入
  const processTextInput = async (text: string): Promise<ChatResponse> => {
    try {
      // 准备请求数据
      const requestData = {
        text,
        systemPrompt: systemPrompt,
        alienParameters: alienParameters || null,
      };

      // 发送到后端API
      const response = await fetch(`${backendUrl}/api/process-text`, {
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

      // 设置响应
      setResponse(data.content);

      // 如果提供了回调，则执行它
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

  // 处理Enter键发送消息
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 清理函数
  useEffect(() => {
    return () => {
      // 如果组件卸载时正在录音，停止录音
      if (isRecording) {
        if (speechRecognitionMode === "xfyun") {
          stopXfyunRecording();
        } else if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((track) => track.stop());
          mediaRecorderRef.current = null;
        }
      }

      // 关闭任何打开的WebSocket连接
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, [isRecording, speechRecognitionMode]);

  return (
    <Card className="w-full border border-purple-300 bg-gradient-to-br from-indigo-900 to-purple-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-center text-green-400">
          Alien Communication Device
        </CardTitle>

        <div className="flex items-center gap-2">
          {/* 语音识别模式选择器 */}
          <Select
            value={speechRecognitionMode}
            onValueChange={(value: SpeechRecognitionMode) =>
              setSpeechRecognitionMode(value)
            }
          >
            <SelectTrigger className="w-[180px] bg-gray-800 border-green-500 text-green-400">
              <SelectValue placeholder="选择语音识别模式" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-green-500 text-green-400">
              <SelectItem value="default">默认语音识别</SelectItem>
              <SelectItem value="xfyun">讯飞流式识别</SelectItem>
            </SelectContent>
          </Select>

          {/* 语音输入切换按钮 */}
          {isVoiceInputEnabled ? (
            <Button
              onClick={toggleVoiceInput}
              className="bg-green-600 hover:bg-green-500 text-white border border-green-400"
            >
              <Mic size={16} className="mr-2" />
              已启用语音输入
            </Button>
          ) : (
            <Button
              onClick={toggleVoiceInput}
              className="bg-gray-800 hover:bg-green-800 text-green-400 hover:text-green-300 border border-green-500"
            >
              <Mic size={16} className="mr-2" />
              启用语音输入
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 文本输入区域 */}
        <div className="space-y-2 relative">
          <Textarea
            placeholder="输入您要发送给外星人的消息..."
            className="h-32 bg-black/50 border-green-500 text-green-400 font-mono focus:border-green-400 focus:ring-green-400"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing} // 移除 isRecording 条件，允许在录音时编辑
          />

          {/* 语音控制 - 仅在启用语音输入时显示 */}
          {isVoiceInputEnabled && (
            <div className="mt-2 flex justify-center">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="bg-green-600 hover:bg-green-500 text-white border border-green-400"
                  disabled={isProcessing}
                >
                  <Mic size={16} className="mr-2" />
                  开始录音
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-500 text-white border border-red-400"
                  disabled={isProcessing}
                >
                  <MicOff size={16} className="mr-2" />
                  停止录音
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 错误消息显示 */}
        {errorMessage && (
          <div className="flex items-center p-2 bg-red-900/50 border border-red-500 rounded-md">
            <AlertCircle size={16} className="text-red-400 mr-2" />
            <span className="text-red-300 text-sm">{errorMessage}</span>
          </div>
        )}

        {/* 录音/处理指示器 */}
        {(isRecording || isProcessing) && (
          <div className="flex items-center justify-center h-8 bg-black/30 rounded-md border border-green-500">
            <Loader2 className="h-4 w-4 animate-spin text-green-400 mr-2" />
            <span className="text-green-400 text-sm">
              {isRecording ? "录音中..." : "处理中..."}
            </span>
          </div>
        )}

        {/* 响应显示区域 */}
        <div className="h-32 overflow-y-auto p-3 bg-black/70 rounded-md border border-purple-500 text-purple-300 font-mono">
          {response ? (
            <p>{response}</p>
          ) : (
            <p className="text-purple-600">外星人的回应将显示在这里...</p>
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
          发送消息
        </Button>
      </CardFooter>
    </Card>
  );
}

export default UserInputArea;
