import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTask } from "./SortableTask";
import api from "../services/api";

interface Task {
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
}

interface TaskList {
  id: number;
  name: string;
  color?: string;
}

interface DraggableTaskListProps {
  tasks: Task[];
  taskLists: TaskList[];
  onTaskClick: (task: Task) => void;
  onToggleCompletion: (task: Task, e: React.MouseEvent) => void;
  onMoveTask: (taskId: number, direction: 'up' | 'down') => void;
  onDeleteTask?: (taskId: number) => void;
  onStartTask?: (taskId: number) => void;
  onRevertTask?: (taskId: number) => void;
  onCompleteTask?: (taskId: number) => void;
  onTasksUpdate: (tasks: Task[]) => void;
}

export function DraggableTaskList({
  tasks,
  taskLists,
  onTaskClick,
  onToggleCompletion,
  onMoveTask,
  onDeleteTask,
  onStartTask,
  onRevertTask,
  onCompleteTask,
  onTasksUpdate,
}: DraggableTaskListProps) {
  console.log("DraggableTaskList renderizado");
  console.log("Quantidade de tarefas:", tasks.length);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex(task => task.id === active.id);
    const newIndex = tasks.findIndex(task => task.id === over.id);
    const newTasks = arrayMove(tasks, oldIndex, newIndex);

    // Update positions locally
    onTasksUpdate(newTasks.map((task, index) => ({ ...task, position: index })));

    // Persist changes to backend
    try {
      await api.patch(`tasks/${active.id}/reorder/`, { position: newIndex });
      // Refetch or update remaining tasks if needed
    } catch (err) {
      console.error('Failed to persist reorder', err);
      onTasksUpdate(tasks); // Revert on error
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          {tasks.map(task => {
            const list = taskLists.find(l => l.id === task.task_list);
            return (
                <SortableTask
                  key={task.id}
                  task={task}
                  list={list}
                  onClick={() => onTaskClick(task)}
                  onToggleCompletion={onToggleCompletion}
                  onMoveUp={() => onMoveTask(task.id, 'up')}
                  onMoveDown={() => onMoveTask(task.id, 'down')}
                  onDelete={onDeleteTask ? () => onDeleteTask(task.id) : undefined}
                  onStartTask={onStartTask ? () => onStartTask(task.id) : undefined}
                  onRevertTask={onRevertTask ? () => onRevertTask(task.id) : undefined}
                  onCompleteTask={onCompleteTask ? () => onCompleteTask(task.id) : undefined}
                />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}