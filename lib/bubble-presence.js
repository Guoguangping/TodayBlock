'use strict';

// 悬浮块空闲贴边的纯计算。窗口位置仍由 main.js 的 anchor 持久化，
// 这里只判断“算不算靠边缘”以及细条该占哪一块矩形。

/** 距工作区左/右/上边缘不超过该值（DIP）才允许贴边。钳制最近是 8px，所以 12 能覆盖贴边。 */
const EDGE_DOCK_THRESHOLD = 12;
const STRIP_THICKNESS = 24;
const BUBBLE_PAD = 8;
const BUBBLE_FACE = 72;

/**
 * 选择离工作区最近的左/右/上边缘。
 * 底边不参与；屏幕中间返回 null，调用方只淡出、不收缩。
 * @returns {'left'|'right'|'top'|null}
 */
function nearestScreenEdge(bounds, workArea, threshold = EDGE_DOCK_THRESHOLD) {
  if (!bounds || !workArea) return null;
  const left = bounds.x - workArea.x;
  const right = workArea.x + workArea.width - (bounds.x + bounds.width);
  const top = bounds.y - workArea.y;
  const candidates = [
    ['left', left],
    ['right', right],
    ['top', top]
  ].filter(([, distance]) => (
    Number.isFinite(distance) && distance <= threshold && distance >= -threshold
  ));
  if (!candidates.length) return null;
  candidates.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  return candidates[0][0];
}

function stripMetrics(scale = 1) {
  const safe = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    pad: Math.round(BUBBLE_PAD * safe),
    face: Math.round(BUBBLE_FACE * safe),
    thickness: Math.max(10, Math.round(STRIP_THICKNESS * safe))
  };
}

/**
 * 细条矩形贴在完整气泡朝向屏幕的那一侧，外沿与原窗口外沿对齐。
 * 鼠标停在细条上时，还原成完整气泡后光标仍落在窗口内。
 */
function stripBounds(full, edge, scale = 1, workArea = null) {
  if (!full) return null;
  if (edge !== 'left' && edge !== 'right' && edge !== 'top') {
    return { x: full.x, y: full.y, width: full.width, height: full.height };
  }
  const { pad, face, thickness } = stripMetrics(scale);
  if (edge === 'right') {
    const right = workArea ? workArea.x + workArea.width : full.x + full.width;
    return {
      x: Math.round(right - thickness),
      y: Math.round(full.y + pad),
      width: thickness,
      height: face
    };
  }
  if (edge === 'left') {
    return {
      x: Math.round(workArea ? workArea.x : full.x),
      y: Math.round(full.y + pad),
      width: thickness,
      height: face
    };
  }
  return {
    x: Math.round(full.x + pad),
    y: Math.round(workArea ? workArea.y : full.y),
    width: face,
    height: thickness
  };
}

/** 拖动结束时若窗口仍是细条，按边缘把坐标折回完整气泡锚点，避免把细条尺寸写进 anchor。 */
function anchorFromStrip(bounds, fullSize, edge, scale = 1) {
  const { pad } = stripMetrics(scale);
  if (!bounds) return { x: 0, y: 0 };
  if (!fullSize || (edge !== 'left' && edge !== 'right' && edge !== 'top')) {
    return { x: bounds.x, y: bounds.y };
  }
  if (edge === 'right') {
    return { x: bounds.x + bounds.width - fullSize.width, y: bounds.y - pad };
  }
  if (edge === 'left') {
    return { x: bounds.x, y: bounds.y - pad };
  }
  return { x: bounds.x - pad, y: bounds.y };
}

function normalizeIdleFadeMs(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms)) return 4000;
  return Math.min(30000, Math.max(1000, Math.round(ms)));
}

/**
 * 贴边必须同时满足：已经空闲淡出、开关打开、确实靠左/右/上边缘、当前没有鼠标或拖动。
 * 屏幕中间 edge 为空，结果为 false。
 */
function shouldEdgeDock({ idle, enabled, edge, interacting }) {
  return Boolean(idle && enabled && edge && !interacting);
}

module.exports = {
  EDGE_DOCK_THRESHOLD,
  STRIP_THICKNESS,
  BUBBLE_PAD,
  BUBBLE_FACE,
  nearestScreenEdge,
  stripBounds,
  anchorFromStrip,
  normalizeIdleFadeMs,
  shouldEdgeDock
};
