import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleText } from '../utils/textSampler';

const nameScan = sampleText(['TRAVIS MINOR'], {
  fontSize: 82,
  cw: 1100,
  ch: 150,
  density: 2,
  worldW: 9.8,
  worldH: 1.35,
});

const DEPTH_LAYERS = 14;
const EDGE_REPEAT = 3;
const POINT_COUNT = nameScan.fill.length * DEPTH_LAYERS + nameScan.edge.length * EDGE_REPEAT;
const TERRAIN_COLS = 210;
const TERRAIN_ROWS = 138;
const TERRAIN_POINT_COUNT = TERRAIN_COLS * TERRAIN_ROWS;
const TERRAIN_HALF_WIDTH = 10.2;
const TERRAIN_HALF_DEPTH = 6.9;
const NAME_MIN_Y = Math.min(...nameScan.fill.map((point) => point.y));
const NAME_BASE_Y = terrainHeight(0, 0) + 2.08;

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function lidarColor(range01, intensity = 1) {
  const stops = [
    new THREE.Color('#182dff'),
    new THREE.Color('#00a7ff'),
    new THREE.Color('#00ff8c'),
    new THREE.Color('#d7ff00'),
    new THREE.Color('#ff7a00'),
    new THREE.Color('#ff1e00'),
  ];
  const scaled = THREE.MathUtils.clamp(range01, 0, 1) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  return stops[index].clone().lerp(stops[index + 1], scaled - index).multiplyScalar(intensity);
}

function buildNamePointCloud() {
  const random = seededRandom(0x4c494441);
  const positions = new Float32Array(POINT_COUNT * 3);
  const colors = new Float32Array(POINT_COUNT * 3);
  const sizes = new Float32Array(POINT_COUNT);
  let cursor = 0;

  const writePoint = (source, depth, jitter, intensity, size) => {
    const i3 = cursor * 3;
    const x = source.x + (random() - 0.5) * jitter;
    const z = depth/2 + (random() - 0.5) * jitter * 1.5;
    const uprightY = (source.y - NAME_MIN_Y) * 1.04;
    const y = NAME_BASE_Y + uprightY + (random() - 0.5) * jitter * 0.45;
    const range = Math.hypot(x / 4.5, z / 1.25, (y + 1.6) / 2.2) / 1.55;
    const color = lidarColor(range, intensity);

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    sizes[cursor] = size;
    cursor += 1;
  };

  for (let layer = 0; layer < DEPTH_LAYERS; layer++) {
    const t = DEPTH_LAYERS === 1 ? 0.5 : layer / (DEPTH_LAYERS - 1);
    const depth = THREE.MathUtils.lerp(-0.58, 0.58, t);
    const layerFalloff = 0.58 + t * 0.36;

    for (const point of nameScan.fill) {
      if (random() < 0.32) continue;
      writePoint(point, depth, 0.028, layerFalloff * (0.55 + random() * 0.36), 0.022);
    }
  }

  for (let i = 0; i < nameScan.edge.length * EDGE_REPEAT; i++) {
    const point = nameScan.edge[i % nameScan.edge.length];
    const depth = THREE.MathUtils.lerp(-0.68, 0.68, random());
    writePoint(point, depth, 0.018, 1.25, 0.031);
  }

  return {
    count: cursor,
    positions: positions.slice(0, cursor * 3),
    colors: colors.slice(0, cursor * 3),
    sizes: sizes.slice(0, cursor),
  };
}

function terrainHeight(x, z) {
  const ridge =
    Math.sin(x * 1.15 + z * 0.42) * 0.16 +
    Math.sin(x * 2.7 - z * 0.8) * 0.055 +
    Math.cos(z * 1.65) * 0.09;
  const mound =
    Math.exp(-((x + 2.4) ** 2 + (z - 1.2) ** 2) * 0.18) * 0.5 +
    Math.exp(-((x - 3.1) ** 2 + (z + 2.3) ** 2) * 0.22) * 0.36;

  return -2.05 + ridge + mound;
}

function buildTerrainPointCloud() {
  const random = seededRandom(0x54455252);
  const positions = new Float32Array(TERRAIN_POINT_COUNT * 3);
  const colors = new Float32Array(TERRAIN_POINT_COUNT * 3);
  let cursor = 0;

  for (let row = 0; row < TERRAIN_ROWS; row++) {
    const v = row / (TERRAIN_ROWS - 1);
    if (row % 17 === 0) continue;

    for (let col = 0; col < TERRAIN_COLS; col++) {
      const u = col / (TERRAIN_COLS - 1);
      if (random() < 0.08) continue;

      const x = THREE.MathUtils.lerp(-TERRAIN_HALF_WIDTH, TERRAIN_HALF_WIDTH, u) + (random() - 0.5) * 0.035;
      const z = THREE.MathUtils.lerp(-TERRAIN_HALF_DEPTH, TERRAIN_HALF_DEPTH, v) + (random() - 0.5) * 0.035;
      const y = terrainHeight(x, z) + (random() - 0.5) * 0.025;
      const range = Math.hypot(x / 7, z / 4.8, (y + 2.05) / 1.2) / 1.45;
      const elevationBoost = THREE.MathUtils.clamp((y + 2.25) / 0.9, 0, 1) * 0.2;
      const color = lidarColor(range + elevationBoost, 0.42 + elevationBoost * 1.2);
      const i3 = cursor * 3;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      cursor += 1;
    }
  }

  return {
    count: cursor,
    positions: positions.slice(0, cursor * 3),
    colors: colors.slice(0, cursor * 3),
  };
}

export function IntroAnimation() {
  const sceneRef = useRef();
  const cloudRef = useRef();
  const terrainRef = useRef();
  const cloud = useMemo(() => buildNamePointCloud(), []);
  const terrain = useMemo(() => buildTerrainPointCloud(), []);

  useFrame((state, dt) => {
    const px = state.pointer.x;
    const py = state.pointer.y;
    const damping = 1 - Math.exp(-dt * 4.5);
    if (sceneRef.current) {
      sceneRef.current.rotation.y = THREE.MathUtils.lerp(
        sceneRef.current.rotation.y,
        px * 0.13,
        damping,
      );
      sceneRef.current.rotation.x = THREE.MathUtils.lerp(
        sceneRef.current.rotation.x,
        -py * 0.055,
        damping,
      );
      sceneRef.current.position.x = THREE.MathUtils.lerp(
        sceneRef.current.position.x,
        px * 0.18,
        damping,
      );
      sceneRef.current.position.y = THREE.MathUtils.lerp(
        sceneRef.current.position.y,
        py * 0.085,
        damping,
      );
    }

  });

  return (
    <group ref={sceneRef}>
      <points ref={cloudRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={cloud.positions}
            count={cloud.count}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={cloud.colors}
            count={cloud.count}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.026}
          vertexColors
          transparent
          opacity={0.96}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <points ref={terrainRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={terrain.positions}
            count={terrain.count}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={terrain.colors}
            count={terrain.count}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.021}
          vertexColors
          transparent
          opacity={0.82}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

    </group>
  );
}
