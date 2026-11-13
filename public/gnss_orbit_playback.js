/* Recorded-epoch playback. Each scientific update finishes before the next starts. */
(function (root) {
  'use strict';
  function create(options) {
    const now = options.now || (() => performance.now());
    const later = options.setTimer || setTimeout;
    const cancel = options.clearTimer || clearTimeout;
    const last = Math.max(0, options.count - 1);
    const cadence = Math.max(0.001, options.secondsPerEpoch || 1);
    let playing = false, speed = 1, timer = null, generation = 0;
    let anchorIndex = 0, anchorTime = 0, pending = false, restartPending = false;
    const notify = reason => options.onState?.({ playing, speed, reason });
    function pause(reason = 'paused') {
      playing = false;
      generation++;
      cancel(timer);
      timer = null;
      notify(reason);
    }
    function schedule() {
      cancel(timer);
      if (playing && !pending) timer = later(tick, 1000);
    }
    function restart() {
      restartPending = false;
      anchorIndex = 0;
      anchorTime = now();
      void run(0, generation);
    }
    async function run(index, token) {
      pending = true;
      let ok = false;
      try { ok = (await options.applyIndex(index)) !== false; }
      catch (error) { options.onError?.(error); }
      finally { pending = false; }
      if (token !== generation) {
        if (playing && restartPending) restart(); else schedule();
        return;
      }
      if (!ok) { pause('error'); return; }
      if (index >= last) { pause('ended'); return; }
      schedule();
    }
    function tick() {
      timer = null;
      if (!playing || pending) return;
      const elapsed = Math.max(0, now() - anchorTime) / 1000;
      const target = Math.min(last, anchorIndex + Math.floor(elapsed * speed / cadence));
      if (target <= options.readIndex()) { schedule(); return; }
      void run(target, generation);
    }
    function play() {
      if (playing || last === 0) return;
      restartPending = options.readIndex() >= last;
      anchorIndex = restartPending ? 0 : options.readIndex();
      anchorTime = now();
      playing = true;
      generation++;
      notify('playing');
      if (restartPending && !pending) restart();
      else schedule();
    }
    function setSpeed(value) {
      if (![1, 10, 30, 60].includes(Number(value))) return;
      speed = Number(value);
      anchorIndex = options.readIndex();
      anchorTime = now();
      notify(playing ? 'playing' : 'paused');
      schedule();
    }
    return { play, pause, setSpeed, get playing() { return playing; }, get speed() { return speed; } };
  }
  const api = { create };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GNSSOrbitPlayback = api;
})(typeof window === 'object' ? window : globalThis);
