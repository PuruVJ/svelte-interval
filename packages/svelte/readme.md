# Svelte Interval

A Svelte utility class for managing intervals with reactive durations. This package provides a convenient way to create and control `setInterval` operations, allowing the interval's duration to be a static number or dynamically tied to Svelte's reactivity system.

**Features:**

- **Reactive Durations:** Dynamically change interval timings based on Svelte's `$state`.
- **Pause/Resume Control:** Pause and resume intervals while maintaining tick count.
- **Tick Counting:** Track how many times the interval has fired.
- **Immediate Start Option:** Optionally create the interval immediately upon initialization.
- **Simple API:** Easy to use `Interval` class for managing `setInterval`.
- **Automatic Cleanup:** Handles `clearInterval` when durations change or components unmount
- **Lazy Initialization:** Intervals are only created when `current` or `tickCount` is first accessed, optimizing resource usage (unless `immediate: true`).
- **Tiny Footprint:** Only 356B (minified + brotlied).

## Usage

The `Interval` class allows you to create an interval that can have either a fixed duration or a duration that reacts to Svelte's `$state` changes.

### Basic Usage

You can initialize `Interval` with a static number for its duration:

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const myInterval = new Interval(1000); // Interval runs every 1000ms (1 second)
</script>

<p>Current Time: {myInterval.current.toLocaleTimeString()}</p>
```

### Immediate Interval Creation

By default, intervals use lazy initialization and only start when `current` or `tickCount` is first accessed. However, you can create the interval immediately upon construction using the `immediate` option:

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  // Lazy initialization (default) - interval starts when .current is accessed
  const lazyTimer = new Interval(1000);

  // Immediate initialization - interval starts right away
  const immediateTimer = new Interval(1000, { immediate: true });

  // The immediate timer is already running, even without accessing .current
  console.log(immediateTimer.paused); // false - already running
  console.log(lazyTimer.paused); // false - but not started yet
</script>

<p>Immediate Timer: {immediateTimer.current.toLocaleTimeString()}</p>
<p>Lazy Timer: {lazyTimer.current.toLocaleTimeString()}</p>
```

### Automatic Cleanup

When the `Interval` instance is destroyed, it will automatically clean up the underlying `setInterval` and prevent memory leaks. In addition to this, this works quite well with `using` keyword too:

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  using myInterval = new Interval(1000);
</script>
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

### Pause and Resume Control

The `Interval` class provides pause and resume functionality that allows you to temporarily stop the interval without losing track of how many times it has fired.

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const timer = new Interval(1000);

  function togglePause() {
    if (timer.paused) {
      timer.resume();
    } else {
      timer.pause();
    }
  }

  function resumeImmediate() {
    timer.resume(true); // Immediately triggers a tick and resets timing
  }
</script>

<p>Current Time: {timer.current.toLocaleTimeString()}</p>
<p>Tick Count: {timer.tickCount}</p>
<p>Status: {timer.paused ? 'Paused' : 'Running'}</p>

<button onclick={togglePause}>
  {timer.paused ? 'Resume' : 'Pause'}
</button>
<button onclick={resumeImmediate}>Resume Immediately</button>
```

**Important:** When paused, the interval continues running in the background but stops executing callbacks and incrementing the tick count. When resumed, it picks up with the current interval cycle timing.

### Tick Counting

The `tickCount` property tracks how many times the interval has fired. This count persists across pause/resume cycles and duration changes. **Accessing `tickCount` will automatically start the interval if it hasn't been started yet.**

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const counter = new Interval(500);

  // Accessing tickCount starts the interval automatically
  const tickInfo = $derived({
    count: counter.tickCount, // This starts the interval
    time: counter.current,
    duration: counter.duration
  });
</script>

<p>Ticks: {tickInfo.count}</p>
<p>Time: {tickInfo.time.toLocaleTimeString()}</p>
<p>Interval: {tickInfo.duration}ms</p>
```

### `current` and `tickCount` Getters

Both the **`current`** and **`tickCount`** getters will automatically start the interval if it hasn't been created yet. This means you can access either property to begin interval execution:

**`current` getter:**

1.  Triggers the creation of the underlying `setInterval` if it hasn't been created yet.
2.  Returns a new `Date` object representing the current time.
3.  Establishes a subscription to the interval, ensuring that updates are triggered.

**`tickCount` getter:**

1.  Triggers the creation of the underlying `setInterval` if it hasn't been created yet.
2.  Returns the current tick count.
3.  Establishes a subscription to the interval, ensuring that updates are triggered.

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const clock = new Interval(1000);

  // Either of these will start the interval:
  const time = $derived(clock.current); // Starts interval and gets current time
  // OR
  const ticks = $derived(clock.tickCount); // Starts interval and gets tick count
</script>

The time is: {time.toLocaleTimeString()}
```

### `paused` Getter

The **`paused`** getter returns the current pause state of the interval:

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const timer = new Interval(1000);
  timer.current; // Start the interval

  // Use in reactive context
  const status = $derived(timer.paused ? 'Paused' : 'Running');
</script>

<p>Timer Status: {status}</p>
<button onclick={() => timer.paused ? timer.resume() : timer.pause()}>
  Toggle
</button>
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

## Advanced Examples

### Advanced Clock with Immediate Option

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  let speed = $state(1000);

  // Background timer that starts immediately
  const backgroundClock = new Interval(() => speed, { immediate: true });

  // User-controlled timer that starts on demand
  const userClock = new Interval(100);
  let userStarted = $state(false);

  const timeData = $derived({
    background: backgroundClock.current,
    user: userStarted ? userClock.current : null,
    backgroundTicks: backgroundClock.tickCount,
    userTicks: userClock.tickCount
  });

  function startUserTimer() {
    userStarted = true;
  }
</script>

<div>
  <h3>Background Clock (immediate): {timeData.background.toLocaleTimeString()}</h3>
  <p>Ticks: {timeData.backgroundTicks} | Speed: {speed}ms</p>

  <h3>User Clock: {timeData.user?.toLocaleTimeString() ?? 'Not started'}</h3>
  <p>Ticks: {timeData.userTicks}</p>

  {#if !userStarted}
    <button onclick={startUserTimer}>Start User Timer</button>
  {/if}

  <button onclick={() => speed = speed === 1000 ? 100 : 1000}>
    Toggle Background Speed
  </button>
</div>
```

### Timer with Reset Functionality

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  let duration = $state(1000);
  using timer = new Interval(() => duration);

  function reset() {
    // Pause and recreate to reset tick count
    timer.pause();
    timer.duration = duration; // This recreates the interval
    timer.resume(true); // Resume with immediate tick
  }
</script>

<div>
  <p>Time: {timer.current.toLocaleTimeString()}</p>
  <p>Ticks: {timer.tickCount}</p>
  <p>Duration: {duration}ms</p>

  <input type="range" min="100" max="2000" step="100" bind:value={duration} />

  <button onclick={() => timer.paused ? timer.resume() : timer.pause()}>
    {timer.paused ? 'Resume' : 'Pause'}
  </button>

  <button onclick={reset}>Reset Timer</button>
</div>
```

### API Reference

### Constructor

- `new Interval(duration: number | (() => number), options?: IntervalOptions)` - Creates a new interval with the specified duration and options

#### Options

- `immediate?: boolean` - If `true`, creates and starts the interval immediately upon construction. Default: `false`

### Properties

- `current: Date` - Gets current time and starts/subscribes to the interval (auto-starts interval)
- `duration: number` - Gets or sets the interval duration in milliseconds
- `paused: boolean` - Gets the current pause state
- `tickCount: number` - Gets the number of times the interval has fired (auto-starts interval)

### Methods

- `pause(): void` - Pauses the interval
- `resume(immediate?: boolean): void` - Resumes the interval, optionally with immediate tick
- `[Symbol.dispose](): void` - Cleans up the interval (automatic with `using`)

**Note:** Both `current` and `tickCount` getters will automatically start the interval when first accessed (if not already started with `immediate: true`), making initialization lazy and efficient by default.
