/* Unit sky dome in local East–North–Up coordinates: direction, not satellite range. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GNSSSkyplot3D = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const RAD = Math.PI / 180;
  const FONT = '"Segoe UI", sans-serif';
  const DEFAULT_CAMERA = Object.freeze({ yaw: -.45, pitch: .55, zoom: 1 });
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

  function direction(azimuth, elevation) {
    if (!Number.isFinite(azimuth) || !Number.isFinite(elevation) || elevation < 0 || elevation > 90) return null;
    const az = azimuth * RAD, el = elevation * RAD, horizontal = Math.cos(el);
    return { east: horizontal * Math.sin(az), north: horizontal * Math.cos(az), up: Math.sin(el) };
  }

  function view(width, height, camera) {
    if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
    camera = camera || DEFAULT_CAMERA;
    const yaw = finite(camera.yaw, DEFAULT_CAMERA.yaw);
    const pitch = clamp(finite(camera.pitch, DEFAULT_CAMERA.pitch), .15, 1.35);
    const zoom = clamp(finite(camera.zoom, 1), .75, 1.35);
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    // At zoom 1 the complete dome and cardinal labels fit the compact canvas.
    const radius = Math.max(1, Math.min((width - 88) / 2, (height - 84) / (1 + sp))) * zoom;
    const cx = width / 2, originY = height / 2 + radius * (1 - sp) / 2;
    const point = vector => {
      const across = vector.east * cy - vector.north * sy;
      const away = vector.east * sy + vector.north * cy;
      return { x: cx + radius * across, y: originY - radius * (vector.up * cp + away * sp),
        depth: vector.up * sp - away * cp };
    };
    return { point, radius, yaw, pitch };
  }

  function project(azimuth, elevation, width, height, camera) {
    const vector = direction(azimuth, elevation), projection = view(width, height, camera);
    return vector && projection ? projection.point(vector) : null;
  }

  function valid(satellite) {
    return satellite && satellite.status === 'ok' && direction(satellite.az_deg, satellite.el_deg) !== null;
  }
  function overlaps(a, b) {
    return a.x < b.x + b.w + 2 && a.x + a.w + 2 > b.x && a.y < b.y + b.h + 2 && a.y + a.h + 2 > b.y;
  }
  function circle(ctx, x, y, radius) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); }

  function hull(points) {
    const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const lower = [], upper = [];
    for (const point of sorted) {
      while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
      lower.push(point);
    }
    for (let i = sorted.length - 1; i >= 0; i--) {
      const point = sorted[i];
      while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
      upper.push(point);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  function render(ctx, width, height, options) {
    options = options || {};
    const projection = view(width, height, options.camera);
    if (!ctx || !projection) return [];
    const colors = options.colors || {}, names = options.names || {};
    const mask = clamp(finite(Number(options.mask), 10), 0, 90);
    const point = projection.point;
    const skyPoint = (az, el) => point(direction(az, el));
    const ring = elevation => Array.from({ length: 91 }, (_, i) => skyPoint(i * 4, elevation));
    const stroke = (points, color, alpha, dashed) => {
      ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.setLineDash(dashed || []);
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    };
    const polygon = points => {
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();
    };
    const obstacles = [];
    ctx.save(); ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#091321'; ctx.fillRect(0, 0, width, height);
    const horizon = ring(0), surface = [];
    for (let el = 0; el <= 90; el += 10) for (let az = 0; az < 360; az += 6) surface.push(skyPoint(az, el));
    ctx.fillStyle = '#102438'; polygon(horizon);
    ctx.fillStyle = 'rgba(26,67,89,.22)'; polygon(hull(surface));

    // All grid directions remain visible through the transparent hemisphere.
    const grid = [];
    for (const el of [15, 30, 45, 60, 75]) grid.push(ring(el));
    for (let az = 0; az < 360; az += 30) grid.push(Array.from({ length: 31 }, (_, i) => skyPoint(az, i * 3)));
    ctx.lineWidth = 1;
    for (const points of grid) {
      for (const near of [false, true]) {
        ctx.beginPath();
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i];
          if (((a.depth + b.depth) / 2 >= 0) !== near) continue;
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        ctx.globalAlpha = near ? .72 : .35; ctx.strokeStyle = near ? '#3b6176' : '#294b60'; ctx.stroke();
      }
    }
    stroke(horizon, '#53758a', .9);
    ctx.lineWidth = 1.4; stroke(ring(mask), '#ffc45b', .95, [5, 5]); ctx.setLineDash([]);

    const origin = point({ east: 0, north: 0, up: 0 }), zenith = skyPoint(0, 90);
    ctx.lineWidth = 1; stroke([origin, zenith], '#90b0c3', .5, [3, 4]); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 12px ' + FONT;
    for (const [label, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
      const vector = direction(az, 0), position = point({ east: vector.east * 1.12, north: vector.north * 1.12, up: 0 });
      ctx.fillStyle = '#c9dce8'; ctx.fillText(label, position.x, position.y);
      obstacles.push({ x: position.x - 10, y: position.y - 9, w: 20, h: 18 });
    }
    ctx.font = '11px ' + FONT; ctx.fillStyle = '#a9c5d5';
    ctx.fillText('Zenith 90°', zenith.x, zenith.y - 15);
    obstacles.push({ x: zenith.x - 36, y: zenith.y - 23, w: 72, h: 16 });
    for (const el of [30, 60]) {
      const position = skyPoint(projection.yaw / RAD - 90, el);
      ctx.font = '10px ' + FONT; ctx.fillStyle = '#819fb2'; ctx.fillText(el + '°', position.x - 10, position.y - 7);
      obstacles.push({ x: position.x - 24, y: position.y - 15, w: 28, h: 16 });
    }
    circle(ctx, origin.x, origin.y, 3.2); ctx.fillStyle = '#d6e6ef'; ctx.fill();
    ctx.font = '10px ' + FONT; ctx.fillText('RX', origin.x, origin.y + 14);
    obstacles.push({ x: origin.x - 12, y: origin.y - 5, w: 24, h: 26 });

    const targets = (options.satellites || []).filter(valid).map(satellite => {
      const position = skyPoint(satellite.az_deg, satellite.el_deg);
      return Object.assign({}, satellite, position, { aboveMask: satellite.el_deg >= mask,
        r: satellite.sat === options.selectedSat ? 6 : (satellite.el_deg >= mask ? 4.2 : 3.1) * (.93 + .07 * position.depth) });
    }).sort((a, b) => a.depth - b.depth);
    const selected = targets.find(satellite => satellite.sat === options.selectedSat);
    if (selected) {
      const color = colors[selected.system] || '#b8cfdf', vector = direction(selected.az_deg, selected.el_deg);
      const foot = point({ east: vector.east, north: vector.north, up: 0 });
      ctx.lineWidth = 1.2; stroke([origin, selected], color, .75); stroke([selected, foot], color, .45, [3, 4]);
      ctx.setLineDash([]); ctx.globalAlpha = .7; circle(ctx, foot.x, foot.y, 2); ctx.fillStyle = color; ctx.fill();
    }
    for (const satellite of targets) {
      ctx.globalAlpha = satellite.aboveMask ? .9 + .1 * (satellite.depth + 1) / 2 : .36;
      const color = colors[satellite.system] || '#b8cfdf';
      circle(ctx, satellite.x, satellite.y, satellite.r); ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#091321'; ctx.stroke();
      if (satellite.sat === options.selectedSat) {
        ctx.globalAlpha = 1; circle(ctx, satellite.x, satellite.y, satellite.r + 4); ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.stroke();
      }
      obstacles.push({ x: satellite.x - satellite.r - 2, y: satellite.y - satellite.r - 2, w: (satellite.r + 2) * 2, h: (satellite.r + 2) * 2 });
    }
    ctx.globalAlpha = 1; ctx.font = '12px ' + FONT; ctx.textAlign = 'left';
    const labels = targets.filter(s => s.aboveMask || s.sat === options.selectedSat)
      .sort((a, b) => Number(b.sat === options.selectedSat) - Number(a.sat === options.selectedSat) || b.depth - a.depth);
    for (const satellite of labels) {
      if (options.labelMode === 'none') continue;
      const label = options.labelMode === 'names' ? (names[satellite.system] || satellite.name || satellite.system) + ' · ' + satellite.sat : satellite.sat;
      const labelWidth = ctx.measureText(label).width, gap = satellite.r + 5;
      const offsets = [[gap, -7], [-gap - labelWidth, -7], [gap, -21], [-gap - labelWidth, -21], [gap, 7], [-gap - labelWidth, 7], [-labelWidth / 2, -gap - 15], [-labelWidth / 2, gap + 1], [gap + 15, -30], [-gap - labelWidth - 15, -30]];
      let box;
      for (const [dx, dy] of offsets) {
        const candidate = { x: satellite.x + dx, y: satellite.y + dy, w: labelWidth, h: 15 };
        if (candidate.x < 5 || candidate.y < 5 || candidate.x + labelWidth > width - 5 || candidate.y + 15 > height - 5) continue;
        if (obstacles.some(obstacle => overlaps(candidate, obstacle))) continue;
        box = candidate; break;
      }
      if (!box) continue;
      const nearest = { x: clamp(satellite.x, box.x, box.x + box.w), y: clamp(satellite.y, box.y, box.y + box.h) };
      const color = colors[satellite.system] || '#b8cfdf';
      if (Math.hypot(nearest.x - satellite.x, nearest.y - satellite.y) > gap + 6) {
        ctx.lineWidth = .8; stroke([satellite, nearest], color, .5); ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 3; ctx.strokeStyle = '#091321'; ctx.strokeText(label, box.x, box.y + 7.5);
      ctx.fillStyle = color; ctx.fillText(label, box.x, box.y + 7.5); obstacles.push(box);
    }
    ctx.restore(); return targets;
  }
  return Object.freeze({ direction, project, render, DEFAULT_CAMERA });
});
