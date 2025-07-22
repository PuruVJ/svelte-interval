<script lang="ts">
	import { Interval } from "svelte-interval-rune";

  // const interval1 = new Interval(1000)
  const interval1 = new Interval(1000, {immediate: false})
  const interval2 = new Interval(1000)
</script>

<!-- <p>1: {interval1.tickCount}</p> -->
<p>1: {interval1.tickCount}</p>
<p>2: {interval2.tickCount}</p>

<button onclick={() => interval1.paused ? interval1.resume(true) : interval1.pause()}>Toggle</button>

<button onclick={() => interval2.duration = interval2.duration === 100 ? 1000 : 100}>Change Interval2 time</button>