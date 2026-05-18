import * as THREE from 'three';

/**
 * Renders text lines to an offscreen canvas and samples pixel positions
 * into point and line data:
 *   fill     - every filled pixel
 *   edge     - filled pixels adjacent to empty pixels
 *   segments - neighboring edge pixels connected as outline line segments
 */
export function sampleText(lines, {
  fontSize = 68,
  cw       = 900,
  ch       = 230,
  density  = 3,       // sample every N pixels
  worldW   = 8.0,     // world-space width the canvas maps to
  worldH   = 2.3,
} = {}) {
  const off = document.createElement('canvas');
  off.width  = cw;
  off.height = ch;
  const ctx  = off.getContext('2d');

  ctx.fillStyle    = '#fff';
  ctx.font         = `bold ${fontSize}px "Courier New", monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const lh = ch / lines.length;
  lines.forEach((text, i) => ctx.fillText(text, cw / 2, lh * (i + 0.5)));

  const { data } = ctx.getImageData(0, 0, cw, ch);
  const px = (x, y) =>
    x >= 0 && x < cw && y >= 0 && y < ch &&
    data[(y * cw + x) * 4 + 3] > 128;

  const fill = [];
  const edge = [];
  const edgePixels = [];
  const edgeByKey = new Map();

  for (let y = density; y < ch - density; y += density) {
    for (let x = density; x < cw - density; x += density) {
      if (!px(x, y)) continue;

      const wx =  (x / cw - 0.5) * worldW;
      const wy = -(y / ch - 0.5) * worldH;
      fill.push(new THREE.Vector3(wx, wy, 0));

      const isEdge =
        !px(x - density, y) || !px(x + density, y) ||
        !px(x, y - density) || !px(x, y + density);
      if (isEdge) {
        const point = new THREE.Vector3(wx, wy, 0);
        edge.push(point);
        edgePixels.push({ x, y, point });
        edgeByKey.set(`${x},${y}`, point);
      }
    }
  }

  const segments = [];
  const neighborOffsets = [
    [density, 0],
    [0, density],
    [density, density],
    [-density, density],
  ];

  for (const { x, y, point } of edgePixels) {
    for (const [dx, dy] of neighborOffsets) {
      const neighbor = edgeByKey.get(`${x + dx},${y + dy}`);
      if (neighbor) segments.push([point, neighbor]);
    }
  }

  return { fill, edge, segments };
}
