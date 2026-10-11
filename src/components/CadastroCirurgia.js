import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  query,
  where 
} from 'firebase/firestore';

const hospitais = [
  { id: 1, nome: 'Hospital Santa Maria', unidade: 'Unidade Centro' },
  { id: 2, nome: 'Hospital Central', unidade: 'Unidade Matriz' },
  { id: 3, nome: 'Hospital São José', unidade: 'Unidade Norte' },
  { id: 4, nome: 'Hospital Municipal', unidade: 'Unidade Sul' },
  { id: 5, nome: 'Hospital Universitário', unidade: 'Unidade Principal' },
  { id: 6, nome: 'Hospital Infantil', unidade: 'Unidade Centro' },
  { id: 7, nome: 'Hospital de Emergência', unidade: 'Unidade Central' },
  { id: 8, nome: 'Clínica São Lucas', unidade: 'Unidade Jardins' },
  { id: 9, nome: 'Centro Cirúrgico Premium', unidade: 'Unidade Alphaville' },
];

const especialidades = [
  'Ortopedia - Artroplastia',
  'Neurocirurgia - Craniotomia',
  'Cardiologia - Angioplastia',
  'Urologia - prostatectomia',
  'Ginecologia - Histerectomia',
  'Oftalmologia - Catarata',
  'Otorrinolaringologia - Septoplastia',
  'Cirurgia Vascular',
  'Cirurgia Plástica',
  'Cirurgia Torácica',
];

const statusOptions = [
  { value: 'eletivo', label: 'Eletivo' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'urgente', label: 'Urgente' },
];

function CadastroCirurgia({ cirurgia, onSaved, onCancel }) {
  const [formData, setFormData] = useState({
    hospitalId: cirurgia?.hospitalId || '',
    hospitalNome: cirurgia?.hospitalNome || '',
    unidade: cirurgia?.unidade || '',
    paciente: cirurgia?.paciente || '',
    especialidade: cirurgia?.especialidade || '',
    data: cirurgia?.data || '',
    horario: cirurgia?.horario || '',
    status: cirurgia?.status || 'eletivo',
  });

  const [hospitalSearch, setHospitalSearch] = useState(cirurgia?.hospitalNome || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredHospitais, setFilteredHospitais] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (hospitalSearch) {
      const filtered = hospitais.filter(h => 
        h.nome.toLowerCase().includes(hospitalSearch.toLowerCase())
      );
      setFilteredHospitais(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredHospitais(hospitais);
      setShowSuggestions(true);
    }
  }, [hospitalSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHospitalSelect = (hospital) => {
    setFormData({
      ...formData,
      hospitalId: hospital.id,
      hospitalNome: hospital.nome,
      unidade: hospital.unidade
    });
    setHospitalSearch(hospital.nome);
    setShowSuggestions(false);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.hospitalNome) newErrors.hospital = 'Selecione um hospital';
    if (!formData.paciente) newErrors.paciente = 'Informe o nome da paciente';
    if (!formData.especialidade) newErrors.especialidade = 'Selecione a especialidade';
    if (!formData.data) newErrors.data = 'Informe a data';
    if (!formData.horario) newErrors.horario = 'Informe o horário';
    if (!formData.status) newErrors.status = 'Selecione o status';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const cirurgiaData = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (cirurgia?.id) {
        await updateDoc(doc(db, 'cirurgias', cirurgia.id), cirurgiaData);
      } else {
        await addDoc(collection(db, 'cirurgias'), cirurgiaData);
      }

      onSaved();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cadastro-container">
      <button className="btn-back" onClick={onCancel}>
        ← Voltar
      </button>

      <div className="cadastro-card">
        <h2>{cirurgia?.id ? 'Editar Cirurgia' : 'Nova Cirurgia'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Hospital/Cliente *</label>
            <div className="typeahead-container" ref={inputRef}>
              <input
                type="text"
                className="typeahead-input"
                value={hospitalSearch}
                onChange={(e) => {
                  setHospitalSearch(e.target.value);
                  setFormData({ ...formData, hospitalId: '', hospitalNome: '', unidade: '' });
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar hospital..."
              />
              {showSuggestions && filteredHospitais.length > 0 && (
                <div className="typeahead-list">
                  {filteredHospitais.map(hospital => (
                    <div
                      key={hospital.id}
                      className={`typeahead-item ${formData.hospitalId === hospital.id ? 'selected' : ''}`}
                      onClick={() => handleHospitalSelect(hospital)}
                    >
                      <strong>{hospital.nome}</strong>
                      <div style={{ fontSize: '12px', color: '#888' }}>{hospital.unidade}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.hospital && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.hospital}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nome da Paciente *</label>
              <input
                type="text"
                value={formData.paciente}
                onChange={(e) => setFormData({ ...formData, paciente: e.target.value })}
                placeholder="Nome completo"
              />
              {errors.paciente && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.paciente}</span>}
            </div>

            <div className="form-group">
              <label>Especialidade *</label>
              <select
                value={formData.especialidade}
                onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
              >
                <option value="">Selecione...</option>
                {especialidades.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
              {errors.especialidade && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.especialidade}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data da Cirurgia *</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
              {errors.data && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.data}</span>}
            </div>

            <div className="form-group">
              <label>Horário da Cirurgia *</label>
              <input
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              />
              {errors.horario && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.horario}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.status && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.status}</span>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : cirurgia?.id ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CadastroCirurgia;
