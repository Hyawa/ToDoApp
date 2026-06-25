import { useState } from 'react';
import { Plus, CheckCircle2, Circle, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { Subtask } from '../types';
import api from '../services/api';

interface SubtasksSectionProps {
  taskId: number;
  subtasks: Subtask[];
  onSubtasksChange: (newSubtasks: Subtask[]) => void;
}

export function SubtasksSection({ taskId, subtasks, onSubtasksChange }: SubtasksSectionProps) {
  const [newTitle, setNewTitle] = useState('');

  const completedCount = subtasks.filter(s => s.is_completed).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.post<Subtask>('subtasks/', {
        task: taskId,
        title: newTitle
      });
      onSubtasksChange([...subtasks, res.data]);
      setNewTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (subtask: Subtask) => {
    try {
      const newStatus = !subtask.is_completed;
      const res = await api.patch<Subtask>(`subtasks/${subtask.id}/`, {
        is_completed: newStatus
      });
      onSubtasksChange(subtasks.map(s => s.id === subtask.id ? res.data : s));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`subtasks/${id}/`);
      onSubtasksChange(subtasks.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const moveSubtask = async (id: number, direction: 'up' | 'down') => {
    const idx = subtasks.findIndex(s => s.id === id);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= subtasks.length) return;

    const a = subtasks[idx];
    const b = subtasks[targetIdx];

    // Swap positions locally
    const newAPos = b.position;
    const newBPos = a.position;

    onSubtasksChange(subtasks.map(s => {
      if (s.id === a.id) return { ...s, position: newAPos };
      if (s.id === b.id) return { ...s, position: newBPos };
      return s;
    }));

    try {
      await api.patch(`subtasks/${a.id}/`, { position: newAPos });
      await api.patch(`subtasks/${b.id}/`, { position: newBPos });
    } catch (err) {
      console.error(err);
      // revert by refetching subtasks for the task
      try {
        const res = await api.get<Subtask[]>(`subtasks/?task_id=${taskId}`);
        onSubtasksChange(res.data);
      } catch (e) {
        console.error('Failed to refetch subtasks', e);
      }
    }
  };

  return (
    <div className="subtasks-section">
      <div className="subtasks-header">
        <h3>Subtarefas</h3>
        <span className="subtasks-counter">
          {completedCount}/{subtasks.length} concluídas
        </span>
      </div>
      
      {subtasks.length > 0 && completedCount === subtasks.length && (
        <div className="subtasks-all-done">
          Todas as subtarefas concluídas! 🎉
        </div>
      )}

      <ul className="subtasks-list">
        {subtasks.map(sub => (
          <li key={sub.id} className={`subtask-item ${sub.is_completed ? 'completed' : ''}`}>
            <button type="button" className="subtask-toggle" onClick={() => toggleStatus(sub)}>
              {sub.is_completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <span className="subtask-title">{sub.title}</span>
            <div className="subtask-actions">
              <button type="button" className="subtask-reorder" onClick={() => moveSubtask(sub.id, 'up')} title="Subir">
                <ChevronUp size={14} />
              </button>
              <button type="button" className="subtask-reorder" onClick={() => moveSubtask(sub.id, 'down')} title="Descer">
                <ChevronDown size={14} />
              </button>
              <button type="button" className="subtask-delete" onClick={() => handleDelete(sub.id)}>
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="subtask-form">
        <Plus size={16} />
        <input 
          type="text" 
          placeholder="Adicionar subtarefa..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
      </form>
    </div>
  );
}
