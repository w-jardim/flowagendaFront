import { describe, test, expect } from 'vitest';
import { normalizeClient, prepareWhatsappForSend, stripNonDigits } from './normalize';

describe('normalize utilities', () => {
  test('prepareWhatsappForSend adds 55 prefix when missing', () => {
    expect(prepareWhatsappForSend('(21) 99999-9999')).toBe('5521999999999');
    expect(prepareWhatsappForSend('21999999999')).toBe('5521999999999');
    expect(prepareWhatsappForSend('5521999999999')).toBe('5521999999999');
    expect(prepareWhatsappForSend('')).toBe('');
  });

  test('stripNonDigits removes non-digit characters', () => {
    expect(stripNonDigits('(21) 99999-9999')).toBe('21999999999');
    expect(stripNonDigits('abc123')).toBe('123');
  });

  test('normalizeClient returns normalized fields', () => {
    const raw = {
      _id: '123',
      nome: 'João',
      whatsapp: '5521999999999',
      email: 'joao@example.com',
      endereco: 'Rua A, 123'
    };

    const n = normalizeClient(raw);
    expect(n.id).toBe('123');
    expect(n.nome).toBe('João');
    expect(n.whatsapp).toBe('5521999999999');
    expect(n.telefone).toBe('(21) 99999-9999');
    expect(n.email).toBe('joao@example.com');
    expect(n.endereco).toBe('Rua A, 123');
  });
});
