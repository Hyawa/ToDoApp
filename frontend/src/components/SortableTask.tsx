import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskItem } from "./TaskItem";

interface SortableTaskProps {
  task: {
    id: number;
    title: string;
    is_completed: boolean;
    is_starred: boolean;
    task_list: number;
    position: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
    scheduled_time?: string | null;
    subtasks?: Array<{
      id: number;
      title: string;
      is_completed: boolean;
    }>;
  };
  list?: {
    id: number;
    name: string;
    color?: string;
  };
  onClick: () => void;
  onToggleCompletion: (task: { id: number; is_completed: boolean; title: string; task_list: number; status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED' }, e: React.MouseEvent) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete?: () => void;
  onStartTask?: (taskId: number) => void;
  onRevertTask?: (taskId: number) => void;
  onCompleteTask?: (taskId: number) => void;
}

export function SortableTask({
  task,
  list,
  onClick,
  onToggleCompletion,
  onMoveUp,
  onMoveDown,
  onDelete,
  onStartTask,
  onRevertTask,
  onCompleteTask,
}: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskItem
        task={task}
        taskLists={list ? [list] : []}
        onClick={onClick}
        onToggleCompletion={onToggleCompletion}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
        onStartTask={onStartTask ? () => onStartTask(task.id) : undefined}
        onRevertTask={onRevertTask ? () => onRevertTask(task.id) : undefined}
        onCompleteTask={onCompleteTask ? () => onCompleteTask(task.id) : undefined}
      />
       <div className="reorder-actions" {...listeners} onClick={e => e.stopPropagation()}>
         <button className="reorder-btn" onClick={onMoveUp} title="Subir">↑</button>
         <button className="reorder-btn" onClick={onMoveDown} title="Descer">↓</button>
       </div>
    </div>
  );
}