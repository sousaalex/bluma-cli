import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, Static } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { Header, SessionInfo } from "./ui/UI";
import { spawn, ChildProcess } from "child_process"; // Mude a importação para ser mais genérica
import { ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { InputPrompt } from '../components/ui/InputPrompt'

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
      // console.log("JSON PARCED:", parsed);

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
  const [statusMessage, setStatusMessage] = useState<string | null>(
    "Starting..."
  );
  const [toolsCount, setToolsCount] = useState<number | null>(null);
  const [mcpStatus, setMcpStatus] = useState<"connecting" | "connected">(
    "connecting"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const backendProcess = useRef<ChildProcessWithoutNullStreams | null>(null);
  const [position, setPosition] = useState(0);

  const workdir = process.cwd();

  const maxPosition = 3; // controla quantas "colunas" dentro dos parênteses


  useEffect(() => {
    if (!isProcessing) return; // não faz nada se não estiver processando

    const interval = setInterval(() => {
      setPosition((prev) => (prev >= maxPosition ? 0 : prev + 1));
    }, 100); // velocidade da animação

    return () => clearInterval(interval); // limpa intervalo ao desmontar/parar
  }, [isProcessing]);

  useEffect(() => {
    // 1. O histórico agora começa vazio. O Header e o SessionInfo são renderizados fora dele.
    setHistory([
      { id: 0, component: <Header /> },
      // {
      //   id: 1,
      //   component: (
      //     <SessionInfo
      //       sessionId={sessionId}
      //       toolsCount={toolsCount}
      //       mcpStatus={mcpStatus}
      //       workdir={workdir} // <-- ADICIONE A PROP AQUI
      //     />
      //   ),
      // },
    ]);

    // 2. A lógica para encontrar o backend permanece a mesma.
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const isWin = process.platform === "win32";
    const backendExecutableName = isWin ? "bluma.exe" : "bluma";
    const backendPath = path.resolve(__dirname, backendExecutableName);

    // Depuração (pode ser removida em produção)
    // console.log('Caminho final do backend:', backendPath);
    // console.log('Diretório de trabalho atual:', process.cwd());

    const backend = spawn(backendPath, [sessionId], {
      stdio: ["pipe", "pipe", "pipe"],
      
    });
    backendProcess.current = backend;

    // 3. Os listeners de eventos do processo (error, exit) permanecem os mesmos.
    backend.on("error", (error) => {
      console.error("Erro no processo backend:", error);
      console.error("Caminho tentado:", backendPath);
    });

    backend.on("exit", (code, signal) => {
      if (code !== 0) {
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
                {/* <Text color="gray">O processo backend terminou inesperadamente (código: {code})</Text> */}
                <Text color="gray">We will repeat the initialization</Text>
              </Box>
            ),
          },
        ]);
        setStatusMessage(null);
        setIsProcessing(false);
      }
    });

    // 4. O listener principal de 'data' é onde a mágica acontece.
    backend.stdout.on("data", (data) => {
      const messages = data.toString().split("\n").filter(Boolean);
      messages.forEach((message: string) => {
        try {
          const parsed = JSON.parse(message);

          // --- INÍCIO DA LÓGICA DE ATUALIZAÇÃO CORRIGIDA ---

          // Lógica que atualiza estados, mas NÃO o histórico.
          if (parsed.type === "connection_status") {
            setStatusMessage(parsed.message);
            return; // Sai da função forEach para esta mensagem
          }

          if (parsed.type === "status" && parsed.status === "mcp_connected") {
            setStatusMessage(null);
            setToolsCount(parsed.tools);
            setMcpStatus("connected");
            setHistory((prev) => {
              const newHistory = [...prev];

              // Substitui o item 1 (SessionInfo) por uma nova versão com os dados atualizados
              newHistory[1] = {
                id: 1,
                component: (
                  <SessionInfo
                    sessionId={sessionId}
                    toolsCount={parsed.tools} // Usa o dado recebido
                    mcpStatus={"connected"} // Usa o dado recebido
                    workdir={workdir}
                  />
                ),
              };
              return newHistory;
            });
            return; // Importante
          }

          if (
            parsed.type === "done" ||
            (parsed.type === "tool_call" &&
              parsed.tool_name.includes("agent_end_task")) ||
            (parsed.type === "tool_result" &&
              parsed.tool_name.includes("agent_end_task"))
          ) {
            setIsProcessing(false);
            setStatusMessage(null);
            // Se for um 'done', não precisa adicionar nada ao histórico.
            // Se for um 'agent_end_task', o componente já retorna null, então não há problema.
            if (parsed.type === "done") return;
          }

          if (parsed.type === "error") {
            setStatusMessage(null);
            setIsProcessing(false);
            // O erro será adicionado ao histórico abaixo.
          }

          // Lógica que SEMPRE adiciona um componente ao histórico.
          // Se nenhum dos 'if' abaixo for satisfeito, nada é adicionado.
          let newComponent: React.ReactElement | null = null;

          if (parsed.type === "debug") {
            newComponent = <Text color="gray">🔍 {parsed.message}</Text>;
          } else if (parsed.type === "completion") {
            setIsProcessing(false);
            setStatusMessage(null);
            newComponent = <Text color="green">🎯 {parsed.message}</Text>;
          } else if (parsed.type === "feedback") {
            const colorMap = {
              error: "red",
              excellent: "green",
              good: "blue",
              warning: "yellow",
            };
            const color =
              colorMap[parsed.level as keyof typeof colorMap] || "white";
            newComponent = (
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
            );
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
                  ⚠️ Protocol Violation
                </Text>
                <Text color="gray">{parsed.content}</Text>
                <Text color="yellow">{parsed.message}</Text>
              </Box>
            );
          } else if (parsed.type === "warning") {
            newComponent = <Text color="yellow">⚠️ {parsed.message}</Text>;
          } else if (parsed.type === "agent_response") {
            newComponent = (
              <Box>
                <Text color="magenta">bluma:</Text>
                <Text> {parsed.content}</Text>
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

          // Adiciona o novo componente ao histórico, se ele foi criado.
          if (newComponent) {
            setHistory((prev) => [
              ...prev,
              { id: prev.length, component: newComponent },
            ]);
          }

          // --- FIM DA LÓGICA DE ATUALIZAÇÃO CORRIGIDA ---
        } catch (error) {
          // Ignora erros de parsing de JSON
        }
      });
    });

    // 5. A função de cleanup permanece a mesma.
    return () => {
      if (backendProcess.current) {
        backendProcess.current.kill();
      }
    };
  }, [sessionId]);

  const handleSubmit = useCallback(
    (text: string) => { // 'text' agora vem diretamente do InputPrompt
      if (!text || !backendProcess.current || isProcessing) return;

      setIsProcessing(true);

      const maxLength = 10000;
      const displayText =
        text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

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

      const message = JSON.stringify({ type: "user_message", content: text });

      try {
        backendProcess.current.stdin.write(message + "\n");
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
      }

      // REMOVA: setQuery("");
    },
    [isProcessing] // Remova 'query' das dependências se estiver lá
  );

  // Lógica da animação
  const spacesBeforeDot = " ".repeat(position);
  const spacesAfterDot = " ".repeat(maxPosition - position);

  return (
    <Box flexDirection="column">
      {/* 1. Renderize os componentes "estáticos" do cabeçalho diretamente. */}

      <Static items={history}>
        {(item) => <Box key={item.id}>{item.component}</Box>}
      </Static>

      {statusMessage && mcpStatus !== "connected" && (
        <Box borderStyle="round" borderColor="white" flexDirection="row">
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
      ) : (
        mcpStatus === 'connected' && (
          // SUBSTITUA o bloco do TextInput por isto:
          <InputPrompt onSubmit={handleSubmit} />
        )
      )}

      {mcpStatus === "connected" && (
        <Box flexDirection="column" justifyContent="center" alignItems="center">
          <Text color="gray" dimColor>
            BluMa Senior Full Stack Developer
          </Text>
        </Box>
      )}
    </Box>
  );
});

export default App;
