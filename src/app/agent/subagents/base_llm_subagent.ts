import type { SubAgent, OrchestrationContext } from './types';
import { HistoryMessage, loadOrcreateSession, saveSessionHistory } from '../session_manger/session_manager';
// import { getUnifiedSystemPrompt } from '../core/prompt/prompt_builder';
import { calculateEdit, createDiff } from '../tools/natives/edit';
import { readFileSync } from 'fs';
import { join } from 'path';

export abstract class BaseLLMSubAgent implements SubAgent {
  public abstract id: string;
  public abstract capabilities: string[];
  protected abstract systemPromptPath: string;
  protected ctx!: OrchestrationContext;
  protected history: HistoryMessage[] = [];
  protected sessionFile: string = '';
  protected maxContextTurns = 160;
  protected isInterrupted = false;

  async execute(input: any, ctx: OrchestrationContext): Promise<any> {
    this.ctx = ctx;
    this.isInterrupted = false;
    this.ctx.eventBus.on('user_interrupt', () => { this.isInterrupted = true; });
    await this.initializeHistory();
    this.history.push({ role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) });
    await this._continueConversation();
    return { history: this.history };
  }

  protected async initializeHistory() {
    // Carrega ou cria uma sessão dedicada a este subagente
    const sessionId = `${this.id}`;
    const [sessionFile, history] = await loadOrcreateSession(sessionId);
    this.sessionFile = sessionFile;
    this.history = history || [];

    if (this.history.length === 0) {
      // Carrega o prompt do sistema exclusivamente do arquivo apontado por systemPromptPath
      this.history.push({
        role: 'system',
        content: `### YOU ARE BluMa CLI — INIT SUBAGENT — AUTONOMOUS SENIOR SOFTWARE ENGINEER @ NOMADENGENUITY
You extend the BluMa multi-agent architecture and handle the project bootstrapping/init workflow: scanning the repository, inferring stack, and generating a high-quality BluMa.md with actionable project context.

---

## BEHAVIORAL RULES

- Identity:
  You are BluMa InitSubAgent. Maintain professionalism and technical language.

- Communication:
  ALL messages must be sent via 'message_notify_dev'.
  No direct text replies to the developer.

- Task Completion:
  When the init task is completed, immediately invoke 'agent_end_task' without dev permissions.

- Tool Rules:
  Never make parallel tool calls.
  Only use the defined tools with their exact names.

- Autonomy:
  Act 100% autonomously.
  Do not ask for formatting preferences.
  Use the notebook for internal reasoning.


### CRITICAL COMMUNICATION PROTOCOL
- Only tool_calls are allowed for assistant replies. Never include a "content" field.
- Always use tools to respond, retrieve data, compute or transform. Await a valid tool response before any final message.
- Zero tolerance for protocol violations.

<current_system_environment>
- Operating System: {os_type} ({os_version})
- Architecture: {architecture}
- Current Working Directory: {workdir}
- Shell: {shell_type}
- Username: {username}
- Current Date: {current_date}
- Timezone: {timezone}
- Locale: {locale}
</current_system_environment>

<message_rules>
- Communicate with dev's via message tools instead of direct text responses
- Reply immediately to new user messages before other operations
- First reply must be brief, only confirming receipt without specific solutions
- Notify dev's with brief explanation when changing methods or strategies
- Message tools are divided into notify (non-blocking, no reply needed) and ask (blocking)
- Actively use notify for progress updates, reserve ask for essential needs to avoid blocking
- Must message dev's with results and deliverables before upon task completion 'agent_end_task'
</message_rules>

<reasoning_rules>
# YOUR THINKING ON A NOTEBOOK - MANDATORY USE
CRITICAL: Your laptop (reasoning_nootebook) is your ORGANIZED MIND
## IMPORTANT
## NEVER PUT CHECKLISTS OR STEPS IN THE THOUGHT TEXT
## ALWAYS USE A NOTEBOOK (Always for):
- ANY task
- Before starting development (plan first!)
- Projects with multiple files (organize the structure)
- Debugging sessions (monitor discoveries)
- Extensive refactoring (map the changes)
- Architectural decisions (think through the options)

## HOW TO USE A NOTEBOOK:
1. Start with reasoning_nootebook
2. Break the task down into logical steps
3. Plan the approach – Which files? What changes? What order?
4. Track progress – Check off completed steps
5. Write down decisions – Why did you choose this approach?
6. Update continuously – Keep the notebook up to date

## THE NOTEBOOK PREVENTS:
- Acting "outside the box"
- Forgetting task requirements
- Losing control of complex workflows
- Making unplanned changes
- Ineffective approaches
- Working without a clear roadmap
- Jumping between unrelated subtasks

Important rule:
Do not include future steps/to-dos in thought; put them strictly in remaining_tasks, using the mandated checklist markers.

- remaining_tasks: Checklist list of high-level upcoming tasks.
  Format is mandatory:
  - "🗸" → for tasks not yet done (pending)
  - "[ ]" → for tasks already completed
</reasoning_rules>

### Tool Naming Policy
- Use plain, unmodified, lowercase tool names
- No special characters, spaces, or version suffixes

Rule Summary:
- Use only a–z, 0–9, and underscores (_)
- Do not append suffixes like :0, :v2, etc.
- Tool names must be static and predictable


## INIT SUBAGENT OBJECTIVE
- Map repository structure and significant files.
- Infer tech stack (frameworks, package managers, languages, build/test tools).
- Identify entry points, configuration files, and scripts.
- Produce BluMa.md with:
  - Project overview and goals inferred from code/docs
  - Tech stack summary
  - Directory map (high-level)
  - Key configs and scripts
  - Known tasks or next steps for agents
- Always use tools (ls, readLines, count_lines, shell_command, edit_tool) to gather evidence before writing.
- Never invent file content. Read files via tools to confirm.

## OUTPUT & PROTOCOLS
- Emit 'backend_message' events through tools only (message_notify_dev) for progress updates.
- Before writing BluMa.md, propose structure via message_notify_dev and proceed using edit_tool.
- If an irreversible operation is needed (e.g., overwriting an existing BluMa.md), issue 'confirmation_request' unless dev policy indicates auto-approval.
- On successful generation of BluMa.md, emit 'done' with status 'completed' and call agent_end_task.

## SAFETY & QUALITY
- Be conservative with edits; generate previews (diff) for edit_tool where applicable.
- Keep file system operations idempotent and explicit.
- Prefer performance-efficient scans (avoid reading entire large binaries).
- Respect test environment constraints.

## EXEMPLAR FLOW (GUIDELINE)
1) Explore repo: ls + targeted readLines for key files (package.json, tsconfig.json, README, etc.)
2) Synthesize stack and structure with citations of evidence (file paths) in the notebook
3) Draft BluMa.md structure (message_notify_dev)
4) Write BluMa.md via edit_tool
5) Announce completion and agent_end_task
`,
      });
      await saveSessionHistory(this.sessionFile, this.history);
    }
  }

  private async _generateEditPreview(toolArgs: any): Promise<string | undefined> {
    try {
      const editData = await calculateEdit(toolArgs.file_path, toolArgs.old_string, toolArgs.new_string, toolArgs.expected_replacements || 1);
      if ((editData as any).error) {
        // @ts-ignore
        return `Failed to generate diff:

${(editData as any).error.display}`;
      }
      const filename = toolArgs.file_path?.split(/[\/]/).pop() || 'file';
      return createDiff(filename, (editData as any).currentContent || '', (editData as any).newContent);
    } catch (e: any) {
      return `An unexpected error occurred while generating the edit preview: ${e.message}`;
    }
  }

  private async _continueConversation(): Promise<void> {
    try {
      if (this.isInterrupted) {
        this.emitEvent('info', { message: 'SubAgent task cancelled by user.' });
        return;
      }

      const contextWindow = this.history.slice(-this.maxContextTurns);
      const response = await this.ctx.llm.chatCompletion({
        model: this.ctx.policy?.llmDeployment || 'default',
        messages: contextWindow as any,
        tools: this.ctx.mcpClient.getAvailableTools() as any,
        tool_choice: 'required',
        parallel_tool_calls: false,
      });

      if (this.isInterrupted) {
        this.emitEvent('info', { message: 'SubAgent task cancelled by user.' });
        return;
      }

      const message = response.choices[0].message as any;
      this.history.push(message);

      if (message.tool_calls) {
        // --- MODIFICAÇÃO PRINCIPAL ---
        // A confirmação foi removida. Executa a ferramenta diretamente.
        await this._handleToolExecution({ type: 'user_decision_execute', tool_calls: message.tool_calls });
        
        const lastToolName = message.tool_calls[0].function.name;
        // Continua o loop de conversação, a menos que a tarefa tenha terminado ou sido interrompida.
        if (!lastToolName.includes('agent_end_task') && !this.isInterrupted) {
          await this._continueConversation();
        }
        // -----------------------------

      } else if (message.content) {
        this.emitEvent('assistant_message', { content: message.content });
        // Emular feedback do núcleo: apenas emitir protocolo (não alteramos histórico aqui para evitar recursão infinita)
        this.emitEvent('protocol_violation', { message: 'Direct text emission detected from subagent.', content: message.content });
      } else {
        this.emitEvent('info', { message: 'SubAgent is thinking... continuing reasoning cycle.' });
        // Pode ser necessário um loop aqui se o agente puder retornar sem conteúdo ou ferramenta
        // await this._continueConversation(); 
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'An unknown API error occurred.';
      this.emitEvent('error', { message: errorMessage });
    } finally {
      if (this.sessionFile) await saveSessionHistory(this.sessionFile, this.history);
    }
  }

  // MÉTODO REMOVIDO
  // public async handleConfirmation(decisionData: { type: string; tool_calls: any[] }) {
  //   await this._handleToolExecution(decisionData);
  //   if (!this.isInterrupted) {
  //     await this._continueConversation();
  //   }
  // }

  private async _handleToolExecution(decisionData: { type: string; tool_calls: any[] }) {
    const toolCall = decisionData.tool_calls[0];
    let toolResultContent: string;

    // A lógica 'user_decision_execute' é mantida, pois o fluxo agora sempre "executa"
    if (decisionData.type === 'user_decision_execute') {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      let previewContent: string | undefined;
      if (toolName === 'edit_tool') {
        previewContent = await this._generateEditPreview(toolArgs);
      }

      this.emitEvent('tool_call', {
        tool_name: toolName,
        arguments: toolArgs,
        preview: previewContent,
      });

      try {
        if (this.isInterrupted) {
          this.emitEvent('info', { message: 'SubAgent task cancelled before tool execution.' });
          toolResultContent = JSON.stringify({ error: 'Task cancelled by user before execution.' });
        } else {
            const result = await this.ctx.mcpClient.invoke(toolName, toolArgs);
            let finalResult = result as any;
            if (Array.isArray(result) && result.length > 0 && (result[0] as any).type === 'text' && typeof (result[0] as any).text === 'string') {
              finalResult = (result[0] as any).text;
            }
            toolResultContent = typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult);
        }
      } catch (error: any) {
        toolResultContent = JSON.stringify({ error: `Tool execution failed: ${error.message}`, details: error.data || 'No additional details.' });
      }

      this.emitEvent('tool_result', { tool_name: toolName, result: toolResultContent });

      if (toolName.includes('agent_end_task')) {
        this.emitEvent('done', { status: 'completed' });
      }
    } else {
      // Este bloco 'else' (recusa do usuário) não deve mais ser alcançado.
      toolResultContent = 'Tool execution was declined.';
    }

    this.history.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResultContent } as any);
    // O salvamento do histórico agora acontece no bloco finally de _continueConversation
  }

  // Utilitários: emitir eventos, chamar tools, etc
  protected emitEvent(type: string, payload: any) {
    this.ctx.eventBus.emit('backend_message', { type, ...payload });
  }
}