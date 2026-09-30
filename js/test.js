const serviceVisuals = {
  concept: "/images/creative/service/img_service_01.jpg",
  poster: "/images/creative/service/img_service_02.jpg",
  motion: "/images/creative/service/img_service_03.jpg",
  campaign: "/images/creative/service/img_service_04.jpg",
  digital: "/images/creative/service/img_service_05.jpg"
};

/* 1. Reveal Motion */
function initRevealAnimation() {
  const targets = document.querySelectorAll(".reveal-up, .reveal-text, .pipeline-card, .work-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((target) => observer.observe(target));
}

/* 2. Slogan Scroll Parallax */
function initSloganMotion() {
  const lines = document.querySelectorAll(".slogan-line");
  if (!lines.length) return;

  window.addEventListener(
    "scroll",
    () => {
      const scrollY = window.scrollY;
      lines.forEach((line, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const amount = Math.min(42, scrollY * 0.025) * direction;
        line.style.transform = `translateX(${amount}px)`;
      });
    },
    { passive: true }
  );
}

/* 3. Services Accordion System */
function initServicesAccordion() {
  const items = document.querySelectorAll(".service-item");
  const preview = document.querySelector("#servicePreview");
  const previewImage = document.querySelector(".service-preview-image");

  if (!items.length) return;

  items.forEach((item) => {
    const trigger = item.querySelector(".service-trigger");
    const panel = item.querySelector(".service-panel");
    const mobileImgBox = item.querySelector(".mobile-service-img");

    if (!trigger || !panel) return;

    trigger.addEventListener("click", () => {
      const isActive = item.classList.contains("is-active");

      items.forEach((otherItem) => {
        otherItem.classList.remove("is-active");
        const otherPanel = otherItem.querySelector(".service-panel");
        if (otherPanel) otherPanel.style.maxHeight = "0px";
      });

      if (!isActive) {
        item.classList.add("is-active");

        const key = item.dataset.service;
        const targetImgSrc = serviceVisuals[key] || serviceVisuals.concept;

        if (mobileImgBox) {
          mobileImgBox.style.backgroundImage = `url('${targetImgSrc}')`;
        }

        panel.style.maxHeight = `${panel.scrollHeight + 200}px`;

        if (preview && previewImage) {
          previewImage.style.backgroundImage = `url('${targetImgSrc}')`;
          previewImage.style.backgroundSize = "cover";
          previewImage.style.backgroundPosition = "center";
          previewImage.style.backgroundRepeat = "no-repeat";
          preview.classList.add("is-visible");
        }
      } else {
        item.classList.remove("is-active");
        panel.style.maxHeight = "0px";
        if (preview) preview.classList.remove("is-visible");
      }
    });
  });
}

/* 4. Instagram Feed & Slider Logic */
function initInstagramFeed() {
        // 1. Step 3에서 연장한 60일 장기 토큰
        const ACCESS_TOKEN = 'EAAOwnBLrA18BSgAvUEMuEOOKRe1Eqv3YQZAw6kojJYhV9l6dcbdwt97IBzZAyGJB5dDQN8KCzOt1VxkvT1gYOCZCqmywF2nXK4pl0hp7ez5kG9mSAyjWQBZB2y0011Xuxu3vYfxBX87xhkjZAdDN6ORXQAbxUZATK4KnZCIsLyvLv4pPVQz6ZC9ZBh2X8kJT7CeF90B9fdDRHqJmD4m5GQTeHHYbws0SwXB0n5o7KMvLbJS2yZA1D4cM3mmWEry8P1WobxZAkM7iWoramncwEZAlABAHTkZBIgBwZD';

        // 2. Step 2에서 확인한 17841... 로 시작하는 실제 인스타그램 계정 ID
        const INSTAGRAM_ACCOUNT_ID = '17841413082626243';

        const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption';
        const url = `https://graph.facebook.com/v22.0/${INSTAGRAM_ACCOUNT_ID}/media?fields=${FIELDS}&access_token=${ACCESS_TOKEN}`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const grid = document.getElementById('instafeed');
      if (!grid || !data || !data.data) return;

      const feeds = data.data.slice(0, 12);
      feeds.forEach((feed) => {
        if (!feed.media_url) return;

        const anchor = document.createElement('a');
        anchor.href = feed.permalink;
        anchor.target = '_blank';
        anchor.rel = 'noopener';

        const imageUrl = feed.media_type === 'VIDEO' ? feed.thumbnail_url : feed.media_url;
        if (imageUrl) {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = feed.caption || 'Instagram Image';
          anchor.appendChild(img);
        }

        const captionDiv = document.createElement('div');
        captionDiv.className = 'insta-caption';
        captionDiv.textContent = feed.caption || '';
        anchor.appendChild(captionDiv);

        grid.appendChild(anchor);
      });

      initWorkSliderEvents();
    })
    .catch((err) => console.error('인스타그램 피드를 불러오는데 실패했습니다:', err));
}

function initWorkSliderEvents() {
  const grid = document.getElementById('instafeed');
  const prevBtn = document.getElementById('slider-prev-btn');
  const nextBtn = document.getElementById('slider-next-btn');

  if (!grid || !prevBtn || !nextBtn) return;

  const getScrollAmount = () => grid.clientWidth * 0.8;

  nextBtn.addEventListener('click', () => {
    grid.style.scrollBehavior = 'smooth';
    const maxScroll = grid.scrollWidth - grid.clientWidth;
    if (grid.scrollLeft >= maxScroll - 5) {
      grid.scrollLeft = 0;
    } else {
      grid.scrollLeft += getScrollAmount();
    }
  });

  prevBtn.addEventListener('click', () => {
    grid.style.scrollBehavior = 'smooth';
    if (grid.scrollLeft <= 5) {
      grid.scrollLeft = grid.scrollWidth;
    } else {
      grid.scrollLeft -= getScrollAmount();
    }
  });

  let isDown = false;
  let startX;
  let scrollLeft;
  let isDragging = false;

  grid.addEventListener('mousedown', (e) => {
    isDown = true;
    isDragging = false;
    grid.style.scrollBehavior = 'auto';
    startX = e.pageX - grid.offsetLeft;
    scrollLeft = grid.scrollLeft;
  });

  grid.addEventListener('mouseleave', () => {
    isDown = false;
    grid.style.scrollBehavior = 'smooth';
  });

  grid.addEventListener('mouseup', () => {
    isDown = false;
    grid.style.scrollBehavior = 'smooth';
  });

  grid.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - grid.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 5) isDragging = true;
    grid.scrollLeft = scrollLeft - walk;
  });

  grid.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    link.addEventListener('dragstart', (e) => e.preventDefault());
  });
}

/* 5. Drag Panel */
function initContactDrag() {
  const panel = document.querySelector("#dragPanel");
  if (!panel) return;

  let isDragging = false;

  function updateWidth(clientX) {
    const rect = panel.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const width = Math.max(28, Math.min(100, raw));
    panel.style.setProperty("--drag-width", `${width}%`);
  }

  panel.addEventListener("pointerdown", (event) => {
    isDragging = true;
    panel.setPointerCapture(event.pointerId);
    updateWidth(event.clientX);
  });

  panel.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    updateWidth(event.clientX);
  });

  panel.addEventListener("pointerup", () => { isDragging = false; });
  panel.addEventListener("pointercancel", () => { isDragging = false; });

  window.addEventListener(
    "scroll",
    () => {
      const rect = panel.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top < windowHeight && rect.bottom > 0 && !isDragging) {
        const progress = 1 - Math.max(0, rect.top) / windowHeight;
        const width = 48 + progress * 52;
        panel.style.setProperty("--drag-width", `${Math.min(100, Math.max(48, width))}%`);
      }
    },
    { passive: true }
  );
}

/* 6. Smooth Scroll */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* 7. Parallax System */
function initObjectInsideParallax() {
  function animateObjects() {
    const parallaxObjects = document.querySelectorAll(
      ".card-media-placeholder .slide-item img, .card-media-placeholder .slide-item video, .card-media-placeholder .slide-item .placeholder-text-graphic"
    );

    if (window.innerWidth <= 900) {
      parallaxObjects.forEach((obj) => { obj.style.transform = "none"; });
      return;
    }

    const windowHeight = window.innerHeight;

    parallaxObjects.forEach((obj) => {
      const card = obj.closest(".bs-card");
      if (!card) return;

      const rect = card.getBoundingClientRect();

      if (rect.top < windowHeight && rect.bottom > 0) {
        const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
        const parentCol = obj.closest(".bs-card-col");
        let speedFactor = 30;

        if (parentCol) {
          if (parentCol.classList.contains("scroll-slow")) speedFactor = 45;
          else if (parentCol.classList.contains("scroll-fast")) speedFactor = -35;
        }

        const moveY = (progress - 0.5) * speedFactor;
        
        // 수정된 부분: scale(1.05)를 제거하고 translateY만 남김
        obj.style.transform = `translateY(${moveY}px)`; 
      }
    });
  }

  window.addEventListener("scroll", () => {
    window.requestAnimationFrame(animateObjects);
  }, { passive: true });

  window.addEventListener("resize", animateObjects);
  animateObjects();
}

/* 8. 웹 컴포넌트 (Sliding Panels) 연동 */
function initSlidingPanels() {
  const panelElement = document.getElementById('hero-sliding-panels');
  if (!panelElement) return;

  // 기존에 사용하던 이미지 및 비디오 에셋의 URL만 추출
  const mediaAssets = [
    '/images/creative/main_top/img_01.jpg',
    '/images/creative/main_top/img_02.jpg',
    '/images/creative/main_top/img_03.jpg',
    '/images/creative/main_top/img_04.jpg',
    '/images/creative/main_top/img_05.jpg',
    '/images/creative/main_top/img_06.jpg',
    '/images/creative/main_top/img_07.jpg',
    '/images/creative/main_top/img_08.jpg',
    '/images/creative/main_top/img_09.jpg',
    '/images/creative/main_top/img_10.jpg',
    '/images/creative/main_top/img_11.jpg',
    '/images/creative/main_top/img_12.jpg',
    '/images/creative/main_top/img_13.jpg',
    '/images/creative/main_top/img_14.jpg',
    '/images/creative/main_top/img_15.jpg',
    '/images/creative/main_top/img_16.jpg',
    '/images/creative/main_top/img_17.jpg',
    '/images/creative/main_top/img_18.jpg',
    '/images/creative/main_top/img_19.jpg'
  ];

  // 컴포넌트의 'images' 속성에 배열을 콤마(,)로 구분된 문자열로 주입
  panelElement.setAttribute('images', mediaAssets.join(','));
}

/* 9. Mobile Hamburger Navigation */
function initMobileMenu() {
  const toggleBtn = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#siteNav");
  const header = document.querySelector(".site-header");
  const navLinks = document.querySelectorAll("#siteNav a");

  if (!toggleBtn || !nav) return;

  toggleBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = nav.classList.contains("is-open");
    if (isOpen) {
      nav.classList.remove("is-open");
      if (header) header.classList.remove("is-open");
      toggleBtn.classList.remove("is-active");
      toggleBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    } else {
      nav.classList.add("is-open");
      if (header) header.classList.add("is-open");
      toggleBtn.classList.add("is-active");
      toggleBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      if (header) header.classList.remove("is-open");
      toggleBtn.classList.remove("is-active");
      toggleBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });
}

/* 10. Contact Form (GAS Submitting) */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    const submitButton = this.querySelector('.form-submit');
    submitButton.textContent = 'SENDING...';
    submitButton.disabled = true;

    const formData = new FormData(this);
    const searchParams = new URLSearchParams(formData);
    const gasUrl = "https://script.google.com/macros/s/AKfycbyJr2gnL_hnhtUdMc3AUBtH4mvpM2AZyBSiiCxqlsDrQv68CfrGHcaBG6IhQaddpvKS/exec";

    fetch(gasUrl, {
      method: 'POST',
      body: searchParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    .then(() => {
      alert('문의가 성공적으로 접수되었습니다!');
      form.reset();
    })
    .catch((error) => {
      alert('전송 중 에러가 발생했습니다. 다시 시도해 주세요.');
      console.error('Error:', error);
    })
    .finally(() => {
      submitButton.textContent = 'SEND';
      submitButton.disabled = false;
    });
  });
}

/* Master Initialization */
document.addEventListener("DOMContentLoaded", () => {
  initSmoothAnchors();
  initRevealAnimation();
  initSloganMotion();
  initServicesAccordion();
  initInstagramFeed();
  initContactDrag();
  initContactForm();
  initSlidingPanels();
  initMobileMenu();
});