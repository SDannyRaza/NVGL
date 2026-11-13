const test = require('node:test');
const assert = require('node:assert/strict');
require('./public/gnss_orbit_playback.js');
// Browser scripts are ESM under package.json, so their browser global is used here.
const { create } = globalThis.GNSSOrbitPlayback;

function harness(extra = {}) {
  let time = 0, index = 0, nextId = 0;
  const timers = new Map(), applied = [], states = [];
  const player = create({
    count: 100, secondsPerEpoch: 1, now: () => time,
    readIndex: () => index,
    applyIndex: async value => { applied.push(value); index = value; return true; },
    setTimer: callback => { timers.set(++nextId, callback); return nextId; },
    clearTimer: id => timers.delete(id),
    onState: state => states.push(state), ...extra
  });
  return { player, applied, states, timers,
    setIndex: value => { index = value; },
    async tick(ms = 1000) {
      time += ms;
      const callbacks = [...timers.values()]; timers.clear();
      for (const callback of callbacks) callback();
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

test('playback follows recorded time, supports speeds and pauses without queued ticks', async () => {
  const h = harness();
  h.player.play(); await h.tick();
  assert.deepEqual(h.applied, [1]);
  h.player.setSpeed(10); await h.tick();
  h.player.setSpeed(30); await h.tick();
  h.player.setSpeed(60); await h.tick();
  assert.deepEqual(h.applied, [1, 11, 41, 99]);
  assert.equal(h.player.playing, false);
  assert.equal(h.states.at(-1).reason, 'ended');
  assert.equal(h.timers.size, 0);
  h.player.play(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.applied.at(-1), 0, 'replaying at the end restarts at the first epoch');
  h.player.pause(); await h.tick(10000);
  assert.equal(h.applied.at(-1), 0);
});

test('a slow scientific update cannot overlap a second playback update', async () => {
  let finish, count = 0;
  const h = harness({ applyIndex: () => { count++; return new Promise(resolve => { finish = resolve; }); } });
  h.player.play(); await h.tick();
  await h.tick(4000);
  assert.equal(count, 1);
  assert.equal(h.timers.size, 0);
  h.player.setSpeed(30);
  h.player.pause(); h.player.play();
  assert.equal(h.timers.size, 0, 'restart also waits for the pending update');
  finish(true); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.timers.size, 1);
  h.player.pause();
});

test('failed calculations pause playback, and epoch cadence is respected', async () => {
  const failed = harness({ applyIndex: async () => false });
  failed.player.play(); await failed.tick();
  assert.equal(failed.player.playing, false);
  assert.equal(failed.states.at(-1).reason, 'error');
  const h = harness({ secondsPerEpoch: 2 });
  h.player.play(); await h.tick();
  assert.deepEqual(h.applied, []);
  await h.tick(); assert.deepEqual(h.applied, [1]);
  h.player.pause();
});

test('pause and replay while the last epoch is pending restarts once it finishes', async () => {
  let index = 1, finish;
  const applied = [];
  const h = harness({count:3,readIndex:()=>index,applyIndex:value=>{
    index=value;applied.push(value);
    return value===2?new Promise(resolve=>{finish=resolve}):Promise.resolve(true);
  }});
  h.player.play(); await h.tick();
  assert.deepEqual(applied,[2]);
  h.player.pause();h.player.play();
  finish(true);await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(applied,[2,0]);
  assert.equal(h.player.playing,true);
  await h.tick();assert.equal(applied.at(-1),1);
  h.player.pause();
});
