import { createSubscriber } from 'svelte/reactivity';

const INTERNAL = Symbol();

export interface IntervalOptions {
	/**
	 * Create the interval immediately upon initialization.
	 *
	 * @default false
	 */
	immediate?: boolean;
}

/**
 * A reactive interval timer that integrates with Svelte's reactivity system.
 * The interval runs in the background and can be paused/resumed while maintaining tick count.
 *
 * @example
 * ```javascript
 * // Static duration
 * const timer = new Interval(1000);
 * console.log(timer.current); // Gets current time and starts the interval
 *
 * // Reactive duration
 * let delay = $state(500);
 * const reactiveTimer = new Interval(() => delay);
 * delay = 1000; // Duration updates automatically
 *
 * // Pause and resume
 * timer.pause();
 * timer.resume(); // Resume normally
 * timer.resume(true); // Resume with immediate tick
 *
 * // Check status
 * console.log(timer.tickCount); // Number of times interval has fired
 * console.log(timer.paused); // Current pause state
 * ```
 */
export class Interval {
	#subscribe: () => void;
	#update?: () => void;
	#interval_id = 0;

	#duration_input: (() => number) | number = $state(0);
	#is_active = $state(true);
	#tick_count = $state(0);
	#version = $state(0);

	[INTERNAL]: {
		run_func: () => void;
		is_active: boolean;
		tick_count: number;
		increment_tick: () => void;
		update: (() => void) | undefined;
		trigger_update: () => void;
		force_restart: () => void;
	};

	#duration = $derived(
		typeof this.#duration_input === 'function' ? this.#duration_input() : this.#duration_input,
	);
	#interval = $derived.by(() => {
		this.#version;

		clearInterval(this.#interval_id);
		this.#interval_id = setInterval(this.#run_func.bind(this), this.#duration) as unknown as number;

		return this.#interval_id;
	});

	#run_func = () => {
		if (!this.#is_active) return;
		this.#tick_count++;
		this.#update?.();
	};

	#kickoff_subscriptions() {
		this.#interval;
		this.#subscribe();
	}

	/**
	 * Creates a new Interval instance.
	 *
	 * @param duration - The interval duration in milliseconds. Can be a number or a reactive function.
	 */
	constructor(duration: number | (() => number), options: IntervalOptions = {}) {
		const { immediate = false } = options;

		this.#duration_input = duration;

		const self = this; // Use 'self' to avoid scope issues
		this[INTERNAL] = {
			get run_func() {
				return self.#run_func;
			},
			set run_func(fn) {
				self.#run_func = fn;
			},
			get is_active() {
				return self.#is_active;
			},
			set is_active(active) {
				self.#is_active = active;
			},
			get tick_count() {
				return self.#tick_count;
			},
			increment_tick() {
				self.#tick_count = self.#tick_count + 1;
			},
			get update() {
				return self.#update;
			},
			trigger_update() {
				if (self.#update) {
					self.#update();
				}
			},
			force_restart() {
				self.#version = self.#version + 1;
			},
		};

		this.#subscribe = createSubscriber((update) => {
			this.#update = update;
			return () => clearInterval(this.#interval_id);
		});

		if (immediate) this.#kickoff_subscriptions();
	}

	/**
	 * Resumes the interval if it was paused.
	 *
	 * @param immediate - If true, immediately triggers a tick and resets the interval timing.
	 */
	resume(immediate = false) {
		this.#is_active = true;

		if (immediate) {
			this.#version++;
			this.#run_func();
		}
	}

	/**
	 * Pauses the interval. The interval continues running in the background but stops executing callbacks and incrementing tick count.
	 */
	pause() {
		this.#is_active = false;
	}

	/**
	 * Gets the current paused state of the interval.
	 */
	get isActive() {
		return this.#is_active;
	}

	/**
	 * Gets the number of times the interval has fired (tick count).
	 * This count persists across pause/resume cycles and duration changes.
	 */
	get tickCount() {
		this.#kickoff_subscriptions();
		return this.#tick_count;
	}

	/**
	 * Gets the current date and time, and starts the interval if not already started.
	 * This is the primary way to activate the interval's reactivity.
	 */
	get current() {
		this.#kickoff_subscriptions();
		return new Date();
	}

	/**
	 * Gets the current duration of the interval in milliseconds.
	 */
	get duration() {
		return this.#duration;
	}

	set duration(value: number | (() => number)) {
		this.#duration_input = value;
		this.#version++;
	}

	/**
	 * Completely stops and clears the interval. Cannot be resumed.
	 * Use pause()/resume() if you want to temporarily stop.
	 */
	stop(): void {
		clearInterval(this.#interval_id);
		this.#is_active = false;
		this.#interval_id = 0;
	}

	/**
	 * Check if interval has been completely stopped
	 */
	get isStopped(): boolean {
		return this.#interval_id === 0;
	}

	[Symbol.dispose]() {
		clearInterval(this.#interval_id);
	}
}

export function sync(...intervals: Interval[]) {
	if (intervals.length === 0) {
		throw new Error('At least one interval is required for sync');
	}

	// Find leader
	let leader = intervals[0];
	for (const interval of intervals) {
		if (interval.duration < leader.duration) {
			leader = interval;
		}
	}

	// Store original run functions
	const original_run_funcs = new Map();
	for (const interval of intervals) {
		original_run_funcs.set(interval, interval[INTERNAL].run_func);
	}

	let sync_active = $state(false);

	return {
		enable() {
			if (sync_active) return;
			sync_active = true;

			// Override run functions
			for (const interval of intervals) {
				if (interval === leader) {
					// Leader triggers all intervals
					interval[INTERNAL].run_func = () => {
						// Only proceed if leader is active
						if (!leader[INTERNAL].is_active) return;

						// Execute all intervals' original behaviors
						for (const synced_interval of intervals) {
							const original_func = original_run_funcs.get(synced_interval);
							original_func.call(synced_interval);
						}
					};
				} else {
					// Followers do nothing
					interval[INTERNAL].run_func = () => {};
				}
			}

			// Start the leader (if not already started) AND force restart with new behavior
			leader.current; // This starts the leader if not already started
			leader[INTERNAL].force_restart(); // This restarts with new sync behavior
		},

		disable() {
			if (!sync_active) return;
			sync_active = false;

			// Restore original functions
			intervals.forEach((interval) => {
				const original_func = original_run_funcs.get(interval);
				interval[INTERNAL].run_func = original_func;

				// Force restart each interval to restore individual timing
				interval[INTERNAL].force_restart();
			});
		},

		get isActive() {
			return sync_active;
		},

		get leader() {
			return leader;
		},
	};
}

export class LimitedInterval extends Interval {
	#max_ticks: number;
	#is_completed = false;
	#completion_baseline = 0;

	constructor(duration: number | (() => number), maxTicks: number, options: IntervalOptions = {}) {
		super(duration, options);

		if (maxTicks <= 0) {
			throw new Error('max_ticks must be greater than 0');
		}

		this.#max_ticks = maxTicks;

		// Override run function with limit checking
		this[INTERNAL].run_func = () => {
			if (this.#is_completed) return;

			// Execute base interval behavior
			if (!this[INTERNAL].is_active) return;
			this[INTERNAL].increment_tick();
			this[INTERNAL].trigger_update();

			// Check completion
			const ticksSinceBaseline = this[INTERNAL].tick_count - this.#completion_baseline;
			if (ticksSinceBaseline >= this.#max_ticks) {
				this.#is_completed = true;
				this.pause();
			}
		};
	}

	get isCompleted() {
		return this.#is_completed;
	}

	get remainingTicks() {
		const ticksSinceBaseline = this.tickCount - this.#completion_baseline;
		return Math.max(0, this.#max_ticks - ticksSinceBaseline);
	}

	get maxTicks() {
		return this.#max_ticks;
	}

	reset() {
		this.#is_completed = false;
		this.#completion_baseline = this.tickCount;
		if (!this.isActive) {
			this.resume();
		}
	}

	set maxTicks(new_max: number) {
		if (new_max <= 0) {
			throw new Error('max_ticks must be greater than 0');
		}
		this.#max_ticks = new_max;
		this.#is_completed = false;
	}
}
