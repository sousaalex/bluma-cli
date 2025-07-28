import React, { useState, useEffect, useRef, useCallback, memo } from 'react'; // Adicionado 'memo'
import { Box, Text, Static } from "ink";
import Spinner from "ink-spinner";
import { EventEmitter } from "events";

import { Header, SessionInfo } from "./layout";
import { InputPrompt } from "./input/InputPrompt";
import { ConfirmationPrompt } from "./ConfirmationPrompt";
import { Agent } from "../agent/agent.js";

import { WorkingSpinner } from './WorkingSpinner.js'; // Importe o novo spinner

import { ToolCallDisplay } from './components/ToolCallDisplay.js';
import { ToolResultDisplay } from './components/ToolResultDisplay.js'; 

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
  const [confirmationPreview, setConfirmationPreview] = useState<string | null>(null);

  const alwaysAcceptList = useRef<string[]>([]);
  const workdir = process.cwd();

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
            <Box >
              <Box flexDirection="row" alignItems="center">
                <Text color="white" dimColor>
                  {">"} {""}
                </Text>
              </Box>
              <Box flexDirection="column" marginBottom={1}>
                <Text color="white" dimColor>{displayText}</Text>
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
              {" "}
              <Text color="yellow" bold>
                {" "}
                Protocol Violation{" "}
              </Text>{" "}
              <Text color="gray">{parsed.content}</Text>{" "}
              <Text color="yellow">{parsed.message}</Text>{" "}
            </Box>
          );
        } else if (parsed.type === "error") {
          newComponent = <Text color="red">❌ {parsed.message}</Text>;
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

  // --- Lógica de Renderização Unificada ---

  const renderInteractiveComponent = () => {
    if (mcpStatus !== 'connected') {
      return (
        <Box borderStyle="round" borderColor="black">
          <Text color="yellow">
            <Spinner type="dots" /> {statusMessage || 'Connecting...'}
          </Text>
        </Box>
      );
    }
    
    // OTIMIZAÇÃO 2: Use o componente de spinner isolado
    if (isProcessing) {
      return <WorkingSpinner />;
    }

    if (pendingConfirmation) {
      return (
        <ConfirmationPrompt
          toolCalls={pendingConfirmation}
          // V--- PASSE O PREVIEW PARA O COMPONENTE ---V
          preview={confirmationPreview} 
          onDecision={(decision) => {
            // Limpa o preview quando a decisão é tomada
            setConfirmationPreview(null);
            handleConfirmation(decision, pendingConfirmation)
          }}
        />
      );
    }
    return <InputPrompt onSubmit={handleSubmit} />;
  };

  return (
    <Box flexDirection="column">
      <Static items={history}>
        {(item) => <Box key={item.id}>{item.component}</Box>}
      </Static>

      {renderInteractiveComponent()}

      {/* {mcpStatus === 'connected' && (
        <Box justifyContent="center" width="100%">
          <Text color="gray" dimColor>BluMa Senior Full Stack Developer</Text>
        </Box>
      )} */}
    </Box>
  );
};

// --- Exportação Otimizada ---
// Memorize o App inteiro também, como uma boa prática final.
export const App = memo(AppComponent);
export default App;