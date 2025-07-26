import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Interval, sync, LimitedInterval } from '../src/index.svelte';

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

describe('LimitedInterval', () => {
	let interval: LimitedInterval;

	beforeEach(() => {
		vi.clearAllTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe('constructor', () => {
		it('should create LimitedInterval with max ticks', () => {
			interval = new LimitedInterval(1000, 5);
			expect(interval.duration).toBe(1000);
			expect(interval.maxTicks).toBe(5);
			expect(interval.isCompleted).toBe(false);
			expect(interval.remainingTicks).toBe(5);
		});

		it('should accept immediate option', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new LimitedInterval(1000, 3, { immediate: true });

			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
			expect(interval.maxTicks).toBe(3);
		});

		it('should throw error for invalid max ticks', () => {
			expect(() => new LimitedInterval(1000, 0)).toThrow('max_ticks must be greater than 0');
			expect(() => new LimitedInterval(1000, -1)).toThrow('max_ticks must be greater than 0');
		});

		it('should accept reactive duration', () => {
			let dynamicDuration = $state(500);
			interval = new LimitedInterval(() => dynamicDuration, 10);

			expect(interval.duration).toBe(500);

			dynamicDuration = 1000;
			expect(interval.duration).toBe(1000);
		});
	});

	describe('tick counting and limits', () => {
		it('should stop after reaching max ticks', () => {
			interval = new LimitedInterval(100, 3);
			interval.current; // Start the interval

			expect(interval.tickCount).toBe(0);
			expect(interval.isCompleted).toBe(false);

			vi.advanceTimersByTime(150); // 1 tick
			expect(interval.tickCount).toBe(1);
			expect(interval.isCompleted).toBe(false);
			expect(interval.remainingTicks).toBe(2);

			vi.advanceTimersByTime(100); // 2 ticks
			expect(interval.tickCount).toBe(2);
			expect(interval.isCompleted).toBe(false);
			expect(interval.remainingTicks).toBe(1);

			vi.advanceTimersByTime(100); // 3 ticks - should complete
			expect(interval.tickCount).toBe(3);
			expect(interval.isCompleted).toBe(true);
			expect(interval.remainingTicks).toBe(0);

			// Should not tick anymore
			vi.advanceTimersByTime(1000);
			expect(interval.tickCount).toBe(3);
			expect(interval.isCompleted).toBe(true);
		});

		it('should not tick when paused', () => {
			interval = new LimitedInterval(100, 5);
			interval.current;

			vi.advanceTimersByTime(150);
			expect(interval.tickCount).toBe(1);

			interval.pause();
			vi.advanceTimersByTime(500);
			expect(interval.tickCount).toBe(1);
			expect(interval.isCompleted).toBe(false);

			interval.resume();
			vi.advanceTimersByTime(100); // Should tick at next 100ms boundary
			expect(interval.tickCount).toBe(2);
		});

		it('should handle immediate tick on resume', () => {
			interval = new LimitedInterval(1000, 3);
			interval.current;

			interval.pause();
			expect(interval.tickCount).toBe(0);

			interval.resume(true);
			expect(interval.tickCount).toBe(1);
			expect(interval.remainingTicks).toBe(2);
		});

		it('should complete on immediate tick if at limit', () => {
			interval = new LimitedInterval(100, 1);
			interval.current;

			interval.pause();
			expect(interval.tickCount).toBe(0);

			interval.resume(true);
			expect(interval.tickCount).toBe(1);
			expect(interval.isCompleted).toBe(true);
		});
	});

	describe('reset functionality', () => {
		it('should reset completion state', () => {
			interval = new LimitedInterval(100, 2);
			interval.current;

			vi.advanceTimersByTime(250);
			expect(interval.isCompleted).toBe(true);
			expect(interval.tickCount).toBe(2);

			interval.reset();
			expect(interval.isCompleted).toBe(false);
			expect(interval.remainingTicks).toBe(2);
			// Tick count should not reset - it's cumulative
			expect(interval.tickCount).toBe(2);

			vi.advanceTimersByTime(250);
			expect(interval.tickCount).toBe(4);
			expect(interval.isCompleted).toBe(true);
		});

		it('should resume interval if it was stopped', () => {
			interval = new LimitedInterval(100, 1);
			interval.current;

			vi.advanceTimersByTime(150);
			expect(interval.isCompleted).toBe(true);
			expect(interval.isActive).toBe(false);

			interval.reset();
			expect(interval.isActive).toBe(true);
			expect(interval.isCompleted).toBe(false);
		});
	});

	describe('maxTicks setter', () => {
		it('should update max ticks and reset completion', () => {
			interval = new LimitedInterval(100, 2);
			interval.current;

			vi.advanceTimersByTime(250);
			expect(interval.isCompleted).toBe(true);

			interval.maxTicks = 5;
			expect(interval.maxTicks).toBe(5);
			expect(interval.isCompleted).toBe(false);
			expect(interval.remainingTicks).toBe(3); // 5 - 2 current ticks
		});

		it('should throw error for invalid max ticks', () => {
			interval = new LimitedInterval(100, 5);

			expect(() => {
				interval.maxTicks = 0;
			}).toThrow('max_ticks must be greater than 0');
			expect(() => {
				interval.maxTicks = -1;
			}).toThrow('max_ticks must be greater than 0');
		});
	});

	describe('inheritance from Interval', () => {
		it('should maintain all Interval functionality', () => {
			interval = new LimitedInterval(500, 10);

			// Test inherited methods and properties
			expect(interval.isActive).toBe(true);
			expect(interval.duration).toBe(500);

			interval.pause();
			expect(interval.isActive).toBe(false);

			interval.resume();
			expect(interval.isActive).toBe(true);

			interval.duration = 1000;
			expect(interval.duration).toBe(1000);
		});

		it('should work with Symbol.dispose', () => {
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
			interval = new LimitedInterval(100, 5);
			interval.current;

			interval[Symbol.dispose]();
			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});
});

describe('sync function', () => {
	let interval1: Interval;
	let interval2: Interval;
	let interval3: Interval;
	let controller: ReturnType<typeof sync>;

	beforeEach(() => {
		vi.clearAllTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
		controller?.disable();
	});

	describe('basic synchronization', () => {
		it('should synchronize multiple intervals', () => {
			interval1 = new Interval(300);
			interval2 = new Interval(100); // This should be the leader (fastest)
			interval3 = new Interval(200);

			controller = sync(interval1, interval2, interval3);
			expect(controller.leader).toBe(interval2);

			controller.enable(); // This starts the leader automatically

			// After 100ms, all should tick once (leader's pace)
			vi.advanceTimersByTime(150);
			expect(interval1.tickCount).toBe(1);
			expect(interval2.tickCount).toBe(1);
			expect(interval3.tickCount).toBe(1);

			// After another 100ms, all should tick again
			vi.advanceTimersByTime(100);
			expect(interval1.tickCount).toBe(2);
			expect(interval2.tickCount).toBe(2);
			expect(interval3.tickCount).toBe(2);
		});

		it('should select the fastest interval as leader', () => {
			interval1 = new Interval(1000);
			interval2 = new Interval(500);
			interval3 = new Interval(100);

			controller = sync(interval1, interval2, interval3);
			expect(controller.leader).toBe(interval3); // 100ms is fastest
		});

		it('should handle equal duration intervals', () => {
			interval1 = new Interval(200);
			interval2 = new Interval(200);
			interval3 = new Interval(200);

			controller = sync(interval1, interval2, interval3);
			expect(controller.leader).toBe(interval1); // First one becomes leader
		});
	});

	describe('start and stop functionality', () => {
		beforeEach(() => {
			interval1 = new Interval(300);
			interval2 = new Interval(100);
			interval3 = new Interval(200);
			controller = sync(interval1, interval2, interval3);
		});

		it('should start synchronization', () => {
			expect(controller.isActive).toBe(false);

			controller.enable(); // This starts the leader automatically
			expect(controller.isActive).toBe(true);

			vi.advanceTimersByTime(150);
			expect(interval1.tickCount).toBe(1);
			expect(interval2.tickCount).toBe(1);
			expect(interval3.tickCount).toBe(1);
		});

		it('should stop synchronization and restore individual behavior', () => {
			controller.enable(); // This starts the leader automatically

			vi.advanceTimersByTime(250);
			expect(interval1.tickCount).toBe(2);
			expect(interval2.tickCount).toBe(2);
			expect(interval3.tickCount).toBe(2);

			controller.disable();
			expect(controller.isActive).toBe(false);

			// Clear timers to ensure clean restart with individual timing
			vi.clearAllTimers();

			// Restart intervals with individual timing
			interval1.current;
			interval2.current;
			interval3.current;

			// Now they should tick at their individual rates
			vi.advanceTimersByTime(350);
			// interval1 (300ms): should tick once at 300ms = 1 more (2 + 1 = 3)
			// interval2 (100ms): should tick 3 times = 3 more (2 + 3 = 5)
			// interval3 (200ms): should tick once at 200ms = 1 more (2 + 1 = 3)
			expect(interval1.tickCount).toBe(3);
			expect(interval2.tickCount).toBe(5);
			expect(interval3.tickCount).toBe(3);
		});

		it('should not start if already active', () => {
			controller.enable();

			// Start intervals after sync is active and capture initial count
			expect(interval1.tickCount).toBe(0);
			const ticksBefore = interval1.tickCount; // This will be 0

			controller.enable(); // Should be no-op
			vi.advanceTimersByTime(150);

			// Should get exactly one tick since only one start() was effective
			expect(interval1.tickCount).toBe(1);
			expect(interval1.tickCount - ticksBefore).toBe(1);
		});

		it('should not stop if already inactive', () => {
			expect(() => controller.disable()).not.toThrow();
			expect(controller.isActive).toBe(false);
		});
	});

	describe('reactive leader property', () => {
		beforeEach(() => {
			interval1 = new Interval(300);
			interval2 = new Interval(100);
			controller = sync(interval1, interval2);
		});

		it('should return leader when active', () => {
			controller.enable();
			expect(controller.leader).toBe(interval2);
		});

		it('should return leader even when inactive', () => {
			expect(controller.leader).toBe(interval2);

			controller.enable();
			expect(controller.leader).toBe(interval2);

			controller.disable();
			expect(controller.leader).toBe(interval2);
		});
	});

	describe('error handling', () => {
		it('should throw error for empty intervals array', () => {
			expect(() => sync()).toThrow('At least one interval is required for sync');
		});

		it('should handle intervals with zero duration', () => {
			interval1 = new Interval(0);
			interval2 = new Interval(100);

			controller = sync(interval1, interval2);
			expect(controller.leader).toBe(interval1); // 0 is fastest

			expect(() => controller.enable()).not.toThrow();
		});
	});

	describe('pause/resume behavior during sync', () => {
		beforeEach(() => {
			interval1 = new Interval(200);
			interval2 = new Interval(100);
			controller = sync(interval1, interval2);
		});

		it('should respect individual pause states', () => {
			controller.enable(); // This starts the leader automatically

			interval1.pause();

			vi.advanceTimersByTime(150);
			expect(interval1.tickCount).toBe(0); // Paused, so no ticks
			expect(interval2.tickCount).toBe(1); // Still active
		});

		it('should handle leader being paused', () => {
			controller.enable(); // This starts the leader automatically

			interval2.pause(); // Pause the leader

			vi.advanceTimersByTime(150);
			expect(interval1.tickCount).toBe(0); // No leader ticks = no sync ticks
			expect(interval2.tickCount).toBe(0); // Leader is paused
		});
	});
});

describe('Integration: sync with LimitedInterval', () => {
	let limited1: LimitedInterval;
	let limited2: LimitedInterval;
	let limited3: LimitedInterval;
	let controller: ReturnType<typeof sync>;

	beforeEach(() => {
		vi.clearAllTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
		controller?.disable();
	});

	describe('synchronized limited intervals', () => {
		it('should sync LimitedIntervals while preserving limits', () => {
			limited1 = new LimitedInterval(300, 5);
			limited2 = new LimitedInterval(100, 3); // Fastest, will be leader
			limited3 = new LimitedInterval(200, 4);

			controller = sync(limited1, limited2, limited3);
			controller.enable(); // Leader starts automatically

			// All sync to 100ms pace until leader completes
			vi.advanceTimersByTime(350); // 3 ticks - leader completes
			expect(limited1.tickCount).toBe(3);
			expect(limited2.tickCount).toBe(3);
			expect(limited2.isCompleted).toBe(true);
			expect(limited3.tickCount).toBe(3);

			// Once leader completes, it stops driving sync
			vi.advanceTimersByTime(200);
			expect(limited1.tickCount).toBe(3); // No more ticks
			expect(limited2.tickCount).toBe(3);
			expect(limited3.tickCount).toBe(3);
		});

		it('should handle when leader completes first', () => {
			limited1 = new LimitedInterval(300, 10);
			limited2 = new LimitedInterval(100, 2); // Leader with smallest limit
			limited3 = new LimitedInterval(200, 5);

			controller = sync(limited1, limited2, limited3);
			controller.enable(); // limited2 (leader) starts automatically

			vi.advanceTimersByTime(250); // 2 ticks - leader completes
			expect(limited1.tickCount).toBe(2);
			expect(limited2.tickCount).toBe(2);
			expect(limited2.isCompleted).toBe(true);
			expect(limited3.tickCount).toBe(2);

			// Since leader is completed, sync should stop working
			vi.advanceTimersByTime(500);
			expect(limited1.tickCount).toBe(2); // No more ticks
			expect(limited2.tickCount).toBe(2);
			expect(limited3.tickCount).toBe(2);
		});
	});

	describe('mixed interval types in sync', () => {
		it('should sync regular Interval with LimitedInterval', () => {
			const regular = new Interval(200);
			limited1 = new LimitedInterval(100, 3);

			controller = sync(regular, limited1);
			controller.enable(); // limited1 (leader) starts automatically

			vi.advanceTimersByTime(350); // 3 ticks - limited1 completes
			expect(regular.tickCount).toBe(3);
			expect(limited1.tickCount).toBe(3);
			expect(limited1.isCompleted).toBe(true);

			// Once leader completes, sync stops
			vi.advanceTimersByTime(200);
			expect(regular.tickCount).toBe(3);
			expect(limited1.tickCount).toBe(3);
		});

		it('should handle complex mixed scenarios', () => {
			const regular1 = new Interval(300);
			limited1 = new LimitedInterval(100, 2);
			const regular2 = new Interval(200);
			limited2 = new LimitedInterval(150, 4);

			controller = sync(regular1, limited1, regular2, limited2);
			expect(controller.leader).toBe(limited1); // 100ms is fastest

			controller.enable(); // limited1 (leader) starts automatically

			vi.advanceTimersByTime(250); // 2 ticks - limited1 completes
			expect(regular1.tickCount).toBe(2);
			expect(limited1.tickCount).toBe(2);
			expect(limited1.isCompleted).toBe(true);
			expect(regular2.tickCount).toBe(2);
			expect(limited2.tickCount).toBe(2);

			// Since leader (limited1) is completed, no more sync ticks
			vi.advanceTimersByTime(300);
			expect(regular1.tickCount).toBe(2); // No more ticks
			expect(limited1.tickCount).toBe(2);
			expect(regular2.tickCount).toBe(2);
			expect(limited2.tickCount).toBe(2);
		});
	});

	describe('reset functionality during sync', () => {
		it('should handle reset of limited interval during sync', () => {
			limited1 = new LimitedInterval(100, 2);
			limited2 = new LimitedInterval(200, 5);

			controller = sync(limited1, limited2);
			controller.enable(); // limited1 (leader) starts automatically

			vi.advanceTimersByTime(250); // limited1 completes after 2 ticks
			expect(limited1.isCompleted).toBe(true);
			expect(limited1.tickCount).toBe(2);

			limited1.reset();
			expect(limited1.isCompleted).toBe(false);

			// Should continue syncing after reset
			vi.advanceTimersByTime(200); // 2 more ticks
			expect(limited1.tickCount).toBe(4); // 2 (before reset) + 2 (after reset)
			expect(limited2.tickCount).toBe(4);
			expect(limited1.isCompleted).toBe(true); // Completed again after reset
		});

		it('should handle maxTicks changes during sync', () => {
			limited1 = new LimitedInterval(100, 2); // This will be leader
			limited2 = new LimitedInterval(200, 5);

			controller = sync(limited1, limited2);
			controller.enable(); // limited1 starts automatically

			vi.advanceTimersByTime(150); // 1 tick
			expect(limited1.tickCount).toBe(1);
			expect(limited2.tickCount).toBe(1);

			limited1.maxTicks = 10; // Increase leader's limit

			vi.advanceTimersByTime(500); // 5 more ticks (6 total)
			expect(limited1.tickCount).toBe(6);
			expect(limited1.isCompleted).toBe(false);
			expect(limited2.tickCount).toBe(5); // limited2 completes at 5 ticks
			expect(limited2.isCompleted).toBe(true); // Should be completed
		});
	});

	describe('sync state management', () => {
		it('should maintain completion state when stopping sync', () => {
			limited1 = new LimitedInterval(100, 2);
			limited2 = new LimitedInterval(200, 5);

			controller = sync(limited1, limited2);
			controller.enable(); // limited1 (leader) starts automatically

			vi.advanceTimersByTime(250); // limited1 completes
			expect(limited1.isCompleted).toBe(true);

			controller.disable();
			expect(limited1.isCompleted).toBe(true); // Should remain completed
			expect(limited2.isCompleted).toBe(false);
		});

		it('should restore individual timing after sync stops', () => {
			limited1 = new LimitedInterval(300, 10);
			limited2 = new LimitedInterval(100, 10);

			controller = sync(limited1, limited2);
			controller.enable(); // limited2 (leader) starts automatically

			vi.advanceTimersByTime(250); // 2 ticks at 100ms pace
			expect(limited1.tickCount).toBe(2);
			expect(limited2.tickCount).toBe(2);

			controller.disable();

			// Clear timers to ensure clean restart with individual timing
			vi.clearAllTimers();

			// Restart intervals with individual timing
			limited1.current;
			limited2.current;

			// Now they tick at individual rates
			vi.advanceTimersByTime(350);
			// limited1 (300ms): should tick once at 300ms = 1 more (2 + 1 = 3)
			// limited2 (100ms): should tick 3 times = 3 more (2 + 3 = 5)
			expect(limited1.tickCount).toBe(3);
			expect(limited2.tickCount).toBe(5);
		});
	});
});
