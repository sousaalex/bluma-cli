import json
import time
from rich.panel import Panel
from .feedback import AdvancedFeedbackSystem, log_feedback
from .metrics import AgentMetricsTracker
from .notebook import log_notebook_entry
from .tools import ToolInvoker
from cli.protocols.documentation import DocumentationProtocol
# from cli.protocols.idle import IdleProtocol
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
             "top_p": 1,            # 🎯 Focused token selection
            "frequency_penalty": 0.15, # 🚫 Reduce repetitive patterns
            "presence_penalty": 0.1,   # 🔄 Encourage diverse approaches
            "stream": False,           # ✅ Better for feedback processing
            "seed": hash(session_id) % 10000 if session_id else 42,  # 🌱 Session consistency
           "parallel_tool_calls": True  # ⚡ Enable concurrent tools
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
        # self.idle_protocol = IdleProtocol()
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
        
        # Start new task tracking
        task_id = self.metrics_tracker.start_task(f"cycle_{self.cycles_completed}")
        
        # ✨ DIRECT PERFORMANCE SYSTEM INITIALIZATION
        if self.cycles_completed == 0:  # First time running
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

                PERFORMANCE TRACKING: Your cumulative score affects future task assignments. Maintain high standards."""
            })
        
        # yield {
        #     "type": "thinking",
        #     "message": "🧠 Starting intelligent processing...",
        #     "task_id": task_id
        # }
        
        log_notebook_entry("Starting enhanced agent turn", {
            "history_length": len(current_history),
            "task_id": task_id,
            "session_id": self.session_id
        })
        
        # NO ITERATION LIMITS - Agent has complete freedom to work
        iteration_count = 0
        recent_actions = [] # Track recent actions to detect real loops
        
        try:
            while True:  # Unlimited iterations - agent decides when to stop
                iteration_count += 1
                
                all_tools = self.mcp_client.global_tools_for_llm
                if not all_tools:
                    error_feedback = self.feedback_system.generate_feedback({
                        "event": "error_occurred",
                        "error_type": "no_tools_available",
                        "severity": "high"
                    })
                    
                    yield {
                        "type": "error",
                        "message": f"❌ {error_feedback['message']}"
                    }
                    
                    yield {
                        "type": "done",
                        "status": "error",
                        "history": current_history
                    }
                    return

                # Make LLM call with performance tracking
                # yield {
                #     "type": "llm_thinking",
                #     "message": f"🤖 Processing step {iteration_count}... (no limits!)"
                # }
                
                try:
                    # 🎯 GET OPTIMAL PARAMETERS FOR GPT-4.1
                    optimal_params = BluMaConfig.get_optimal_params(self.session_id)
                    
                    llm_start_time = time.time()
                    
                    # 🚀 CREATE API CALL WITH DYNAMIC OPTIMAL PARAMETERS
                    api_call_params = {
                        "model": self.deployment_name,
                        "messages": current_history,
                        "tools": all_tools,
                        "tool_choice": "auto",
                        **optimal_params  # 🎯 SPREAD OPTIMAL PARAMETERS
                    }
                    
                    # 🧠 GPT-4.1 OPTIMIZED FOR BLUMA
                    yield {
                        "type": "info",
                        "message": f"🎯 Using GPT-4.1 with optimized BluMa parameters"
                    }
                    
                    response = await self.client.chat.completions.create(**api_call_params)
                    
                except Exception as api_error:
                    # Specific API error handling with detailed feedback
                    yield {
                        "type": "error",
                        "message": f"🚨 API Error: {str(api_error)}"
                    }
                    
                    # Log the exact parameters that caused the error
                    yield {
                        "type": "debug",
                        "message": f"🔍 API Params: {api_call_params}"
                    }
                    
                    # End session gracefully
                    yield {
                        "type": "done",
                        "status": "error",
                        "history": current_history
                    }
                    return
                # llm_response_time = time.time() - llm_start_time
                
                # yield {
                #     "type": "llm_response",
                #     "message": f"⚡ IA responded in {llm_response_time:.1f}s"
                # }
                
                response_message = response.choices[0].message

                if response_message.tool_calls:
                    # Add assistant message with tool_calls
                    current_history.append(response_message.model_dump())

                    # Execute tools with enhanced tracking
                    tool_responses = []
                    tools_executed = 0

                    for tool_call in response_message.tool_calls:
                        tool_name = tool_call.function.name
                        tool_args = json.loads(tool_call.function.arguments)
                        tools_executed += 1
                        
                        # Simple loop detection - track recent identical actions
                        action_signature = f"{tool_name}_{str(tool_args)}"
                        recent_actions.append(action_signature)
                        if len(recent_actions) > 20:  # Keep only last 20 actions
                            recent_actions.pop(0)
                        
                        # Check for potential loop (same action repeated 8+ times recently)
                        if recent_actions.count(action_signature) >= 8:
                            yield {
                                "type": "info",
                                "message": f"🔄 Action repetition detected with {tool_name} - agent working intensively..."
                            }
                        
                        yield {
                            "type": "tool_call",
                            "tool_name": tool_name,
                            "arguments": tool_args,
                            "message": f"🔧 Executing: {tool_name}"
                        }
                        
                        # Execute tool with timing and error protection
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
                            
                            # Use the error result for further processing
                            result = error_result
                        
                        # Feedback (mantém para rastreio de performance)
                        try:
                            tool_success = not (isinstance(result, dict) and result.get("error"))
                            tool_feedback = self.feedback_system.generate_feedback({
                                "event": "tool_call_executed",
                                "tool_name": tool_name,
                                "success": tool_success,
                                "response_time": tool_execution_time
                            })
                            if tool_feedback["level"] in ["error", "excellent", "good"]:
                                yield {
                                    "type": "feedback",
                                    "level": tool_feedback["level"],
                                    "message": tool_feedback['message'],
                                    "score": tool_feedback['score']
                                }
                            if tool_feedback["level"] in ["excellent", "good"]:
                                current_history.append({
                                    "role": "system",
                                    "content": f"PERFORMANCE FEEDBACK: {tool_feedback['message']} Your tool selection and execution demonstrate proper engineering methodology. Continue applying this systematic approach to subsequent actions."
                                })
                            elif tool_feedback["level"] == "error":
                                current_history.append({
                                    "role": "system", 
                                    "content": f"CORRECTION REQUIRED: {tool_feedback['message']} You must adjust your approach immediately. Analyze the task requirements more thoroughly before selecting tools."
                                })
                        except Exception as feedback_error:
                            yield {
                                "type": "warning",
                                "message": f"Feedback generation failed: {str(feedback_error)}"
                            }
                        tool_responses.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": str(result)
                        })

                        # NOVA LÓGICA: se for agent_end_task, encerra ciclo imediatamente (idle é só estado interno)
                        if tool_name == "agent_end_task":
                            self.metrics_tracker.end_task(success=True, quality_score=1.0)
                            performance = self.metrics_tracker.get_performance_summary()
                            if performance.get("status") != "no_data":
                                yield {
                                    "type": "performance_summary",
                                    "data": performance,
                                    "message": f"Cycles completed: {self.cycles_completed + 1}"
                                }
                            self.cycles_completed += 1
                            log_notebook_entry("Agent entrou em idle (interno) após end_task", {
                                "cycles_completed": self.cycles_completed,
                                "cumulative_score": self.feedback_system.get_cumulative_score()
                            })
                            # Adiciona as tool_responses antes de terminar
                            current_history.extend(tool_responses)
                            yield {
                                "type": "done",
                                "status": "completed",
                                "history": current_history
                            }
                            return

                    # Adiciona tool_responses normalmente
                    current_history.extend(tool_responses)

                    # Remove toda a lógica de notify_dev_pending, needed_send_more_notfications e bloqueio de idle
                    # Remove também a verificação de idle manual

                    # Decisão de ciclo: só encerra se for pelo fluxo agent_end_task acima
                    # Caso contrário, continua normalmente
                    cycle_duration = time.time() - cycle_start_time
                    
                    # Decision logic with performance considerations
                    # The cycle ends when agent_end_task is executed.
                    # (Removido: ciclo nunca termina por timeout, só por agent_end_task)

                    if self.notify_dev_pending:
                        self.metrics_tracker.record_context_switch()
                        yield {
                            "type": "context_switch",
                            "message": "🔄 More actions needed - continuing processing..."
                        }
                        log_notebook_entry("Notification pending, continuing cycle", {
                            "cycle_duration": cycle_duration,
                            "tools_executed": tools_executed,
                            "notify_dev_pending": self.notify_dev_pending
                        })
                        # Continue the loop
                        continue
                
                elif response_message.content:
                    # Handle direct text response (protocol violation)
                    error_feedback = self.feedback_system.generate_feedback({
                        "event": "error_occurred",
                        "error_type": "invalid_action_direct_text",
                        "severity": "high",  # Increased severity
                        "last_message": response_message.content
                    })
                    
                    # Show violation in UI
                    yield {
                        "type": "protocol_violation",
                        "message": f"PROTOCOL VIOLATION: {error_feedback['message']}",
                        "content": response_message.content
                    }
                    
                    # DON'T add the violating message to history - only add correction
                    # Adding violating messages could teach the model that direct responses are acceptable
                    
                    # Add strong correction message to history with role system
                    strong_correction = f"""
                        ## PROTOCOL VIOLATION — SEVERE
                        You are sending direct text notifications, which is strictly prohibited.

                        PENALTY APPLIED: {error_feedback['score']:.1f} points deducted from your cumulative score.

                        VIOLATION DETAILS:
                        - You are sending direct text notifications instead of using the message_notify_dev tool and this is prohibited.
                        - This violates the established protocol for communication between you and the human dev
                        - Direct notifications are not allowed under any circumstances

                        """
                    
                    current_history.append({
                        "role": "system", 
                        "content": strong_correction
                    })
                    
                    # Log the violation but don't end the session
                    log_notebook_entry("Protocol violation detected - agent given chance to correct", {
                        "violation_content": response_message.content[:100],
                        "penalty_score": error_feedback['score'],
                        "iteration": iteration_count
                    })
                    
                    self.metrics_tracker.record_context_switch()
                    
                    # CONTINUE THE LOOP - Give agent another chance
                    continue

                # If we reach here, continue the cycle for LLM to decide next action
                # yield {
                #     "type": "thinking",
                #     "message": "🤔 Continuing reasoning..."
                # }

            # This code should never be reached since the loop is infinite
            # Agent will exit via idle() tool or completion detection
            pass

        except Exception as e:
            error_msg = str(e)
            
            # Log the error for debugging
            log_notebook_entry("Processing exception caught", {
                "exception": error_msg,
                "task_id": task_id,
                "iterations_completed": iteration_count
            })
            
            # Check if this is a critical error that should end the session
            critical_errors = [
                "Connection", "Authentication", "Rate limit", "API key", "Service unavailable"
            ]
            
            is_critical = any(critical_term in error_msg for critical_term in critical_errors)
            
            if is_critical:
                # Critical error - end session
                self.metrics_tracker.end_task(success=False, quality_score=0.3)
                
                yield {
                    "type": "error",
                    "message": f"❌ Critical error: {error_msg}"
                }
                
                yield {
                    "type": "done",
                    "status": "error",
                    "history": current_history
                }
            else:
                # Non-critical error - apenas envia warning e continua o loop principal
                yield {
                    "type": "warning",
                    "message": f"⚠️ Minor issue encountered: {error_msg}"
                }
                # O loop já continua normalmente, não precisa de continue

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
