const test = require('node:test');
const assert = require('node:assert/strict');
require('./public/gnss_skyplot_3d.js');
const { direction, project, render } = globalThis.GNSSSkyplot3D;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('sky dome maps azimuth and elevation to physical unit East-North-Up directions', () => {
  for (const [az, expected] of [[0, [0, 1, 0]], [90, [1, 0, 0]], [180, [0, -1, 0]], [270, [-1, 0, 0]]]) {
    const value = direction(az, 0);
    [value.east, value.north, value.up].forEach((coordinate, i) => near(coordinate, expected[i]));
  }
  for (let az = 0; az <= 360; az += 15) for (let el = 0; el <= 90; el += 5) {
    const value = direction(az, el);
    near(Math.hypot(value.east, value.north, value.up), 1);
    near(value.up, Math.sin(el * Math.PI / 180));
    near(Math.hypot(value.east, value.north), Math.cos(el * Math.PI / 180));
  }
  const zenith = direction(123, 90); near(zenith.up, 1); near(zenith.east, 0); near(zenith.north, 0);
  assert.equal(direction(10, -.1), null); assert.equal(direction(10, 90.1), null); assert.equal(direction(NaN, 10), null);
});

test('orthographic projection preserves geographic orientation and remains inside the compact canvas at default zoom', () => {
  const camera = { yaw: 0, pitch: .55, zoom: 1 };
  const north = project(0, 0, 600, 400, camera), east = project(90, 0, 600, 400, camera);
  const south = project(180, 0, 600, 400, camera), west = project(270, 0, 600, 400, camera);
  near(north.x, south.x); near(east.y, west.y);
  assert.ok(east.x > west.x); assert.ok(north.y < south.y); assert.ok(north.depth < south.depth);
  for (const [width, height] of [[298, 320], [700, 400]]) for (const yaw of [-Math.PI, -.45, 0, Math.PI / 2]) for (const pitch of [.15, .55, 1.35]) {
    for (let az = 0; az < 360; az += 10) for (let el = 0; el <= 90; el += 10) {
      const value = project(az, el, width, height, { yaw, pitch, zoom: 1 });
      assert.ok(value.x > 20 && value.x < width - 20);
      assert.ok(value.y > 20 && value.y < height - 20);
      assert.ok(Number.isFinite(value.depth));
    }
  }
  assert.equal(project(0, -1, 400, 320), null); assert.equal(project(0, 10, NaN, 320), null);
});

test('3D render uses the same mask inclusivity, depth order and constellation colours without mutating observations', () => {
  const fills = [], labels = [];
  const ctx = new Proxy({ fillStyle: '', globalAlpha: 1,
    fill() { fills.push(this.fillStyle); }, fillText(text) { labels.push([text, this.fillStyle]); },
    measureText(text) { return { width: text.length * 6 }; }
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const satellites = [
    { sat: 'G01', system: 'G', status: 'ok', az_deg: 45, el_deg: 45 },
    { sat: 'E02', system: 'E', status: 'ok', az_deg: 225, el_deg: 10 },
    { sat: 'C03', system: 'C', status: 'ok', az_deg: 270, el_deg: 9.999 },
    { sat: 'G04', system: 'G', status: 'ok', az_deg: 70, el_deg: -1 },
    { sat: 'G05', system: 'G', status: 'No matching NAV record' }
  ];
  const original = JSON.stringify(satellites), colors = { G: '#55a8ff', E: '#48d6c7', C: '#ffc45b' };
  const targets = render(ctx, 700, 400, { satellites, colors, mask: 10, selectedSat: 'G01', labelMode: 'prn' });
  assert.deepEqual(targets.map(s => s.sat).sort(), ['C03', 'E02', 'G01']);
  assert.equal(targets.find(s => s.sat === 'E02').aboveMask, true);
  assert.equal(targets.find(s => s.sat === 'C03').aboveMask, false);
  assert.ok(targets.every((s, i) => !i || targets[i - 1].depth <= s.depth));
  assert.ok(Object.values(colors).every(color => fills.includes(color)));
  assert.ok(labels.some(([label, color]) => label === 'G01' && color === colors.G));
  assert.ok(labels.some(([label, color]) => label === 'E02' && color === colors.E));
  assert.ok(!labels.some(([label]) => label === 'G04' || label === 'C03'));
  assert.equal(JSON.stringify(satellites), original);
});
