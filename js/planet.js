/* ============================================
   Low-Poly 3D Planet — Canvas Renderer
   Matches PPT Slide 1's rotating globe effect:
   - Icosphere with colored triangular faces
   - Wireframe overlay + vertex dots
   - Single orbital ring with front/back depth
   - Small red triangles on surface
   ============================================ */

(function () {
  'use strict';

  class LowPolyPlanet {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.rotation = 0;
      this.rotationSpeed = 0.003;
      this.tiltX = 0.28; // slight tilt for 3D perspective

      this.resize();
      this.buildGeometry();
      this.animate();
      this.bindEvents();
    }

    resize() {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.min(rect.width, rect.height);

      this.size = size;
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.canvas.style.width = size + 'px';
      this.canvas.style.height = size + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.cx = size / 2;
      this.cy = size / 2;
      this.R = size * 0.34;       // sphere face radius
      this.wireR = size * 0.38;   // wireframe radius — slightly larger than faces (PPT style)
    }

    /* ---- Geometry: Icosphere (1x subdivided icosahedron = 80 faces, 42 verts) ---- */
    buildGeometry() {
      const t = (1 + Math.sqrt(5)) / 2;
      const raw = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
      ];

      this.verts = raw.map(v => {
        const l = Math.hypot(v[0], v[1], v[2]);
        return [v[0] / l, v[1] / l, v[2] / l];
      });

      this.faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
      ];

      // Subdivide once → 80 faces, 42 vertices
      this.subdivide();

      // Assign persistent colors to each face
      this.faceColors = this.faces.map((f, i) => this.pickFaceColor(f, i));
    }

    subdivide() {
      const cache = {};
      const mid = (a, b) => {
        const key = Math.min(a, b) + ':' + Math.max(a, b);
        if (cache[key] != null) return cache[key];
        const va = this.verts[a], vb = this.verts[b];
        const m = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2];
        const l = Math.hypot(m[0], m[1], m[2]);
        this.verts.push([m[0] / l, m[1] / l, m[2] / l]);
        return (cache[key] = this.verts.length - 1);
      };

      const nf = [];
      for (const [a, b, c] of this.faces) {
        const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
        nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      this.faces = nf;
    }

    /* ---- Color assignment: PPT-matching dark blue / purple / rose palette ---- */
    pickFaceColor(f, seed) {
      const v0 = this.verts[f[0]], v1 = this.verts[f[1]], v2 = this.verts[f[2]];
      const cx = (v0[0] + v1[0] + v2[0]) / 3;
      const cy = (v0[1] + v1[1] + v2[1]) / 3;
      const cz = (v0[2] + v1[2] + v2[2]) / 3;

      // Pseudo-random noise from seed
      const n = (Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1;
      const noise = n < 0 ? n + 1 : n;

      const angle = Math.atan2(cz, cx);
      const height = (cy + 1) / 2; // 0..1

      // PPT palette — dark navy, deep purple, rose/crimson, violet
      // More rose/pink entries to match PPT's prominent warm areas
      const palette = [
        [20, 22, 55],     // dark navy
        [32, 24, 60],     // deep purple-blue
        [70, 35, 65],     // medium purple
        [140, 55, 78],    // rose-crimson (brighter)
        [25, 28, 65],     // blue-purple
        [55, 30, 58],     // purple
        [160, 70, 90],    // bright rose (more prominent)
        [18, 16, 42],     // very dark
        [110, 50, 70],    // warm rose
        [42, 32, 72],     // violet
        [180, 85, 105],   // hot pink (PPT upper-right area)
        [95, 40, 62],     // dusty rose
      ];

      // Select two colors from palette based on position + noise, then blend
      const idx = Math.floor((angle / Math.PI + 1) * 2.5 + height * 2 + noise * 2.5) % palette.length;
      const idx2 = (idx + 1 + Math.floor(noise * 3)) % palette.length;
      const blend = noise;

      const c1 = palette[idx], c2 = palette[idx2];
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * blend),
        Math.round(c1[1] + (c2[1] - c1[1]) * blend),
        Math.round(c1[2] + (c2[2] - c1[2]) * blend),
      ];
    }

    /* ---- 3D Transform: Y-rotation + X-tilt, optional radius override ---- */
    xform(v, radius) {
      const r = radius || this.R;
      const cr = Math.cos(this.rotation), sr = Math.sin(this.rotation);
      const x = v[0] * cr - v[2] * sr;
      const z = v[0] * sr + v[2] * cr;

      const ct = Math.cos(this.tiltX), st = Math.sin(this.tiltX);
      const y2 = v[1] * ct - z * st;
      const z2 = v[1] * st + z * ct;

      return {
        px: this.cx + x * r,
        py: this.cy - y2 * r,
        z: z2
      };
    }

    /* ---- Main Draw ---- */
    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.size, this.size);

      // Project vertices at face radius AND wireframe radius
      const proj = this.verts.map(v => this.xform(v));
      const wireProj = this.verts.map(v => this.xform(v, this.wireR));

      // Build face data with depth
      const renderList = this.faces.map((f, i) => {
        const p0 = proj[f[0]], p1 = proj[f[1]], p2 = proj[f[2]];
        return {
          f, i,
          p: [p0, p1, p2],
          depth: (p0.z + p1.z + p2.z) / 3
        };
      });

      // Painter's algorithm: back-to-front
      renderList.sort((a, b) => a.depth - b.depth);

      // 1) Draw BACK half of orbit ring (behind the sphere)
      this.drawOrbitRing(ctx, false);

      // 2) Draw sphere faces
      for (const { p, i, depth } of renderList) {
        const [cr, cg, cb] = this.faceColors[i];
        // Lighting: brighter on front-facing side
        const light = Math.max(0.25, 0.5 + depth * 0.55);
        const r = Math.min(255, Math.round(cr * light));
        const g = Math.min(255, Math.round(cg * light));
        const b = Math.min(255, Math.round(cb * light));

        ctx.beginPath();
        ctx.moveTo(p[0].px, p[0].py);
        ctx.lineTo(p[1].px, p[1].py);
        ctx.lineTo(p[2].px, p[2].py);
        ctx.closePath();

        // Fill + thin same-color stroke to eliminate sub-pixel gaps
        const color = `rgb(${r},${g},${b})`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.fill();
        ctx.stroke();
      }

      // 3) Wireframe overlay — uses wireProj (larger radius), thicker lines, more visible at edges
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      for (const { f, depth } of renderList) {
        if (depth < -0.35) continue; // show more of the edge/silhouette wireframe
        const alpha = Math.max(0, Math.min(0.7, (depth + 0.4) * 0.65));
        ctx.strokeStyle = `rgba(220, 215, 240, ${alpha})`;
        const wp = f.map(vi => wireProj[vi]);
        ctx.beginPath();
        ctx.moveTo(wp[0].px, wp[0].py);
        ctx.lineTo(wp[1].px, wp[1].py);
        ctx.lineTo(wp[2].px, wp[2].py);
        ctx.closePath();
        ctx.stroke();
      }

      // 4) Vertex dots — larger and brighter to match PPT
      const drawnVerts = new Set();
      for (const { f, depth } of renderList) {
        if (depth < -0.35) continue;
        for (const vi of f) {
          if (drawnVerts.has(vi)) continue;
          drawnVerts.add(vi);
          const p = wireProj[vi]; // use wireframe radius for dots too
          if (p.z < -0.35) continue;

          const a = Math.max(0, Math.min(1, (p.z + 0.4) * 0.75));
          const dotR = 3 + p.z * 3;

          // Outer glow (bigger)
          ctx.beginPath();
          ctx.arc(p.px, p.py, dotR * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 210, 235, ${a * 0.15})`;
          ctx.fill();

          // Mid glow
          ctx.beginPath();
          ctx.arc(p.px, p.py, dotR * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(225, 220, 245, ${a * 0.25})`;
          ctx.fill();

          // Core dot (bright, larger)
          ctx.beginPath();
          ctx.arc(p.px, p.py, Math.max(dotR, 2.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245, 240, 255, ${a * 0.9})`;
          ctx.fill();
        }
      }

      // 5) Small red triangles on sphere surface (PPT detail)
      const triVerts = [5, 14, 23, 31, 38];
      for (const vi of triVerts) {
        if (vi >= proj.length) continue;
        const p = proj[vi];
        if (p.z < 0.15) continue;
        const a = Math.min(0.75, (p.z - 0.15) * 1.5);
        const sz = 5 + p.z * 5;

        ctx.save();
        ctx.translate(p.px, p.py);
        ctx.rotate(this.rotation * 2 + vi * 1.3);
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.lineTo(-sz * 0.58, sz * 0.5);
        ctx.lineTo(sz * 0.58, sz * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(195, 50, 60, ${a})`;
        ctx.fill();
        ctx.restore();
      }

      // 6) Draw FRONT half of orbit ring (in front of sphere)
      this.drawOrbitRing(ctx, true);
    }

    /* ---- Orbit Ring: single pink/rose ellipse with front/back depth ---- */
    drawOrbitRing(ctx, frontHalf) {
      const ringR = this.R * 1.35;
      const tilt = 0.36;
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const segments = 240;

      ctx.lineWidth = 2.2; // thicker ring like PPT
      ctx.lineCap = 'round';
      ctx.beginPath();
      let started = false;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * ringR;
        const z = Math.sin(angle) * ringR;
        const y = -z * sinT;
        const zDepth = z * cosT;

        const isFront = zDepth >= 0;
        if (isFront !== frontHalf) {
          if (started) {
            ctx.stroke();
            ctx.beginPath();
            started = false;
          }
          continue;
        }

        const px = this.cx + x;
        const py = this.cy + y;

        // More visible opacity to match PPT
        const depthFactor = Math.abs(zDepth) / ringR;
        const alpha = frontHalf
          ? 0.45 + depthFactor * 0.3
          : 0.18 + depthFactor * 0.2;
        ctx.strokeStyle = `rgba(220, 180, 195, ${alpha})`;

        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }

      if (started) ctx.stroke();
    }

    /* ---- Animation Loop ---- */
    animate() {
      this.rotation += this.rotationSpeed;
      this.draw();
      requestAnimationFrame(() => this.animate());
    }

    bindEvents() {
      let timer;
      window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.resize(), 200);
      });
    }
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('constellation-canvas');
    if (canvas) new LowPolyPlanet(canvas);
  });
})();
