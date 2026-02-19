import * as THREE from 'three'

const PULSAR_VERTEX_SHADER = /* glsl */ `
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const PULSAR_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec3 uCoreColor;
uniform vec3 uJetColor;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vec3 pos = normalize(vPosition);

  // Pulsating core: radial gradient with sin modulation
  float dist = length(vPosition);
  float pulse = 0.5 + 0.5 * sin(uTime * 5.0);
  float coreRadius = 0.35 + pulse * 0.15;
  float coreMask = 1.0 - smoothstep(0.0, coreRadius, dist);
  float coreGlow = exp(-dist * 3.5) * (0.7 + pulse * 0.3);
  vec3 core = uCoreColor * coreGlow;

  // Polar jets: two cones along Y axis
  float yAbs = abs(pos.y);
  float xzDist = length(pos.xz);
  float jetCone = smoothstep(0.25, 0.0, xzDist) * smoothstep(0.5, 0.9, yAbs);
  float jetPulse = 0.5 + 0.5 * sin(uTime * 8.0 - dist * 6.0);
  float jetFade = exp(-dist * 1.5);
  vec3 jets = uJetColor * jetCone * jetPulse * jetFade * 2.5;

  // Accretion disk: ring in XZ plane
  float diskY = abs(pos.y);
  float diskR = length(pos.xz);
  float diskMask = smoothstep(0.0, 0.12, diskY);
  diskMask = 1.0 - diskMask;
  float diskRing = smoothstep(0.3, 0.4, diskR) * smoothstep(0.9, 0.7, diskR);
  float diskSpin = 0.5 + 0.5 * sin(uTime * 3.0 + atan(pos.z, pos.x) * 4.0);
  vec3 disk = mix(uCoreColor, uJetColor, diskSpin) * diskMask * diskRing * 1.5;

  // Combine all layers
  vec3 finalColor = core + jets + disk;

  // Fade at distance
  float alpha = clamp(length(finalColor), 0.0, 1.0);
  alpha = max(alpha, coreMask * (0.5 + pulse * 0.5));

  gl_FragColor = vec4(finalColor, alpha);
}
`

export function createPulsarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uCoreColor: { value: new THREE.Color(0xaaddff) },
      uJetColor: { value: new THREE.Color(0x00ffff) },
    },
    vertexShader: PULSAR_VERTEX_SHADER,
    fragmentShader: PULSAR_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}
