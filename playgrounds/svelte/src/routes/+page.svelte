<script lang="ts">
	import { Interval } from "svelte-interval-rune";

  // const interval1 = new Interval(1000)
  const interval2 = new Interval(1000, {immediate: false})
</script>

<!-- <p>1: {interval1.tickCount}</p> -->
<p>2: {interval2.tickCount}</p>

<button onclick={() => interval2.paused ? interval2.resume(true) : interval2.pause()}>Toggle</button>