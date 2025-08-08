//App.tsx
// Ficheiro: src/app/ui/App.tsx
import React, { useState, useEffect, useRef, useCallback, memo } from "react"; // Adicionado 'memo'
import { Box, Text, Static } from "ink";
import { EventEmitter } from "events";

import { Header, SessionInfo } from "./layout";
import { InputPrompt, uiEventBus } from "./components/InputPrompt";
import { ConfirmationPrompt } from "./ConfirmationPrompt";
import { Agent } from "../agent/agent.js";

import { WorkingTimer } from "./WorkingTimer.js";

import { ToolCallDisplay } from "./components/ToolCallDisplay.js";
import { ToolResultDisplay } from "./components/ToolResultDisplay.js";
import SessionInfoConnectingMCP from "./SessionInfoConnectingMCP.js";
import SlashCommands from "./components/SlashCommands.js";
import { checkForUpdates } from "../agent/utils/update_check.js";
import UpdateNotice from "./components/UpdateNotice.js";
import ErrorMessage from "./components/ErrorMessage.js";

// --- Interfaces e Componentes (inalterados) ---

interface HistoryItem {
  id: number;
  component: React.ReactElement;
}

export interface AppProps {
  eventBus: EventEmitter;
  sessionId: string;
}

const AppComponent = ({ eventBus, sessionId }: AppProps) => {
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
  const [pendingConfirmation, setPendingConfirmation] = useState<any[] | null>(
    null
  );
  const [confirmationPreview, setConfirmationPreview] = useState<string | null>(
    null
  );

  // Novo: bloqueio total do input durante execução do subagente /init
  const [isInitAgentActive, setIsInitAgentActive] = useState(false);

  const alwaysAcceptList = useRef<string[]>([]);
  const workdir = process.cwd();
  const updateCheckRan = useRef<boolean>(false);

  const handleInterrupt = useCallback(() => {
    if (!isProcessing) return; // Só interrompe se estiver a processar

    // Emite um evento para o agente parar o que está a fazer
    eventBus.emit("user_interrupt");

    // Atualiza a UI imediatamente
    setIsProcessing(false);
    setHistory((prev) => [
      ...prev,
      {
        id: prev.length,
        component: <Text color="yellow">-- Task cancelled by dev. --</Text>,
      },
    ]);
  }, [isProcessing, eventBus]);

  // Delegated slash command renderer is handled by SlashCommands component

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || isProcessing || !agentInstance.current) return;

      // Intercepta comandos de slash
      if (text.startsWith("/")) {
        const [cmd] = text.slice(1).trim().split(/\s+/);
        // If it's just a single slash without a command, do nothing (avoid stray echo)
        if (!cmd) {
          setIsProcessing(false);
          return;
        }
        // BLOQUEIA TOTAL SE FOR /init
        if (cmd === "init") {
          setIsInitAgentActive(true);
          // Ativa o estado de processamento apenas para /init
          setIsProcessing(true);
        } else {
          // Não ativamos o estado de processamento para comandos de consulta (/help, /tools, /mcp, etc.)
          setIsProcessing(false);
          setIsInitAgentActive(false);
        }
        setHistory((prev) => [
          ...prev,
          {
            id: prev.length,
            component: (
              <Box marginBottom={1}>
                <Text color="white" dimColor>
                  {text}
                </Text>
              </Box>
            ),
          },
          {
            id: prev.length + 1,
            component: (
              <SlashCommands
                input={text}
                setHistory={setHistory as any}
                agentRef={agentInstance as any}
              />
            ),
          },
        ]);
        return;
      }

      setIsProcessing(true);

      const displayText =
        text.length > 10000 ? text.substring(0, 10000) + "..." : text;
      setHistory((prev) => [
        ...prev,
        {
          id: prev.length,
          component: (
            // Uma única Box para o espaçamento
            <Box marginBottom={1}>
              {/* Um único Text que contém tudo */}
              <Text color="white" dimColor>
                {/* O prompt e o texto são renderizados como um bloco contínuo */}
                <Text color="white">{"❯"} </Text>
                {displayText}
              </Text>
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
    setHistory([{ id: 0, component: <Header /> }]);

    const initializeAgent = async () => {
      try {
        agentInstance.current = new Agent(sessionId, eventBus);
        await agentInstance.current.initialize();
        eventBus.emit("backend_message", {
          type: "status",
          status: "mcp_connected",
          tools: agentInstance.current.getAvailableTools().length,
        });
      } catch (error) {
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
        // Libera input quando terminar /init
        if (parsed.type === "done" || parsed.type === "error") {
          setIsInitAgentActive(false);
        }
        if (parsed.type === "connection_status") {
          setStatusMessage(parsed.message);
          return;
        }
        if (parsed.type === "confirmation_request") {
          const toolToConfirm = parsed.tool_calls[0].function.name;
          if (alwaysAcceptList.current.includes(toolToConfirm)) {
            handleConfirmation("accept", parsed.tool_calls);
            return;
          }

          setPendingConfirmation(parsed.tool_calls);
          setConfirmationPreview(parsed.preview || null); // Armazena o preview ou null

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

          if (!updateCheckRan.current) {
            updateCheckRan.current = true;
            Promise.resolve()
              .then(() => checkForUpdates())
              .then((msg) => {
                if (msg) {
                  setHistory((prev) => [
                    ...prev,
                    {
                      id: prev.length,
                      component: <UpdateNotice message={msg} />,
                    },
                  ]);
                }
              })
              .catch(() => void 0);
          }

          return;
        }
        if (parsed.type === "error") {
          setStatusMessage(null);
          setIsProcessing(false);
        }
        let newComponent: React.ReactElement | null = null;
        if (parsed.type === "debug") {
          newComponent = <Text color="gray">{parsed.message}</Text>;
        } else if (parsed.type === "protocol_violation") {
          newComponent = (
            <Box
              borderStyle="round"
              borderColor="yellow"
              flexDirection="column"
              marginBottom={1}
              paddingX={1}
            >
              <Text color="yellow" bold>
                Protocol Violation
              </Text>
              <Text color="gray">{parsed.content}</Text>
              <Text color="yellow">{parsed.message}</Text>
            </Box>
          );
        } else if (parsed.type === "error") {
          newComponent = (
            <ErrorMessage
              message={parsed.message}
              details={parsed.details || undefined}
              hint={parsed.hint || undefined}
            />
          );
        } else if (parsed.type === "tool_call") {
          newComponent = (
            <ToolCallDisplay
              toolName={parsed.tool_name}
              args={parsed.arguments}
              preview={parsed.preview}
            />
          );
        } else if (parsed.type === "tool_result") {
          newComponent = (
            <ToolResultDisplay
              toolName={parsed.tool_name}
              result={parsed.result}
            />
          );
        } else if (parsed.type === "user_overlay") {
          newComponent = (
            <Box marginBottom={1}>
              <Text color="gray">
                <Text color="magenta">{"❯"} </Text>
                {parsed.payload}
              </Text>
            </Box>
          );
        } else if (parsed.type === "log") {
          newComponent = (
            <Text color="gray">
              ℹ️ {parsed.message}
              {parsed.payload ? `: ${parsed.payload}` : ""}
            </Text>
          );
        } else if (parsed.type === "assistant_message" && parsed.content) {
          newComponent = null; // Não renderiza nada na tela
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

    // Ponte UI→Agent: reenvia eventos user_overlay do uiEventBus para o eventBus do App/Agent
    const handleUiOverlay = (data: {
      kind?: string;
      payload: string;
      ts?: number;
    }) => {
      // Propaga para o agente; a renderização virá do próprio Agent via backend_message
      eventBus.emit("user_overlay", data);
    };

    uiEventBus.on("user_overlay", handleUiOverlay);

    eventBus.on("backend_message", handleBackendMessage);
    initializeAgent();

    return () => {
      uiEventBus.off("user_overlay", handleUiOverlay);
      eventBus.off("backend_message", handleBackendMessage);
    };
  }, [eventBus, sessionId, handleConfirmation]);

  // --- Lógica de Renderização Unificada ---

  const renderInteractiveComponent = () => {
    if (mcpStatus !== "connected") {
      return (
        <Box borderStyle="round" borderColor="black">
          <SessionInfoConnectingMCP
            sessionId={sessionId}
            workdir={workdir}
            statusMessage={statusMessage}
          />
        </Box>
      );
    }

    if (pendingConfirmation) {
      return (
        <ConfirmationPrompt
          toolCalls={pendingConfirmation}
          preview={confirmationPreview}
          onDecision={(decision) => {
            setConfirmationPreview(null);
            handleConfirmation(decision, pendingConfirmation);
          }}
        />
      );
    }

    // O InputPrompt é agora renderizado aqui, juntamente com o spinner se necessário
    return (
      <Box flexDirection="column">
        {/* O spinner só aparece quando está a processar E não há confirmação pendente */}
        {isProcessing && !pendingConfirmation && <WorkingTimer />}
        <InputPrompt
          onSubmit={handleSubmit}
          isReadOnly={isProcessing || isInitAgentActive}
          disableWhileProcessing={isInitAgentActive}
          onInterrupt={handleInterrupt}
        />
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Static items={history}>
        {(item) => <Box key={item.id}>{item.component}</Box>}
      </Static>
      {renderInteractiveComponent()}
    </Box>
  );
};

export const App = memo(AppComponent);
export default App;
