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
    constructor(canvas, { container } = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.container = container || null;
      this.stars = [];
      this.starCount = this.getStarCount();

      this.resize();
      this.init();
      this.bindEvents();
      this.animate();
    }

    getStarCount() {
      const w = this.container ? this.container.offsetWidth : window.innerWidth;
      if (w < 640) return 120;
      if (w < 1024) return 220;
      return 360;
    }

    resize() {
      if (this.container) {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
      } else {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
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

              // Trigger contact triangles entrance
              if (entry.target.classList.contains('section-contact') && !this.animated.has('contact')) {
                this.animated.add('contact');
                entry.target.classList.add('in-view');
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

      // 更新小宇航员位置
      this.updateAstronautPosition(currentIndex);
    }

    updateAstronautPosition(activeIndex) {
      const astronaut = document.getElementById('navAstronaut');
      const activeDot = this.navDots[activeIndex];
      if (!astronaut || !activeDot) return;

      const nav = document.getElementById('sideNav');
      const navRect = nav.getBoundingClientRect();
      const dotRect = activeDot.getBoundingClientRect();
      const offsetTop = dotRect.top - navRect.top + dotRect.height / 2 - 23;
      astronaut.style.top = offsetTop + 'px';
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
    // Particle system — hero
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
      new ParticleSystem(canvas);
    }

    // Particle system — contact section
    const contactCanvas = document.getElementById('contact-stars-canvas');
    if (contactCanvas) {
      new ParticleSystem(contactCanvas, { container: contactCanvas.parentElement });
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

    // ==========================================
    // GIS Mission Control Dashboard
    // Leaflet + 高德免费瓦片 (无需 Key)
    // ==========================================
    (function initGisDashboard() {
      var viewport = document.getElementById('gisMapViewport');
      if (!viewport) return;

      var mapContainer = document.getElementById('gisAmapContainer');
      var regionsEl = document.getElementById('gisRegions');
      var markersEl = document.getElementById('gisMarkers');
      var perfOverlay = document.getElementById('gisPerfOverlay');
      var perfMarkers = document.getElementById('gisPerfMarkers');
      var perfFps = document.getElementById('gisPerfFps');
      var perfTiles = document.getElementById('gisPerfTiles');
      var missionBtns = document.querySelectorAll('.gis-mission-btn');
      var svgRegions = regionsEl.querySelectorAll('.gis-region');

      // Leaflet 地图实例
      var map = null;
      var mapReady = false;
      var overlayGroup = null; // 用于清理覆盖物

      // 高德免费瓦片地址 (style=7 标准路网)
      var TILE_URL = 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7';
      // 高德卫星瓦片 (style=6)
      var SAT_URL = 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=6';

      // 深圳中心 (Leaflet 用 [lat, lng])
      var SZ_CENTER = [22.55, 114.06];

      // 派工区划多边形坐标 (Leaflet: [lat, lng])
      var REGION_PATHS = [
        [[22.55, 113.92], [22.58, 113.95], [22.57, 113.99], [22.53, 113.98], [22.52, 113.94]],
        [[22.56, 114.02], [22.59, 114.06], [22.57, 114.10], [22.53, 114.08], [22.53, 114.03]],
        [[22.56, 114.10], [22.58, 114.14], [22.55, 114.17], [22.52, 114.15], [22.53, 114.11]],
        [[22.58, 113.86], [22.62, 113.90], [22.60, 113.94], [22.56, 113.93], [22.55, 113.88]],
        [[22.62, 114.00], [22.65, 114.05], [22.63, 114.09], [22.59, 114.07], [22.60, 114.02]]
      ];

      // 业务标记点坐标 [lat, lng, type]
      // type: survey=查勘, car=车定损, person=人定损, property=物定损
      var MARKER_TYPES = ['survey', 'car', 'person', 'property'];
      var MARKER_POINTS = [
        [22.555, 113.93, 'survey'],   [22.565, 113.96, 'car'],      [22.545, 113.95, 'person'],
        [22.57, 114.04, 'property'],  [22.555, 114.07, 'survey'],   [22.545, 114.06, 'car'],
        [22.565, 114.12, 'person'],   [22.555, 114.14, 'property'], [22.535, 114.13, 'survey'],
        [22.59, 113.88, 'car'],       [22.595, 113.91, 'person'],   [22.575, 113.90, 'property'],
        [22.635, 114.03, 'survey'],   [22.625, 114.06, 'car'],      [22.615, 114.05, 'person']
      ];

      // 图层堆叠（fusion 阶段）
      var layerStack = document.createElement('div');
      layerStack.className = 'gis-layer-stack gis-overlay';
      layerStack.innerHTML =
        '<div class="gis-layer l-base">四维地图</div>' +
        '<div class="gis-layer l-road">高德瓦片地图</div>' +
        '<div class="gis-layer l-data">业务数据层</div>';
      viewport.appendChild(layerStack);

      // 回退用瓦片网格
      var tilesEl = null;
      var tiles = [];

      function createFallbackTiles() {
        tilesEl = document.createElement('div');
        tilesEl.className = 'gis-tiles-fallback';
        for (var i = 0; i < 48; i++) {
          var tile = document.createElement('div');
          tile.className = 'gis-tile';
          tilesEl.appendChild(tile);
        }
        viewport.insertBefore(tilesEl, viewport.firstChild);
        tiles = tilesEl.querySelectorAll('.gis-tile');
      }

      // ---- 初始化 Leaflet 地图 ----
      function initMap() {
        if (typeof L === 'undefined') {
          console.warn('[GIS] Leaflet 未加载，使用回退模式');
          createFallbackTiles();
          return;
        }

        try {
          map = L.map(mapContainer, {
            center: SZ_CENTER,
            zoom: 11,
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            boxZoom: false,
            keyboard: false
          });

          L.tileLayer(TILE_URL, {
            subdomains: '1234',
            maxZoom: 18,
            detectRetina: true
          }).addTo(map);

          overlayGroup = L.layerGroup().addTo(map);

          map.whenReady(function () {
            mapReady = true;
            mapContainer.classList.add('map-ready');
            // 真实地图就绪，隐藏 SVG 回退
            regionsEl.style.display = 'none';
          });

          // 超时回退
          setTimeout(function () {
            if (!mapReady) {
              console.warn('[GIS] 地图加载超时，使用回退模式');
              map.remove();
              map = null;
              createFallbackTiles();
              regionsEl.style.display = '';
            }
          }, 5000);

        } catch (e) {
          console.warn('[GIS] 地图初始化失败:', e.message);
          createFallbackTiles();
        }
      }

      initMap();

      // ---- 地图覆盖物操作 ----
      function clearMapOverlays() {
        if (overlayGroup) overlayGroup.clearLayers();
        // 移除临时图层（卫星/路网）
        if (map && map._extraLayers) {
          map._extraLayers.forEach(function (l) { map.removeLayer(l); });
          map._extraLayers = [];
        }
      }

      function addPolygon(path, delay, opts) {
        if (!mapReady) return;
        var defaults = {
          color: '#f37979',
          weight: 2,
          opacity: 0.7,
          fillColor: '#f37979',
          fillOpacity: 0.12,
          dashArray: null
        };
        var o = Object.assign({}, defaults, opts);
        animTimeout.push(setTimeout(function () {
          var poly = L.polygon(path, {
            color: o.color,
            weight: o.weight,
            opacity: o.opacity,
            fillColor: o.fillColor,
            fillOpacity: o.fillOpacity,
            dashArray: o.dashArray
          });
          overlayGroup.addLayer(poly);
        }, delay));
      }

      // Leaflet 图标颜色映射
      var LF_MARKER_CLASSES = {
        survey: 'gis-lf-marker gis-lf-survey',
        car: 'gis-lf-marker gis-lf-car',
        person: 'gis-lf-marker gis-lf-person',
        property: 'gis-lf-marker gis-lf-property'
      };

      function addTypedMarker(latlng, delay, type) {
        if (!mapReady) return;
        var markerType = type || MARKER_TYPES[Math.floor(Math.random() * 4)];
        animTimeout.push(setTimeout(function () {
          var icon = L.divIcon({
            className: LF_MARKER_CLASSES[markerType],
            iconSize: [10, 10],
            iconAnchor: [5, 5]
          });
          var marker = L.marker(latlng, { icon: icon, interactive: false });
          overlayGroup.addLayer(marker);
        }, delay));
      }

      // ---- 动画控制 ----
      var currentPhase = 'migrate';
      var animTimeout = [];

      function clearAnimations() {
        animTimeout.forEach(function (t) { clearTimeout(t); });
        animTimeout = [];
        clearMapOverlays();
        // CSS 回退
        if (tiles.length) tiles.forEach(function (t) { t.classList.remove('loaded', 'highlight'); });
        svgRegions.forEach(function (r) { r.classList.remove('drawn', 'filled'); });
        markersEl.innerHTML = '';
        if (tilesEl) tilesEl.classList.remove('active');
        perfOverlay.classList.remove('active');
        layerStack.classList.remove('active');
        perfMarkers.textContent = '0';
        perfTiles.textContent = '0';
        perfFps.textContent = '60';
        // 清理 migrate 绘制交互
        if (map && map._migrateCleanup) {
          map._migrateCleanup();
          map._migrateCleanup = null;
        }
        // 清理 SDK 裁切交互
        if (map && map._sdkCleanup) {
          map._sdkCleanup();
          map._sdkCleanup = null;
        }
        // 重置地图视角 + 恢复可见性
        if (mapReady && map) {
          mapContainer.classList.add('map-ready');
          map.dragging.enable();
          map.setView(SZ_CENTER, 11, { animate: true });
        }
      }

      function runPhase(phase) {
        clearAnimations();

        if (phase === 'migrate') {
          if (mapReady) {
            REGION_PATHS.forEach(function (path, i) {
              addPolygon(path, 200 + i * 350, { opacity: 0.8 });
            });
            MARKER_POINTS.forEach(function (pt, i) {
              addTypedMarker([pt[0], pt[1]], 1200 + i * 80, pt[2]);
            });

            // 绘制多边形工具栏
            var mToolbar = document.createElement('div');
            mToolbar.className = 'gis-sdk-toolbar';
            mToolbar.innerHTML =
              '<div class="gis-sdk-row">' +
                '<button class="gis-sdk-btn" data-tool="draw">&#9998; 绘制</button>' +
              '</div>' +
              '<div class="gis-sdk-row gis-sdk-actions" style="display:none">' +
                '<button class="gis-sdk-btn gis-sdk-confirm" data-tool="confirm">&#10003; 确认</button>' +
                '<button class="gis-sdk-btn" data-tool="cancel">&#10005; 取消</button>' +
              '</div>';
            viewport.appendChild(mToolbar);
            var mActionsRow = mToolbar.querySelector('.gis-sdk-actions');

            var drawMode = false;
            var drawPoints = [];
            var drawMarkers = [];
            var drawPolyline = null;
            var drawPolygonLayer = null;
            var mHint = document.createElement('div');
            mHint.className = 'gis-split-hint gis-overlay';
            mHint.textContent = '选择工具开始操作';
            viewport.appendChild(mHint);

            function drawPreview() {
              if (drawPolyline) { overlayGroup.removeLayer(drawPolyline); drawPolyline = null; }
              if (drawPolygonLayer) { overlayGroup.removeLayer(drawPolygonLayer); drawPolygonLayer = null; }
              if (drawPoints.length >= 2) {
                var pts = drawPoints.slice();
                if (drawPoints.length >= 3) {
                  // 显示闭合多边形预览
                  drawPolygonLayer = L.polygon(pts, {
                    color: '#f37979', weight: 2.5,
                    fillColor: '#f37979', fillOpacity: 0.15,
                    dashArray: '6 4', interactive: false
                  });
                  overlayGroup.addLayer(drawPolygonLayer);
                } else {
                  drawPolyline = L.polyline(pts, {
                    color: '#f37979', weight: 2, dashArray: '6 4', interactive: false
                  });
                  overlayGroup.addLayer(drawPolyline);
                }
              }
            }

            function clearDraw() {
              drawPoints = [];
              drawMarkers.forEach(function (m) { overlayGroup.removeLayer(m); });
              drawMarkers = [];
              if (drawPolyline) { overlayGroup.removeLayer(drawPolyline); drawPolyline = null; }
              if (drawPolygonLayer) { overlayGroup.removeLayer(drawPolygonLayer); drawPolygonLayer = null; }
            }

            function exitDrawMode() {
              drawMode = false;
              map.off('click', onDrawClick);
              mActionsRow.style.display = 'none';
              mToolbar.querySelector('[data-tool="draw"]').classList.remove('active');
            }

            function onDrawClick(e) {
              if (!drawMode) return;
              var latlng = [e.latlng.lat, e.latlng.lng];
              drawPoints.push(latlng);
              var dot = L.circleMarker(latlng, {
                radius: 4, color: '#f37979', fillColor: '#fff',
                fillOpacity: 1, weight: 2, interactive: false
              });
              overlayGroup.addLayer(dot);
              drawMarkers.push(dot);
              drawPreview();
              if (drawPoints.length >= 3) {
                mHint.textContent = '继续添加顶点，或点击确认完成';
              } else {
                mHint.textContent = '已添加 ' + drawPoints.length + ' 点，至少需要 3 点';
              }
            }

            mToolbar.addEventListener('click', function (ev) {
              var btn = ev.target.closest('.gis-sdk-btn');
              if (!btn) return;
              var tool = btn.dataset.tool;

              if (tool === 'draw') {
                if (drawMode) {
                  clearDraw();
                  exitDrawMode();
                  mHint.textContent = '选择工具开始操作';
                } else {
                  drawMode = true;
                  map.dragging.disable();
                  mToolbar.querySelectorAll('.gis-sdk-btn').forEach(function (b) { b.classList.remove('active'); });
                  btn.classList.add('active');
                  mActionsRow.style.display = '';
                  mHint.textContent = '点击地图添加多边形顶点';
                  map.on('click', onDrawClick);
                }
              } else if (tool === 'confirm') {
                if (drawPoints.length >= 3) {
                  // 确认：绘制正式多边形
                  if (drawPolyline) { overlayGroup.removeLayer(drawPolyline); drawPolyline = null; }
                  if (drawPolygonLayer) { overlayGroup.removeLayer(drawPolygonLayer); drawPolygonLayer = null; }
                  drawMarkers.forEach(function (m) { overlayGroup.removeLayer(m); });
                  drawMarkers = [];
                  var finalPoly = L.polygon(drawPoints, {
                    color: '#f37979', weight: 2.5,
                    fillColor: '#f37979', fillOpacity: 0.15,
                    interactive: false
                  });
                  overlayGroup.addLayer(finalPoly);
                  drawPoints = [];
                  exitDrawMode();
                  map.dragging.enable();
                  mHint.textContent = '绘制完成';
                } else {
                  mHint.textContent = '至少需要 3 个顶点';
                }
              } else if (tool === 'cancel') {
                clearDraw();
                exitDrawMode();
                map.dragging.enable();
                mHint.textContent = '已取消';
              }
            });

            // 存储清理函数
            map._migrateCleanup = function () {
              clearDraw();
              map.off('click', onDrawClick);
              map.dragging.enable();
              var h = viewport.querySelector('.gis-split-hint');
              if (h) h.remove();
              var tb = viewport.querySelector('.gis-sdk-toolbar');
              if (tb) tb.remove();
            };
          } else {
            // 回退动画
            animTimeout.push(setTimeout(function () {
              if (tilesEl) tilesEl.classList.add('active');
              tiles.forEach(function (t, i) {
                animTimeout.push(setTimeout(function () { t.classList.add('loaded'); }, i * 30));
              });
            }, 100));
            animTimeout.push(setTimeout(function () {
              svgRegions.forEach(function (r) { r.classList.add('drawn'); });
            }, 600));
            animTimeout.push(setTimeout(function () {
              svgRegions.forEach(function (r) { r.classList.add('filled'); });
            }, 1800));
            animTimeout.push(setTimeout(function () {
              var pts = [
                [120,80],[150,110],[100,100],[240,100],[260,130],[280,110],
                [100,200],[130,220],[150,190],[220,200],[250,230],[200,240],
                [320,140],[340,160],[310,170]
              ];
              pts.forEach(function (p, i) {
                animTimeout.push(setTimeout(function () {
                  var m = document.createElement('div');
                  m.className = 'gis-marker m-' + MARKER_TYPES[i % 4];
                  m.style.left = (p[0] / 400 * 100) + '%';
                  m.style.top = (p[1] / 320 * 100) + '%';
                  markersEl.appendChild(m);
                  requestAnimationFrame(function () { m.classList.add('visible'); });
                }, i * 80));
              });
            }, 1200));
          }

        } else if (phase === 'sdk') {
          // 区域裁切交互演示：用户画线拆分多边形
          if (mapReady) {
            map.setView([22.56, 114.04], 12, { animate: true });

            // 初始多边形
            var initVerts = [
              [22.585, 113.97], [22.59, 114.04], [22.575, 114.10],
              [22.545, 114.11], [22.53, 114.05], [22.54, 113.98]
            ];
            var splitPolygons = [initVerts]; // 当前所有多边形顶点集合
            var polyLayers = [];
            var splitColors = ['#f37979', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
            var splitCount = 0;

            var mergeMode = false;
            var mergeSelected = []; // 选中的多边形索引

            function drawAllPolygons(interactiveMode) {
              polyLayers.forEach(function (l) { overlayGroup.removeLayer(l); });
              polyLayers = [];
              splitPolygons.forEach(function (verts, i) {
                var isSelected = mergeSelected.indexOf(i) !== -1;
                var poly = L.polygon(verts, {
                  color: isSelected ? '#fff' : splitColors[i % splitColors.length],
                  weight: isSelected ? 3.5 : 2.5,
                  fillColor: splitColors[i % splitColors.length],
                  fillOpacity: isSelected ? 0.4 : 0.15,
                  interactive: !!interactiveMode
                });
                if (interactiveMode) {
                  (function (idx) {
                    poly.on('click', function () {
                      if (!mergeMode) return;
                      var pos = mergeSelected.indexOf(idx);
                      if (pos === -1) {
                        mergeSelected.push(idx);
                      } else {
                        mergeSelected.splice(pos, 1);
                      }
                      drawAllPolygons(true);
                      hint.textContent = '已选 ' + mergeSelected.length + ' 区，点击确认合并';
                    });
                  })(i);
                }
                overlayGroup.addLayer(poly);
                polyLayers.push(poly);
              });
            }

            drawAllPolygons();

            // 提示文字
            var hint = document.createElement('div');
            hint.className = 'gis-split-hint gis-overlay';
            hint.textContent = '选择工具开始操作';
            viewport.appendChild(hint);

            // 裁切交互状态
            var cutStart = null;
            var cutLine = null;
            var previewLine = null;
            var splitMode = false;
            var pendingSplit = null; // 待确认的拆分结果

            // 线段相交检测
            function segIntersect(a1, a2, b1, b2) {
              var d1x = a2[1] - a1[1], d1y = a2[0] - a1[0];
              var d2x = b2[1] - b1[1], d2y = b2[0] - b1[0];
              var cross = d1x * d2y - d1y * d2x;
              if (Math.abs(cross) < 1e-12) return null;
              var t = ((b1[1] - a1[1]) * d2y - (b1[0] - a1[0]) * d2x) / cross;
              var u = ((b1[1] - a1[1]) * d1y - (b1[0] - a1[0]) * d1x) / cross;
              if (t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999) {
                return [a1[0] + t * d1y, a1[1] + t * d1x];
              }
              return null;
            }

            // 拆分一个多边形
            function splitOnePolygon(verts, p1, p2) {
              var inters = [];
              for (var i = 0; i < verts.length; i++) {
                var j = (i + 1) % verts.length;
                var pt = segIntersect(verts[i], verts[j], p1, p2);
                if (pt) inters.push({ pt: pt, edge: i });
              }
              if (inters.length < 2) return null;
              // 取前两个交点
              var i1 = inters[0], i2 = inters[1];
              var poly1 = [i1.pt];
              for (var k = i1.edge + 1; k <= i2.edge; k++) poly1.push(verts[k]);
              poly1.push(i2.pt);
              var poly2 = [i2.pt];
              for (var k = i2.edge + 1; k < verts.length; k++) poly2.push(verts[k]);
              for (var k = 0; k <= i1.edge; k++) poly2.push(verts[k]);
              poly2.push(i1.pt);
              return [poly1, poly2];
            }

            // 延长线段使其足以穿过多边形
            function extendLine(a, b, factor) {
              var dx = b[0] - a[0], dy = b[1] - a[1];
              return [
                [a[0] - dx * factor, a[1] - dy * factor],
                [b[0] + dx * factor, b[1] + dy * factor]
              ];
            }

            function exitSplitMode() {
              splitMode = false;
              cutStart = null;
              map.dragging.enable();
              map.off('mousemove');
              if (previewLine) { overlayGroup.removeLayer(previewLine); previewLine = null; }
              // 移除起点标记
              overlayGroup.eachLayer(function (l) {
                if (l instanceof L.CircleMarker && l.options.fillColor === '#fff') overlayGroup.removeLayer(l);
              });
              var tb = viewport.querySelector('.gis-sdk-toolbar');
              if (tb) {
                tb.querySelectorAll('.gis-sdk-btn').forEach(function (b) { b.classList.remove('active'); });
              }
            }

            function onMapClick(e) {
              if (!splitMode) return;
              var latlng = [e.latlng.lat, e.latlng.lng];

              if (!cutStart) {
                // 第一次点击：起点
                cutStart = latlng;
                var startDot = L.circleMarker(latlng, {
                  radius: 5, color: '#fff', fillColor: '#fff',
                  fillOpacity: 1, weight: 2, interactive: false
                });
                overlayGroup.addLayer(startDot);
                hint.textContent = '点击第二个点完成裁切';

                // 鼠标移动预览线
                map.on('mousemove', function onMove(ev) {
                  if (previewLine) overlayGroup.removeLayer(previewLine);
                  previewLine = L.polyline(
                    [cutStart, [ev.latlng.lat, ev.latlng.lng]],
                    { color: '#fff', weight: 1.5, dashArray: '6 4', interactive: false }
                  );
                  overlayGroup.addLayer(previewLine);
                });
              } else {
                // 第二次点击：裁切
                map.off('mousemove');
                if (previewLine) { overlayGroup.removeLayer(previewLine); previewLine = null; }

                var ext = extendLine(cutStart, latlng, 2);
                // 画裁切线
                cutLine = L.polyline([cutStart, latlng], {
                  color: '#fff', weight: 2, interactive: false
                });
                overlayGroup.addLayer(cutLine);

                // 尝试裁切每一个多边形
                var newPolygons = [];
                var didSplit = false;
                splitPolygons.forEach(function (verts) {
                  var result = splitOnePolygon(verts, ext[0], ext[1]);
                  if (result && result[0].length >= 3 && result[1].length >= 3) {
                    newPolygons.push(result[0]);
                    newPolygons.push(result[1]);
                    didSplit = true;
                  } else {
                    newPolygons.push(verts);
                  }
                });

                if (didSplit) {
                  // 预览拆分结果，等待确认
                  pendingSplit = { oldPolygons: splitPolygons.slice(), newPolygons: newPolygons };
                  splitPolygons = newPolygons;
                  setTimeout(function () {
                    if (cutLine) { overlayGroup.removeLayer(cutLine); cutLine = null; }
                    drawAllPolygons(false);
                    actionsRow.style.display = '';
                    hint.textContent = '预览拆分结果，点击确认或取消';
                  }, 300);
                  // 暂停点击监听
                  splitMode = false;
                } else {
                  setTimeout(function () {
                    if (cutLine) { overlayGroup.removeLayer(cutLine); cutLine = null; }
                  }, 500);
                  hint.textContent = '未穿过区域，请重试';
                  cutStart = null;
                }
              }
            }

            // 工具栏按钮
            var toolbar = document.createElement('div');
            toolbar.className = 'gis-sdk-toolbar';
            toolbar.innerHTML =
              '<div class="gis-sdk-row">' +
                '<button class="gis-sdk-btn" data-tool="split">&#9986; 拆分</button>' +
                '<button class="gis-sdk-btn" data-tool="merge">&#8644; 合并</button>' +
              '</div>' +
              '<div class="gis-sdk-row gis-sdk-actions" style="display:none">' +
                '<button class="gis-sdk-btn gis-sdk-confirm" data-tool="confirm">&#10003; 确认</button>' +
                '<button class="gis-sdk-btn" data-tool="cancel">&#10005; 取消</button>' +
              '</div>';
            viewport.appendChild(toolbar);
            var actionsRow = toolbar.querySelector('.gis-sdk-actions');
            var confirmBtn = toolbar.querySelector('[data-tool="confirm"]');
            var cancelBtn = toolbar.querySelector('[data-tool="cancel"]');

            var history = []; // 保存拆分历史用于合并

            function mergeSelectedPolygons() {
              if (mergeSelected.length < 2) {
                hint.textContent = '请至少选择两个区域';
                return;
              }
              history.push(splitPolygons.slice());
              // 合并选中的多边形顶点（凸包近似：按顺序拼接）
              var mergedVerts = [];
              mergeSelected.sort(function (a, b) { return a - b; });
              mergeSelected.forEach(function (idx) {
                mergedVerts = mergedVerts.concat(splitPolygons[idx]);
              });
              // 移除已合并的，添加合并后的
              var newPolygons = [];
              splitPolygons.forEach(function (verts, i) {
                if (mergeSelected.indexOf(i) === -1) newPolygons.push(verts);
              });
              newPolygons.push(mergedVerts);
              splitPolygons = newPolygons;
              mergeSelected = [];
              exitMergeMode();
              drawAllPolygons(false);
              hint.textContent = '已合并，当前 ' + splitPolygons.length + ' 区';
            }

            function exitMergeMode() {
              mergeMode = false;
              mergeSelected = [];
              actionsRow.style.display = 'none';
              toolbar.querySelector('[data-tool="merge"]').classList.remove('active');
            }

            toolbar.addEventListener('click', function (ev) {
              var btn = ev.target.closest('.gis-sdk-btn');
              if (!btn) return;
              var tool = btn.dataset.tool;

              if (tool === 'split') {
                if (splitMode) {
                  // 已在拆分模式，点击退出
                  exitSplitMode();
                  hint.textContent = '选择工具开始操作';
                } else {
                  splitMode = true;
                  map.dragging.disable();
                  toolbar.querySelectorAll('.gis-sdk-btn').forEach(function (b) { b.classList.remove('active'); });
                  btn.classList.add('active');
                  actionsRow.style.display = '';
                  hint.textContent = '点击地图两点绘制裁切线';
                }
              } else if (tool === 'merge') {
                exitSplitMode();
                if (splitPolygons.length < 2) {
                  hint.textContent = '只有一个区域，无需合并';
                  return;
                }
                if (mergeMode) {
                  exitMergeMode();
                  drawAllPolygons(false);
                  hint.textContent = '选择工具开始操作';
                } else {
                  mergeMode = true;
                  toolbar.querySelectorAll('.gis-sdk-btn').forEach(function (b) { b.classList.remove('active'); });
                  btn.classList.add('active');
                  actionsRow.style.display = '';
                  drawAllPolygons(true);
                  hint.textContent = '点击选择要合并的区域';
                }
              } else if (tool === 'confirm') {
                if (pendingSplit) {
                  // 确认拆分
                  history.push(pendingSplit.oldPolygons);
                  splitCount++;
                  pendingSplit = null;
                  actionsRow.style.display = 'none';
                  exitSplitMode();
                  drawAllPolygons(false);
                  hint.textContent = '已拆分为 ' + splitPolygons.length + ' 区';
                } else if (mergeMode) {
                  mergeSelectedPolygons();
                }
              } else if (tool === 'cancel') {
                if (pendingSplit) {
                  splitPolygons = pendingSplit.oldPolygons;
                  pendingSplit = null;
                  drawAllPolygons(false);
                }
                actionsRow.style.display = 'none';
                exitSplitMode();
                if (mergeMode) {
                  exitMergeMode();
                  drawAllPolygons(false);
                }
                hint.textContent = '已取消';
              }
            });

            map.on('click', onMapClick);
            // 存储清理函数
            map._sdkCleanup = function () {
              map.off('click', onMapClick);
              map.off('mousemove');
              map.dragging.enable();
              mergeMode = false;
              mergeSelected = [];
              var h = viewport.querySelector('.gis-split-hint');
              if (h) h.remove();
              var tb = viewport.querySelector('.gis-sdk-toolbar');
              if (tb) tb.remove();
            };

          } else {
            // 回退模式：静态展示
            if (tilesEl) tilesEl.classList.add('active');
            tiles.forEach(function (t, i) {
              animTimeout.push(setTimeout(function () { t.classList.add('loaded'); }, i * 25));
            });
            animTimeout.push(setTimeout(function () {
              svgRegions.forEach(function (r) { r.classList.add('drawn'); r.classList.add('filled'); });
            }, 500));
            animTimeout.push(setTimeout(function () {
              perfOverlay.classList.add('active');
              perfFps.textContent = '60';
              perfMarkers.textContent = '裁切';
              perfTiles.textContent = '演示';
            }, 800));
          }

        } else if (phase === 'perf') {
          perfOverlay.classList.add('active');

          if (mapReady) {
            var count = 0;
            var total = 80;
            for (var i = 0; i < total; i++) {
              (function (idx) {
                animTimeout.push(setTimeout(function () {
                  var lat = 22.48 + Math.random() * 0.2;
                  var lng = 113.85 + Math.random() * 0.35;
                  var rtype = MARKER_TYPES[idx % 4];
                  var icon = L.divIcon({
                    className: LF_MARKER_CLASSES[rtype],
                    iconSize: [10, 10],
                    iconAnchor: [5, 5]
                  });
                  var marker = L.marker([lat, lng], { icon: icon, interactive: false });
                  overlayGroup.addLayer(marker);
                  count++;
                  perfMarkers.textContent = String(count * 650);
                  perfFps.textContent = '60';
                  perfTiles.textContent = String(count);
                }, idx * 30));
              })(i);
            }
          } else {
            if (tilesEl) tilesEl.classList.add('active');
            tiles.forEach(function (t, i) {
              animTimeout.push(setTimeout(function () {
                t.classList.add('loaded', 'highlight');
                perfTiles.textContent = String(i + 1);
              }, i * 15));
            });
            var cnt = 0;
            for (var j = 0; j < 60; j++) {
              (function (idx) {
                animTimeout.push(setTimeout(function () {
                  var m = document.createElement('div');
                  var rt = MARKER_TYPES[idx % 4];
                  m.className = 'gis-marker pulse m-' + rt;
                  m.style.left = (10 + Math.random() * 80) + '%';
                  m.style.top = (5 + Math.random() * 85) + '%';
                  markersEl.appendChild(m);
                  requestAnimationFrame(function () { m.classList.add('visible'); });
                  cnt++;
                  perfMarkers.textContent = String(cnt * 850);
                  perfFps.textContent = '60';
                }, idx * 40));
              })(j);
            }
          }

        } else if (phase === 'fusion') {
          // 融合方案：隐藏地图，用纯色背景 + 3D 图层堆叠展示
          if (mapReady) {
            mapContainer.classList.remove('map-ready');
          }
          // 3D 图层堆叠效果
          animTimeout.push(setTimeout(function () {
            layerStack.classList.add('active');
          }, 300));
          animTimeout.push(setTimeout(function () {
            perfOverlay.classList.add('active');
            perfTiles.textContent = '3层';
            perfMarkers.textContent = '融合';
            perfFps.textContent = '60';
          }, 800));
        }
      }

      // 按钮点击
      missionBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          missionBtns.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var phase = btn.dataset.phase;
          if (phase !== currentPhase) {
            currentPhase = phase;
            runPhase(phase);
          }
        });
      });

      // 滚动进入视图时自动触发
      var gisSection = document.getElementById('project3');
      if (gisSection) {
        var triggered = false;
        new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting && !triggered) {
            triggered = true;
            setTimeout(function () { runPhase('migrate'); }, 600);
          }
        }, { threshold: 0.3 }).observe(gisSection);
      }
    })();

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
