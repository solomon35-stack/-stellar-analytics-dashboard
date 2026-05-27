/**
 * Tests for Issue #41 – Indexer Circuit Breaker
 */

import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker/CircuitBreaker';

function makeBreaker(opts?: ConstructorParameters<typeof CircuitBreaker>[0]) {
  return new CircuitBreaker({ failureThreshold: 3, cooldownMs: 500, successThreshold: 2, ...opts });
}

describe('CircuitBreaker – CLOSED state', () => {
  it('executes the function and returns its result', async () => {
    const cb = makeBreaker();
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('stays CLOSED after fewer failures than the threshold', async () => {
    const cb = makeBreaker();
    for (let i = 0; i < 2; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    }
    expect(cb.getState()).toBe('CLOSED');
  });

  it('opens after reaching the failure threshold', async () => {
    const cb = makeBreaker();
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }
    expect(cb.getState()).toBe('OPEN');
  });

  it('resets failure count on a success', async () => {
    const cb = makeBreaker();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await cb.execute(() => Promise.resolve('ok'));
    // One failure then a success – should still be CLOSED
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getStats().failureCount).toBe(0);
  });
});

describe('CircuitBreaker – OPEN state', () => {
  it('throws CircuitOpenError without calling the function', async () => {
    const cb = makeBreaker();
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }

    const fn = jest.fn(() => Promise.resolve('should not run'));
    await expect(cb.execute(fn)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('CircuitBreaker – HALF_OPEN state', () => {
  it('transitions to HALF_OPEN after cooldown', async () => {
    const cb = makeBreaker({ cooldownMs: 50 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }
    expect(cb.getState()).toBe('OPEN');

    await new Promise((r) => setTimeout(r, 60));
    expect(cb.getState()).toBe('HALF_OPEN');
  });

  it('closes after enough successes in HALF_OPEN', async () => {
    const cb = makeBreaker({ cooldownMs: 50, successThreshold: 2 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }
    await new Promise((r) => setTimeout(r, 60));

    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe('HALF_OPEN'); // still needs one more
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe('CLOSED');
  });

  it('re-opens on failure in HALF_OPEN', async () => {
    const cb = makeBreaker({ cooldownMs: 50 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }
    await new Promise((r) => setTimeout(r, 60));

    await expect(cb.execute(() => Promise.reject(new Error('fail again')))).rejects.toThrow();
    expect(cb.getState()).toBe('OPEN');
  });
});

describe('CircuitBreaker – manual reset', () => {
  it('resets to CLOSED from OPEN', async () => {
    const cb = makeBreaker();
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }
    expect(cb.getState()).toBe('OPEN');

    cb.reset();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getStats().failureCount).toBe(0);
  });
});

describe('CircuitBreaker – getStats', () => {
  it('returns correct stats', async () => {
    const cb = makeBreaker();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();

    const stats = cb.getStats();
    expect(stats.state).toBe('CLOSED');
    expect(stats.failureCount).toBe(1);
    expect(stats.lastFailureTime).not.toBeNull();
  });
});
