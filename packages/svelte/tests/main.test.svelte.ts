import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Interval } from '../src/index.svelte';
import { flushSync, tick } from 'svelte';

// Mock timers for controlled testing
vi.useFakeTimers();

describe('Interval', () => {
	let interval: Interval;

	beforeEach(() => {
		vi.clearAllTimers();
	});

	afterEach(() => {
		// Clean up any running intervals
		vi.clearAllTimers();
	});

	describe('constructor', () => {
		it('should accept a number duration', () => {
			interval = new Interval(1000);
			expect(interval.duration).toBe(1000);
		});

		it('should accept a function duration', () => {
			const durationFn = () => 2000;
			interval = new Interval(durationFn);
			expect(interval.duration).toBe(2000);
		});

		it('should accept immediate option', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');

			// Without immediate option (default lazy)
			const lazyInterval = new Interval(1000);
			expect(setIntervalSpy).not.toHaveBeenCalled();

			// With immediate option
			const immediateInterval = new Interval(1000, { immediate: true });
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
		});

		it('should start interval immediately when immediate: true', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');

			interval = new Interval(500, { immediate: true });

			// Interval should be created immediately
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500);
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			// Accessing current shouldn't create another interval
			interval.current;
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
		});

		it('should respect immediate option with reactive duration', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			let dynamicDuration = $state(300);

			interval = new Interval(() => dynamicDuration, { immediate: true });

			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300);
		});

		it('should not affect pause state with immediate option', () => {
			interval = new Interval(1000, { immediate: true });

			// Should start unpaused regardless of immediate option
			expect(interval.isActive).toBe(true);

			// Should still be able to pause
			interval.pause();
			expect(interval.isActive).toBe(false);
		});
	});

	describe('current getter', () => {
		it('should return current Date when accessed', () => {
			const mockDate = new Date('2023-01-01T00:00:00Z');
			vi.setSystemTime(mockDate);

			interval = new Interval(1000);
			const current = interval.current;

			expect(current).toBeInstanceOf(Date);
			expect(current.getTime()).toBe(mockDate.getTime());
		});

		it('should return new Date when accessed after time passes', () => {
			interval = new Interval(100);
			const mockDate1 = new Date('2023-01-01T00:00:00Z');
			const mockDate2 = new Date('2023-01-01T00:00:01Z');

			vi.setSystemTime(mockDate1);
			let current1 = interval.current;

			vi.setSystemTime(mockDate2);
			let current2 = interval.current;

			expect(current1.getTime()).toBe(mockDate1.getTime());
			expect(current2.getTime()).toBe(mockDate2.getTime());
		});
	});

	describe('duration getter', () => {
		it('should return static duration', () => {
			interval = new Interval(1500);
			expect(interval.duration).toBe(1500);
		});

		it('should return current value from reactive $state function', () => {
			let dynamicDuration = $state(1000);
			interval = new Interval(() => dynamicDuration);

			expect(interval.duration).toBe(1000);

			dynamicDuration = 2000;
			expect(interval.duration).toBe(2000);
		});

		it('should be reactive to $state changes', () => {
			let multiplier = $state(1);
			interval = new Interval(() => multiplier * 1000);

			expect(interval.duration).toBe(1000);

			multiplier = 3;
			expect(interval.duration).toBe(3000);
		});
	});

	describe('duration setter', () => {
		it('should update duration when constructor was passed a function', () => {
			interval = new Interval(() => 1000);
			expect(interval.duration).toBe(1000);

			interval.duration = 500;
			expect(interval.duration).toBe(500);

			interval.duration = () => 2000;
			expect(interval.duration).toBe(2000);
		});

		it('should recreate interval with new duration', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			interval.current;
			expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

			interval.duration = 500;
			interval.current;
			expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 500);
		});

		it('should clear existing interval when duration changes', () => {
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
			interval = new Interval(1000);

			interval.current;
			interval.duration = 2000;
			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});

	describe('pause and resume functionality', () => {
		it('should start unpaused by default', () => {
			interval = new Interval(1000);
			expect(interval.isActive).toBe(true);
		});

		it('should pause the interval', () => {
			interval = new Interval(1000);
			interval.pause();
			expect(interval.isActive).toBe(false);
		});

		it('should resume the interval', () => {
			interval = new Interval(1000);
			interval.pause();
			expect(interval.isActive).toBe(false);

			interval.resume();
			expect(interval.isActive).toBe(true);
		});

		it('should handle multiple pause/resume cycles', () => {
			interval = new Interval(1000);

			interval.pause();
			expect(interval.isActive).toBe(false);

			interval.resume();
			expect(interval.isActive).toBe(true);

			interval.pause();
			expect(interval.isActive).toBe(false);

			interval.resume(true);
			expect(interval.isActive).toBe(true);
		});

		it('should handle pause/resume when not yet started', () => {
			interval = new Interval(1000);

			expect(() => {
				interval.pause();
				interval.resume();
				interval.resume(true);
			}).not.toThrow();
		});
	});

	describe('tickCount', () => {
		it('should start at 0', () => {
			interval = new Interval(1000);
			expect(interval.tickCount).toBe(0);
		});

		it('should increment on each tick', () => {
			interval = new Interval(100);
			interval.current;

			expect(interval.tickCount).toBe(0);

			vi.advanceTimersByTime(250);
			expect(interval.tickCount).toBe(2);
		});

		it('should not increment when paused', () => {
			interval = new Interval(100);
			interval.current;

			interval.pause();
			vi.advanceTimersByTime(300);

			expect(interval.tickCount).toBe(0);
		});

		it('should continue incrementing after resume', () => {
			interval = new Interval(100);
			interval.current;

			vi.advanceTimersByTime(150);
			expect(interval.tickCount).toBe(1);

			interval.pause();
			vi.advanceTimersByTime(200);
			expect(interval.tickCount).toBe(1);

			interval.resume(false);
			vi.advanceTimersByTime(150);
			// Total time: 150 + 200 + 150 = 500ms with 100ms interval
			// Ticks at: 100ms (before pause), 200ms & 300ms (paused, no count), 400ms & 500ms (after resume)
			expect(interval.tickCount).toBe(3);
		});

		it('should increment immediately when resume(true) is called', () => {
			interval = new Interval(1000);
			interval.current;

			interval.pause();
			expect(interval.tickCount).toBe(0);

			interval.resume(true);
			expect(interval.tickCount).toBe(1);
		});

		it('should persist across duration changes', () => {
			interval = new Interval(100);
			interval.current;

			vi.advanceTimersByTime(250);
			expect(interval.tickCount).toBe(2);

			interval.duration = 200;
			interval.current;

			expect(interval.tickCount).toBe(2);

			vi.advanceTimersByTime(250);
			expect(interval.tickCount).toBe(3);
		});

		it('should track ticks accurately over multiple cycles', () => {
			interval = new Interval(50);
			interval.current;

			vi.advanceTimersByTime(125);
			expect(interval.tickCount).toBe(2);

			interval.pause();
			vi.advanceTimersByTime(100);
			expect(interval.tickCount).toBe(2);

			interval.resume(true);
			expect(interval.tickCount).toBe(3);

			vi.advanceTimersByTime(75);
			// With the #version fix, resume(true) properly recreates the interval
			// In 75ms with 50ms interval, we get 1 tick at 50ms mark
			expect(interval.tickCount).toBe(4);
		});

		it('should handle rapid pause/resume without losing count', () => {
			interval = new Interval(100);
			interval.current;

			vi.advanceTimersByTime(150);
			expect(interval.tickCount).toBe(1);

			for (let i = 0; i < 5; i++) {
				interval.pause();
				interval.resume(false);
			}

			// Tick count should remain 1 since no time advanced during pause/resume cycles
			expect(interval.tickCount).toBe(1);

			vi.advanceTimersByTime(150);
			// Total time: 150 + 150 = 300ms with 100ms interval
			// Ticks at: 100ms (initial), 200ms & 300ms (after resume)
			expect(interval.tickCount).toBe(3);
		});
	});

	describe('interval behavior', () => {
		it('should create interval with correct duration', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			interval.current;

			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
		});

		it('should handle zero duration', () => {
			interval = new Interval(0);

			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval.current;

			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 0);
		});

		it('should handle negative duration gracefully', () => {
			interval = new Interval(-1000);

			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval.current;

			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), -1000);
		});
	});

	describe('reactive duration changes with $state', () => {
		it('should be reactive to $state changes in duration function', () => {
			let duration = $state(1000);
			interval = new Interval(() => duration);

			expect(interval.duration).toBe(1000);

			duration = 500;
			expect(interval.duration).toBe(500);
		});
	});

	describe('subscription lifecycle', () => {
		it('should not create interval until current is accessed', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			expect(setIntervalSpy).not.toHaveBeenCalled();

			interval.current;

			expect(setIntervalSpy).toHaveBeenCalled();
		});

		it('should not create interval until tickCount is accessed', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			expect(setIntervalSpy).not.toHaveBeenCalled();

			interval.tickCount;

			expect(setIntervalSpy).toHaveBeenCalled();
		});

		it('should handle multiple accesses to current', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			interval.current;
			interval.current;
			interval.current;

			expect(setIntervalSpy).toHaveBeenCalled();
		});

		it('should create interval immediately with immediate option', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000, { immediate: true });

			// Should be created immediately, before any property access
			expect(setIntervalSpy).toHaveBeenCalled();
		});
	});

	describe('cleanup', () => {
		it('should clean up interval when effect is disposed', async () => {
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

			const cleanup = $effect.root(() => {
				const interval = new Interval(1000);

				interval.current;
			});

			// Cleanup the effect, which should dispose the interval
			cleanup();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});

		it('should clean up interval with immediate option when effect is disposed', () => {
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

			const cleanup = $effect.root(() => {
				new Interval(1000, { immediate: true });
			});

			// Cleanup the effect, which should dispose the interval
			cleanup();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});

		it('should clean up reactive interval when effect is disposed', () => {
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

			const cleanup = $effect.root(() => {
				let duration = $state(500);
				const interval = new Interval(() => duration);

				interval.tickCount; // Start the interval
			});

			// Cleanup the effect, which should dispose the interval
			cleanup();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});

	describe('Symbol.dispose', () => {
		it('should clear interval when disposed', () => {
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
			interval = new Interval(1000);
			interval.current;

			interval[Symbol.dispose]();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle rapid duration changes', () => {
			interval = new Interval(1000);
			interval.current;

			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

			for (let i = 0; i < 10; i++) {
				interval.duration = i * 100;
			}

			interval.current;

			expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle reactive state changes properly', () => {
			let count = $state(0);
			let baseTime = $state(100);

			interval = new Interval(() => baseTime * (count + 1));

			expect(interval.duration).toBe(100);

			count = 1;
			expect(interval.duration).toBe(200);

			baseTime = 200;
			expect(interval.duration).toBe(400);
		});
	});
});
