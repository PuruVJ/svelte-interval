import { createSubscriber } from 'svelte/reactivity';

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

	#duration = $derived(
		typeof this.#duration_input === 'function' ? this.#duration_input() : this.#duration_input,
	);
	#interval = $derived.by(() => {
		this.#version;

		clearInterval(this.#interval_id);
		this.#interval_id = setInterval(this.#run_func.bind(this), this.#duration) as unknown as number;

		return this.#interval_id;
	});

	#run_func() {
		if (!this.#is_active) return;
		this.#tick_count++;
		this.#update?.();
	}

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

	[Symbol.dispose]() {
		clearInterval(this.#interval_id);
	}
}
