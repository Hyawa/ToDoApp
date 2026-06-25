import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
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
    opacity: isDragging ? 0.6 : 1,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Beautiful Drag Handle & Reorder buttons with Lucide React Icons */}
      <div 
        className="reorder-actions" 
        {...listeners} 
        onClick={e => e.stopPropagation()}
        style={{ cursor: "grab", display: "flex", flexDirection: "row", alignItems: "center", gap: "2px" }}
      >
        <GripVertical size={18} style={{ color: "var(--text-muted)", marginRight: "2px" }} />
        <button className="reorder-btn" onClick={onMoveUp} title="Subir">
          <ChevronUp size={16} />
        </button>
        <button className="reorder-btn" onClick={onMoveDown} title="Descer">
          <ChevronDown size={16} />
        </button>
      </div>

      <TaskItem
        task={task}
        taskLists={list ? [list] : []}
        onClick={onClick}
        onToggleCompletion={onToggleCompletion}
        onDelete={onDelete}
        onStartTask={onStartTask}
        onRevertTask={onRevertTask}
        onCompleteTask={onCompleteTask}
      />
    </div>
  );
}
