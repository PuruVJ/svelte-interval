<script lang="ts">
  import { Interval, sync } from 'svelte-interval-rune';

  const in1 = new Interval(100);
  const in2 = new Interval(200);
  const in3 = new Interval(300);

  const controller = sync(in1, in2, in3);

  function start() {
    controller.enable();
  }

  function stop() {
    controller.disable();
  }
</script>

<p>Leader: {!!controller.leader}</p>

<p>1: {in1.tickCount}</p>
<p>2: {in2.tickCount}</p>
<p>3: {in3.tickCount}</p>

<button onclick={start}>Sync</button>
<button onclick={stop}>Desync</button>