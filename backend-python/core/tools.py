# tools.py

import time
from typing import Dict, Any, Optional

class ToolInvoker:
    """
    Enhanced tool invoker with metrics tracking and performance monitoring
    """
    def __init__(self, mcp_client, metrics_tracker: Optional[Any] = None):
        self.mcp_client = mcp_client
        self.metrics_tracker = metrics_tracker
        self.tool_call_history = []

    async def invoke(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        """
        Execute tool call with enhanced error handling and metrics tracking
        """
        start_time = time.time()
        
        try:
            # Record tool call start if metrics available
            if self.metrics_tracker and self.metrics_tracker.current_task:
                # This will be recorded in the metrics when feedback is generated
                pass
            
            result = await self.mcp_client.call_mcp_tool(tool_name, tool_args)
            execution_time = time.time() - start_time
            
            # Determine if call was successful
            success = not (isinstance(result, dict) and result.get("error"))
            
            # Record in history
            call_record = {
                "tool_name": tool_name,
                "args": tool_args,
                "result": result,
                "execution_time": execution_time,
                "success": success,
                "timestamp": time.time()
            }
            self.tool_call_history.append(call_record)
            
            # Keep only last 100 calls to prevent memory bloat
            if len(self.tool_call_history) > 100:
                self.tool_call_history = self.tool_call_history[-100:]
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_result = {"error": str(e)}
            
            # Record failed call
            call_record = {
                "tool_name": tool_name,
                "args": tool_args,
                "result": error_result,
                "execution_time": execution_time,
                "success": False,
                "timestamp": time.time(),
                "exception": str(e)
            }
            self.tool_call_history.append(call_record)
            
            return error_result
    
    def get_tool_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics for tool usage"""
        if not self.tool_call_history:
            return {"status": "no_data"}
        
        total_calls = len(self.tool_call_history)
        successful_calls = sum(1 for call in self.tool_call_history if call["success"])
        
        # Calculate average execution times
        avg_execution_time = sum(call["execution_time"] for call in self.tool_call_history) / total_calls
        
        # Tool usage frequency
        tool_usage = {}
        for call in self.tool_call_history:
            tool_name = call["tool_name"]
            if tool_name not in tool_usage:
                tool_usage[tool_name] = {"count": 0, "success_count": 0, "avg_time": 0.0}
            tool_usage[tool_name]["count"] += 1
            if call["success"]:
                tool_usage[tool_name]["success_count"] += 1
        
        # Calculate success rates and average times per tool
        for tool_name, stats in tool_usage.items():
            tool_calls = [call for call in self.tool_call_history if call["tool_name"] == tool_name]
            stats["success_rate"] = stats["success_count"] / stats["count"]
            stats["avg_time"] = sum(call["execution_time"] for call in tool_calls) / len(tool_calls)
        
        return {
            "total_calls": total_calls,
            "successful_calls": successful_calls,
            "success_rate": successful_calls / total_calls,
            "avg_execution_time": avg_execution_time,
            "tool_usage": tool_usage,
            "recent_failures": [
                call for call in self.tool_call_history[-10:] 
                if not call["success"]
            ]
        }
    
    def clear_history(self):
        """Clear tool call history"""
        self.tool_call_history = [] 