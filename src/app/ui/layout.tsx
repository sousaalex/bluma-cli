
import { Box, Text } from 'ink';

// Estilizado: Header ASCII animado universal
import BigText from 'ink-big-text';
;

const BRAND_COLORS = {
  main: 'cyan',
  accent: 'magenta',
  shadow: 'blue',
  greydark: '#444',
};

export const Header = () => {
    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height={8}>
            <BigText
                text="BluMa CLI"
                font="block"
                colors={[BRAND_COLORS.main, BRAND_COLORS.accent, BRAND_COLORS.shadow]}
            />
        </Box>
    );
};


// --- SessionInfo --- //
// Este componente exibe informações detalhadas da sessão do BluMa Engineer em tempo real.
// Útil para debugging e acompanhamento em ambientes CLI ou TUI com Ink.
// Os comentários a seguir explicam cada bloco e estratégia:

export const SessionInfo = ({ 
    sessionId,      // ID único da sessão atual, para segregação ou rastreio
    workdir,        // Diretório de trabalho atual do BluMa, útil para saber contexto da execução
    toolsCount,     // Número de ferramentas ativas carregadas pelo MCP
    mcpStatus       // Estado da conexão central MCP (connecting/connected)
}: { 
    sessionId: string; // Define o prop obrigatório da sessão
    workdir: string;   // Define o prop obrigatório do diretório
    toolsCount: number | null; // Pode ser null se ainda carregando
    mcpStatus: 'connecting' | 'connected'; // String restrita para status
}) => (
    <Box 
        borderStyle="round"    // Borda arredondada para destaque visual
        borderColor="gray"     // Borda cinza, mantém discreto mas separado
        paddingX={1}           // Espaço horizontal entre a borda e o conteúdo
        flexDirection="column" // Empilha itens em coluna para melhor leitura
        marginBottom={1}       // Espaço abaixo, separa visualmente dos próximos componentes
    >
        {/* Linha principal: hostname e ID da sessão (identidade visual da CLI) */}
        <Text>
            <Text bold color="white">localhost</Text> 
            <Text color="gray"> session:</Text>{' '}
            <Text color="magenta">{sessionId}</Text>
        </Text>
        {/* Linha do diretório de trabalho (contexto de execução do agente) */}
        <Text>
            <Text color="magenta">↳</Text>{' '}
            <Text color="gray">workdir: {workdir}</Text>
        </Text>
        {/* Linha identificando o agente humano ou IA responsável */}
        <Text>
            <Text color="magenta">↳</Text> 
            <Text color="gray">agent: BluMa</Text>
        </Text>
        {/* Linha do status do MCP (central de coordenação dos plugins/ações) */}
        <Text>
            <Text color="magenta">↳</Text> 
            <Text color="gray">MCP: </Text>
            <Text color={mcpStatus === 'connected' ? 'green' : 'yellow'}>
                {/* Verde indica MCP operativo, amarelo é "tentando conectar" */}
                {mcpStatus}
            </Text>
        </Text>
        {/* Linha com total de ferramentas conectadas ou "loading..." se carregando */}
        <Text>
            <Text color="magenta">↳</Text> 
            <Text color="gray">Tools: </Text>
            <Text color="cyan">
                {/* Exibe valor dinâmico ou mensagem amigável de aguardo */}
                {toolsCount !== null ? toolsCount : 'loading...'}
            </Text>
        </Text>
    </Box>
);