# Svelte Interval

A comprehensive Svelte utility package for managing intervals with reactive durations, synchronization, and advanced control features. This package provides convenient classes and functions for creating and controlling `setInterval` operations with full reactivity support.

**Features:**

- **Core Interval Management:** Basic reactive interval functionality with pause/resume/stop controls
- **Limited Intervals:** Automatically complete after a specified number of ticks
- **Interval Synchronization:** Sync multiple intervals to tick together at the fastest interval's pace
- **Reactive Durations:** Dynamically change interval timings based on Svelte's `$state`
- **Complete Lifecycle Control:** Pause, resume, stop, and restart intervals
- **Tick Counting:** Track how many times intervals have fired
- **Immediate Start Option:** Optionally create intervals immediately upon initialization
- **Automatic Cleanup:** Handles `clearInterval` when durations change or components unmount
- **Lazy Initialization:** Intervals only start when accessed (unless `immediate: true`)

## Installation

```bash
npm install svelte-interval-rune
```

## Basic Usage

### Creating a Simple Interval

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const timer = new Interval(1000);
</script>

<p>Time: {timer.current.toLocaleTimeString()}</p>
<p>Ticks: {timer.tickCount}</p>
```

### Immediate vs Lazy Initialization

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  // Lazy (default) - starts when accessed
  const lazyTimer = new Interval(1000);

  // Immediate - starts right away
  const immediateTimer = new Interval(1000, { immediate: true });
</script>

<p>Lazy: {lazyTimer.current.toLocaleTimeString()}</p>
<p>Immediate: {immediateTimer.current.toLocaleTimeString()}</p>
```

### Reactive Duration

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  let speed = $state(1000);
  const timer = new Interval(() => speed);
</script>

<p>Duration: {timer.duration}ms | Ticks: {timer.tickCount}</p>
<button onclick={() => speed = 500}>Fast</button>
<button onclick={() => speed = 2000}>Slow</button>
```

## Interval Control

### Pause, Resume, and Stop

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  const timer = new Interval(1000);
</script>

<p>Ticks: {timer.tickCount} | Status: {timer.isActive ? 'Running' : timer.isStopped ? 'Stopped' : 'Paused'}</p>

<button onclick={() => timer.pause()}>Pause</button>
<button onclick={() => timer.resume()}>Resume</button>
<button onclick={() => timer.resume(true)}>Resume Immediate</button>
<button onclick={() => timer.stop()}>Stop</button>
```

**Key Differences:**

- **Pause:** Temporarily stops ticking but keeps the interval running internally
- **Stop:** Completely destroys the interval and resets state
- **Resume:** Continues from where it was paused
- **Resume(true):** Immediately ticks and resets timing cycle

## Limited Intervals

Use `LimitedInterval` when you need an interval that automatically stops after a specific number of ticks.

```svelte
<script>
  import { LimitedInterval } from 'svelte-interval-rune';

  const timer = new LimitedInterval(500, 10); // 500ms interval, stops after 10 ticks
</script>

<p>Ticks: {timer.tickCount} / {timer.maxTicks}</p>
<p>Remaining: {timer.remainingTicks}</p>
<p>Completed: {timer.isCompleted}</p>

<button onclick={() => timer.reset()}>Reset</button>
<input type="number" bind:value={timer.maxTicks} min="1" />
```

### LimitedInterval Features

- **Automatic Completion:** Stops automatically after reaching `maxTicks`
- **Reset Functionality:** Use `reset()` to continue from current tick count
- **Dynamic Limits:** Change `maxTicks` at runtime
- **Remaining Ticks:** Track progress with `remainingTicks`
- **Completion State:** Check `isCompleted` status

## Interval Synchronization

The `sync()` function allows multiple intervals to tick together at the pace of the fastest interval.

```svelte
<script>
  import { Interval, LimitedInterval, sync } from 'svelte-interval-rune';

  const timer1 = new Interval(1000);        // 1 second
  const timer2 = new Interval(500);         // 500ms (will be leader - fastest)
  const timer3 = new LimitedInterval(750, 5); // 750ms, 5 ticks max

  const controller = sync(timer1, timer2, timer3);
</script>

<p>Leader: {controller.leader.duration}ms | Sync: {controller.isSynced ? 'On' : 'Off'}</p>
<p>Timer1: {timer1.tickCount} | Timer2: {timer2.tickCount} | Timer3: {timer3.tickCount}</p>

<button onclick={() => controller.enable()}>Enable Sync</button>
<button onclick={() => controller.disable()}>Disable Sync</button>
```

### Sync Behavior

- **Leader Selection:** The fastest interval (shortest duration) becomes the leader
- **Synchronized Ticking:** All intervals tick together at the leader's pace
- **Individual State:** Each interval maintains its own pause/active state
- **Leader Completion:** When the leader completes (if it's a LimitedInterval), sync stops
- **Restoration:** When sync is disabled, intervals return to their individual timing

### Advanced Sync Example

```svelte
<script>
  import { Interval, LimitedInterval, sync } from 'svelte-interval-rune';

  const fast = new Interval(100);           // Fast timer
  const limited = new LimitedInterval(200, 3); // Limited interval

  const controller = sync(fast, limited);
</script>

<p>Fast: {fast.tickCount} | Limited: {limited.tickCount}/{limited.maxTicks}</p>
<p>Leader: {controller.leader.duration}ms | Completed: {limited.isCompleted}</p>

<button onclick={() => controller.enable()}>Start Sync</button>
<button onclick={() => limited.reset()}>Reset Limited</button>
```

## API Reference

### Interval Class

#### Constructor

```typescript
new Interval(duration: number | (() => number), options?: IntervalOptions)
```

**Parameters:**

- `duration` - Static number or reactive function returning interval duration in milliseconds
- `options.immediate?` - If `true`, starts interval immediately. Default: `false`

#### Properties

- `current: Date` - Gets current time and auto-starts interval
- `duration: number` - Gets or sets the interval duration
- `isActive: boolean` - Whether the interval is currently active (not paused/stopped)
- `isStopped: boolean` - Whether the interval has been completely stopped
- `tickCount: number` - Number of times the interval has fired (auto-starts interval)

#### Methods

- `pause(): void` - Pauses the interval (can be resumed)
- `resume(immediate?: boolean): void` - Resumes the interval, optionally with immediate tick
- `stop(): void` - Completely stops and cleans up the interval
- `[Symbol.dispose](): void` - Automatic cleanup (works with `using`)

### LimitedInterval Class

Extends `Interval` with automatic completion after N ticks.

#### Constructor

```typescript
new LimitedInterval(duration: number | (() => number), maxTicks: number, options?: IntervalOptions)
```

**Additional Parameters:**

- `maxTicks` - Number of ticks before auto-completion

#### Additional Properties

- `maxTicks: number` - Gets or sets the maximum tick limit
- `isCompleted: boolean` - Whether the interval has reached its tick limit
- `remainingTicks: number` - Number of ticks remaining before completion

#### Additional Methods

- `reset(): void` - Resets completion state and resumes from current tick count

### sync() Function

#### Signature

```typescript
function sync(...intervals: Interval[]): SyncController;
```

**Parameters:**

- `...intervals` - One or more Interval or LimitedInterval instances to synchronize

#### Returns: SyncController

```typescript
interface SyncController {
	enable(): void; // Start synchronization
	disable(): void; // Stop synchronization and restore individual timing
	isSynced: boolean; // Whether sync is currently active
	leader: Interval; // The fastest interval driving synchronization
}
```

### IntervalOptions

```typescript
interface IntervalOptions {
	immediate?: boolean; // Start interval immediately on construction
}
```

## Advanced Patterns

### Custom Timer with Reset

```svelte
<script>
  import { Interval } from 'svelte-interval-rune';

  let duration = $state(1000);
  let timer = $state(new Interval(() => duration));

  function resetTimer() {
    timer.stop();
    timer = new Interval(() => duration);
  }
</script>

<p>Ticks: {timer.tickCount} | Duration: {duration}ms</p>
<button onclick={() => duration = 500}>Fast</button>
<button onclick={() => resetTimer()}>Reset</button>
```

### Countdown Timer

```svelte
<script>
  import { LimitedInterval } from 'svelte-interval-rune';

  let countdown = new LimitedInterval(1000, 10); // 10 second countdown
</script>

<p>{countdown.isCompleted ? 'Time\'s Up!' : `${countdown.remainingTicks}s left`}</p>
<button onclick={() => countdown.current}>Start</button>
<button onclick={() => countdown.reset()}>Reset</button>
```

## Performance Notes

- **Lazy Initialization:** Intervals only start when `current` or `tickCount` is first accessed (unless `immediate: true`)
- **Automatic Cleanup:** All intervals automatically clean up when components unmount
- **Memory Efficient:** Stopped intervals are fully cleaned up and garbage collected
- **Sync Overhead:** Minimal overhead when syncing intervals - leader drives all timing

## Bundle Size

- **Interval:** ~478B (minified + brotlied)
- **LimitedInterval:** ~687B (minified + brotlied)
- **sync:** ~306B (minified + brotlied)
- **Interval + LimitedInterval:** ~698B (minified + brotlied)
- **Interval + sync:** ~678B (minified + brotlied)
- **LimitedInterval + sync:** ~883B (minified + brotlied)
- **Total Package:** ~886B for all features
