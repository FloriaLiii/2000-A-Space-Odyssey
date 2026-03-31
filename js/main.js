/* ============================================
   黎康珏的探索之旅 - Main JavaScript
   粒子系统 + 星座连线 + 滚动动画
   ============================================ */

(function () {
  'use strict';

  // ==========================================
  // Starfield System (PPT 繁星闪烁效果)
  // Static white dots that twinkle — appear & disappear
  // ==========================================
  class ParticleSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.stars = [];
      this.starCount = this.getStarCount();

      this.resize();
      this.init();
      this.bindEvents();
      this.animate();
    }

    getStarCount() {
      const w = window.innerWidth;
      if (w < 640) return 120;
      if (w < 1024) return 220;
      return 360;
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    init() {
      this.stars = [];
      for (let i = 0; i < this.starCount; i++) {
        this.stars.push(this.createStar());
      }
    }

    createStar() {
      // Most stars are white/light grey, a few slightly warm
      const brightness = 180 + Math.floor(Math.random() * 75); // 180–255
      const warmth = Math.random() < 0.15 ? Math.floor(Math.random() * 30) : 0;
      const r = Math.min(255, brightness + warmth);
      const g = Math.min(255, brightness);
      const b = Math.min(255, brightness + Math.floor(warmth * 0.3));

      return {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: 0.8 + Math.random() * 2, // 0.8–2.8px
        r, g, b,
        twinkleSpeed: 0.006 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        maxOpacity: 0.5 + Math.random() * 0.5, // brighter: 0.5–1.0
      };
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.resize();
        this.starCount = this.getStarCount();
        while (this.stars.length < this.starCount) this.stars.push(this.createStar());
        while (this.stars.length > this.starCount) this.stars.pop();
      });
    }

    update() {
      for (const s of this.stars) {
        s.phase += s.twinkleSpeed;
        // Smooth twinkle: stars fade between dim and bright, never fully off
        const raw = Math.sin(s.phase);
        s.opacity = (0.15 + 0.85 * Math.max(0, raw)) * s.maxOpacity;
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (const s of this.stars) {
        if (s.opacity < 0.02) continue; // skip invisible stars

        // Soft glow for brighter stars
        if (s.opacity > 0.3 && s.radius > 1) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${s.opacity * 0.08})`;
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${s.opacity})`;
        ctx.fill();
      }
    }

    animate() {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.animate());
    }
  }

  // ==========================================
  // Voyage (航行日志) Rocket Animation
  // ==========================================
  class VoyageAnimator {
    constructor(section) {
      this.section = section;
      this.trail = section.querySelector('#voyageTrail');
      this.mask = section.querySelector('#voyageTrailMask');
      this.rocket = section.querySelector('#voyageRocket');
      this.nodes = section.querySelectorAll('.voyage-node');

      if (!this.trail || !this.rocket || !this.mask) return;

      // Use the mask path for drawing animation
      this.pathLength = this.mask.getTotalLength();
      this.mask.style.strokeDasharray = this.pathLength;
      this.mask.style.strokeDashoffset = this.pathLength;

      // Node trigger points (fraction of total path length)
      this.triggers = [];
      this.nodes.forEach((node) => {
        this.triggers.push(parseFloat(node.getAttribute('data-trigger') || 0.5));
      });
      this.revealed = new Set();

      this.startAnimation();
    }

    startAnimation() {
      const duration = 4000; // 4 seconds total flight
      const start = performance.now();
      this.rocket.classList.add('flying');

      const animate = (now) => {
        const elapsed = now - start;
        const rawProgress = Math.min(elapsed / duration, 1);
        // Ease in-out
        const progress = rawProgress < 0.5
          ? 2 * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

        // Draw trail behind rocket via mask
        const drawLength = this.pathLength * progress;
        this.mask.style.strokeDashoffset = this.pathLength - drawLength;

        // Move rocket along path (fixed direction, no rotation)
        const point = this.mask.getPointAtLength(drawLength);
        const containerRect = this.section.querySelector('.voyage-container').getBoundingClientRect();

        // SVG viewBox is 0-180 x 0-100 mapping to container
        const rocketX = (point.x / 180) * containerRect.width;
        const rocketY = (point.y / 100) * containerRect.height;

        this.rocket.style.left = rocketX + 'px';
        this.rocket.style.top = rocketY + 'px';

        // Reveal planets when rocket passes their trigger point
        this.triggers.forEach((trigger, i) => {
          if (progress >= trigger && !this.revealed.has(i)) {
            this.revealed.add(i);
            this.nodes[i].classList.add('revealed');
          }
        });

        if (rawProgress < 1) {
          requestAnimationFrame(animate);
        }
        // Rocket stays visible at the end position (top-right)
      };

      // Small delay before launch
      setTimeout(() => {
        requestAnimationFrame(animate);
      }, 300);
    }
  }

  // ==========================================
  // Scroll-based Animations
  // ==========================================
  class ScrollAnimator {
    constructor() {
      this.sections = document.querySelectorAll('.section');
      this.navDots = document.querySelectorAll('.nav-dot');
      this.progressBar = document.getElementById('progressBar');
      this.animElements = document.querySelectorAll(
        '.anim-fade-up, .anim-wipe-in, .anim-scale-in, .anim-fade-left, .anim-fade-right'
      );
      this.skillFills = document.querySelectorAll('.skill-fill');
      this.statNumbers = document.querySelectorAll('.stat-number');
      this.animated = new Set();

      this.setupObserver();
      this.setupScrollListener();
      this.setupNavigation();

      // Trigger landing animations immediately
      setTimeout(() => {
        document.querySelectorAll('.section-landing .anim-fade-up').forEach((el) => {
          el.classList.add('visible');
        });
      }, 300);
    }

    setupObserver() {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Animate child elements
              const animChildren = entry.target.querySelectorAll(
                '.anim-fade-up, .anim-wipe-in, .anim-scale-in, .anim-fade-left, .anim-fade-right'
              );
              animChildren.forEach((el) => {
                el.classList.add('visible');
              });

              // Animate skill bars
              const fills = entry.target.querySelectorAll('.skill-fill');
              fills.forEach((fill) => {
                const width = fill.getAttribute('data-width');
                fill.style.width = width + '%';
              });

              // Animate stat numbers
              if (!this.animated.has(entry.target.id)) {
                const stats = entry.target.querySelectorAll('.stat-number');
                stats.forEach((stat) => {
                  this.animateNumber(stat);
                });
                if (stats.length) this.animated.add(entry.target.id);
              }

              // Trigger voyage animation
              if (entry.target.classList.contains('section-voyage') && !this.animated.has('voyage')) {
                this.animated.add('voyage');
                entry.target.classList.add('in-view');
                new VoyageAnimator(entry.target);
              }
            }
          });
        },
        { threshold: 0.2 }
      );

      this.sections.forEach((section) => observer.observe(section));
    }

    animateNumber(el) {
      const target = parseFloat(el.getAttribute('data-count'));
      const isFloat = target % 1 !== 0;
      const duration = 1500;
      const start = performance.now();

      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;

        el.textContent = isFloat ? current.toFixed(1) : Math.floor(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = isFloat ? target.toFixed(1) : target;
        }
      };

      requestAnimationFrame(step);
    }

    setupScrollListener() {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            this.updateProgress();
            this.updateActiveNav();
            ticking = false;
          });
          ticking = true;
        }
      });
    }

    updateProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      this.progressBar.style.width = progress + '%';
    }

    updateActiveNav() {
      let currentIndex = 0;
      const scrollY = window.scrollY + window.innerHeight / 2;

      this.sections.forEach((section, i) => {
        if (scrollY >= section.offsetTop) {
          currentIndex = i;
        }
      });

      this.navDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });
    }

    setupNavigation() {
      this.navDots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.querySelector(dot.getAttribute('href'));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    }
  }

  // ==========================================
  // Initialize
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    // Particle system
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
      new ParticleSystem(canvas);
    }

    // Scroll animations
    new ScrollAnimator();
  });
})();
