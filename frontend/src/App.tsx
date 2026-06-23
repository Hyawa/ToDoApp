import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ArrowDownToLine, Clock, Plus, Tag as TagIcon, X, Calendar } from 'lucide-react';
import api from './services/api';
import type { Task, RecurrenceType } from './types';
import './index.css';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      const response = await api.get<Task[]>('tasks/');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const response = await api.post<Task>('tasks/', {
        title: newTaskTitle,
      });
      setTasks(prev => [...prev, response.data]);
      setNewTaskTitle('');
    } catch (error) {
      console.error('Error creating task', error);
    }
  };

  const toggleTaskCompletion = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = !task.is_completed;
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));
      
      await api.patch(`tasks/${task.id}/`, {
        is_completed: newStatus
      });
      
      // se tinha recorrência e completou, buscamos tudo pra pegar a nova tarefa
      if (!task.is_completed && newStatus && task.recurrence_type !== 'NONE') {
        fetchTasks();
      }
    } catch (error) {
      // Revert on error
      fetchTasks();
    }
  };

  const sendToBottom = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`tasks/${task.id}/send-to-bottom/`);
      fetchTasks();
    } catch (error) {
      console.error('Error sending task to bottom', error);
    }
  };

  const updateTask = async (taskId: number, data: Partial<Task>) => {
    try {
      const response = await api.patch<Task>(`tasks/${taskId}/`, data);
      setTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(response.data);
      }
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await api.delete(`tasks/${taskId}/`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  // Grouping
  const todayDateStr = new Date().toISOString().split('T')[0];
  
  // Pending: not completed AND due_date < today
  const pendingTasks = tasks.filter(t => !t.is_completed && t.due_date < todayDateStr);
  
  // Today: not completed AND due_date >= today
  const todayTasks = tasks.filter(t => !t.is_completed && t.due_date >= todayDateStr);

  // We can sort them here by position (they already come sorted from backend, but just in case)
  const sortByPosition = (a: Task, b: Task) => a.position - b.position;
  pendingTasks.sort(sortByPosition);
  todayTasks.sort(sortByPosition);

  return (
    <div className="app-container">
      <header className="header">
        <h1>ToDoApp</h1>
      </header>

      {/* Input */}
      <form onSubmit={handleCreateTask} className="task-input-container">
        <Plus size={20} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
        <input 
          type="text" 
          className="task-input" 
          placeholder="O que você precisa fazer?"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
      </form>

      {/* Pending List */}
      {pendingTasks.length > 0 && (
        <section className="task-section">
          <h2 className="section-title pending">
            <Clock size={16} /> Pendentes
          </h2>
          <div className="task-list">
            {pendingTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={(e) => toggleTaskCompletion(task, e)}
                onSendBottom={(e) => sendToBottom(task, e)}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Today List */}
      <section className="task-section">
        <h2 className="section-title">
          <Calendar size={16} /> Hoje
        </h2>
        {todayTasks.length === 0 && pendingTasks.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={48} />
            <p>Tudo limpo por aqui! Aproveite seu dia.</p>
          </div>
        ) : (
          <div className="task-list">
            {todayTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={(e) => toggleTaskCompletion(task, e)}
                onSendBottom={(e) => sendToBottom(task, e)}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sidebar Overlay */}
      {selectedTask && (
        <div className="sidebar-overlay" onClick={() => setSelectedTask(null)} />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${selectedTask ? 'open' : ''}`}>
        {selectedTask && (
          <>
            <div className="sidebar-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Detalhes</h3>
              <button className="close-btn" onClick={() => setSelectedTask(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <input 
                className="form-input" 
                value={selectedTask.title}
                onChange={(e) => updateTask(selectedTask.id, { title: e.target.value })}
                style={{ fontSize: '1.125rem', fontWeight: 500, border: 'none', padding: '0.5rem 0', background: 'transparent' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea 
                className="form-textarea"
                placeholder="Adicionar descrição..."
                value={selectedTask.description || ''}
                onBlur={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                onChange={(e) => setSelectedTask({...selectedTask, description: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Recorrência</label>
              <select 
                className="form-select"
                value={selectedTask.recurrence_type}
                onChange={(e) => updateTask(selectedTask.id, { recurrence_type: e.target.value as RecurrenceType })}
              >
                <option value="NONE">Nenhuma</option>
                <option value="DAILY">Diária</option>
                <option value="WEEKLY">Semanal</option>
                <option value="MONTHLY">Mensal</option>
              </select>
            </div>
            
            {/* MVP tags feature visually simple */}
            {selectedTask.tags.length > 0 && (
              <div className="form-group">
                <label className="form-label">Tags</label>
                <div className="tags-container">
                  {selectedTask.tags.map(t => (
                    <span key={t.id} className="tag-badge">{t.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <button 
                onClick={() => deleteTask(selectedTask.id)}
                style={{ 
                  background: 'transparent', border: 'none', color: 'var(--danger-color)', 
                  cursor: 'pointer', padding: '0.5rem', fontWeight: 500, width: '100%',
                  textAlign: 'left', borderRadius: 'var(--radius-md)'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Excluir Tarefa
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Inline component for simplicity in MVP (can be moved later)
function TaskItem({ 
  task, 
  onToggle, 
  onSendBottom, 
  onClick 
}: { 
  task: Task, 
  onToggle: (e: React.MouseEvent) => void,
  onSendBottom: (e: React.MouseEvent) => void,
  onClick: () => void
}) {
  return (
    <div className={`task-item ${task.is_completed ? 'completed' : ''}`} onClick={onClick}>
      <div 
        className={`checkbox-container ${task.is_completed ? 'checked' : ''}`}
        onClick={onToggle}
      >
        {task.is_completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </div>
      
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        
        <div className="task-meta">
          {task.tags.length > 0 && (
            <span className="meta-item"><TagIcon size={12} /> {task.tags.length}</span>
          )}
          {task.recurrence_type !== 'NONE' && (
            <span className="meta-item"><Clock size={12} /> {task.recurrence_type}</span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button 
          className="action-btn" 
          onClick={onSendBottom}
          title="Jogar para o final"
        >
          <ArrowDownToLine size={16} />
        </button>
      </div>
    </div>
  );
}

export default App;
