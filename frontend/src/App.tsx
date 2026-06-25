import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from './services/api';
import { LeftSidebar } from './components/LeftSidebar';
import { TaskModal } from './components/TaskModal';
import { ListModal } from './components/ListModal';
import { SubtasksSection } from './components/SubtasksSection';
import { DraggableTaskList } from './components/DraggableTaskList';
import { requestNotificationPermission, sendNotification } from './services/notification';
import { isTaskVisible } from './utils/taskVisibility';
import './index.css';

// Tipos temporários até a definição formal ser localizada
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
type EstimatedTime = '5_MINUTES' | '15_MINUTES' | '30_MINUTES' | '1_HOUR' | '2_HOURS' | null;

interface Task {
  id: number;
  title: string;
  is_completed: boolean;
  is_starred: boolean;
  task_list: number;
  position: number;
  status: TaskStatus;
  estimated_time: EstimatedTime;
  scheduled_time?: string | null;
  hide_until_due?: number | null;
  recurrence_type?: string | null;
  recurrence_days?: number[] | null;
  start_date: string;
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

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [activeFilter, setActiveFilter] = useState('ALL');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  const fetchData = async () => {
    try {
      const [tasksRes, listsRes] = await Promise.all([
        api.get<Task[]>('tasks/'),
        api.get<TaskList[]>('tasklists/')
      ]);
      console.log("TASKS_FROM_API", tasksRes.data.map(t => ({
        id: t.id,
        title: t.title,
        start_date: t.start_date,
        due_date: t.due_date,
        scheduled_time: t.scheduled_time,
        recurrence_type: t.recurrence_type,
        repeat_monday: t.repeat_monday,
        repeat_tuesday: t.repeat_tuesday,
        repeat_wednesday: t.repeat_wednesday,
        repeat_thursday: t.repeat_thursday,
        repeat_friday: t.repeat_friday,
        repeat_saturday: t.repeat_saturday,
        repeat_sunday: t.repeat_sunday,
        is_completed: t.is_completed,
        status: t.status,
      })));
      console.log('Fetched tasks', tasksRes.status, 'count=', tasksRes.data.length, tasksRes.data.slice(0, 10));
      setTasks(tasksRes.data);
      setTaskLists(listsRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Notification Polling System
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (!task.is_completed && task.scheduled_time && task.notification_offset !== null) {
          const [hours, minutes] = task.scheduled_time.split(':').map(Number);
          const scheduledDate = new Date(task.start_date);
          scheduledDate.setHours(hours, minutes, 0, 0);
          
          const notifyTime = new Date(scheduledDate.getTime() - task.notification_offset * 60000);
          
          // If we are within the current minute of the notification time
          if (now.getHours() === notifyTime.getHours() && now.getMinutes() === notifyTime.getMinutes() && now.getDate() === notifyTime.getDate()) {
            sendNotification('ToDoApp Lembrete', {
              body: `Sua tarefa "${task.title}" está agendada para ${task.scheduled_time}.`,
              icon: '/favicon.ico'
            });
          }
        }
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  const handleSaveTask = async (taskData: Partial<Task>) => {
    console.log("APP_SAVE_TASK_DATA", taskData);
    try {
      const payload = {
        ...taskData,
        start_date: taskData.start_date || new Date().toISOString().split('T')[0],
      };
      if (taskData.id) {
        const response = await api.patch(`tasks/${taskData.id}/`, payload);
        console.log("APP_SAVE_RESPONSE", response.data);
      } else {
        const response = await api.post('tasks/', payload);
        console.log("APP_SAVE_RESPONSE", response.data);
      }
      fetchData();
      
      // Request permission if they set a notification
      if (taskData.notification_offset !== null && taskData.notification_offset !== undefined) {
        requestNotificationPermission();
      }
    } catch (error) {
      console.error('Error saving task', error);
    }
  };

  const updateTaskStatus = async (taskId: number, status: TaskStatus) => {
    try {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      await api.patch(`tasks/${taskId}/`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating task status', error);
      fetchData();
    }
  };

  const startTask = (taskId: number) => updateTaskStatus(taskId, 'IN_PROGRESS');
  const revertTask = (taskId: number) => updateTaskStatus(taskId, 'PENDING');
  const completeTask = (taskId: number) => updateTaskStatus(taskId, 'COMPLETED');

  const toggleTaskCompletion = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = !task.is_completed;
      console.log('Toggling task', { id: task.id, prev: task.is_completed, new: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));
      const res = await api.patch(`tasks/${task.id}/`, { is_completed: newStatus });
      console.log('Toggle response', res.status, res.data);
      fetchData();
    } catch (error) {
      console.error('Error toggling task', error);
      fetchData();
    }
  };

  const moveTask = async (taskId: number, direction: 'up' | 'down') => {
    // operate on the currently displayed (filtered + sorted) tasks so reordering is per-list/filter
    const visible = getFilteredTasks();
    const idx = visible.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= visible.length) return;

    const a = visible[idx];
    const b = visible[targetIdx];

    // Swap positions locally for instant UI update
    // update global tasks state so the UI updates while preserving other tasks
    setTasks(prev => prev.map(t => {
      if (t.id === a.id) return { ...t, position: b.position };
      if (t.id === b.id) return { ...t, position: a.position };
      return t;
    }));

    try {
      // Persist both positions
      await api.patch(`tasks/${a.id}/reorder/`, { position: b.position });
      await api.patch(`tasks/${b.id}/reorder/`, { position: a.position });
    } catch (err) {
      console.error('Failed to persist reorder', err);
      // revert by refetching
      fetchData();
    }
  };

  const handleCreateList = async (name: string, color: string) => {
    try {
      await api.post('tasklists/', { name, color });
      fetchData();
    } catch (error) {
      console.error('Error creating list', error);
    }
  };

  const handleDeleteList = async (id: number) => {
    try {
      await api.delete(`tasklists/${id}/`);
      if (activeFilter === id.toString()) setActiveFilter('ALL');
      fetchData();
    } catch (error) {
      console.error('Error deleting list', error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    const confirmed = window.confirm('Tem certeza que deseja excluir esta tarefa?');
    if (!confirmed) return;

    try {
      await deleteTask(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const { displayTasks, futureTasks, inProgressTasks } = React.useMemo(() => {
    const now = new Date();
    const logVisibility = [];
    let filtered = [];
    const futureTasksList = [];
    const inProgressTasksList = [];

    // 1. Separar tarefas visíveis, futuras e em andamento
    tasks.forEach(task => {
      const visibility = isTaskVisible(task, now);
      logVisibility.push({
        id: task.id,
        titulo: task.title,
        repeticao: task.recurrence_type,
        dias_repeticao: [
          task.repeat_monday ? "Seg" : null,
          task.repeat_tuesday ? "Ter" : null,
          task.repeat_wednesday ? "Qua" : null,
          task.repeat_thursday ? "Qui" : null,
          task.repeat_friday ? "Sex" : null,
          task.repeat_saturday ? "Sáb" : null,
          task.repeat_sunday ? "Dom" : null
        ].filter(Boolean).join(", ") || "N/A",
        mostrar_tarefa: task.hide_until_due,
        data_referencia: task.start_date + (task.scheduled_time ? ` ${task.scheduled_time}` : ""),
        deve_exibir: visibility.visible,
        motivo: visibility.reason
      });
      
      if (task.status === 'IN_PROGRESS') {
        inProgressTasksList.push(task);
      } else if (task.status === 'PENDING' && visibility.visible && !task.is_completed) {
        filtered.push(task);
      } else if (task.status === 'PENDING' && !task.is_completed) {
        futureTasksList.push(task);
      }
    });
    
    // Log dos resultados de visibilidade (apenas uma vez)
    if (logVisibility.length > 0) {
      console.log("=== Log de Visibilidade de Tarefas ===");
      logVisibility.forEach(log => {
        console.log(`id: ${log.id}`);
        console.log(`titulo: ${log.titulo}`);
        console.log(`repeticao: ${log.repeticao}`);
        console.log(`dias_repeticao: ${log.dias_repeticao}`);
        console.log(`mostrar_tarefa: ${log.mostrar_tarefa}`);
        console.log(`data_referencia: ${log.data_referencia}`);
        console.log(`deve_exibir: ${log.deve_exibir}`);
        console.log(`motivo: ${log.motivo}`);
        console.log("---");
      });
    }

    // 2. Sidebar Filters
    if (activeFilter === 'STARRED') {
      filtered = filtered.filter(t => t.is_starred);
    } else if (activeFilter === 'PENDING') {
      filtered = filtered.filter(t => !t.is_completed);
    } else if (activeFilter === 'COMPLETED') {
      filtered = filtered.filter(t => t.is_completed);
    } else if (activeFilter === 'FUTURE') {
      filtered = futureTasksList;
    } else if (activeFilter === 'IN_PROGRESS') {
      filtered = inProgressTasksList;
    } else if (activeFilter !== 'ALL') {
      filtered = filtered.filter(t => t.task_list === Number(activeFilter));
    }

    // Sort: Pending first, then by position
    const sortedTasks = filtered.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return a.position - b.position;
    });

    return {
      displayTasks: sortedTasks,
      futureTasks: futureTasksList,
      inProgressTasks: inProgressTasksList
    };
  }, [tasks, activeFilter]);

  return (
    <div className="layout-container">
      <LeftSidebar 
        expanded={sidebarExpanded}
        setExpanded={setSidebarExpanded}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        taskLists={taskLists}
        onCreateListClick={() => setIsListModalOpen(true)}
        onDeleteListClick={handleDeleteList}
      />

      <main className="main-content">
        <header className="main-header">
          <h1>
            {activeFilter === 'ALL' && 'Todas as tarefas'}
            {activeFilter === 'STARRED' && 'Com estrela'}
            {activeFilter === 'PENDING' && 'Pendentes'}
            {activeFilter === 'COMPLETED' && 'Concluídas'}
            {taskLists.find(l => l.id.toString() === activeFilter)?.name}
          </h1>
        </header>

        {activeFilter === 'FUTURE' ? (
          <div className="future-tasks-section">
            <h2>Tarefas Futuras</h2>
            {futureTasks.length === 0 ? (
              <p>Nenhuma tarefa futura encontrada.</p>
            ) : (
              <ul className="future-tasks-list">
                {futureTasks.map(task => (
                  <li key={task.id} className="future-task-item">
                    <div className="future-task-header">
                      <h3>{task.title}</h3>
                      <span className="future-task-date">
                        {task.start_date} {task.scheduled_time && `às ${task.scheduled_time}`}
                      </span>
                    </div>
                    <p className="future-task-reason">
                      Motivo: {isTaskVisible(task).reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : activeFilter === 'IN_PROGRESS' ? (
          <div className="in-progress-tasks-section">
            <h2>Em Andamento</h2>
            {inProgressTasks.length === 0 ? (
              <p>Nenhuma tarefa em andamento.</p>
            ) : (
              <DraggableTaskList
                tasks={inProgressTasks}
                taskLists={taskLists}
                onTaskClick={(task) => {
                  setTaskToEdit(task);
                  setIsTaskModalOpen(true);
                }}
                onToggleCompletion={toggleTaskCompletion}
                onMoveTask={moveTask}
                onTasksUpdate={(updatedTasks) => {
                  setTasks(prev => prev.map(t => {
                    const updatedTask = updatedTasks.find(ut => ut.id === t.id);
                    return updatedTask ? updatedTask : t;
                  }));
                }}
              />
            )}
          </div>
        ) : (
          <>
            <DraggableTaskList
              tasks={displayTasks.filter(task => task.status === 'PENDING' && !task.is_completed)}
              taskLists={taskLists}
              onTaskClick={(task) => {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }}
              onToggleCompletion={toggleTaskCompletion}
              onMoveTask={moveTask}
              onStartTask={startTask}
              onDeleteTask={handleDeleteTask}
              onTasksUpdate={(updatedTasks) => {
                setTasks(prev => prev.map(t => {
                  const updatedTask = updatedTasks.find(ut => ut.id === t.id);
                  return updatedTask ? updatedTask : t;
                }));
              }}
            />
            {inProgressTasks.length > 0 && activeFilter === 'ALL' && (
              <div className="in-progress-tasks-section">
                <h2>Em Andamento</h2>
             <DraggableTaskList
                   tasks={inProgressTasks}
                   taskLists={taskLists}
                   onTaskClick={(task) => {
                     setTaskToEdit(task);
                     setIsTaskModalOpen(true);
                   }}
                   onToggleCompletion={toggleTaskCompletion}
                   onMoveTask={moveTask}
                   onRevertTask={revertTask}
                   onCompleteTask={completeTask}
                   onDeleteTask={handleDeleteTask}
                   onTasksUpdate={(updatedTasks) => {
                     setTasks(prev => prev.map(t => {
                       const updatedTask = updatedTasks.find(ut => ut.id === t.id);
                       return updatedTask ? updatedTask : t;
                     }));
                   }}
                 />
              </div>
            )}
          </>
        )}

        <button 
          className="fab-create" 
          onClick={() => { setTaskToEdit(null); setIsTaskModalOpen(true); }}
        >
          <Plus size={24} />
        </button>
      </main>

      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
        taskLists={taskLists}
      />
      
      {/* We inject SubtasksSection into the same DOM flow or let it be handled inside TaskModal. Let's actually add it to the TaskModal layout if taskToEdit is present */}
      {isTaskModalOpen && taskToEdit && (
         <div className="modal-subtasks-wrapper">
           <SubtasksSection 
              taskId={taskToEdit.id} 
              subtasks={taskToEdit.subtasks || []} 
              onSubtasksChange={(subs) => setTaskToEdit({...taskToEdit, subtasks: subs})}
           />
         </div>
      )}

      <ListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        onSave={handleCreateList}
      />
    </div>
  );
}

export default App;
