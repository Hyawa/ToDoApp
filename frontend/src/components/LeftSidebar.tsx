import { Menu, Star, Inbox, CheckCircle2, List as ListIcon, Plus, Hash } from 'lucide-react';
import type { TaskList } from '../types';

interface LeftSidebarProps {
  expanded: boolean;
  setExpanded: (val: boolean) => void;
  activeFilter: string; // 'ALL' | 'STARRED' | 'PENDING' | 'COMPLETED' | string (list id)
  setActiveFilter: (val: string) => void;
  taskLists: TaskList[];
  onCreateListClick: () => void;
  onDeleteListClick: (id: number) => void;
}

export function LeftSidebar({
  expanded,
  setExpanded,
  activeFilter,
  setActiveFilter,
  taskLists,
  onCreateListClick,
  onDeleteListClick
}: LeftSidebarProps) {

  return (
    <aside className={`left-sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <button className="hamburger-btn" onClick={() => setExpanded(!expanded)}>
          <Menu size={24} />
        </button>
        {expanded && <h2 className="logo-text">ToDoApp</h2>}
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className={`nav-item ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')} title="Todas as tarefas">
            <Inbox size={20} className="nav-icon" />
            {expanded && <span className="nav-label">Todas as tarefas</span>}
          </li>
          <li className={`nav-item ${activeFilter === 'STARRED' ? 'active' : ''}`} onClick={() => setActiveFilter('STARRED')} title="Com estrela">
            <Star size={20} className="nav-icon" />
            {expanded && <span className="nav-label">Com estrela</span>}
          </li>
          <li className={`nav-item ${activeFilter === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveFilter('PENDING')} title="Pendentes">
            <ListIcon size={20} className="nav-icon" />
            {expanded && <span className="nav-label">Pendentes</span>}
          </li>
          <li className={`nav-item ${activeFilter === 'COMPLETED' ? 'active' : ''}`} onClick={() => setActiveFilter('COMPLETED')} title="Concluídas">
            <CheckCircle2 size={20} className="nav-icon" />
            {expanded && <span className="nav-label">Concluídas</span>}
          </li>
        </ul>

        <div className="sidebar-divider" />

        {expanded && <h3 className="section-title">Minhas Listas</h3>}
        
        <ul className="nav-list lists-container">
          {taskLists.map(list => (
            <li 
              key={list.id} 
              className={`nav-item ${activeFilter === list.id.toString() ? 'active' : ''}`} 
              onClick={() => setActiveFilter(list.id.toString())}
              title={list.name}
            >
              <Hash size={20} className="nav-icon" style={{ color: list.color || 'var(--text-muted)' }} />
              {expanded && (
                <>
                  <span className="nav-label">{list.name}</span>
                  {list.name !== 'My Tasks' && (
                    <button 
                      className="list-delete-btn" 
                      onClick={(e) => { e.stopPropagation(); onDeleteListClick(list.id); }}
                    >×</button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {expanded && (
          <button className="create-list-btn" onClick={onCreateListClick}>
            <Plus size={16} /> Criar nova lista
          </button>
        )}
      </nav>
    </aside>
  );
}
