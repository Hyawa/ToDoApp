import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Star, Hash, Bell, ChevronUp, ChevronDown } from 'lucide-react';
import api from './services/api';
import type { Task, TaskList } from './types';
import { LeftSidebar } from './components/LeftSidebar';
import { TaskModal } from './components/TaskModal';
import { ListModal } from './components/ListModal';
import { SubtasksSection } from './components/SubtasksSection';
import { requestNotificationPermission, sendNotification } from './services/notification';
import './index.css';

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
    try {
      if (taskData.id) {
        await api.patch(`tasks/${taskData.id}/`, taskData);
      } else {
        await api.post('tasks/', taskData);
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

  const toggleTaskCompletion = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = !task.is_completed;
      console.log('Toggling task', { id: task.id, prev: task.is_completed, new: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));
      const res = await api.patch(`tasks/${task.id}/`, { is_completed: newStatus });
      console.log('Toggle response', res.status, res.data);
      fetchData(); // Refetch to handle recurrence generation
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

  // Filtering Logic
  const getFilteredTasks = () => {
    let filtered = tasks;
    const now = new Date();

    // 1. Hide intelligently based on hide_until_due
    filtered = filtered.filter(task => {
      if (task.is_completed) return true; // Let completed tasks through, they are filtered later
      if (!task.scheduled_time || task.hide_until_due === null) return true;
      
      const [hours, minutes] = task.scheduled_time.split(':').map(Number);
      const scheduledDate = new Date(task.start_date);
      scheduledDate.setHours(hours, minutes, 0, 0);
      
      const showTime = new Date(scheduledDate.getTime() - task.hide_until_due * 60000);
      return now >= showTime;
    });

    // 2. Sidebar Filters
    if (activeFilter === 'STARRED') {
      filtered = filtered.filter(t => t.is_starred);
    } else if (activeFilter === 'PENDING') {
      filtered = filtered.filter(t => !t.is_completed);
    } else if (activeFilter === 'COMPLETED') {
      filtered = filtered.filter(t => t.is_completed);
    } else if (activeFilter !== 'ALL') {
      filtered = filtered.filter(t => t.task_list === Number(activeFilter));
    }

    // Sort: Pending first, then by position
    return filtered.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return a.position - b.position;
    });
  };

  const displayTasks = getFilteredTasks();

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

        <div className="task-list">
          {displayTasks.map(task => {
            const list = taskLists.find(l => l.id === task.task_list);
            const subtasksDone = task.subtasks?.filter(s => s.is_completed).length || 0;
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const subtasksBadge = hasSubtasks ? `${subtasksDone}/${task.subtasks.length} concluídas` : null;
            const isAllSubtasksDone = hasSubtasks && subtasksDone === task.subtasks.length;

            // If we are in 'ALL' or a specific list, filter out completed ones to a separate section below? 
            // The prompt says: "Ao concluir uma tarefa: Ela deve desaparecer imediatamente de My Tasks E aparecer automaticamente em Concluídas".
            // So if activeFilter is ALL or a List, we should probably hide completed tasks.
            // Let's hide completed tasks from ALL and custom lists, unless we are in the COMPLETED filter.
            if (task.is_completed && activeFilter !== 'COMPLETED' && activeFilter !== 'STARRED') {
               return null;
            }

            return (
              <div 
                key={task.id} 
                className={`task-item ${task.is_completed ? 'completed' : ''} ${isAllSubtasksDone && !task.is_completed ? 'all-subtasks-done' : ''}`}
                onClick={() => {
                  setTaskToEdit(task);
                  setIsTaskModalOpen(true);
                }}
              >
                <div className={`checkbox-container ${task.is_completed ? 'checked' : ''}`} onClick={(e) => toggleTaskCompletion(task, e)}>
                  {task.is_completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </div>
                
                <div className="task-content">
                  <span className="task-title">{task.title}</span>
                  
                  <div className="task-meta">
                    {list && <span className="meta-badge list-badge" style={{ color: list.color || 'var(--text-muted)' }}><Hash size={12}/> {list.name}</span>}
                    {task.scheduled_time && <span className="meta-badge time-badge"><Bell size={12}/> {task.scheduled_time.substring(0,5)}</span>}
                    {subtasksBadge && <span className={`meta-badge subtask-badge ${isAllSubtasksDone ? 'done' : ''}`}>{subtasksBadge}</span>}
                  </div>
                </div>

                <div className="task-actions">
                  {task.is_starred && <Star size={16} fill="#f59e0b" color="#f59e0b" />}
                  <div className="reorder-actions" onClick={e => e.stopPropagation()}>
                    <button className="reorder-btn" onClick={() => moveTask(task.id, 'up')} title="Subir">
                      <ChevronUp size={14} />
                    </button>
                    <button className="reorder-btn" onClick={() => moveTask(task.id, 'down')} title="Descer">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
