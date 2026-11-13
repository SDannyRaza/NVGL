const test = require('node:test');
const assert = require('node:assert/strict');
require('./public/gnss_skyplot.js');
const { project, visibleSatellites, render } = globalThis.GNSSSkyplot;

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`);
}

test('sky projection places north up and azimuth clockwise with zenith at the centre', () => {
  const expected = [[0, 100, 0], [90, 200, 100], [180, 100, 200], [270, 0, 100]];
  for (const [azimuth, x, y] of expected) {
    const point = project(azimuth, 0, 100, 100, 100);
    near(point.x, x);
    near(point.y, y);
  }
  for (const azimuth of [0, 30, 90, 180, 359]) {
    assert.deepEqual(project(azimuth, 90, 100, 100, 100), { x: 100, y: 100 });
  }
  near(project(0, 45, 100, 100, 100).y, 50);
  near(project(450, 0, 100, 100, 100).x, 200);
});

test('below-horizon and invalid geometry never become horizon markers', () => {
  assert.equal(project(0, -0.01, 100, 100, 100), null);
  assert.equal(project(0, 90.01, 100, 100, 100), null);
  assert.equal(project(NaN, 30, 100, 100, 100), null);
  const satellites = [
    { sat: 'G01', status: 'ok', az_deg: 0, el_deg: 30 },
    { sat: 'G02', status: 'ok', az_deg: 90, el_deg: -5 },
    { sat: 'G03', status: 'No matching NAV record', az_deg: 30, el_deg: 45 },
    { sat: 'G04', status: 'ok', az_deg: NaN, el_deg: 45 },
    { sat: 'G05', status: 'ok', az_deg: 80, el_deg: 95 }
  ];
  assert.deepEqual(visibleSatellites(satellites, 0).map(s => s.sat), ['G01']);
});

test('elevation mask includes the boundary and keeps the zenith visible at 90 degrees', () => {
  const satellites = [9.999, 10, 10.001, 90].map((elevation, index) => ({
    sat: `G0${index + 1}`, status: 'ok', az_deg: index * 90, el_deg: elevation
  }));
  assert.deepEqual(visibleSatellites(satellites, 10).map(s => s.sat), ['G02', 'G03', 'G04']);
  assert.deepEqual(visibleSatellites(satellites, 90).map(s => s.sat), ['G04']);
});

test('render retains below-mask targets with canonical marker and label colours', () => {
  const fills = [], labels = [];
  const ctx = new Proxy({
    globalAlpha: 1,
    fillStyle: '',
    fill() { fills.push(this.fillStyle); },
    fillText(text) { labels.push([text, this.fillStyle]); },
    measureText(text) { return { width: text.length * 6 }; }
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const satellites = [
    { sat: 'G01', system: 'G', status: 'ok', az_deg: 45, el_deg: 50 },
    { sat: 'E02', system: 'E', status: 'ok', az_deg: 200, el_deg: 5 },
    { sat: 'G03', system: 'G', status: 'ok', az_deg: 90, el_deg: -1 }
  ];
  const colors = { G: '#55a8ff', E: '#48d6c7' };
  const targets = render(ctx, 600, 460, { satellites, mask: 10, colors, labelMode: 'prn' });
  assert.equal(targets.length, 2);
  assert.equal(targets.find(s => s.sat === 'E02').aboveMask, false);
  assert.equal(targets.find(s => s.sat === 'G01').aboveMask, true);
  assert.ok(fills.includes(colors.G));
  assert.ok(fills.includes(colors.E));
  assert.ok(labels.some(([text, color]) => text === 'G01' && color === colors.G));
  assert.ok(!labels.some(([text]) => text === 'G03'));
});
