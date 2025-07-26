<script lang="ts">
  import { LimitedInterval, sync } from 'svelte-interval-rune';

  const in1 = new LimitedInterval(100, 300);
  const in2 = new LimitedInterval(200, 200);
  const in3 = new LimitedInterval(300, 100);

  const sync_controller = sync(in1, in2, in3);

  function start() {
    sync_controller.enable();
  }

  function stop() {
    sync_controller.disable();
  }
</script>

<p>Leader: {!!sync_controller.leader}</p>

<p>1: {in1.tickCount}</p>
<p>2: {in2.tickCount}</p>
<p>3: {in3.tickCount}</p>

<button onclick={start}>Sync</button>
<button onclick={stop}>Desync</button>