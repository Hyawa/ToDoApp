import { Star, Circle, CheckCircle2, Play, Undo2, Trash2, Clock, Calendar, List as ListIcon } from 'lucide-react';
import type { Task, TaskList } from '../types';

interface TaskItemProps {
  task: Task;
  taskLists: TaskList[];
  onClick: () => void;
  onToggleCompletion: (task: Task, e: React.MouseEvent) => void;
  onStartTask?: (taskId: number) => void;
  onRevertTask?: (taskId: number) => void;
  onCompleteTask?: (taskId: number) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function TaskItem({
  task,
  taskLists,
  onClick,
  onToggleCompletion,
  onStartTask,
  onRevertTask,
  onCompleteTask,
  onDelete,
}: TaskItemProps) {
  const taskList = taskLists.find(list => list.id === task.task_list);
  const taskListColor = taskList?.color || 'var(--text-muted)';
  
  const handleToggleCompletion = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompletion(task, e);
  };
  
  const handleStartTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartTask?.(task.id);
  };
  
  const handleRevertTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRevertTask?.(task.id);
  };

  const handleCompleteTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCompleteTask?.(task.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(e);
  };

  // Check if all subtasks are done
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const allSubtasksDone = hasSubtasks && task.subtasks!.every(s => s.is_completed);
  
  return (
    <div 
      className={`task-item ${task.is_completed ? 'completed' : ''} ${allSubtasksDone ? 'all-subtasks-done' : ''}`} 
      onClick={onClick}
    >
      {/* Checkbox */}
      <div 
        className={`checkbox-container ${task.is_completed ? 'checked' : ''}`} 
        onClick={handleToggleCompletion}
      >
        {task.is_completed ? (
          <CheckCircle2 size={20} />
        ) : (
          <Circle size={20} />
        )}
      </div>
      
      {/* Task Content (Title & Meta) */}
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        
        <div className="task-meta">
          {taskList && (
            <span className="meta-badge" style={{ borderLeft: `3px solid ${taskListColor}`, paddingLeft: '6px' }}>
              {taskList.name}
            </span>
          )}
          
          {task.scheduled_time && (
            <span className="meta-badge time-badge">
              <Clock size={12} /> {task.scheduled_time.substring(0, 5)}
            </span>
          )}
          
          {task.estimated_time && (
            <span className="meta-badge">
              <Clock size={12} /> {
                task.estimated_time === '5_MINUTES' ? '5m' :
                task.estimated_time === '15_MINUTES' ? '15m' :
                task.estimated_time === '30_MINUTES' ? '30m' :
                task.estimated_time === '1_HOUR' ? '1h' :
                task.estimated_time === '2_HOURS' ? '2h' : task.estimated_time
              }
            </span>
          )}

          {hasSubtasks && (
            <span className={`meta-badge subtask-badge ${allSubtasksDone ? 'done' : ''}`}>
              <ListIcon size={12} /> {task.subtasks!.filter(s => s.is_completed).length}/{task.subtasks!.length}
            </span>
          )}
        </div>
      </div>
      
      {/* Task Actions (Star & Control Buttons) */}
      <div className="task-actions">
        {task.status === 'PENDING' && onStartTask && (
          <button className="task-action-btn" onClick={handleStartTask} title="Iniciar">
            <Play size={16} />
          </button>
        )}
        
        {task.status === 'IN_PROGRESS' && onRevertTask && (
          <button className="task-action-btn" onClick={handleRevertTask} title="Voltar para Pendente">
            <Undo2 size={16} />
          </button>
        )}
        
        {task.status === 'IN_PROGRESS' && onCompleteTask && (
          <button className="task-action-btn" onClick={handleCompleteTask} title="Concluir">
            <CheckCircle2 size={16} />
          </button>
        )}

        {onDelete && (
          <button className="task-action-btn delete-btn" onClick={handleDelete} title="Excluir">
            <Trash2 size={16} />
          </button>
        )}
        
        {task.is_starred && (
          <Star size={16} fill="var(--warning)" color="var(--warning)" className="task-star" />
        )}
      </div>
    </div>
  );
}
