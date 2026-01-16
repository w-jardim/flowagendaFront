// src/components/ClientModal.jsx
import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Loader2, CreditCard, MapPin } from 'lucide-react';
import api from '../services/api';
import { normalizeClient, prepareWhatsappForSend } from '../services/normalize';

export default function ClientModal({ isOpen, onClose, onSuccess, clientToEdit }) {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    endereco: ''
  });
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes or clientToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        // Modo edição - normalizar o objeto e popular fields
        const client = normalizeClient(clientToEdit);
        // client.telefoneDigits contém apenas números sem country code
        setFormData({
          nome: client.nome || '',
          telefone: formatPhone(client.telefoneDigits || ''),
          email: client.email || '',
          cpf: formatCPF(client.cpf || ''),
          endereco: client.endereco || ''
        });
      } else {
        // Modo criação - limpar form
        setFormData({
          nome: '',
          telefone: '',
          email: '',
          cpf: '',
          endereco: ''
        });
      }
    }
  }, [isOpen, clientToEdit]);

  // Máscara para WhatsApp
  const formatPhone = (value) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');

    // Aplica máscara brasileira
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  // Máscara para CPF
  const formatCPF = (value) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');

    // Aplica máscara brasileira
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    } else if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }
  };

  // Limpa máscara do CPF para envio (apenas números)
  const cleanCPF = (cpf) => {
    return cpf.replace(/\D/g, '');
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.telefone.trim()) {
      alert('Nome e WhatsApp são obrigatórios.');
      return;
    }

    setSaving(true);

    try {
      const dadosParaEnviar = {
        nome: formData.nome.trim(),
        whatsapp: prepareWhatsappForSend(formData.telefone),
        email: formData.email.trim() || undefined,
        cpf: cleanCPF(formData.cpf) || undefined,
        endereco: formData.endereco.trim() || undefined
      };

      if (clientToEdit) {
        // Editar cliente existente
        await api.patch(`/clientes/${clientToEdit.id}`, dadosParaEnviar);
      } else {
        // Criar novo cliente
        await api.post('/clientes', dadosParaEnviar);
      }

      if (onSuccess) {
        onSuccess(); // Recarrega lista de clientes
      }

      onClose();
      alert(clientToEdit ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);

      if (error.response?.status === 409) {
        alert('Este WhatsApp ou CPF já está cadastrado.');
      } else if (error.response?.status === 400) {
        alert('Dados inválidos. Verifique o nome e WhatsApp.');
      } else {
        alert('Erro ao salvar cliente. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User size={20} />
            {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nome || ''}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome completo"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                required
                value={formData.telefone || ''}
                onChange={handlePhoneChange}
                placeholder="(21) 99999-9999"
                maxLength={15}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Digite apenas números. O código 55 será adicionado automaticamente.
            </p>
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail <span className="text-slate-400">(opcional)</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@email.com"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              CPF <span className="text-slate-400">(opcional)</span>
            </label>
            <div className="relative">
              <CreditCard size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.cpf || ''}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Endereço <span className="text-slate-400">(opcional)</span>
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                clientToEdit ? 'Atualizar' : 'Cadastrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}