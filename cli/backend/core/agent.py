import json
import time
from rich.panel import Panel
from .feedback import AdvancedFeedbackSystem, log_feedback
from .metrics import AgentMetricsTracker
from .notebook import log_notebook_entry
from .tools import ToolInvoker
from cli.protocols.documentation import DocumentationProtocol
from cli.protocols.notification import NotificationProtocol

class BluMaConfig:
    """
    🎯 BLUMA GPT-4.1 CONFIGURATION
    Optimized parameters specifically for BluMa with GPT-4.1
    """
    
    @staticmethod
    def get_optimal_params(session_id: str = None) -> dict:
        """
        Returns optimized parameters for GPT-4.1 with BluMa feedback system
        """
        return {
            "temperature": 0.0,        # 🎯 Deterministic for protocol adherence
            "max_tokens": 4096,        # ✅ Adequate for complex responses
            "top_p": 1,                # 🎯 Focused token selection
            "frequency_penalty": 0.15, # 🚫 Reduce repetitive patterns
            "presence_penalty": 0.1,   # 🔄 Encourage diverse approaches
            "stream": False,           # ✅ Better for feedback processing
            "seed": hash(session_id) % 10000 if session_id else 42,  # 🌱 Session consistency
            "parallel_tool_calls": True # ⚡ Enable concurrent tools
        }

class Agent:
    def __init__(self, mcp_client, client, deployment_name, console, session_id):
        self.mcp_client = mcp_client
        self.client = client
        self.deployment_name = deployment_name
        self.console = console
        self.session_id = session_id
        
        # Initialize advanced systems
        self.metrics_tracker = AgentMetricsTracker(session_id)
        self.feedback_system = AdvancedFeedbackSystem(self.metrics_tracker)
        self.tool_invoker = ToolInvoker(mcp_client, self.metrics_tracker)
        
        # Initialize protocols
        self.documentation_protocol = DocumentationProtocol()
        self.notification_protocol = NotificationProtocol()
        
        # Performance tracking
        self.current_cycle_start = time.time()
        self.cycles_completed = 0
        
        # Notification state tracking
        self.notify_dev_pending = False

    def reset_notification_state(self):
        """Reset notification pending state"""
        self.notify_dev_pending = False
        
    def get_notification_state(self):
        """Get current notification state for debugging"""
        return {
            "notify_dev_pending": self.notify_dev_pending,
            "session_id": self.session_id,
            "cycles_completed": self.cycles_completed
        }

    async def process_turn(self, current_history):
        """
        Enhanced async generator that yields events for frontend communication
        """
        cycle_start_time = time.time()
        self.current_cycle_start = cycle_start_time
        
        task_id = self.metrics_tracker.start_task(f"cycle_{self.cycles_completed}")
        
        if self.cycles_completed == 0:
            current_history.append({
                "role": "system",
                "content": """PERFORMANCE SYSTEM ACTIVE: You are operating under continuous evaluation. Your actions are scored based on:

                SCORING CRITERIA:
                - Tool selection accuracy: +2.5 points for optimal choices, -1.0 for suboptimal
                - Task completion methodology: +3.0 points for a systematic approach
                - Protocol adherence: -2.5 points per violation (direct responses forbidden)
                - Code quality: +2.0 points for production-ready implementations

                BEHAVIORAL REQUIREMENTS:
                - You must analyze task requirements before selecting tools
                - You must use message_notify_dev for **ALL** communications and notfications initial
                - You must implement complete, tested solutions
                - Never forget to signal the system that the task has ended with "agent_end_task." Once the system receives this signal, it will put the agent in idle mode until the human developer sends a new task. Never forget that the system needs to be signaled so that it knows that the agent has completed its task.
                - Never forget to follow the "end_task_rules" properly
                PERFORMANCE TRACKING: Your cumulative score affects future task assignments. Maintain high standards.
                """
            })
        
        log_notebook_entry("Starting enhanced agent turn", {
            "history_length": len(current_history),
            "task_id": task_id,
            "session_id": self.session_id
        })
        
        iteration_count = 0
        
        try:
            while True:
                iteration_count += 1
                
                all_tools = self.mcp_client.global_tools_for_llm
                if not all_tools:
                    yield {"type": "error", "message": "❌ No tools available from MCP servers."}
                    yield {"type": "done", "status": "error", "history": current_history}
                    return

                try:
                    optimal_params = BluMaConfig.get_optimal_params(self.session_id)
                    api_call_params = {
                        "model": self.deployment_name,
                        "messages": current_history,
                        "tools": all_tools,
                        "tool_choice": "auto",
                        **optimal_params
                    }
                    
                    yield {"type": "info", "message": "🎯 Using GPT-4.1 with optimized BluMa parameters"}
                    
                    response = await self.client.chat.completions.create(**api_call_params)
                    
                except Exception as api_error:
                    yield {"type": "error", "message": f"🚨 API Error: {str(api_error)}"}
                    yield {"type": "debug", "message": f"🔍 API Params: {json.dumps(api_call_params, indent=2)}"}
                    yield {"type": "done", "status": "error", "history": current_history}
                    return
                
                response_message = response.choices[0].message

                if response_message.tool_calls:
                    # Adiciona a mensagem do assistente ao histórico ANTES de executar as ferramentas
                    current_history.append(response_message.model_dump())

                    # --- CORREÇÃO INICIADA ---
                    # Lógica refatorada para garantir a execução de todas as ferramentas antes de decidir o término.

                    # 1. PREPARAÇÃO: Flags e listas para coletar resultados.
                    tool_responses = []
                    task_should_end = False  # Flag para controlar o fim da tarefa.

                    # 2. EXECUÇÃO: Este loop executa TODAS as ferramentas solicitadas pelo LLM.
                    for tool_call in response_message.tool_calls:
                        tool_name = tool_call.function.name
                        tool_args_str = tool_call.function.arguments
                        
                        try:
                            tool_args = json.loads(tool_args_str)
                        except json.JSONDecodeError:
                            yield {"type": "error", "message": f"❌ Failed to decode JSON for {tool_name}: {tool_args_str}"}
                            tool_args = {"error": "Invalid JSON arguments"}

                        # Apenas sinaliza se a tarefa deve terminar. NÃO sai do loop aqui.
                        if tool_name == "agent_end_task":
                            task_should_end = True

                        yield {
                            "type": "tool_call",
                            "tool_name": tool_name,
                            "arguments": tool_args,
                            "message": f"🔧 Executing: {tool_name}"
                        }
                        
                        tool_start_time = time.time()
                        try:
                            result = await self.tool_invoker.invoke(tool_name, tool_args)
                            tool_execution_time = time.time() - tool_start_time
                            
                            yield {
                                "type": "tool_result",
                                "tool_name": tool_name,
                                "result": str(result),
                                "execution_time": tool_execution_time,
                                "message": f"✅ {tool_name} executed in {tool_execution_time:.1f}s"
                            }
                        except Exception as tool_error:
                            tool_execution_time = time.time() - tool_start_time
                            error_result = f"Tool execution failed: {str(tool_error)}"
                            
                            yield {
                                "type": "tool_result",
                                "tool_name": tool_name,
                                "result": error_result,
                                "execution_time": tool_execution_time,
                                "message": f"❌ {tool_name} failed in {tool_execution_time:.1f}s"
                            }
                            result = error_result
                        
                        # Coleta o resultado da ferramenta para adicionar ao histórico mais tarde.
                        tool_responses.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": str(result)
                        })

                    # 3. ATUALIZAÇÃO DO HISTÓRICO: Adiciona os resultados de TODAS as ferramentas.
                    current_history.extend(tool_responses)

                    # 4. CONTROLE DE FLUXO: Agora, e somente agora, verifica se a tarefa deve terminar.
                    if task_should_end:
                        self.metrics_tracker.end_task(success=True, quality_score=1.0)
                        # Envia o evento final 'done' com o histórico totalmente atualizado.
                     
                        performance = self.metrics_tracker.get_performance_summary()
                        if performance.get("status") != "no_data":
                            yield {
                            "type": "done",
                            "status": "completed",
                            "history": current_history
                            }
                            yield {
                                "type": "performance_summary",
                                "data": performance,
                                "message": f"Cycles completed: {self.cycles_completed + 1}"
                            }
                        self.cycles_completed += 1
                        log_notebook_entry("Agent task completed via agent_end_task", {
                            "cycles_completed": self.cycles_completed,
                        })
                        
                        
                        
                        # Encerra a função geradora de forma limpa.
                        return
                    
                    # --- FIM DA CORREÇÃO ---

                elif response_message.content:
                    # Lida com violação de protocolo (resposta direta de texto)
                    error_feedback = self.feedback_system.generate_feedback({
                        "event": "error_occurred",
                        "error_type": "invalid_action_direct_text",
                        "severity": "high",
                        "last_message": response_message.content
                    })
                    
                    yield {
                        "type": "protocol_violation",
                        "message": f"PROTOCOL VIOLATION: {error_feedback['message']}",
                        "content": response_message.content
                    }
                    
                    strong_correction = f"""
                        ## PROTOCOL VIOLATION — SEVERE
                        You sent a direct text response, which is strictly prohibited.
                        PENALTY APPLIED: {error_feedback['score']:.1f} points deducted.
                        You MUST use tools for all actions and communication.
                    """
                    
                    current_history.append({"role": "system", "content": strong_correction})
                    
                    log_notebook_entry("Protocol violation: Agent given chance to correct.", {
                        "violation_content": response_message.content[:100],
                        "penalty_score": error_feedback['score'],
                        "iteration": iteration_count
                    })
                    
                    self.metrics_tracker.record_context_switch()
                    continue  # Dá ao agente outra chance de seguir o protocolo.

                # Se chegamos aqui, significa que o LLM não fez nada (nem tool_call, nem content).
                # Isso pode indicar um estado de confusão. Damos uma chance para ele continuar.
                else:
                    yield {"type": "info", "message": "🤔 Agent is thinking... continuing reasoning cycle."}
                    continue


        except Exception as e:
            error_msg = str(e)
            log_notebook_entry("Critical processing exception caught", {
                "exception": error_msg,
                "task_id": task_id,
                "iterations_completed": iteration_count
            })
            
            yield {"type": "error", "message": f"❌ Critical error: {error_msg}"}
            yield {"type": "done", "status": "error", "history": current_history}
            
            self.metrics_tracker.end_task(success=False, quality_score=0.1)

    def get_training_data(self):
        """Export comprehensive training data"""
        return {
            "metrics": self.metrics_tracker.export_training_data(),
            "feedback": self.feedback_system.export_feedback_data(),
            "session_summary": {
                "session_id": self.session_id,
                "cycles_completed": self.cycles_completed,
                "total_score": self.feedback_system.get_cumulative_score(),
                "performance_summary": self.metrics_tracker.get_performance_summary()
            }
        }

    def handle_tool_response(self, tool_name, result, context=None):
        """
        Enhanced tool response handling with metrics
        """
        success = not (isinstance(result, dict) and result.get("error"))
        
        feedback = self.feedback_system.generate_feedback({
            "event": "tool_call_executed",
            "tool_name": tool_name,
            "success": success,
            "response_time": context.get("response_time", 0.0) if context else 0.0
        })
        
        log_notebook_entry(f"Tool response: {tool_name}", {
            "result": result,
            "success": success,
            "feedback_score": feedback["score"],
            **(context or {})
        })
        
        return feedback