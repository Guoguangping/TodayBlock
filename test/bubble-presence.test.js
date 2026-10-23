'use strict';

const assert = require('node:assert/strict');
const {
  nearestScreenEdge,
  stripBounds,
  anchorFromStrip,
  normalizeIdleFadeMs,
  shouldEdgeDock
} = require('../lib/bubble-presence');

const work = { x: 0, y: 0, width: 1920, height: 1040 };
const full = { x: 100, y: 80, width: 88, height: 88 };

assert.equal(
  nearestScreenEdge({ x: 800, y: 400, width: 88, height: 88 }, work),
  null,
  '屏幕中间只应淡出，不贴边'
);

assert.equal(
  nearestScreenEdge({ x: 1920 - 88 - 18, y: 18, width: 88, height: 88 }, work),
  null,
  '默认 18px 边距不算贴边'
);

assert.equal(
  nearestScreenEdge({ x: 1920 - 88 - 8, y: 200, width: 88, height: 88 }, work),
  'right'
);

assert.equal(
  nearestScreenEdge({ x: 8, y: 400, width: 88, height: 88 }, work),
  'left'
);

assert.equal(
  nearestScreenEdge({ x: 400, y: 8, width: 88, height: 88 }, work),
  'top'
);

assert.equal(
  nearestScreenEdge({ x: 400, y: 1040 - 88, width: 88, height: 88 }, work),
  null,
  '底边不收成细条'
);

assert.equal(
  nearestScreenEdge({ x: 1920 - 88 - 8, y: 8, width: 88, height: 88 }, work),
  'right',
  '右上角距离相同时优先左右边缘'
);

const right = stripBounds(full, 'right', 1);
assert.deepEqual(right, { x: 164, y: 88, width: 24, height: 72 });
assert.equal(right.x + right.width, full.x + full.width, '右侧细条外沿对齐原窗口');

const left = stripBounds(full, 'left', 1);
assert.equal(left.x, full.x);
assert.equal(left.width, 24);

const top = stripBounds(full, 'top', 1);
assert.equal(top.y, full.y);
assert.equal(top.height, 24);

assert.deepEqual(anchorFromStrip(right, { width: 88, height: 88 }, 'right', 1), { x: 100, y: 80 });
assert.deepEqual(anchorFromStrip(left, { width: 88, height: 88 }, 'left', 1), { x: 100, y: 80 });
assert.deepEqual(anchorFromStrip(top, { width: 88, height: 88 }, 'top', 1), { x: 100, y: 80 });

const scaled = stripBounds(full, 'right', 1.15);
assert.ok(scaled.width >= 24 && scaled.width <= 30);
assert.equal(scaled.x + scaled.width, full.x + full.width);

assert.equal(normalizeIdleFadeMs(undefined), 4000);
assert.equal(normalizeIdleFadeMs(2000), 2000);
assert.equal(normalizeIdleFadeMs(50), 1000);
assert.equal(normalizeIdleFadeMs(999999), 30000);
assert.equal(normalizeIdleFadeMs('nope'), 4000);

assert.equal(shouldEdgeDock({ idle: true, enabled: true, edge: 'left', interacting: false }), true);
assert.equal(shouldEdgeDock({ idle: true, enabled: true, edge: null, interacting: false }), false);
assert.equal(shouldEdgeDock({ idle: false, enabled: true, edge: 'top', interacting: false }), false);
assert.equal(shouldEdgeDock({ idle: true, enabled: false, edge: 'right', interacting: false }), false);
assert.equal(shouldEdgeDock({ idle: true, enabled: true, edge: 'right', interacting: true }), false);

console.log('bubble-presence tests passed');
