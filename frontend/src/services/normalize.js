/**
 * src/services/normalize.js
 * Utilitários puros para normalização de objetos recebidos do backend.
 * Regras principais:
 * - `id`: garante existir em `id` (usa `_id` como fallback)
 * - `telefone`: fallback entre `telefone || whatsapp || phone` e retornado no formato para exibição
 * - `whatsapp` para envio: sempre números, sem caracteres; adiciona prefixo `55` se não existir
 * - `preco`: garante número em `preco` e adiciona `precoFormatted` para exibição em pt-BR
 * - `endereco`: string não vazia ('' como fallback)
 * As funções são puras e retornam novos objetos.
 */

function ensureId(obj) {
  const id = obj?.id ?? obj?._id ?? obj?.user_id ?? obj?.cliente_id ?? obj?.servico_id ?? null;
  return id ?? null;
}

function pickPhone(obj) {
  // Try several keys
  const raw = obj?.telefone ?? obj?.whatsapp ?? obj?.phone ?? obj?.cliente_telefone ?? '';
  return String(raw || '');
}

function stripNonDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function stripLeadingCountry55(value) {
  const d = stripNonDigits(value);
  if (d.startsWith('55')) return d.slice(2);
  return d;
}

function prepareWhatsappForSend(value) {
  const digits = stripNonDigits(value || '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits; // already has country code
  return `55${digits}`;
}

function formatPreco(value) {
  if (value === undefined || value === null || value === '') return { preco: 0, precoFormatted: '' };
  // Accept strings with comma or dot
  const str = String(value).replace(/\./g, '').replace(',', '.');
  const num = Number(str);
  if (Number.isNaN(num)) return { preco: 0, precoFormatted: '' };
  return { preco: num, precoFormatted: num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) };
}

export function normalizeClient(raw) {
  if (!raw) return null;
  const id = ensureId(raw);
  const telefoneRaw = pickPhone(raw);
  const telefoneDisplay = (() => {
    const d = stripLeadingCountry55(telefoneRaw);
    if (!d) return '';
    // Simple display: keep as (XX) XXXXX-XXXX or fallback to raw digits
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  })();

  const endereco = raw?.endereco ?? raw?.address ?? '';
  const email = raw?.email ?? '';
  const nome = raw?.nome ?? raw?.name ?? '';
  const cpf = raw?.cpf ?? '';

  return {
    ...raw,
    id,
    nome,
    telefone: telefoneDisplay,
    telefoneDigits: stripNonDigits(telefoneRaw),
    whatsapp: prepareWhatsappForSend(telefoneRaw || raw?.whatsapp),
    email,
    cpf,
    endereco: endereco || ''
  };
}

export function normalizeService(raw) {
  if (!raw) return null;
  const id = ensureId(raw);
  const nome = raw?.nome ?? raw?.name ?? raw?.title ?? '';
  const descricao = raw?.descricao ?? raw?.description ?? '';
  const { preco, precoFormatted } = formatPreco(raw?.preco ?? raw?.price ?? 0);
  const duracao = raw?.duracao ?? raw?.duration ?? raw?.duracao_minutos ?? raw?.durationMinutes ?? '';

  return {
    ...raw,
    id,
    nome,
    descricao,
    preco,
    precoFormatted,
    duracao
  };
}

export function normalizeAppointment(raw) {
  if (!raw) return null;
  const id = ensureId(raw);
  // unify date field
  const dateFields = ['data_inicio', 'datetime_inicio', 'start', 'inicio', 'data', 'data_agendamento', 'horario_inicio'];
  let data_inicio = null;
  for (const k of dateFields) {
    if (raw[k]) { data_inicio = raw[k]; break; }
  }

  const servicoNome = raw?.servico_nome ?? raw?.servico?.nome ?? raw?.service?.name ?? raw?.title ?? '';
  const clienteNome = raw?.cliente_nome ?? raw?.cliente?.nome ?? raw?.customer?.name ?? raw?.client_name ?? '';
  const clienteTelefoneRaw = raw?.cliente_telefone ?? raw?.cliente?.telefone ?? raw?.cliente?.whatsapp ?? raw?.whatsapp ?? raw?.phone ?? '';

  const clienteTelefone = (() => {
    const d = stripLeadingCountry55(clienteTelefoneRaw);
    if (!d) return '';
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  })();

  return {
    ...raw,
    id,
    data_inicio,
    servico_nome: servicoNome,
    cliente_nome: clienteNome,
    cliente_telefone: clienteTelefone,
    cliente_telefone_digits: stripNonDigits(clienteTelefoneRaw)
  };
}

export { ensureId, pickPhone, stripNonDigits, prepareWhatsappForSend };
