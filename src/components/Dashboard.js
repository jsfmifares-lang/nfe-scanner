import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import CadastroCirurgia from './CadastroCirurgia';

function Dashboard({ user }) {
  const [view, setView] = useState('dashboard');
  const [cirurgias, setCirurgias] = useState([]);
  const [selectedCirurgia, setSelectedCirurgia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadCirurgias();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadCirurgias = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'cirurgias'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCirurgias(data);
    } catch (error) {
      console.error('Erro ao carregar:', error);
      // Dados de exemplo para demonstração
      setCirurgias([
        {
          id: '1',
          hospitalNome: 'Hospital Santa Maria',
          unidade: 'Unidade Centro',
          especialidade: 'Ortopedia - Artroplastia',
          horario: '11:14',
          paciente: 'Maria Silva',
          status: 'aguardando',
          data: '2024-01-15'
        },
        {
          id: '2',
          hospitalNome: 'Hospital Central',
          unidade: 'Unidade Matriz',
          especialidade: 'Neurocirurgia - Craniotomia',
          horario: '12:14',
          paciente: 'João Santos',
          status: 'aguardando',
          data: '2024-01-15'
        },
        {
          id: '3',
          hospitalNome: 'Hospital São José',
          unidade: 'Unidade Norte',
          especialidade: 'Cardiologia - Angioplastia',
          horario: '14:14',
          paciente: 'Ana Oliveira',
          status: 'aguardando',
          data: '2024-01-15'
        },
        {
          id: '4',
          hospitalNome: 'Hospital Santa Maria',
          unidade: 'Unidade Centro',
          especialidade: 'Cardiologia - Marcapasso',
          horario: '15:14',
          paciente: 'Pedro Costa',
          status: 'material',
          data: '2024-01-15'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir?')) {
      try {
        await deleteDoc(doc(db, 'cirurgias', id));
        setCirurgias(cirurgias.filter(c => c.id !== id));
        showToast('Cirurgia excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir:', error);
        showToast('Erro ao excluir', 'error');
      }
    }
  };

  const handleEdit = (cirurgia) => {
    setSelectedCirurgia(cirurgia);
    setView('cadastro');
  };

  const handleSaved = () => {
    setView('dashboard');
    setSelectedCirurgia(null);
    loadCirurgias();
    showToast(selectedCirurgia?.id ? 'Cirurgia atualizada!' : 'Cirurgia cadastrada!');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDeliverBy = (horario) => {
    if (!horario) return '--:--';
    const [hours, minutes] = horario.split(':').map(Number);
    const deliverMinutes = hours * 60 + minutes - 180;
    const h = Math.floor(deliverMinutes / 60);
    const m = deliverMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getLateInfo = (horario) => {
    if (!horario) return null;
    const [hours, minutes] = horario.split(':').map(Number);
    const surgeryTime = new Date();
    surgeryTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const diff = now - surgeryTime;
    
    if (diff > 0) {
      const hoursLate = Math.floor(diff / (1000 * 60 * 60));
      const minsLate = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `atrasado ${hoursLate}h ${minsLate}min`;
    }
    return null;
  };

  const stats = {
    total: cirurgias.length,
    criticos: cirurgias.filter(c => c.status === 'urgente').length,
    aguardando: cirurgias.filter(c => c.status === 'aguardando').length,
    liberados: cirurgias.filter(c => c.status === 'liberado').length,
  };

  if (view === 'cadastro') {
    return (
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>NFe Scanner</h2>
            <p>Sistema de Entregas</p>
          </div>
          <nav className="sidebar-menu">
            <button className="menu-item" onClick={() => setView('dashboard')}>
              <span>📊</span> Dashboard
            </button>
            <button className="menu-item active">
              <span>➕</span> Nova Cirurgia
            </button>
          </nav>
          <div className="sidebar-footer">
            <button className="menu-item" onClick={handleLogout}>
              <span>🚪</span> Sair
            </button>
          </div>
        </aside>
        <main className="main-content">
          <header className="top-bar">
            <h1>Cadastro de Cirurgia</h1>
            <div className="user-info">
              <span>{user?.displayName || user?.email}</span>
            </div>
          </header>
          <div className="content">
            <CadastroCirurgia
              cirurgia={selectedCirurgia}
              onSaved={handleSaved}
              onCancel={() => {
                setView('dashboard');
                setSelectedCirurgia(null);
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>NFe Scanner</h2>
          <p>Sistema de Entregas</p>
        </div>
        <nav className="sidebar-menu">
          <button className="menu-item active">
            <span>📊</span> Dashboard
          </button>
          <button className="menu-item" onClick={() => setView('cadastro')}>
            <span>➕</span> Nova Cirurgia
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="menu-item" onClick={handleLogout}>
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h1>Dashboard</h1>
          <div className="user-info">
            <span>{user?.displayName || user?.email}</span>
          </div>
        </header>

        <div className="content">
          <div className="stats-grid">
            <div className="stat-card info">
              <h3>Total de Pedidos</h3>
              <div className="value">{stats.total}</div>
              <div className="subtitle">pedidos ativos</div>
            </div>
            <div className="stat-card critical">
              <h3>Situação Crítica</h3>
              <div className="value">{stats.criticos}</div>
              <div className="subtitle">pedidos críticos</div>
            </div>
            <div className="stat-card warning">
              <h3>Aguardando Liberação</h3>
              <div className="value">{stats.aguardando}</div>
              <div className="subtitle">pendentes</div>
            </div>
            <div className="stat-card success">
              <h3>Materiais Separados</h3>
              <div className="value">{stats.liberados}</div>
              <div className="subtitle">prontos</div>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header">
              <div>
                <h2>ENTREGAS DE MATERIAIS CIRÚRGICOS</h2>
                <div className="table-info">
                  <strong>{stats.total}</strong> pedidos ativos · <strong>{stats.criticos}</strong> em situação crítica
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="clock">{formatTime(currentTime)}</div>
                <div className="page-info">PÁGINA 1 DE 1</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>HOSPITAL</th>
                  <th>CIRURGIA</th>
                  <th>HORÁRIO</th>
                  <th>ENTREGAR ATÉ</th>
                  <th>STATUS</th>
                  <th>PRIORIDADE</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      <div className="loading">
                        <div className="spinner"></div>
                        Carregando...
                      </div>
                    </td>
                  </tr>
                ) : cirurgias.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      Nenhuma cirurgia cadastrada
                    </td>
                  </tr>
                ) : (
                  cirurgias.map(cirurgia => {
                    const lateInfo = getLateInfo(cirurgia.horario);
                    const isUrgent = cirurgia.status === 'urgente';
                    
                    return (
                      <tr key={cirurgia.id} className={isUrgent ? 'critical' : ''}>
                        <td>
                          <div className="hospital-cell">
                            {cirurgia.hospitalNome}
                            <div className="unit">{cirurgia.unidade}</div>
                          </div>
                        </td>
                        <td className="surgery-cell">{cirurgia.especialidade}</td>
                        <td className="time-cell">{cirurgia.horario}</td>
                        <td className="time-cell">{calculateDeliverBy(cirurgia.horario)}</td>
                        <td>
                          <span className={`status-badge status-${cirurgia.status || 'aguardando'}`}>
                            {cirurgia.status === 'aguardando' ? 'AGUARDANDO LIBERAÇÃO' :
                             cirurgia.status === 'material' ? 'MATERIAL SEPARADO' :
                             cirurgia.status === 'liberado' ? 'LIBERADO' :
                             'AGUARDANDO LIBERAÇÃO'}
                          </span>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                            ⚠ Autorização, Material
                          </div>
                        </td>
                        <td>
                          <div className="priority-badge priority-critico">
                            <span>CRÍTICO</span>
                            {lateInfo && <div className="late-info">{lateInfo}</div>}
                          </div>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button 
                              className="btn-icon edit"
                              onClick={() => handleEdit(cirurgia)}
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-icon delete"
                              onClick={() => handleDelete(cirurgia.id)}
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
