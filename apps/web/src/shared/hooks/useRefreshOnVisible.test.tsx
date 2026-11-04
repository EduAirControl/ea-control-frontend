import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRefreshOnVisible } from './useRefreshOnVisible';

describe('useRefreshOnVisible', () => {
  it('no ejecuta al montar ni por intervalo', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    renderHook(() => useRefreshOnVisible(cb));
    vi.advanceTimersByTime(120000);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ejecuta al volver a estar visible y deja de escuchar al desmontar', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useRefreshOnVisible(cb));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cb).toHaveBeenCalledTimes(1);
    unmount();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('usa siempre la última función recibida', () => {
    const a = vi.fn(); const b = vi.fn();
    const { rerender } = renderHook(({ cb }) => useRefreshOnVisible(cb), { initialProps: { cb: a } });
    rerender({ cb: b });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
