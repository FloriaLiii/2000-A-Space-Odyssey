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

      // Use the mask to control how much of the dashed trail is visible
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

        // Draw trail behind rocket via mask reveal
        const drawLength = this.pathLength * progress;
        this.mask.style.strokeDashoffset = this.pathLength - drawLength;

        // Move rocket along path
        const point = this.mask.getPointAtLength(drawLength);
        const containerRect = this.section.querySelector('.voyage-container').getBoundingClientRect();

        // SVG viewBox is 0-180 x 0-100 mapping to container
        const rocketX = (point.x / 180) * containerRect.width;
        const rocketY = (point.y / 100) * containerRect.height;

        this.rocket.style.left = rocketX + 'px';
        this.rocket.style.top = rocketY + 'px';
        this.rocket.style.transform = 'translate(-50%, -50%)';

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
  // Hobby Gallery Modal (私人星图)
  // ==========================================
  class HobbyGallery {
    constructor() {
      this.modal = document.getElementById('hobbyModal');
      if (!this.modal) return;

      this.backdrop = this.modal.querySelector('.hobby-modal-backdrop');
      this.titleEl = this.modal.querySelector('.hobby-modal-title');
      this.imgEl = this.modal.querySelector('.hobby-modal-img');
      this.dotsEl = this.modal.querySelector('.hobby-modal-dots');
      this.counterEl = this.modal.querySelector('.hobby-modal-counter');
      this.prevBtn = this.modal.querySelector('.arrow-prev');
      this.nextBtn = this.modal.querySelector('.arrow-next');
      this.closeBtn = this.modal.querySelector('.hobby-modal-close');

      this.photos = {};
      this.currentPhotos = [];
      this.currentIndex = 0;

      // 从 photos.json 动态加载照片列表
      fetch('assets/hobbies/photos.json')
        .then(r => r.json())
        .then(data => { this.photos = data; })
        .catch(() => { console.warn('photos.json 未找到，请运行 bash generate-photos.sh'); });

      this.bindEvents();
    }

    bindEvents() {
      // Open modal on planet or card click
      document.querySelectorAll('.hobby-planet, .hobby-card').forEach((el) => {
        el.addEventListener('click', () => {
          const group = el.closest('.hobby-group');
          const planet = group.querySelector('.hobby-planet');
          const hobby = planet.dataset.hobby;
          const title = planet.dataset.title;
          this.open(hobby, title);
        });
      });

      this.closeBtn.addEventListener('click', () => this.close());
      this.backdrop.addEventListener('click', () => this.close());
      this.prevBtn.addEventListener('click', () => this.prev());
      this.nextBtn.addEventListener('click', () => this.next());

      document.addEventListener('keydown', (e) => {
        if (!this.modal.classList.contains('active')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.prev();
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') this.next();
      });
    }

    open(hobby, title) {
      this.currentPhotos = this.photos[hobby] || [];
      this.currentIndex = 0;
      this.titleEl.textContent = title;
      this.renderDots();
      this.showPhoto(false);
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    close() {
      this.modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    prev() {
      if (this.currentPhotos.length <= 1) return;
      this.currentIndex = (this.currentIndex - 1 + this.currentPhotos.length) % this.currentPhotos.length;
      this.showPhoto(true);
    }

    next() {
      if (this.currentPhotos.length <= 1) return;
      this.currentIndex = (this.currentIndex + 1) % this.currentPhotos.length;
      this.showPhoto(true);
    }

    showPhoto(animate) {
      const src = this.currentPhotos[this.currentIndex];
      if (animate) {
        this.imgEl.classList.add('fading');
        setTimeout(() => {
          this.imgEl.src = src;
          this.imgEl.classList.remove('fading');
        }, 200);
      } else {
        this.imgEl.src = src;
      }
      this.counterEl.textContent = `${this.currentIndex + 1} / ${this.currentPhotos.length}`;
      this.updateDots();
    }

    renderDots() {
      this.dotsEl.innerHTML = '';
      this.currentPhotos.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'hobby-modal-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
          this.currentIndex = i;
          this.showPhoto(true);
        });
        this.dotsEl.appendChild(dot);
      });
    }

    updateDots() {
      this.dotsEl.querySelectorAll('.hobby-modal-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === this.currentIndex);
      });
    }
  }

  // ==========================================
  // Hobby Orbits — 动态绘制轨道线穿过星球
  // ==========================================
  function drawHobbyOrbits() {
    const svg = document.getElementById('hobbiesOrbits');
    const section = document.getElementById('hobbies');
    if (!svg || !section) return;

    const sectionRect = section.getBoundingClientRect();
    const w = sectionRect.width;
    const h = sectionRect.height;

    // 用 getBoundingClientRect 获取视觉位置（受 CSS transform 影响，精确对齐）
    function getCenterInSection(el) {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - sectionRect.left,
        y: rect.top + rect.height / 2 - sectionRect.top
      };
    }

    // 大星球中心
    const bigPlanet = section.querySelector('.hobbies-big-planet');
    const bp = getCenterInSection(bigPlanet);

    // 获取每颗小星球图片中心坐标（用 getBoundingClientRect 精确对齐视觉位置）
    const planets = {};
    section.querySelectorAll('.hobby-planet-img').forEach(img => {
      const hobby = img.closest('.hobby-planet').dataset.hobby;
      planets[hobby] = getCenterInSection(img);
    });

    const green = planets.photography;  // 上方
    const red = planets.travel;         // 左下
    const blue = planets.sports;        // 右下

    // PPT 原版用大圆弧，圆心在左侧屏幕外
    // 策略：固定圆心 x = 大星球视觉中心 x，由绿色和红色两点的垂直平分线求 cy
    const bpCx = bp.x;

    // 垂直平分线经过 green 和 red 的中点，方向垂直于 green→red
    // 参数化：给定 cx，求 cy 使圆同时经过 green 和 red
    // cy = midY + (midX - cx) * dx / dy
    const midX = (green.x + red.x) / 2;
    const midY = (green.y + red.y) / 2;
    const dx = red.x - green.x;
    const dy = red.y - green.y;

    const innerCx = bpCx + w * 0.1;
    const innerCy = midY + (midX - innerCx) * dx / dy;
    const innerR = Math.sqrt((green.x - innerCx) * (green.x - innerCx) + (green.y - innerCy) * (green.y - innerCy));

    // 外圆：经过蓝色星球，圆心 x 在内圆右边一点（仿 PPT 比例）
    const outerCx = innerCx + w * 0.12;
    const outerCy = innerCy;
    const outerR = Math.sqrt((blue.x - outerCx) * (blue.x - outerCx) + (blue.y - outerCy) * (blue.y - outerCy));

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <circle cx="${innerCx}" cy="${innerCy}" r="${innerR}" />
      <circle cx="${outerCx}" cy="${outerCy}" r="${outerR}" />
    `;
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

    // Hobby gallery modal
    new HobbyGallery();

    // Draw hobby orbits — 等入场动画完成后再绘制，避免跳动
    window.addEventListener('load', () => {
      const hobbiesSection = document.getElementById('hobbies');
      const orbitsSvg = document.getElementById('hobbiesOrbits');
      if (hobbiesSection && orbitsSvg) {
        // 初始隐藏，避免动画期间闪跳
        orbitsSvg.style.opacity = '0';
        orbitsSvg.style.transition = 'opacity 0.5s ease';
        let drawn = false;
        new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            // 等 anim-scale-in transition (0.8s) 完成后再绘制
            setTimeout(() => {
              drawHobbyOrbits();
              orbitsSvg.style.opacity = '1';
              drawn = true;
            }, 900);
          }
        }, { threshold: 0.1 }).observe(hobbiesSection);
      }
    });
    window.addEventListener('resize', drawHobbyOrbits);

    // 鼠标尾焰轨迹
    let lastTrailTime = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastTrailTime < 30) return; // 控制粒子密度
      lastTrailTime = now;

      const dot = document.createElement('div');
      dot.className = 'cursor-trail';
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
      document.body.appendChild(dot);

      setTimeout(() => dot.remove(), 600);
    });
  });
})();
