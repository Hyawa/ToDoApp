import { useState } from 'react';
import { X } from 'lucide-react';

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];

export function ListModal({ isOpen, onClose, onSave }: ListModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[4]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name, color);
    setName('');
    setColor(COLORS[4]);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content list-modal">
        <div className="modal-header">
          <h2>Nova Lista</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nome da lista</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: Faculdade, Trabalho..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Cor</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button
                  type="button"
                  key={c}
                  className={`color-btn ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Criar Lista</button>
          </div>
        </form>
      </div>
    </div>
  );
}
