/* Observer sky: azimuth clockwise from true north; elevation 90 degrees at zenith. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GNSSSkyplot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const RAD = Math.PI / 180;
  const TAU = Math.PI * 2;
  const FONT = '"Segoe UI", sans-serif';

  function project(az, el, cx, cy, radius) {
    if (![az, el, cx, cy, radius].every(Number.isFinite) || el < 0 || el > 90 || radius < 0) return null;
    const distance = radius * (90 - el) / 90;
    const angle = (az - 90) * RAD;
    return { x: cx + distance * Math.cos(angle), y: cy + distance * Math.sin(angle) };
  }

  function maskAngle(mask) {
    return Math.max(0, Math.min(90, Number.isFinite(Number(mask)) ? Number(mask) : 10));
  }

  function aboveHorizon(satellite) {
    return satellite && satellite.status === 'ok' && Number.isFinite(satellite.az_deg) &&
      Number.isFinite(satellite.el_deg) && satellite.el_deg >= 0 && satellite.el_deg <= 90;
  }

  function visibleSatellites(satellites, mask) {
    const elevation = maskAngle(mask);
    return (satellites || []).filter(satellite => aboveHorizon(satellite) && satellite.el_deg >= elevation);
  }

  function circle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, radius), 0, TAU);
  }

  function overlaps(a, b, gap) {
    return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x &&
      a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  }

  function labelText(satellite, mode, names) {
    if (mode === 'none') return '';
    return mode === 'names' ? (names[satellite.system] || satellite.name || satellite.system) + ' · ' + satellite.sat : satellite.sat;
  }

  function render(ctx, w, h, options) {
    options = options || {};
    if (!ctx || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return [];
    const colors = options.colors || {};
    const names = options.names || {};
    const mask = maskAngle(options.mask);
    const cx = w / 2, cy = h / 2;
    // Leave room for cardinal labels without wasting space around a compact plot.
    const radius = Math.max(1, Math.min(w - 84, h - 84) / 2);
    const compact = radius < 220;
    const maskRadius = radius * (90 - mask) / 90;
    const targets = (options.satellites || []).filter(aboveHorizon).map(satellite => {
      const position = project(satellite.az_deg, satellite.el_deg, cx, cy, radius);
      return Object.assign({}, satellite, position, {
        r: satellite.sat === options.selectedSat ? 6 : (satellite.el_deg >= mask ? (compact ? 4.4 : 4.8) : (compact ? 3.2 : 3.6)),
        aboveMask: satellite.el_deg >= mask
      });
    });

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#091321';
    ctx.fillRect(0, 0, w, h);
    circle(ctx, cx, cy, radius);
    ctx.fillStyle = '#0d2030';
    ctx.fill();

    // The annulus denotes directions above the horizon but below the selected mask.
    if (mask > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.arc(cx, cy, maskRadius, 0, TAU, true);
      ctx.fillStyle = 'rgba(255,196,91,0.055)';
      ctx.fill('evenodd');
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#29495e';
    for (let elevation = 0; elevation < 90; elevation += 15) {
      circle(ctx, cx, cy, radius * (90 - elevation) / 90);
      ctx.stroke();
    }
    ctx.strokeStyle = '#234154';
    for (let azimuth = 0; azimuth < 360; azimuth += 30) {
      const point = project(azimuth, 0, cx, cy, radius);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (compact ? '10px ' : '12px ') + FONT;
    ctx.fillStyle = '#87a9bd';
    const obstacles = [];
    for (let azimuth = 0; azimuth < 360; azimuth += 30) {
      if (azimuth % 90 === 0) continue;
      const angle = (azimuth - 90) * RAD;
      const x = cx + (radius + 17) * Math.cos(angle), y = cy + (radius + 17) * Math.sin(angle);
      ctx.fillText(azimuth + '°', x, y);
      obstacles.push({ x: x - 15, y: y - 7, w: 30, h: 14 });
    }
    ctx.font = (compact ? '700 16px ' : '700 18px ') + FONT;
    ctx.fillStyle = '#eaf3ff';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([name, azimuth]) => {
      const angle = (azimuth - 90) * RAD;
      const x = cx + (radius + 27) * Math.cos(angle), y = cy + (radius + 25) * Math.sin(angle);
      ctx.fillText(name, x, y);
      obstacles.push({ x: x - 9, y: y - 11, w: 18, h: 22 });
    });

    // Elevation labels are separated from the north azimuth labels.
    ctx.font = (compact ? '10px ' : '12px ') + FONT;
    ctx.fillStyle = '#87a9bd';
    ctx.textAlign = 'left';
    for (let elevation = 15; elevation <= 75; elevation += 15) {
      const y = cy - radius * (90 - elevation) / 90;
      const text = elevation + '°';
      ctx.fillText(text, cx + 7, y + 5);
      obstacles.push({ x: cx + 5, y: y - 2, w: 29, h: 13 });
    }
    ctx.fillStyle = '#9bb7c8';
    ctx.fillText('90°', cx + 7, cy + 7);
    obstacles.push({ x: cx + 5, y: cy, w: 29, h: 14 });
    circle(ctx, cx, cy, 2.2);
    ctx.fillStyle = '#a9c0d0';
    ctx.fill();

    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = '#ffc45b';
    ctx.lineWidth = 1.4;
    circle(ctx, cx, cy, maskRadius);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw all points before labels so labels cannot conceal a later satellite marker.
    targets.sort((a, b) => Number(a.aboveMask) - Number(b.aboveMask));
    for (const satellite of targets) {
      const color = colors[satellite.system] || '#b8cfdf';
      ctx.globalAlpha = satellite.aboveMask ? 1 : .4;
      circle(ctx, satellite.x, satellite.y, satellite.r);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = '#091321';
      ctx.stroke();
      if (satellite.sat === options.selectedSat) {
        ctx.globalAlpha = 1;
        circle(ctx, satellite.x, satellite.y, satellite.r + 4);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.7;
        ctx.stroke();
      }
      obstacles.push({ x: satellite.x - satellite.r - 2, y: satellite.y - satellite.r - 2, w: (satellite.r + 2) * 2, h: (satellite.r + 2) * 2 });
    }
    ctx.globalAlpha = 1;
    ctx.font = (compact ? '12px ' : '14px ') + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const mode = options.labelMode || 'prn';
    const labelOrder = targets.filter(satellite => satellite.aboveMask || satellite.sat === options.selectedSat)
      .sort((a, b) => Number(b.sat === options.selectedSat) - Number(a.sat === options.selectedSat) || b.el_deg - a.el_deg);
    for (const satellite of labelOrder) {
      const text = labelText(satellite, mode, names);
      if (!text) continue;
      const textWidth = ctx.measureText(text).width;
      const textHeight = compact ? 15 : 18;
      const gap = satellite.r + (satellite.sat === options.selectedSat ? 7 : 4);
      // Adjacent placements first; larger offsets receive a thin leader line.
      const candidates = [
        [gap, -textHeight / 2], [-gap - textWidth, -textHeight / 2],
        [gap, -textHeight - 4], [-gap - textWidth, -textHeight - 4],
        [gap, 4], [-gap - textWidth, 4],
        [-textWidth / 2, -gap - textHeight], [-textWidth / 2, gap],
        [gap + 13, -textHeight - 15], [-gap - textWidth - 13, -textHeight - 15],
        [gap + 13, 16], [-gap - textWidth - 13, 16]
      ];
      let box = null;
      for (const [dx, dy] of candidates) {
        const candidate = { x: satellite.x + dx, y: satellite.y + dy, w: textWidth, h: textHeight };
        if (candidate.x < 6 || candidate.y < 6 || candidate.x + candidate.w > w - 6 || candidate.y + candidate.h > h - 6) continue;
        if (obstacles.some(obstacle => overlaps(candidate, obstacle, 2))) continue;
        box = candidate;
        break;
      }
      if (!box) continue;
      const nearX = Math.max(box.x, Math.min(satellite.x, box.x + box.w));
      const nearY = Math.max(box.y, Math.min(satellite.y, box.y + box.h));
      const distance = Math.hypot(nearX - satellite.x, nearY - satellite.y);
      if (distance > gap + 7) {
        ctx.globalAlpha = .55;
        ctx.strokeStyle = colors[satellite.system] || '#b8cfdf';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(satellite.x, satellite.y);
        ctx.lineTo(nearX, nearY);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // A narrow background stroke keeps the exact constellation-coloured text readable.
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#091321';
      ctx.strokeText(text, box.x, box.y + box.h / 2);
      ctx.fillStyle = colors[satellite.system] || '#b8cfdf';
      ctx.fillText(text, box.x, box.y + box.h / 2);
      obstacles.push(box);
    }
    ctx.restore();
    return targets;
  }

  return Object.freeze({ project, visibleSatellites, render });
});
