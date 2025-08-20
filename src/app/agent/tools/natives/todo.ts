// Interfaces para clareza e segurança de tipos
export interface TodoArgs {
  action: 'list' | 'add' | 'complete' | 'remove';
  // Note que 'to_do' no add agora é opcional, pois o agente irá injetá-lo.
  // Mas para o 'add', o conteúdo novo virá por aqui.
  items_to_add?: string[]; 
  
  index?: number; // 1-based para completar ou remover

  // Este campo será injetado pelo agente, não pelo LLM.
  current_list?: string[];
}

export interface TodoParsedItem {
  index: number;
  status: 'done' | 'pending';
  text: string;
}

export interface TodoToolResult {
  parsed: TodoParsedItem[];
  render: string; // Checklist formatado para humanos (e para o LLM)
}

// O resultado que a ferramenta retorna PARA O AGENTE
export interface TodoResult {
  to_do: string[]; // A lista completamente nova e atualizada
  removed?: string | null;
  _tool_result: TodoToolResult;
}

// --- Funções Auxiliares (sem alterações) ---

function ensureChecklistFormat(arr: string[] | undefined): string[] {
  if (!arr) return [];
  return arr.map((s) => {
    if (typeof s !== 'string') return String(s);
    if (s.startsWith('🗹 ') || s.startsWith('☐ ')) return s;
    return `☐ ${s}`;
  });
}

function parseItem(str: string): { status: 'done' | 'pending'; text: string } {
  const trimmed = str.trim();
  if (trimmed.startsWith('🗹 ')) {
    return { status: 'done', text: trimmed.slice(2).trim() };
  }
  if (trimmed.startsWith('☐ ')) {
    return { status: 'pending', text: trimmed.slice(2).trim() };
  }
  return { status: 'pending', text: trimmed };
}

function renderChecklist(arr: string[]): string {
  if (!arr || arr.length === 0) return '(A lista de tarefas está vazia)';
  // Adiciona quebras de linha para melhor formatação no log/UI
  return arr.map((s, i) => `${i + 1}. ${s}`).join('\n');
}


// --- A LÓGICA PRINCIPAL DA FERRAMENTA ---

export async function todo(args: TodoArgs): Promise<TodoResult> {
  const action = args.action || 'list';
  // A ferramenta agora opera sobre a `current_list` injetada pelo agente.
  let to_do = ensureChecklistFormat(args.current_list);

  let output_render: string;

  switch (action) {
    case 'list':
      // Ação não muda nada, apenas renderiza
      break;

    case 'add': {
      if (!Array.isArray(args.items_to_add) || args.items_to_add.length === 0) {
        throw new Error("É necessário fornecer 'items_to_add' para a ação 'add'.");
      }
      // Adiciona os novos itens à lista existente
      const newItemsFormatted = ensureChecklistFormat(args.items_to_add);
      to_do = [...to_do, ...newItemsFormatted];
      break;
    }

    case 'complete': {
      const idx = args.index;
      if (!idx || idx < 1 || idx > to_do.length) {
        throw new Error('Índice inválido ou fora do intervalo para completar.');
      }
      const i = idx - 1;
      const parsed = parseItem(to_do[i]);
      if (parsed.status !== 'done') {
        to_do[i] = `🗹 ${parsed.text}`;
      }
      break;
    }

    case 'remove': {
      const idx = args.index;
      if (!idx || idx < 1 || idx > to_do.length) {
        throw new Error('Índice inválido ou fora do intervalo para remover.');
      }
      const i = idx - 1;
      const removed = to_do.splice(i, 1);
      
      // Monta o objeto de resultado e retorna imediatamente para incluir o item removido
      output_render = renderChecklist(to_do);
      return {
        to_do,
        removed: removed[0] || null,
        _tool_result: {
          parsed: to_do.map((t, i) => ({ index: i + 1, ...parseItem(t) })),
          render: `Item '${parseItem(removed[0]).text}' removido.\nLista atual:\n${output_render}`,
        },
      };
    }

    default:
      // Força um erro se a ação for desconhecida
      throw new Error(`Ação desconhecida: ${action}`);
  }

  // Para 'list', 'add', e 'complete', o resultado é montado aqui
  output_render = renderChecklist(to_do);
  let render_message = `Lista de tarefas atual:\n${output_render}`;
  if (action === 'add') render_message = `Item(s) adicionado(s).\n${render_message}`;
  if (action === 'complete') render_message = `Item ${args.index} marcado como concluído.\n${render_message}`;
  
  return {
    to_do, // Sempre retorna o estado completo e atualizado
    _tool_result: {
      parsed: to_do.map((t, i) => ({ index: i + 1, ...parseItem(t) })),
      render: render_message,
    },
  };
}