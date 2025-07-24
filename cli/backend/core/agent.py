import json
import time
from rich.panel import Panel
from .feedback import AdvancedFeedbackSystem, log_feedback
from .metrics import AgentMetricsTracker
from .notebook import log_notebook_entry
from .tools import ToolInvoker
# from cli.protocols.documentation import DocumentationProtocol
# from cli.protocols.notification import NotificationProtocol

class BluMaConfig:

    @staticmethod
    def get_optimal_params(session_id: str = None) -> dict:
        """
        Returns optimized parameters for LLM with BluMa feedback system
        """
        return {
            "temperature": 0.2,        # 🎯 Deterministic for protocol adherence
            "max_tokens": 4096,        # ✅ Adequate for complex responses
            "top_p": 1,                # 🎯 Focused token selection
            "frequency_penalty": 0.15, # 🚫 Reduce repetitive patterns
            "presence_penalty": 0.1,   # 🔄 Encourage diverse approaches
            "stream": False,           # ✅ Better for feedback processing
            "seed": hash(session_id) % 10000 if session_id else 42,  # 🌱 Session consistency
            "parallel_tool_calls": False # ⚡ Enable concurrent tools
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
        
        # # Initialize protocols
        # self.documentation_protocol = DocumentationProtocol()
        # self.notification_protocol = NotificationProtocol()
        
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
        Enhanced async generator that yields events for frontend communication.
        - Immediately executes 'safe' tools like 'agent_end_task' and 'message_notify_dev'.
        - Asks for user confirmation for all other tools.
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
                - Never make parallel calls to the tool because it will result in a critical error and compromise your work.
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
                    from cli.backend.core.context_utils import create_api_context_window
                    context_window = create_api_context_window(current_history, max_turns=300)

                    optimal_params = BluMaConfig.get_optimal_params(self.session_id)
                    api_call_params = {
                        "model": self.deployment_name,
                        "messages": context_window,
                        "tools": all_tools,
                        "tool_choice": "auto",
                        **optimal_params
                    }

                    yield {"type": "info", "message": "🎯 Using GPT-4.1 with optimized BluMa parameters (context window by turns)"}

                    response = await self.client.chat.completions.create(**api_call_params)

                except Exception as api_error:
                    yield {"type": "error", "message": f"🚨 API Error: {str(api_error)}"}
                    yield {"type": "debug", "message": f"🔍 API Params: {json.dumps(api_call_params, indent=2)}"}
                    yield {"type": "done", "status": "error", "history": current_history}
                    return
                
                response_message = response.choices[0].message

                if response_message.tool_calls:
                    # Define a lista de ferramentas que não precisam de permissão.
                    auto_approved_tools = ["agent_end_task", "message_notify_dev", "notebook_sequentialthinking_tools"]

                    # Verifica se TODAS as ferramentas pedidas estão na lista de aprovação automática.
                    all_tools_are_safe = all(
                        any(approved_tool in tc.function.name for approved_tool in auto_approved_tools)
                        for tc in response_message.tool_calls
                    )

                    if all_tools_are_safe:
                        # --- CASO 1: EXECUÇÃO IMEDIATA (TODAS AS FERRAMENTAS SÃO SEGURAS) ---
                        
                        current_history.append(response_message.model_dump())
                        
                        tool_responses = []
                        task_should_end = False

                        for tool_call in response_message.tool_calls:
                            tool_name = tool_call.function.name
                            
                            if "agent_end_task" in tool_name:
                                task_should_end = True

                            try:
                                tool_args = json.loads(tool_call.function.arguments)
                                result = await self.tool_invoker.invoke(tool_name, tool_args)
                            except Exception as e:
                                result = {"error": f"Failed to execute auto-approved tool {tool_name}: {e}"}

                            yield {"type": "tool_result", "tool_name": tool_name, "result": str(result)}
                            
                            tool_responses.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "name": tool_name,
                                "content": str(result)
                            })
                        
                        current_history.extend(tool_responses)

                        if task_should_end:
                            yield {"type": "done", "status": "completed", "history": current_history}
                            return
                        else:
                            continue

                    else:
                        # --- CASO 2: PEDIR PERMISSÃO (PELO MENOS UMA FERRAMENTA NÃO É SEGURA) ---
                        
                        current_history.append(response_message.model_dump())

                        yield {
                            "type": "confirmation_request",
                            "tool_calls": [tc.model_dump() for tc in response_message.tool_calls]
                        }
                        
                        yield {
                            "type": "done",
                            "status": "awaiting_confirmation",
                            "history": current_history
                        }
                        
                        return

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
                    continue

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