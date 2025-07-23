# No arquivo: cli/backend/core/context_utils.py

from typing import List, Dict, Optional

# A assinatura da função foi atualizada para refletir que max_turns pode ser None
def create_api_context_window(full_history: List[Dict], max_turns: Optional[int]) -> List[Dict]:
    """
    Retorna uma janela de contexto otimizada para a API.

    REGRAS:
    1.  Sempre inclui todas as mensagens 'system' do início do histórico.
    2.  Inclui os últimos N 'turnos completos' do histórico passado.
        - Um turno completo começa em 'user' e termina em 'agent_end_task'.
    3.  Sempre inclui o turno atual (o mais recente), mesmo que esteja em andamento.
        - Isso garante que o agente sempre saiba qual é a tarefa atual.

    COMPORTAMENTO ESPECIAL:
    - Se max_turns=None, retorna o histórico completo sem cortes.
    """
    if not full_history:
        return []

    if max_turns is None:
        # Retorna uma cópia do histórico completo sem aplicar filtros.
        return full_history[:]

    # 1. Isolar as mensagens de sistema do início do histórico.
    system_msgs = []
    idx = 0
    while idx < len(full_history) and full_history[idx].get("role") == "system":
        system_msgs.append(full_history[idx])
        idx += 1

    # 2. Percorrer o histórico restante (sem as msgs de sistema) de trás para frente.
    # O objetivo é encontrar os turnos completos mais recentes.
    turns = []
    current_turn = []
    found_turns = 0
    in_turn = False
    
    history_without_system = full_history[idx:]

    for msg in reversed(history_without_system):
        current_turn.insert(0, msg)
        
        if msg.get("role") == "user":
            in_turn = True
        
        # Verifica se um turno completo foi encontrado.
        if (msg.get("role") == "tool" and msg.get("name") == "agent_end_task" and in_turn):
            found_turns += 1
            # Adiciona o turno completo à lista de turnos.
            turns.insert(0, current_turn.copy())
            # Limpa para começar a procurar o próximo turno.
            current_turn.clear()
            in_turn = False
        
        # Para a busca se já encontramos o número desejado de turnos COMPLETOS.
        if found_turns >= max_turns:
            break

    # --------------------------------------------------------------------
    # >>> INÍCIO DA CORREÇÃO CRÍTICA <<<
    # --------------------------------------------------------------------
    # 3. Adicionar o turno atual (em andamento) de volta.
    # Se `current_turn` ainda contém mensagens, significa que o loop terminou
    # no meio de um turno (o turno mais recente). Este turno é essencial
    # para o agente saber o que fazer a seguir.
    if current_turn:
        turns.insert(0, current_turn)
    # --------------------------------------------------------------------
    # >>> FIM DA CORREÇÃO CRÍTICA <<<
    # --------------------------------------------------------------------

    # 4. Montar a janela de contexto final.
    # Junta as mensagens de sistema com todas as mensagens dos turnos selecionados.
    context_window = system_msgs + [msg for turn in turns for msg in turn]
    
    return context_window