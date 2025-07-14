import { createSubscriber } from 'svelte/reactivity';

export class Interval {
	#duration_input: (() => number) | number = $state(0);
	#subscribe: () => void;
	#update?: () => void;

	#duration = $derived(
		typeof this.#duration_input === 'function' ? this.#duration_input() : this.#duration_input,
	);
	#interval = $derived(setInterval(() => this.#update!(), this.#duration));

	constructor(duration: number | (() => number)) {
		this.#duration_input = duration;

		this.#subscribe = createSubscriber((update) => {
			this.#update = update;
			return this.#clear.bind(this);
		});
	}

	#clear = () => clearInterval(this.#interval);

	get current() {
		this.#interval;
		this.#subscribe();
		return new Date();
	}

	get duration() {
		return this.#duration;
	}

	set duration(value: number | (() => number)) {
		this.#clear();
		this.#duration_input = value;
	}
}
