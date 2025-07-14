import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Interval } from '../src/index.svelte';

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

			// Advance time
			vi.setSystemTime(mockDate2);

			// Access current again - should return new Date
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
			// Start with a function that returns 1000
			interval = new Interval(() => 1000);
			expect(interval.duration).toBe(1000);

			// Change to a number
			interval.duration = 500;
			expect(interval.duration).toBe(500);

			// Change to a different function
			interval.duration = () => 2000;
			expect(interval.duration).toBe(2000);
		});

		it('should recreate interval with new duration', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			// Start the interval
			interval.current;
			expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

			// Change duration and verify new interval is created
			interval.duration = 500;
			interval.current; // Access again to trigger new interval
			expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 500);
		});

		it('should clear existing interval when duration changes', () => {
			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
			interval = new Interval(1000);

			// Access current to start the interval
			interval.current;

			interval.duration = 2000;
			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});

	describe('interval behavior', () => {
		it('should create interval with correct duration', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			// Access current to trigger interval creation
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

			// Interval should not be created yet
			expect(setIntervalSpy).not.toHaveBeenCalled();

			// Access current to trigger subscription
			interval.current;

			expect(setIntervalSpy).toHaveBeenCalled();
		});

		it('should handle multiple accesses to current', () => {
			const setIntervalSpy = vi.spyOn(window, 'setInterval');
			interval = new Interval(1000);

			// Access current multiple times
			interval.current;
			interval.current;
			interval.current;

			// Should only create interval once per subscription
			expect(setIntervalSpy).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle rapid duration changes', () => {
			interval = new Interval(1000);
			interval.current; // Start subscription

			const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

			// Rapidly change duration
			for (let i = 0; i < 10; i++) {
				interval.duration = i * 100;
			}

			expect(clearIntervalSpy).toHaveBeenCalledTimes(10);
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
