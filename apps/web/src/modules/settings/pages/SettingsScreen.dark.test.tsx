import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';


const { get, save } = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/preferencesService', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    save: (...args: unknown[]) => save(...args),
  },
  DEFAULT_REMINDERS: {
    alertas: true,
    advertencias: true,
    resumenDiario: false,
    sonido: true,
  },
}));

import SettingsScreen from './SettingsScreen';

const prefs = (over = {}) => ({ darkMode: false, colorTheme: '', language: 'es', dateFormat: 'DD-MM-YYYY',
  manualTimezone: 'America/Lima', autoTimezone: true, notificationsEnabled: true, reminders: {}, ...over });

function mountWithSystemDark() {
  window.matchMedia = ((q: string) => ({ matches: q.includes('dark'), media: q, addEventListener() {},
    removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  return render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
}
const isDark = () => document.querySelector('.settings-page')!.classList.contains('dark');

describe('SettingsScreen modo oscuro', () => {
  beforeEach(() => { localStorage.clear(); get.mockReset(); save.mockClear(); document.body.className = ''; });

  it('BD en claro y sistema oscuro: queda en claro', async () => {
    get.mockResolvedValue(prefs({ darkMode: false }));
    mountWithSystemDark();
    await waitFor(() => expect(get).toHaveBeenCalled());
    await waitFor(() => expect(isDark()).toBe(false));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('BD en claro y localStorage heredado en oscuro (otro usuario): queda en claro', async () => {
    localStorage.setItem('darkMode', 'true');
    get.mockResolvedValue(prefs({ darkMode: false }));
    mountWithSystemDark();
    await waitFor(() => expect(isDark()).toBe(false));
  });

  it('BD en oscuro: queda en oscuro', async () => {
    get.mockResolvedValue(prefs({ darkMode: true }));
    mountWithSystemDark();
    await waitFor(() => expect(isDark()).toBe(true));
  });

  it('no sube a la BD el valor del sistema antes de hidratar', async () => {
    get.mockResolvedValue(prefs({ darkMode: false }));
    mountWithSystemDark();
    await waitFor(() => expect(get).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    for (const [body] of save.mock.calls) expect(body.darkMode).toBe(false);
  });

  it('GET fallido con sistema oscuro: no escribe en la BD el modo del sistema', async () => {
    get.mockResolvedValue(null);
    const { container } = mountWithSystemDark();
    await new Promise((r) => setTimeout(r, 50));
    // el usuario cambia otra cosa (un recordatorio) y se dispara la sincronización
    const toggles = container.querySelectorAll('.toggle');
    fireEvent.click(toggles[toggles.length - 1]);
    await new Promise((r) => setTimeout(r, 50));
    for (const [body] of save.mock.calls) expect(body.darkMode).not.toBe(true);
  });

  it('un refresco al volver a la pestaña con el PUT en vuelo no revierte el cambio del usuario', async () => {
    let release: (v: unknown) => void = () => {};
    save.mockImplementation(() => new Promise((r) => { release = r; }));
    get.mockResolvedValue(prefs({ darkMode: true }));
    const { container } = mountWithSystemDark();
    await waitFor(() => expect(isDark()).toBe(true));
    fireEvent.click(container.querySelector('.toggle')!);          // el usuario apaga el modo oscuro
    await waitFor(() => expect(isDark()).toBe(false));
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(isDark()).toBe(false);
    release(null);
    save.mockResolvedValue(null);
  });

  it('no consulta las preferencias en bucle', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    get.mockResolvedValue(prefs());
    mountWithSystemDark();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(get).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('vuelve a leer al regresar a la pestaña y aplica el valor de otro dispositivo', async () => {
    get.mockResolvedValue(prefs({ darkMode: false }));
    mountWithSystemDark();
    await waitFor(() => expect(isDark()).toBe(false));
    get.mockResolvedValue(prefs({ darkMode: true }));
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(isDark()).toBe(true));
    expect(get).toHaveBeenCalledTimes(2);
  });
});
