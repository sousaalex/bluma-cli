import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, Static } from "ink";
import Spinner from "ink-spinner";
import { EventEmitter } from "events";

import { Header, SessionInfo } from "./layout";
import { InputPrompt } from "./input/InputPrompt";
import { ConfirmationPrompt } from "./ConfirmationPrompt";
import { Agent } from "../agent/agent.js";

// --- Interfaces e Componentes (inalterados) ---

interface HistoryItem {
  id: number;
  component: React.ReactElement;
}

export interface AppProps {
  eventBus: EventEmitter;
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
      let thinkingData;
      if (typeof args === "string") {
        thinkingData = JSON.parse(args);
      } else if (args && typeof args === "object") {
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
          </Box>
          <Box flexDirection="column" marginBottom={1}>
            <Text color="gray">{thinkingData.thought}</Text>
          </Box>
        </Box>
      );
    } catch (e) {
      return (
        <Box
          borderStyle="round"
          borderColor="blue"
          marginBottom={1}
          paddingX={1}
        >
          <Text color="blue" bold>
            Thinking Process (Raw)
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
  const MAX_LINES = 4; // Um valor razoável para exibir a prévia de um JSON

  // --- Lógica de Exclusão (inalterada) ---
  // Ferramentas que não devem exibir um resultado visual.
  if (toolName.includes("agent_end_task") || toolName.includes("notebook_sequentialthinking_tools")) {
    return null;
  }

  // --- Lógica de Renderização Especial para `message_notify_dev` (inalterada) ---
  // Esta ferramenta tem uma UI customizada.
  if (toolName.includes("message_notify_dev")) {
    try {
      const parsed = JSON.parse(result);
      if (parsed.content && parsed.content.body) {
        return (
          <Box flexDirection="column">
            <Box>
              <Text color="magenta" bold>
                bluma
              </Text>
            </Box>
            <Box flexDirection="column" marginBottom={1}>
              <Text>{parsed.content.body}</Text>
            </Box>
          </Box>
        );
      }
    } catch (e) {
      // Se o parse falhar, ele usará a lógica de fallback abaixo.
    }
  }

  // --- Lógica Principal de Formatação e Truncamento (ATUALIZADA) ---

  let formattedResult = result;
  try {
    // 1. Tenta fazer o parse da string de resultado como se fosse JSON.
    const parsedJson = JSON.parse(result);
    // 2. Se for bem-sucedido, formata o objeto JSON de volta para uma string,
    //    mas com indentação de 2 espaços. Isso cria as quebras de linha (`\n`)
    //    necessárias para o truncamento funcionar.
    formattedResult = JSON.stringify(parsedJson, null, 2);
  } catch (e) {
    // 3. Se a string não for um JSON válido (ex: uma saída de texto simples do shell_command),
    //    não faz nada e usa a string original.
    formattedResult = result;
  }

  // 4. A lógica de truncamento agora opera sobre a string formatada.
  const lines = formattedResult.split("\n");
  const isTruncated = lines.length > MAX_LINES;
  const visibleLines = isTruncated ? lines.slice(0, MAX_LINES) : lines;
  const remainingCount = lines.length - MAX_LINES;

  // --- Renderização de Fallback ---
  // Exibe o resultado (formatado e truncado) para todas as outras ferramentas.
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

const App = React.memo(({ eventBus, sessionId }: AppProps) => {
  const agentInstance = useRef<Agent | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    "Initializing agent..."
  );
  const [toolsCount, setToolsCount] = useState<number | null>(null);
  const [mcpStatus, setMcpStatus] = useState<"connecting" | "connected">(
    "connecting"
  );
  const [isProcessing, setIsProcessing] = useState(true);
  const [position, setPosition] = useState(0);
  const [pendingConfirmation, setPendingConfirmation] = useState<any[] | null>(
    null
  );
  const alwaysAcceptList = useRef<string[]>([]);
  const workdir = process.cwd();
  const maxPosition = 3;

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || isProcessing || !agentInstance.current) return;
      setIsProcessing(true);

      const displayText =
        text.length > 10000 ? text.substring(0, 10000) + "..." : text;
      setHistory((prev) => [
        ...prev,
        {
          id: prev.length,
          component: (
            <Box flexDirection="column">
              <Box>
                <Text color="cyan" bold>
                  you
                </Text>
              </Box>
              <Box flexDirection="column" marginBottom={1}>
                <Text>{displayText}</Text>
              </Box>
            </Box>
          ),
        },
      ]);

      agentInstance.current.processTurn({ content: text });
    },
    [isProcessing]
  );

  const handleConfirmation = useCallback(
    (decision: "accept" | "decline" | "accept_always", toolCalls: any[]) => {
      if (!agentInstance.current) return;
      setPendingConfirmation(null);
      setIsProcessing(true);

      let finalDecision = decision;
      if (decision === "accept_always") {
        const toolNameToWhitelist = toolCalls[0].function.name;
        if (!alwaysAcceptList.current.includes(toolNameToWhitelist)) {
          alwaysAcceptList.current.push(toolNameToWhitelist);
        }
        finalDecision = "accept";
      }

      const messageType =
        finalDecision === "accept"
          ? "user_decision_execute"
          : "user_decision_decline";
      agentInstance.current.handleToolResponse({
        type: messageType,
        tool_calls: toolCalls,
      });
    },
    []
  );

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setPosition((prev) => (prev >= maxPosition ? 0 : prev + 1));
    }, 100);
    return () => clearInterval(interval);
  }, [isProcessing]);

  // <<< MUDANÇA: useEffect principal agora vai direto para a inicialização do agente >>>
  useEffect(() => {
    setHistory([{ id: 0, component: <Header /> }]);

    const initializeAgent = async () => {
      try {
        // 1. Cria e inicializa o agente (carrega ferramentas, histórico, etc.)
        agentInstance.current = new Agent(sessionId, eventBus);
        await agentInstance.current.initialize();

        // 2. Se a inicialização for bem-sucedida, emite o status de "conectado".
        // A conexão com o LLM será testada implicitamente na primeira chamada de `processTurn`.
        eventBus.emit("backend_message", {
          type: "status",
          status: "mcp_connected",
          tools: agentInstance.current.getAvailableTools().length,
        });
      } catch (error) {
        // Se a inicialização falhar (ex: não encontrar chaves de API), emite um erro.
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error during Agent initialization.";
        eventBus.emit("backend_message", {
          type: "error",
          message: errorMessage,
        });
      }
    };

    const handleBackendMessage = (parsed: any) => {
      try {
        if (parsed.type === "confirmation_request") {
          const toolToConfirm = parsed.tool_calls[0].function.name;
          if (alwaysAcceptList.current.includes(toolToConfirm)) {
            handleConfirmation("accept", parsed.tool_calls);
            return;
          }
          setPendingConfirmation(parsed.tool_calls);
          setIsProcessing(false);
          return;
        }

        if (parsed.type === "done") {
          if (parsed.status !== "awaiting_confirmation") {
            setStatusMessage(null);
          }
          setIsProcessing(false);
          return;
        }

        if (parsed.type === "status" && parsed.status === "mcp_connected") {
          setStatusMessage(null);
          setToolsCount(parsed.tools);
          setMcpStatus("connected");
          setIsProcessing(false);
          setHistory((prev) => {
            const newHistory = [...prev];
            if (prev.length < 2) {
              newHistory.push({
                id: 1,
                component: (
                  <SessionInfo
                    sessionId={sessionId}
                    toolsCount={parsed.tools}
                    mcpStatus={"connected"}
                    workdir={workdir}
                  />
                ),
              });
            }
            return newHistory;
          });
          return;
        }

        if (parsed.type === "error") {
          setStatusMessage(null);
          setIsProcessing(false);
        }

        let newComponent: React.ReactElement | null = null;
        if (parsed.type === "debug") {
          newComponent = <Text color="gray">🔍 {parsed.message}</Text>;
        } else if (parsed.type === "protocol_violation") {
          newComponent = (
            <Box
              borderStyle="round"
              borderColor="yellow"
              flexDirection="column"
              marginBottom={1}
              paddingX={1}
            >
              {" "}
              <Text color="yellow" bold>
                {" "}
                ⚠️ Protocol Violation{" "}
              </Text>{" "}
              <Text color="gray">{parsed.content}</Text>{" "}
              <Text color="yellow">{parsed.message}</Text>{" "}
            </Box>
          );
        } else if (parsed.type === "agent_response") {
          newComponent = (
            <Box>
              {" "}
              <Text color="magenta">bluma:</Text> <Text> {parsed.content}</Text>{" "}
            </Box>
          );
        } else if (parsed.type === "error") {
          newComponent = <Text color="red">❌ {parsed.message}</Text>;
        } else if (parsed.type === "tool_call") {
          newComponent = (
            <ToolCall toolName={parsed.tool_name} args={parsed.arguments} />
          );
        } else if (parsed.type === "tool_result") {
          newComponent = (
            <ToolResult toolName={parsed.tool_name} result={parsed.result} />
          );
        }

        if (newComponent) {
          setHistory((prev) => [
            ...prev,
            { id: prev.length, component: newComponent },
          ]);
        }
      } catch (error) {
        // Ignora erros
      }
    };

    eventBus.on("backend_message", handleBackendMessage);
    initializeAgent();

    return () => {
      eventBus.off("backend_message", handleBackendMessage);
    };
  }, [eventBus, sessionId, handleConfirmation]);

  const spacesBeforeDot = " ".repeat(position);
  const spacesAfterDot = " ".repeat(maxPosition - position);

  return (
    <Box flexDirection="column">
      <Static items={history}>
        {(item) => <Box key={item.id}>{item.component}</Box>}
      </Static>

      {statusMessage && mcpStatus !== "connected" && (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" /> {statusMessage}
          </Text>
        </Box>
      )}

      {isProcessing ? (
        <Box borderStyle="round" borderColor="white">
          <Text color="magenta">
            ({spacesBeforeDot}●{spacesAfterDot}) Working...
          </Text>
        </Box>
      ) : pendingConfirmation ? (
        <ConfirmationPrompt
          toolCalls={pendingConfirmation}
          onDecision={(decision) =>
            handleConfirmation(decision, pendingConfirmation)
          }
        />
      ) : (
        mcpStatus === "connected" && <InputPrompt onSubmit={handleSubmit} />
      )}

      {mcpStatus === "connected" && (
        <Box justifyContent="center" width="100%">
          <Text color="gray" dimColor>
            BluMa Senior Full Stack Developer
          </Text>
        </Box>
      )}
    </Box>
  );
});

export default App;
