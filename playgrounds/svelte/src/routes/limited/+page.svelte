<script lang="ts">
  import { LimitedInterval, sync } from 'svelte-interval-rune';

  const in1 = new LimitedInterval(100, 300);
  const in2 = new LimitedInterval(200, 200);
  const in3 = new LimitedInterval(300, 100);

  const controller = sync(in1, in2, in3);

  function start() {
    controller.start();
  }

  function stop() {
    controller.stop();
  }
</script>

<p>Leader: {!!controller.leader}</p>

<p>1: {in1.tickCount}</p>
<p>2: {in2.tickCount}</p>
<p>3: {in3.tickCount}</p>

<button onclick={start}>Sync</button>
<button onclick={stop}>Desync</button>