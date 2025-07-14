<script lang="ts">
	import { Interval } from "svelte-interval-rune";

  const interval = new Interval(1000)
</script>

<h1>Welcome to {interval.current}</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
