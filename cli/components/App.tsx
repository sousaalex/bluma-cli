import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, Static } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { Header, SessionInfo } from "./UI";
import { spawn } from "child_process";
import { ChildProcessWithoutNullStreams } from "child_process";

interface HistoryItem {
  id: number;
  component: React.ReactElement;
}

interface AppProps {
  sessionId: string;
}

interface ToolCallProps {
  toolName: string;
  args: any;
}

const ToolCall = ({ toolName, args }: ToolCallProps) => {
  if (
    toolName.includes("message_notify_dev") ||
    toolName.includes("agent_end_task")
  ) {
    return null;
  }

  

  if (toolName.includes("notebook_sequentialthinking_tools")) {
    try {
      // Primeiro, vamos tentar acessar os dados diretamente
      let thinkingData;
      if (typeof args === "string") {
        thinkingData = JSON.parse(args);
      } else if (args && typeof args === "object") {
        // Verificar se os dados estão em uma propriedade específica
        if (args.content) {
          thinkingData = args.content;
        } else if (args.data) {
          thinkingData = args.data;
        } else {
          thinkingData = args;
        }
      } else {
        throw new Error("Invalid args format");
      }

      return (
        <Box
          borderStyle="round"
          borderColor="green"
          flexDirection="column"
          marginBottom={1}
          paddingX={1}
        >
          <Box marginBottom={1}>
            <Text color="green" bold>
              Thinking Process
            </Text>
            {/* <Text color="gray"> (Step {thinkingData.thought_number}/{thinkingData.total_thoughts})</Text> */}
          </Box>

          <Box flexDirection="column" marginBottom={1}>
            {/* <Text color="cyan" bold>💭 Thought:</Text> */}
            <Text color="gray">{thinkingData.thought}</Text>
          </Box>

          {/* <Box flexDirection="column" marginBottom={1}>
                        <Text color="green" bold>📋 Current Step:</Text>
                        <Text color="gray">{thinkingData.current_step?.step_description}</Text>
                    </Box> */}

          {/* {thinkingData.current_step?.recommended_tools && (
                        <Box flexDirection="column" marginBottom={1}>
                            <Text color="yellow" bold>🛠️ Recommended Tools:</Text>
                            {thinkingData.current_step.recommended_tools.map((tool: any, idx: number) => (
                                <Box key={idx} marginLeft={2}>
                                    <Text color="magenta">• {tool.tool_name}</Text>
                                    <Text color="gray"> (Priority: {tool.priority})</Text>
                                </Box>
                            ))}
                        </Box>
                    )} */}

          {/* {thinkingData.remaining_steps && thinkingData.remaining_steps.length > 0 && (
                        <Box flexDirection="column">
                            <Text color="red" bold>📝 Remaining Steps:</Text>
                            {thinkingData.remaining_steps.map((step: string, idx: number) => (
                                <Box key={idx} marginLeft={2}>
                                    <Text color="gray">• {step}</Text>
                                </Box>
                            ))}
                        </Box>
                    )} */}
        </Box>
      );
    } catch (e) {
      // Fallback - mostrar o conteúdo bruto formatado
      return (
        <Box
          borderStyle="round"
          borderColor="blue"
          marginBottom={1}
          paddingX={1}
        >
          <Text color="blue" bold>
            🧠 Thinking Process (Raw)
          </Text>
          <Text color="gray">{JSON.stringify(args, null, 2)}</Text>
        </Box>
      );
    }
  }

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      marginBottom={1}
    >
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text> </Text>
        <Text>
          <Text bold color="magenta">
            {toolName}
          </Text>
        </Text>
      </Box>

      <Text color="gray">{JSON.stringify(args, null, 2)}</Text>
    </Box>
  );
};

interface ToolResultProps {
  toolName: string;
  result: string;
}

const ToolResult = ({ toolName, result }: ToolResultProps) => {
  const MAX_LINES = 3;
  // Divide o texto por linhas
  const lines = result.split("\n");
  const isTruncated = lines.length > MAX_LINES;
  const visibleLines = isTruncated ? lines.slice(0, MAX_LINES) : lines;
  const remainingCount = lines.length - MAX_LINES;

  if (toolName.includes("agent_end_task")) {
    
    return null; // não renderiza nada
  }

  // Regra especial para a ferramenta notebook_sequentialthinking_tools
  if (toolName.includes("notebook_sequentialthinking_tools")) {
    return null; // não renderiza resultado pois já foi renderizado na call
  }

  // Regra especial para a ferramenta message_notify_dev para uma UI mais limpa.
  if (toolName.includes("message_notify_dev")) {
    try {
      const parsed = JSON.parse(result);
      // Se o resultado for um JSON válido com a mensagem do agente, renderiza de forma especial.
      if (parsed.content && parsed.content.body) {
        return (
          <Box flexDirection="column">
            <Box>
              <Text color="magenta" bold>
                bluma
              </Text>
            </Box>
            <Box flexDirection="column" marginBottom={1} padding={1}>
              <Text>{parsed.content.body}</Text>
            </Box>
          </Box>
        );
      }
    } catch (e) {
      // Se o JSON.parse falhar, o componente de fallback abaixo será usado.
    }
  }

  // Componente  de fallback para todas as outras ferramentas ou resultados inesperados.
  return (
    <Box flexDirection="column" marginBottom={1}>
      {visibleLines.map((line, idx) => (
        <Text key={idx} color="gray">
          {line}
        </Text>
      ))}
      {isTruncated && (
        <Text color="gray">...({remainingCount} more lines)</Text>
      )}
    </Box>
  );
};

const App = React.memo(({ sessionId }: AppProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [isTextLimited, setIsTextLimited] = useState(false);

  // Função memorizada para lidar com mudanças no input
  const handleQueryChange = useCallback((text: string) => {
    // Limita o comprimento do texto no input para evitar problemas
    const maxInputLength = 5000;

    // Preserva quebras de linha (\n), tabs (\t) e espaços, mas remove outros caracteres problemáticos
    const cleanText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Normaliza quebras de linha para \n
    const normalizedText = cleanText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    // Verifica se o texto foi limitado
    const wasLimited = normalizedText.length > maxInputLength;

    // Limita o comprimento
    const limitedText = wasLimited
      ? normalizedText.substring(0, maxInputLength)
      : normalizedText;

    setQuery(limitedText);
    setIsTextLimited(wasLimited);
  }, []);

  const [statusMessage, setStatusMessage] = useState<string | null>(
    "Iniciando backend..."
  );
  const [toolsCount, setToolsCount] = useState<number | null>(null);
  const [mcpStatus, setMcpStatus] = useState<"connecting" | "connected">(
    "connecting"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const backendProcess = useRef<ChildProcessWithoutNullStreams | null>(null);
  const [position, setPosition] = useState(0);
  const maxPosition = 3; // controla quantas "colunas" dentro dos parênteses

  useEffect(() => {
    if (!isProcessing) return; // não faz nada se não estiver processando

    const interval = setInterval(() => {
      setPosition((prev) => (prev >= maxPosition ? 0 : prev + 1));
    }, 100); // velocidade da animação

    return () => clearInterval(interval); // limpa intervalo ao desmontar/parar
  }, [isProcessing]);

  useEffect(() => {
    // Inicializa o histórico com os componentes de cabeçalho
    setHistory([
      { id: 0, component: <Header /> },
      {
        id: 1,
        component: (
          <SessionInfo
            sessionId={sessionId}
            toolsCount={toolsCount}
            mcpStatus={mcpStatus}
          />
        ),
      },
    ]);

    // Inicia o processo de backend
    const backend = spawn("python", [
      "-u",
      "cli/backend/bluma.py",
      sessionId,
    ]);
    backendProcess.current = backend;

    // Log apenas erros críticos
    // backend.stderr.on("data", (data) => {
    //   console.error("Backend STDERR:", data.toString());
    // });

    backend.on("error", (error) => {
      console.error("Erro no processo backend:", error);
    });

    backend.on("exit", (code, signal) => {
      if (code !== 0) {
        // Backend crashed
        setHistory((prev) => [
          ...prev,
          {
            id: prev.length,
            component: (
              <Box
                borderStyle="round"
                borderColor="red"
                marginBottom={1}
                paddingX={1}
              >
                <Text color="red" bold>
                  ❌ Backend Error
                </Text>
                <Text color="gray">
                  O processo backend terminou inesperadamente (código: {code})
                </Text>
                <Text color="gray">
                  Verifique os logs acima para mais detalhes do erro.
                </Text>
              </Box>
            ),
          },
        ]);
        setStatusMessage(null);
        setIsProcessing(false);
      }
    });

    backend.stdout.on("data", (data) => {
      const messages = data.toString().split("\n").filter(Boolean);
      messages.forEach((message: string) => {
        try {
          const parsed = JSON.parse(message);

          setHistory((prev) => {
            const nextId = prev.length;
            // console.log("=========================evento recebido=====================");
              
            // console.log(parsed.type)
            // Handle connection status
            if (parsed.type === "connection_status") {
              setStatusMessage(parsed.message);
              return prev;
            }

            // Handle MCP connection success
            else if (
              parsed.type === "status" &&
              parsed.status === "mcp_connected"
            ) {
              setStatusMessage(null);
              setToolsCount(parsed.tools);
              setMcpStatus("connected");
              const updatedHistory = [...prev];
              updatedHistory[1] = {
                id: 1,
                component: (
                  <SessionInfo
                    sessionId={sessionId}
                    toolsCount={parsed.tools}
                    mcpStatus={"connected"}
                  />
                ),
              };
              return updatedHistory;
            }

            // Handle debug info
            else if (parsed.type === "debug") {
              return [
                ...prev,
                { id: nextId, component: <Text color="gray">🔍 {parsed.message}</Text> }
              ];
            }

            // Handle completion
            else if (parsed.type === "completion") {
              // Reset processing state on completion
              setIsProcessing(false);
              setStatusMessage(null);

              return [
                ...prev,
                {
                  id: nextId,
                  component: <Text color="green">🎯 {parsed.message}</Text>,
                },
              ];
            }
           
            // Handle feedback
            else if (parsed.type === "feedback") {
              const colorMap = {
                error: "red",
                excellent: "green",
                good: "blue",
                warning: "yellow",
              };
              const color =
                colorMap[parsed.level as keyof typeof colorMap] || "white";

              return [
                ...prev,
                {
                  id: nextId,
                  component: (
                    <Box marginBottom={1}>
                      <Text color={color}>
                        {parsed.level === "excellent"
                          ? "🏆"
                          : parsed.level === "error"
                          ? "❌"
                          : parsed.level === "good"
                          ? "✅"
                          : "⚠️"}{" "}
                        {parsed.message}
                      </Text>
                    </Box>
                  ),
                },
              ];
            }

            // Handle protocol violation
            else if (parsed.type === "protocol_violation") {
              return [
                ...prev,
                {
                  id: nextId,
                  component: (
                    <Box
                      borderStyle="round"
                      borderColor="yellow"
                      flexDirection="column"
                      marginBottom={1}
                      paddingX={1}
                    >
                      <Text color="yellow" bold>
                        ⚠️ Protocol Violation
                      </Text>
                      <Text color="gray">{parsed.content}</Text>
                      <Text color="yellow">{parsed.message}</Text>
                    </Box>
                  ),
                },
              ];
            }

            // Handle warnings
            else if (parsed.type === "warning") {
              return [
                ...prev,
                {
                  id: nextId,
                  component: <Text color="yellow">⚠️ {parsed.message}</Text>,
                },
              ];
            }

            // Handle task completion
            else if (parsed.type === "done") {
              // console.log("Terminou..");
              
              // IMPORTANT: Reset processing state immediately
              setIsProcessing(false);
              setStatusMessage(null);
              
              return prev;
            }

            

            // Legacy event handling for backward compatibility
            else if (parsed.type === "agent_response") {
              return [
                ...prev,
                {
                  id: nextId,
                  component: (
                    <Box>
                      <Text color="magenta">bluma:</Text>
                      <Text> {parsed.content}</Text>
                    </Box>
                  ),
                },
              ];
            }

            // Handle errors
            else if (parsed.type === "error") {
              setStatusMessage(null);
              setIsProcessing(false);
              return [
                ...prev,
                {
                  id: nextId,
                  component: <Text color="red">❌ {parsed.message}</Text>,
                },
              ];
            }

            // Handle tool calls
            else if (parsed.type === "tool_call") {
              // Verifica se é um agent_end_task
              if (parsed.tool_name.includes("agent_end_task")) {
                setIsProcessing(false);
                setStatusMessage(null);
                return prev;
              }

              return [
                ...prev,
                {
                  id: nextId,
                  component: (
                    <ToolCall
                      toolName={parsed.tool_name}
                      args={parsed.arguments}
                    />
                  ),
                },
              ];
            }

            // Handle tool results
            else if (parsed.type === "tool_result") {         
              // Verifica se é um agent_end_task
              if (parsed.tool_name.includes("agent_end_task")) {
                setIsProcessing(false);
                setStatusMessage(null);
                return prev;
              }

              return [
                ...prev,
                {
                  id: nextId,
                  component: (
                    <ToolResult
                      toolName={parsed.tool_name}
                      result={parsed.result}
                    />
                  ),
                },
              ];
            }

            return prev; // Retorna o estado anterior se o tipo de mensagem não for reconhecido
          });
        } catch (error) {
          // Ignora erros de parsing de JSON
        }
      });
    });

    return () => {
      if (backendProcess.current) {
        backendProcess.current.kill();
      }
    };
  }, [sessionId]);

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || !backendProcess.current || isProcessing) return;

      setIsProcessing(true);

      // Limita o texto para evitar problemas de interface
      const maxLength = 10000; // Limite máximo
      const displayText =
        text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

      // Adiciona a mensagem do user à UI
      setHistory((prev) => {
        const nextId = prev.length;
        return [
          ...prev,
          {
            id: nextId,
            component: (
              <Box flexDirection="column">
                <Box>
                  <Text color="cyan" bold>
                    dev
                  </Text>
                </Box>
                <Box flexDirection="column" marginBottom={1} padding={1}>
                  <Text>{displayText}</Text>
                </Box>
              </Box>
            ),
          },
        ];
      });

      // Envia para o backend (sem limite - envia o texto completo)
      const message = JSON.stringify({ type: "user_message", content: text });

      try {
        backendProcess.current.stdin.write(message + "\n");
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
      }

      setQuery("");
      setIsTextLimited(false);
    },
    [isProcessing]
  );

  // Lógica da animação
  const spacesBeforeDot = " ".repeat(position);
  const spacesAfterDot = " ".repeat(maxPosition - position);

  return (
    <Box flexDirection="column">
      <Static items={history}>
        {(item) => <Box key={item.id}>{item.component}</Box>}
      </Static>

      {statusMessage && (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" /> {statusMessage}
          </Text>
        </Box>
      )}

      {isProcessing ? (
        <Box 
        borderStyle="round"
        borderColor="white">
          <Text color="magenta">
            ({spacesBeforeDot}●{spacesAfterDot}) Working...
          </Text>
        </Box>
      ) : (
        <Box
          borderStyle="round"
          borderColor="white"
          flexDirection="row"
          alignItems="center"
        >
          <Text bold>{">"} </Text>
          <Box flexGrow={1}>
            <TextInput
              value={query}
              onChange={handleQueryChange}
              onSubmit={handleSubmit}
            />
          </Box>
        </Box>
      )}

      {isTextLimited && (
        <Box marginTop={1}>
          <Text color="yellow">
            ⚠️ Texto limitado a 5000 caracteres para melhor performance
          </Text>
        </Box>
      )}

      <Box flexDirection="column" justifyContent="center" alignItems="center">
        <Text color="gray" bold>
          BluMa Senior Full Stack Developer
        </Text>
      </Box>
    </Box>
  );
});

export default App;
