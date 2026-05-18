/**
 * Runs one local RANSAC pass over `points` (THREE.Vector3[]).
 *
 * The simplified idea:
 * 1. Pick two random edge points.
 * 2. Treat them as a short candidate segment.
 * 3. Count nearby edge points as inliers.
 * 4. Return the strongest local segment and the points it claimed.
 *
 * This intentionally scores finite segments, not infinite lines, so one
 * long accidental fit cannot span multiple letters and stall the animation.
 */
export function ransacStep(points, {
  iterations = 260,
  distThreshold = 0.045,
  endpointSlack = 0.03,
  minInliers = 6,
  minSegLen = 0.06,
  maxSegLen = 0.85,
} = {}) {
  if (points.length < 2) return null;

  let bestInliers = [];
  let bestStart = null;
  let bestEnd = null;
  const thresholdSq = distThreshold * distThreshold;

  for (let i = 0; i < iterations; i++) {
    const ai = (Math.random() * points.length) | 0;
    let bi = (Math.random() * points.length) | 0;
    while (bi === ai) bi = (Math.random() * points.length) | 0;

    const a = points[ai];
    const b = points[bi];
    const rawDx = b.x - a.x;
    const rawDy = b.y - a.y;
    const rawDz = b.z - a.z;
    const len = Math.hypot(rawDx, rawDy, rawDz);
    if (len < minSegLen || len > maxSegLen) continue;

    const dx = rawDx / len;
    const dy = rawDy / len;
    const dz = rawDz / len;

    const inliers = [];
    let minT = Infinity;
    let maxT = -Infinity;

    for (const p of points) {
      const apx = p.x - a.x;
      const apy = p.y - a.y;
      const apz = p.z - a.z;
      const t = apx * dx + apy * dy + apz * dz;
      if (t < -endpointSlack || t > len + endpointSlack) continue;

      const offX = apx - dx * t;
      const offY = apy - dy * t;
      const offZ = apz - dz * t;
      const distSq = offX * offX + offY * offY + offZ * offZ;

      if (distSq <= thresholdSq) {
        inliers.push(p);
        minT = Math.min(minT, t);
        maxT = Math.max(maxT, t);
      }
    }

    const fittedLen = maxT - minT;
    if (
      inliers.length >= minInliers &&
      fittedLen >= minSegLen &&
      fittedLen <= maxSegLen &&
      inliers.length > bestInliers.length
    ) {
      bestInliers = inliers;
      bestStart = a.clone().addScaledVector({ x: dx, y: dy, z: dz }, minT);
      bestEnd = a.clone().addScaledVector({ x: dx, y: dy, z: dz }, maxT);
    }
  }

  if (bestInliers.length < minInliers) return null;

  return {
    start: bestStart,
    end: bestEnd,
    inliers: bestInliers,
  };
}
