import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict

@dataclass
class TaskMetrics:
    """Metrics for a specific task execution"""
    task_id: str
    start_time: float
    end_time: Optional[float] = None
    tools_used: List[str] = None
    tool_calls_count: int = 0
    success: bool = False
    error_count: int = 0
    context_switches: int = 0
    response_quality_score: float = 0.0
    efficiency_score: float = 0.0
    user_satisfaction_score: float = 0.0
    
    def __post_init__(self):
        if self.tools_used is None:
            self.tools_used = []
    
    @property
    def duration(self) -> float:
        if self.end_time:
            return self.end_time - self.start_time
        return time.time() - self.start_time
    
    @property
    def tools_efficiency(self) -> float:
        """Calculate tool usage efficiency (lower is better)"""
        if self.tool_calls_count == 0:
            return 1.0
        unique_tools = len(set(self.tools_used))
        return unique_tools / self.tool_calls_count if self.tool_calls_count > 0 else 0.0

@dataclass 
class SessionMetrics:
    """Aggregated metrics for an entire session"""
    session_id: str
    start_time: float
    tasks: List[TaskMetrics] = None
    total_tool_calls: int = 0
    total_errors: int = 0
    avg_response_time: float = 0.0
    success_rate: float = 0.0
    overall_efficiency: float = 0.0
    
    def __post_init__(self):
        if self.tasks is None:
            self.tasks = []

class AgentMetricsTracker:
    """Advanced metrics tracking system for agent performance"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.current_task: Optional[TaskMetrics] = None
        self.session_metrics = SessionMetrics(session_id, time.time())
        self.metrics_history: List[Dict] = []
        self.performance_trends: Dict[str, List[float]] = defaultdict(list)
        
        # Load historical data
        self._load_metrics_history()
    
    def start_task(self, task_id: str = None) -> str:
        """Start tracking a new task"""
        if task_id is None:
            task_id = f"task_{len(self.session_metrics.tasks)}_{int(time.time())}"
        
        if self.current_task and not self.current_task.end_time:
            self.end_task(success=False)  # End previous task as failed
        
        self.current_task = TaskMetrics(task_id=task_id, start_time=time.time())
        return task_id
    
    def end_task(self, success: bool = True, quality_score: float = 0.5):
        """End current task and calculate metrics"""
        if not self.current_task:
            return
        
        self.current_task.end_time = time.time()
        self.current_task.success = success
        self.current_task.response_quality_score = quality_score
        self.current_task.efficiency_score = self._calculate_efficiency_score()
        
        self.session_metrics.tasks.append(self.current_task)
        self._update_session_metrics()
        self._save_task_metrics()
        
        self.current_task = None
    
    def record_tool_call(self, tool_name: str, success: bool = True, response_time: float = 0.0):
        """Record a tool call for the current task"""
        if not self.current_task:
            self.start_task()
        
        self.current_task.tools_used.append(tool_name)
        self.current_task.tool_calls_count += 1
        
        if not success:
            self.current_task.error_count += 1
        
        self.session_metrics.total_tool_calls += 1
        if not success:
            self.session_metrics.total_errors += 1
    
    def record_context_switch(self):
        """Record when the agent switches context/strategy"""
        if self.current_task:
            self.current_task.context_switches += 1
    
    def calculate_reward_score(self, base_reward: float = 5.0) -> float:
        """Calculate reward score based on engineering quality, not speed"""
        if not self.current_task:
            return 0.0
        
        task = self.current_task
        score = base_reward
        
        # Quality and thoroughness bonuses/penalties
        # NO TIME PENALTIES - Quality over speed
        
        # Tool quality bonus (fewer tools used more thoughtfully)
        efficiency = task.tools_efficiency
        if efficiency > 0.8:  # High efficiency bonus
            score += 2.0
        elif efficiency < 0.3:  # Low efficiency penalty
            score -= 2.0
        
        # Error penalty (focus on getting it right)
        score -= task.error_count * 2.0  # Increased penalty for errors
        
        # Context switch penalty (shows lack of planning)
        if task.context_switches > 2:  # Reduced tolerance for context switches
            score -= (task.context_switches - 2) * 1.0
        
        # Success/failure
        if not task.success:
            score -= 5.0
        
        # Quality bonus (more important than speed)
        score += task.response_quality_score * 5.0  # Increased quality importance
        
        # Completeness bonus - reward thorough work
        if task.tool_calls_count >= 3:  # Reward using multiple tools thoughtfully
            score += 1.0
        
        return max(0.0, score)  # Never negative
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        if not self.session_metrics.tasks:
            return {"status": "no_data"}
        
        tasks = self.session_metrics.tasks
        successful_tasks = [t for t in tasks if t.success]
        
        return {
            "session_id": self.session_id,
            "total_tasks": len(tasks),
            "successful_tasks": len(successful_tasks),
            "success_rate": len(successful_tasks) / len(tasks) if tasks else 0.0,
            "avg_task_duration": sum(t.duration for t in tasks) / len(tasks),
            "avg_tools_per_task": sum(t.tool_calls_count for t in tasks) / len(tasks),
            "avg_efficiency": sum(t.tools_efficiency for t in tasks) / len(tasks),
            "total_errors": sum(t.error_count for t in tasks),
            "avg_quality_score": sum(t.response_quality_score for t in tasks) / len(tasks),
            "current_reward_score": self.calculate_reward_score() if self.current_task else 0.0,
            "performance_trend": self._get_performance_trend()
        }
    
    def get_learning_insights(self) -> Dict[str, Any]:
        """Generate insights for improving engineering quality"""
        summary = self.get_performance_summary()
        insights = []
        
        if summary.get("success_rate", 0) < 0.7:
            insights.append("Success rate needs improvement. Focus on thorough analysis and planning.")
        
        if summary.get("avg_efficiency", 0) < 0.5:
            insights.append("Tool usage could be more thoughtful. Plan your approach before executing.")
        
        if summary.get("avg_quality_score", 0) < 0.6:
            insights.append("Code quality needs attention. Follow engineering best practices.")
        
        if summary.get("total_errors", 0) > 3:
            insights.append("Error rate is concerning. Take time to validate parameters and test thoroughly.")
        
        # Analyze tool usage patterns for quality insights
        tool_patterns = self._analyze_tool_patterns()
        if tool_patterns:
            insights.extend(tool_patterns)
        
        return {
            "insights": insights,
            "recommendations": self._generate_recommendations(summary),
            "next_focus_areas": self._identify_focus_areas(summary)
        }
    
    def _calculate_efficiency_score(self) -> float:
        """Calculate task efficiency score"""
        if not self.current_task:
            return 0.0
        
        # Factors: tool efficiency, time taken, errors
        task = self.current_task
        
        tool_score = task.tools_efficiency
        time_score = max(0, 1 - (task.duration / 120))  # Normalize to 2 minutes
        error_score = max(0, 1 - (task.error_count * 0.2))
        
        return (tool_score + time_score + error_score) / 3
    
    def _update_session_metrics(self):
        """Update aggregate session metrics"""
        tasks = self.session_metrics.tasks
        if not tasks:
            return
        
        successful = [t for t in tasks if t.success]
        self.session_metrics.success_rate = len(successful) / len(tasks)
        self.session_metrics.avg_response_time = sum(t.duration for t in tasks) / len(tasks)
        self.session_metrics.overall_efficiency = sum(t.efficiency_score for t in tasks) / len(tasks)
    
    def _get_performance_trend(self) -> str:
        """Calculate performance trend over recent tasks"""
        if len(self.session_metrics.tasks) < 3:
            return "insufficient_data"
        
        recent_scores = [t.efficiency_score for t in self.session_metrics.tasks[-5:]]
        if len(recent_scores) >= 2:
            trend = recent_scores[-1] - recent_scores[0]
            if trend > 0.1:
                return "improving"
            elif trend < -0.1:
                return "declining"
        return "stable"
    
    def _analyze_tool_patterns(self) -> List[str]:
        """Analyze tool usage patterns for insights"""
        if not self.session_metrics.tasks:
            return []
        
        patterns = []
        all_tools = []
        for task in self.session_metrics.tasks:
            all_tools.extend(task.tools_used)
        
        # Find most used tools
        tool_counts = defaultdict(int)
        for tool in all_tools:
            tool_counts[tool] += 1
        
        if tool_counts:
            most_used = max(tool_counts.items(), key=lambda x: x[1])
            if most_used[1] > len(self.session_metrics.tasks) * 0.7:
                patterns.append(f"Heavy reliance on '{most_used[0]}' tool detected.")
        
        return patterns
    
    def _generate_recommendations(self, summary: Dict) -> List[str]:
        """Generate specific recommendations based on engineering quality"""
        recommendations = []
        
        if summary.get("avg_efficiency", 0) < 0.6:
            recommendations.append("Plan your tool usage more carefully - think before acting")
        
        if summary.get("success_rate", 0) < 0.8:
            recommendations.append("Focus on thorough task completion - verify all requirements")
        
        if summary.get("avg_quality_score", 0) < 0.6:
            recommendations.append("Improve code quality - follow engineering best practices and documentation")
        
        if summary.get("total_errors", 0) > 3:
            recommendations.append("Take more time for validation - quality over speed")
        
        return recommendations
    
    def _identify_focus_areas(self, summary: Dict) -> List[str]:
        """Identify key areas for engineering improvement"""
        focus_areas = []
        
        # Identify worst performing quality metric
        metrics = {
            "tool_efficiency": summary.get("avg_efficiency", 0),
            "success_rate": summary.get("success_rate", 0),
            "code_quality": summary.get("avg_quality_score", 0)
        }
        
        worst_metric = min(metrics.items(), key=lambda x: x[1])
        focus_areas.append(worst_metric[0])
        
        return focus_areas
    
    def _save_task_metrics(self):
        """Save task metrics to file"""
        if not self.current_task:
            return
        
        os.makedirs('logs/metrics', exist_ok=True)
        metrics_file = f'logs/metrics/{self.session_id}_metrics.jsonl'
        
        with open(metrics_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps({
                'timestamp': datetime.now().isoformat(),
                'task_metrics': asdict(self.current_task),
                'reward_score': self.calculate_reward_score()
            }) + '\n')
    
    def _load_metrics_history(self):
        """Load historical metrics for trend analysis"""
        metrics_file = f'logs/metrics/{self.session_id}_metrics.jsonl'
        if not os.path.exists(metrics_file):
            return
        
        try:
            with open(metrics_file, 'r', encoding='utf-8') as f:
                for line in f:
                    self.metrics_history.append(json.loads(line))
        except (IOError, json.JSONDecodeError):
            pass  # Ignore errors in historical data
    
    def export_training_data(self) -> Dict[str, Any]:
        """Export data in format suitable for machine learning"""
        training_data = {
            "session_id": self.session_id,
            "session_summary": asdict(self.session_metrics),
            "task_data": [asdict(task) for task in self.session_metrics.tasks],
            "performance_metrics": self.get_performance_summary(),
            "learning_insights": self.get_learning_insights(),
            "exported_at": datetime.now().isoformat()
        }
        
        # Save to training data directory
        os.makedirs('logs/training_data', exist_ok=True)
        export_file = f'logs/training_data/{self.session_id}_training.json'
        
        with open(export_file, 'w', encoding='utf-8') as f:
            json.dump(training_data, f, indent=2, ensure_ascii=False)
        
        return training_data 