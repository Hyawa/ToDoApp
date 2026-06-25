import { useState, useEffect } from 'react';
import { X, Calendar, Clock, RotateCcw, Bell, Tag as TagIcon, Star } from 'lucide-react';
import type { Task, TaskList, RecurrenceType } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  taskToEdit?: Task | null;
  taskLists: TaskList[];
}

export function TaskModal({ isOpen, onClose, onSave, taskToEdit, taskLists }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskList, setTaskList] = useState<number | ''>('');
  const [isStarred, setIsStarred] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('');
  
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('NONE');
  const [days, setDays] = useState({
    repeat_monday: false,
    repeat_tuesday: false,
    repeat_wednesday: false,
    repeat_thursday: false,
    repeat_friday: false,
    repeat_saturday: false,
    repeat_sunday: false,
  });

  const [notificationOffset, setNotificationOffset] = useState<number | ''>('');
  const [hideUntilDue, setHideUntilDue] = useState<number | ''>('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setTaskList(taskToEdit.task_list || '');
      setIsStarred(taskToEdit.is_starred);
      setStartDate(taskToEdit.start_date);
      setScheduledTime(taskToEdit.scheduled_time ? taskToEdit.scheduled_time.substring(0, 5) : '');
      setRecurrenceType(taskToEdit.recurrence_type);
      setDays({
        repeat_monday: taskToEdit.repeat_monday,
        repeat_tuesday: taskToEdit.repeat_tuesday,
        repeat_wednesday: taskToEdit.repeat_wednesday,
        repeat_thursday: taskToEdit.repeat_thursday,
        repeat_friday: taskToEdit.repeat_friday,
        repeat_saturday: taskToEdit.repeat_saturday,
        repeat_sunday: taskToEdit.repeat_sunday,
      });
      setNotificationOffset(taskToEdit.notification_offset ?? '');
      setHideUntilDue(taskToEdit.hide_until_due ?? '');
    } else {
      // Reset
      setTitle('');
      setDescription('');
      const defaultList = taskLists.find(l => l.name === 'My Tasks');
      setTaskList(defaultList ? defaultList.id : '');
      setIsStarred(false);
      setStartDate(new Date().toISOString().split('T')[0]);
      setScheduledTime('');
      setRecurrenceType('NONE');
      setDays({
        repeat_monday: false, repeat_tuesday: false, repeat_wednesday: false,
        repeat_thursday: false, repeat_friday: false, repeat_saturday: false, repeat_sunday: false,
      });
      setNotificationOffset('');
      setHideUntilDue('');
    }
  }, [taskToEdit, isOpen, taskLists]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: taskToEdit?.id,
      title,
      description,
      task_list: taskList === '' ? null : Number(taskList),
      is_starred: isStarred,
      start_date: startDate,
      due_date: startDate, // Fallback
      scheduled_time: scheduledTime || null,
      recurrence_type: recurrenceType,
      ...days,
      notification_offset: notificationOffset === '' ? null : Number(notificationOffset),
      hide_until_due: hideUntilDue === '' ? null : Number(hideUntilDue),
    });
    onClose();
  };

  const toggleDay = (key: keyof typeof days) => {
    setDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content task-modal">
        <div className="modal-header">
          <h2>{taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group row">
            <input 
              type="text" 
              className="form-input title-input" 
              placeholder="Título da tarefa..." 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              autoFocus
            />
            <button 
              type="button" 
              className={`star-btn ${isStarred ? 'starred' : ''}`}
              onClick={() => setIsStarred(!isStarred)}
            >
              <Star size={24} fill={isStarred ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="form-group">
            <textarea 
              className="form-textarea" 
              placeholder="Descrição (opcional)" 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label><TagIcon size={16} /> Lista</label>
              <select className="form-select" value={taskList} onChange={e => setTaskList(Number(e.target.value))}>
                <option value="">Sem lista</option>
                {taskLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            
            <div className="form-group half">
              <label><Calendar size={16} /> Data Inicial</label>
              <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label><Clock size={16} /> Horário</label>
              <input type="time" className="form-input" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
            </div>
            
            <div className="form-group half">
              <label><RotateCcw size={16} /> Repetição</label>
              <select className="form-select" value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as RecurrenceType)}>
                <option value="NONE">Não repetir</option>
                <option value="DAILY">Diariamente</option>
                <option value="WEEKLY">Semanalmente</option>
                <option value="MONTHLY">Mensalmente</option>
                <option value="YEARLY">Anualmente</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>
          </div>

          {recurrenceType === 'CUSTOM' && (
            <div className="form-group days-selector">
              <label>Repetir nos dias:</label>
              <div className="days-row">
                {Object.entries({
                  repeat_sunday: 'Dom', repeat_monday: 'Seg', repeat_tuesday: 'Ter',
                  repeat_wednesday: 'Qua', repeat_thursday: 'Qui', repeat_friday: 'Sex', repeat_saturday: 'Sáb'
                }).map(([key, label]) => (
                  <button 
                    type="button"
                    key={key} 
                    className={`day-btn ${days[key as keyof typeof days] ? 'active' : ''}`}
                    onClick={() => toggleDay(key as keyof typeof days)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group half">
              <label><Bell size={16} /> Lembrar-me</label>
              <select className="form-select" value={notificationOffset} onChange={e => setNotificationOffset(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Não lembrar</option>
                <option value="0">No horário</option>
                <option value="5">5 minutos antes</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60">1 hora antes</option>
                <option value="120">2 horas antes</option>
                <option value="1440">1 dia antes</option>
              </select>
            </div>

            <div className="form-group half">
              <label>Mostrar tarefa</label>
              <select className="form-select" value={hideUntilDue} onChange={e => setHideUntilDue(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Sempre mostrar</option>
                <option value="5">Apenas 5m antes</option>
                <option value="15">Apenas 15m antes</option>
                <option value="30">Apenas 30m antes</option>
                <option value="60">Apenas 1h antes</option>
                <option value="120">Apenas 2h antes</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar Tarefa</button>
          </div>
        </form>
      </div>
    </div>
  );
}
