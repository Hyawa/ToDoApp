import { Star, Circle, CheckCircle2, Play, Undo2, Archive } from 'lucide-react';
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
  const taskListColor = taskList?.color || '#cccccc';
  
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
  
  return (
    <li className="task-item" onClick={onClick}>
      <div className="task-left">
        <button className="task-checkbox" onClick={handleToggleCompletion}>
          {task.is_completed ? (
            <CheckCircle2 size={20} color="#4CAF50" />
          ) : (
            <Circle size={20} color="#999" />
          )}
        </button>
        <span className={`task-title ${task.is_completed ? 'completed' : ''}`}>{task.title}</span>
      </div>
      
      <div className="task-right">
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
          <button className="task-action-btn" onClick={handleDelete} title="Excluir">
            <Archive size={16} />
          </button>
        )}
        
        {taskList && (
          <span
            className="task-list-indicator"
            style={{ backgroundColor: taskListColor }}
            title={taskList.name}
          />
        )}
        
        {task.is_starred && (
          <Star size={16} fill="#FFD700" color="#FFD700" className="task-star" />
        )}
      </div>
    </li>
  );
}