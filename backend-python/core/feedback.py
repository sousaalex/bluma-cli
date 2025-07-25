import os
from datetime import datetime
from typing import Dict, Any, Optional
from .metrics import AgentMetricsTracker
import time

def log_feedback(feedback_type: str, message: str, context: dict = None):
    os.makedirs('logs', exist_ok=True)
    with open('logs/feedback.log', 'a', encoding='utf-8') as f:
        f.write(f"[{datetime.now().isoformat()}] [{feedback_type.upper()}] {message}\n")
        if context:
            f.write(f"  Context: {context}\n")

class AdvancedFeedbackSystem:
    """Advanced feedback system focused on engineering quality and resilience"""
    
    def __init__(self, metrics_tracker):
        self.metrics_tracker = metrics_tracker
        self.feedback_history = []
        
        # Quality-focused feedback patterns
        self.excellence_patterns = [
            "THOROUGH ANALYSIS", "ROBUST IMPLEMENTATION", "CAREFUL PLANNING",
            "ERROR PREVENTION", "PROFESSIONAL STANDARDS", "QUALITY ASSURANCE",
            "PROPER DOCUMENTATION", "BEST PRACTICES", "COMPREHENSIVE SOLUTION",
            "ALTERNATIVE APPROACH", "CREATIVE SOLUTION", "PERSISTENT EFFORT",  # ✨ NOVO: Resiliência
            "NEVER GIVE UP", "RESOURCEFUL THINKING", "PROBLEM SOLVED"  # ✨ NOVO: Atitude
        ]
        
        self.warning_patterns = [
            "RUSHED WORK", "INCOMPLETE IMPLEMENTATION", "POOR PLANNING",
            "SKIPPED VALIDATION", "LACKS DOCUMENTATION", "SHORTCUTS TAKEN",
            "GAVE UP", "DIDN'T TRY ALTERNATIVES", "EXCUSES INSTEAD OF SOLUTIONS",  # ✨ NOVO: Desistência  
            "RECOMMENDED MANUAL", "SAID IMPOSSIBLE", "BLAMED TOOLS"  # ✨ NOVO: Atitude ruim
        ]
        
        self.error_patterns = [
            "CRITICAL FAILURE", "SECURITY RISK", "DATA CORRUPTION",
            "SYSTEM CRASH", "MAJOR BUG", "PRODUCTION ISSUE"
        ]
    
    def generate_feedback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate contextual feedback with quality focus and resilience rewards"""
        event_type = context.get("event", "unknown")
        
        if event_type == "tool_call_executed":
            return self._handle_tool_execution(context)
        elif event_type == "error_occurred":
            return self._handle_error(context)
        elif event_type == "cycle_completed":
            return self._handle_cycle_completion(context)
        elif event_type == "resilience_check":  # ✨ NOVO: Verificar resiliência
            return self._handle_resilience_check(context)
        elif event_type == "giving_up_detected":  # ✨ NOVO: Detectar desistência
            return self._handle_giving_up(context)
        else:
            return self._handle_general_feedback(context)
    
    def _handle_task_completion(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle task completion with sophisticated scoring"""
        success = context.get("success", False)
        quality_score = context.get("quality_score", 0.5)
        
        if self.metrics_tracker.current_task:
            self.metrics_tracker.end_task(success=success, quality_score=quality_score)
        
        reward_score = self.metrics_tracker.calculate_reward_score()
        performance = self.metrics_tracker.get_performance_summary()
        
        # Generate detailed feedback
        if success:
            if reward_score >= 8.0:
                message = f"🏆 **EXCELLENT PERFORMANCE!** (+{reward_score:.1f} points)\n"
                message += "Outstanding task execution with high efficiency and quality."
                level = "excellent"
            elif reward_score >= 6.0:
                message = f"✅ **GOOD PERFORMANCE** (+{reward_score:.1f} points)\n"
                message += "Task completed successfully with good efficiency."
                level = "good"
            else:
                message = f"✓ **TASK COMPLETED** (+{reward_score:.1f} points)\n"
                message += "Task finished, but there's room for improvement."
                level = "basic"
        else:
            penalty = max(3.0, reward_score)
            message = f"❌ **TASK FAILED** (-{penalty:.1f} points)\n"
            message += "Task not completed successfully. Review approach."
            level = "failed"
            reward_score = -penalty
        
        # Add performance insights
        insights = self._generate_performance_insights(performance)
        if insights:
            message += f"\n\n📊 **Performance Insights:**\n{insights}"
        
        feedback_data = {
            "message": message,
            "score": reward_score,
            "level": level,
            "performance_summary": performance,
            "recommendations": self._get_recommendations(performance)
        }
        
        self._log_feedback("TASK_COMPLETION", feedback_data)
        return feedback_data
    
    def _handle_tool_execution(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle individual tool execution feedback - Quality-focused approach"""
        tool_name = context.get("tool_name", "unknown")
        success = context.get("success", True)
        response_time = context.get("response_time", 0.0)
        
        # Record in metrics
        self.metrics_tracker.record_tool_call(tool_name, success, response_time)
        
        if success:
            # Quality-focused feedback - no speed bonuses
            if tool_name in ["message_notify_dev"] and "analysis" in str(context.get("result", "")).lower():
                message = f"🧠 **THOROUGH ANALYSIS** (+1.5 points)\nComprehensive problem analysis with '{tool_name}'."
                score = 1.5
            elif tool_name.startswith("notion_") or "document" in tool_name:
                message = f"📝 **PROPER DOCUMENTATION** (+1.5 points)\nExcellent planning and documentation with '{tool_name}'."
                score = 1.5
            elif "test" in tool_name.lower() or "validate" in tool_name.lower():
                message = f"🛡️ **QUALITY ASSURANCE** (+1.0 point)\nProactive testing and validation with '{tool_name}'."
                score = 1.0
            else:
                message = f"✅ **TOOL EXECUTED** (+0.5 points)\n'{tool_name}' completed successfully."
                score = 0.5
            level = "success"
        else:
            message = f"❌ **TOOL FAILED** (-1.0 point)\n'{tool_name}' execution failed. Review and improve."
            score = -1.0
            level = "error"
        
        feedback_data = {
            "message": message,
            "score": score,
            "level": level,
            "tool_name": tool_name
        }
        
        self._log_feedback("TOOL_EXECUTION", feedback_data)
        return feedback_data
    
    def _handle_error(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle error scenarios with appropriate penalties"""
        error_type = context.get("error_type", "unknown_error")
        severity = context.get("severity", "medium")
        
        penalty_map = {
            "low": -1.0,
            "medium": -2.5,
            "high": -5.0,
            "critical": -10.0
        }
        
        penalty = penalty_map.get(severity, -2.5)
        
        if error_type == "invalid_action_direct_text":
            message = (
                f"🚫 **PROTOCOL VIOLATION** ({penalty:.1f} points)\n"
                "You responded with direct text instead of using the **message_notify_dev** tool. "
                "This violates the established protocol. Use appropriate tools for communication."
            )
        elif error_type == "invalid_tool_call":
            tool_name = context.get("tool_name", "unknown")
            error_msg = context.get("error", "unspecified error")
            message = (
                f"⚠️ **TOOL CALL ERROR** ({penalty:.1f} points)\n"
                f"Failed to call tool '{tool_name}': {error_msg}. "
                "Verify parameters and tool availability."
            )
        elif error_type == "missing_required_parameter":
            tool_name = context.get("tool_name", "unknown")
            param_name = context.get("param_name", "unknown")
            message = (
                f"⚠️ **PARAMETER ERROR** ({penalty:.1f} points)\n"
                f"Missing required parameter '{param_name}' for tool '{tool_name}'. "
                "Always provide all required parameters."
            )
        else:
            message = (
                f"❌ **ERROR OCCURRED** ({penalty:.1f} points)\n"
                f"An error of type '{error_type}' occurred. Review your approach."
            )
        
        feedback_data = {
            "message": message,
            "score": penalty,
            "level": "error",
            "error_type": error_type,
            "severity": severity
        }
        
        self._log_feedback("ERROR", feedback_data)
        return feedback_data
    
    def _handle_cycle_completion(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle completion of a full interaction cycle - Quality-focused"""
        performance = self.metrics_tracker.get_performance_summary()
        learning_insights = self.metrics_tracker.get_learning_insights()
        
        # Calculate cycle score based on engineering quality, not speed
        base_score = 5.0
        quality_bonus = (performance.get("avg_efficiency", 0.5) - 0.5) * 8  # Thoughtful tool usage
        success_bonus = (performance.get("success_rate", 0.5) - 0.5) * 10  # Success is important
        
        cycle_score = base_score + quality_bonus + success_bonus
        cycle_score = max(0.0, min(15.0, cycle_score))  # Cap between 0-15
        
        if cycle_score >= 12.0:
            message = f"🏆 **ENGINEERING EXCELLENCE** (+{cycle_score:.1f} points)\n"
            message += "Outstanding quality and thoroughness! True Senior Engineer work."
            level = "outstanding"
        elif cycle_score >= 8.0:
            message = f"🎯 **SOLID ENGINEERING** (+{cycle_score:.1f} points)\n"
            message += "Good quality approach with proper planning and execution."
            level = "strong"
        elif cycle_score >= 5.0:
            message = f"✅ **TASK COMPLETED** (+{cycle_score:.1f} points)\n"
            message += "Task finished with acceptable quality standards."
            level = "completed"
        else:
            message = f"⚠️ **NEEDS IMPROVEMENT** (+{cycle_score:.1f} points)\n"
            message += "Focus on quality, planning, and thorough analysis."
            level = "weak"
        
        # Add engineering insights
        if learning_insights.get("insights"):
            message += f"\n\n🧠 **Engineering Insights:**\n"
            for insight in learning_insights["insights"][:3]:  # Top 3 insights
                message += f"• {insight}\n"
        
        feedback_data = {
            "message": message,
            "score": cycle_score,
            "level": level,
            "performance_summary": performance,
            "learning_insights": learning_insights
        }
        
        self._log_feedback("CYCLE_COMPLETION", feedback_data)
        return feedback_data
    
    def _handle_generic_event(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle any other events with basic feedback"""
        event = context.get("event", "unknown")
        message = f"Event '{event}' processed."
        
        feedback_data = {
            "message": message,
            "score": 0.0,
            "level": "neutral"
        }
        
        self._log_feedback("GENERIC", feedback_data)
        return feedback_data
    
    def _generate_performance_insights(self, performance: Dict[str, Any]) -> str:
        """Generate human-readable performance insights"""
        insights = []
        
        success_rate = performance.get("success_rate", 0)
        avg_efficiency = performance.get("avg_efficiency", 0)
        avg_duration = performance.get("avg_task_duration", 0)
        
        if success_rate >= 0.9:
            insights.append("🎯 Excellent task completion rate")
        elif success_rate < 0.6:
            insights.append("⚠️ Low success rate - focus on task completion")
        
        if avg_efficiency >= 0.8:
            insights.append("⚡ Highly efficient tool usage")
        elif avg_efficiency < 0.5:
            insights.append("🔧 Tool usage could be more efficient")
        
        if avg_duration < 30:
            insights.append("🚀 Fast response times")
        elif avg_duration > 90:
            insights.append("🐌 Consider optimizing response speed")
        
        trend = performance.get("performance_trend", "stable")
        if trend == "improving":
            insights.append("📈 Performance trending upward")
        elif trend == "declining":
            insights.append("📉 Performance declining - refocus needed")
        
        return "\n".join(insights) if insights else "No specific insights available."
    
    def _get_recommendations(self, performance: Dict[str, Any]) -> list:
        """Get specific recommendations based on performance"""
        recommendations = []
        
        if performance.get("success_rate", 0) < 0.7:
            recommendations.append("Practice task completion strategies")
        
        if performance.get("avg_efficiency", 0) < 0.6:
            recommendations.append("Focus on reducing redundant tool calls")
        
        if performance.get("avg_task_duration", 0) > 60:
            recommendations.append("Work on decision-making speed")
        
        if performance.get("total_errors", 0) > 3:
            recommendations.append("Improve error handling and parameter validation")
        
        return recommendations
    
    def _log_feedback(self, feedback_type: str, feedback_data: Dict[str, Any]):
        """Log feedback data for analysis"""
        log_feedback(feedback_type, feedback_data["message"], {
            "score": feedback_data["score"],
            "level": feedback_data.get("level"),
            "performance_data": feedback_data.get("performance_summary")
        })
        
        self.feedback_history.append({
            "timestamp": datetime.now().isoformat(),
            "type": feedback_type,
            "data": feedback_data
        })
    
    def get_cumulative_score(self) -> float:
        """Calculate cumulative score from all feedback"""
        return sum(feedback.get("data", {}).get("score", 0) for feedback in self.feedback_history)
    
    def export_feedback_data(self) -> Dict[str, Any]:
        """Export feedback data for training purposes"""
        return {
            "session_id": self.metrics_tracker.session_id,
            "feedback_history": self.feedback_history,
            "cumulative_score": self.get_cumulative_score(),
            "performance_metrics": self.metrics_tracker.get_performance_summary(),
            "learning_insights": self.metrics_tracker.get_learning_insights()
        }

# Legacy functions for backward compatibility
def corrective_feedback(context):
    """Legacy function - use AdvancedFeedbackSystem instead"""
    event = context.get("event", "unknown_error")
    
    if event == "invalid_action_direct_text":
        return "ERROR: Protocol violation detected. Use message_notify_dev tool instead of direct text."
    elif event == "invalid_tool_call":
        tool_name = context.get("tool_name", "unknown")
        error = context.get("error", "unspecified error")
        return f"ERROR: Tool '{tool_name}' failed: {error}"
    elif event == "missing_required_parameter":
        tool_name = context.get("tool_name", "unknown")
        param_name = context.get("param_name", "unknown")
        return f"ERROR: Missing required parameter '{param_name}' for tool '{tool_name}'"
    elif event == "invalid_parameter_value":
        tool_name = context.get("tool_name", "unknown")
        param_name = context.get("param_name", "unknown")
        value = context.get("value", "")
        reason = context.get("reason", "invalid value")
        return f"ERROR: Invalid value '{value}' for parameter '{param_name}' in tool '{tool_name}': {reason}"
    
    return "ERROR: An unexpected error occurred. Please try a different approach."

def positive_feedback(context):
    """Legacy function - use AdvancedFeedbackSystem instead"""
    event = context.get("event", "unknown_success")
    
    if event == "cycle_completed":
        return "[bold green]Cycle completed successfully and accumulated **5 points**.[/bold green]"
    elif event == "tool_call_success":
        tool_name = context.get("tool_name", "unknown")
        return f"[bold green]Tool '{tool_name}' executed successfully.[/bold green]"
    
    return "[bold green]Operation completed successfully.[/bold green]" 