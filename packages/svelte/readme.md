# Svelte Interval

A Svelte utility class for managing intervals with reactive durations. This package provides a convenient way to create and control `setInterval` operations, allowing the interval's duration to be a static number or dynamically tied to Svelte's reactivity system.

**Features:**

- **Reactive Durations:** Dynamically change interval timings based on Svelte's `$state`.
- **Simple API:** Easy to use `Interval` class for managing `setInterval`.
- **Automatic Cleanup:** Handles `clearInterval` when durations change or components unmount
- **Lazy Initialization:** Intervals are only created when `current` is first accessed, optimizing resource usage.
- **Tiny Footprint:** Only 203B (minified + brotlied).

## Usage

The `Interval` class allows you to create an interval that can have either a fixed duration or a duration that reacts to Svelte's `$state` changes.

### Basic Usage

You can initialize `Interval` with a static number for its duration:

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const myInterval = new Interval(1000); // Interval runs every 1000ms (1 second)
</script>

<p>Current Time: {myInterval.current;.toLocaleTimeString()}</p>
```

### Reactive Duration

One of the key features of `svelte-interval-rune` is its ability to react to changes in Svelte's `$state`. You can pass a function to the `Interval` constructor that returns a reactive value.

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  let multiplier = $state(1);
  const reactiveInterval = new Interval(() => multiplier * 500);

  reactiveInterval.current // Returns Date
</script>

<p>Current Time: {reactiveInterval.current.toLocaleTimeString()}</p>
<button onclick={() => multiplier++}>Increase Speed</button>
<p>Current Interval Duration: {reactiveInterval.duration}ms</p>
```

In this example, as `multiplier` changes, the `reactiveInterval`'s duration automatically updates.

### `current` Getter

Accessing the **`current`** getter on an `Interval` instance will:

1.  Trigger the creation of the underlying `setInterval` if it hasn't been created yet.
2.  Return a new `Date` object representing the current time.
3.  Establish a subscription to the interval, ensuring that updates are triggered.

<!-- end list -->

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const clock = new Interval(1000);
  const time = $derived(clock.current); // Accessing .current starts the interval
</script>

The time is: {time.toLocaleTimeString()}
```

### `duration` Getter and Setter

The **`duration`** getter returns the current effective duration of the interval. If the interval was initialized with a function, this getter will reflect the latest value returned by that function.

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  let dynamicDuration = $state(2000);
  const myInterval = new Interval(() => dynamicDuration);

  console.log(myInterval.duration); // 2000

  dynamicDuration = 500;
  console.log(myInterval.duration); // 500
</script>
```

You can also use the **`duration` setter** to change the interval's duration after it has been created:

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const myInterval = new Interval(1000); // Starts with 1000ms duration

  // Change to a new static duration
  myInterval.duration = 500; // Interval now runs every 500ms
</script>
```

#### Important Note on `duration` Setter and Reactivity

When you initialize an `Interval` with a function (e.g., `new Interval(() => reactive_value)`), it creates a reactive link to that function's return value. However, if you later set the `duration` using a **number** (e.g., `myInterval.duration = 500`), this explicitly overwrites the previous reactive function. **The interval will then operate with the new static number, and its connection to the original reactive state variable will be unattached.**

To re-establish a reactive connection after setting a static duration, you must set the `duration` again with a function:

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  let reactiveValue = $state(1000);
  const myInterval = new Interval(() => reactiveValue);

  // Interval is currently reactive to reactiveValue
  console.log(myInterval.duration); // 1000

  // Unattaches from reactiveValue and sets a static duration
  myInterval.duration = 500;
  console.log(myInterval.duration); // 500
  reactiveValue = 2000;
  console.log(myInterval.duration); // Still 500, not reactive to reactiveValue anymore

  // Re-connects to reactiveValue
  myInterval.duration = () => reactiveValue;
  console.log(myInterval.duration); // 2000
</script>
```
