/* ============================================
   黎康珏的探索之旅 - Main JavaScript
   粒子系统 + 星座连线 + 滚动动画
   ============================================ */

(function () {
  'use strict';

  // ==========================================
  // Particle System (复刻 PPT 的星空粒子效果)
  // ==========================================
  class ParticleSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.mouse = { x: -1000, y: -1000 };
      this.connectionDistance = 120;
      this.particleCount = this.getParticleCount();
      this.rafId = null;

      this.resize();
      this.init();
      this.bindEvents();
      this.animate();
    }

    getParticleCount() {
      const w = window.innerWidth;
      if (w < 640) return 60;
      if (w < 1024) return 100;
      return 160;
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    init() {
      this.particles = [];
      for (let i = 0; i < this.particleCount; i++) {
        this.particles.push(this.createParticle());
      }
    }

    createParticle() {
      // Colors matching PPT palette
      const colors = [
        'rgba(204, 164, 174,',  // rose
        'rgba(118, 70, 92,',    // primary
        'rgba(243, 112, 67,',   // accent
        'rgba(250, 154, 30,',   // gold
        'rgba(156, 107, 128,',  // primary-light
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const baseOpacity = 0.15 + Math.random() * 0.45;

      return {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 0.5,
        color: color,
        baseOpacity: baseOpacity,
        opacity: baseOpacity,
        // Twinkle
        twinkleSpeed: 0.005 + Math.random() * 0.015,
        twinklePhase: Math.random() * Math.PI * 2,
      };
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.resize();
        this.particleCount = this.getParticleCount();
        // Adjust particle count
        while (this.particles.length < this.particleCount) {
          this.particles.push(this.createParticle());
        }
        while (this.particles.length > this.particleCount) {
          this.particles.pop();
        }
      });

      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });

      window.addEventListener('mouseout', () => {
        this.mouse.x = -1000;
        this.mouse.y = -1000;
      });
    }

    update() {
      for (const p of this.particles) {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = this.canvas.width + 10;
        if (p.x > this.canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = this.canvas.height + 10;
        if (p.y > this.canvas.height + 10) p.y = -10;

        // Twinkle
        p.twinklePhase += p.twinkleSpeed;
        p.opacity = p.baseOpacity * (0.5 + 0.5 * Math.sin(p.twinklePhase));

        // Mouse repel
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150 * 0.02;
          p.vx += dx * force;
          p.vy += dy * force;
        }

        // Dampen velocity
        p.vx *= 0.99;
        p.vy *= 0.99;
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw connections (constellation lines)
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a = this.particles[i];
          const b = this.particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < this.connectionDistance) {
            const opacity = (1 - dist / this.connectionDistance) * 0.15;
            this.ctx.strokeStyle = `rgba(118, 70, 92, ${opacity})`;
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(a.x, a.y);
            this.ctx.lineTo(b.x, b.y);
            this.ctx.stroke();
          }
        }
      }

      // Mouse connections
      for (const p of this.particles) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const opacity = (1 - dist / 200) * 0.25;
          this.ctx.strokeStyle = `rgba(243, 112, 67, ${opacity})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.stroke();
        }
      }

      // Draw particles
      for (const p of this.particles) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color + p.opacity + ')';
        this.ctx.fill();

        // Glow for larger particles
        if (p.radius > 1.5) {
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
          this.ctx.fillStyle = p.color + (p.opacity * 0.1) + ')';
          this.ctx.fill();
        }
      }
    }

    animate() {
      this.update();
      this.draw();
      this.rafId = requestAnimationFrame(() => this.animate());
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
