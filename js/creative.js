const instagramFallbackPosts = [
  { title: "MORTARHEADD", image: "", url: "https://www.instagram.com/mortarheadd_creative/" },
  { title: "Brand Identity", image: "", url: "https://www.instagram.com/mortarheadd_creative/" },
  { title: "Campaign Visual", image: "", url: "https://www.instagram.com/mortarheadd_creative/" },
  { title: "Motion Graphic", image: "", url: "https://www.instagram.com/mortarheadd_creative/" },
  { title: "Poster Art", image: "", url: "https://www.instagram.com/mortarheadd_creative/" },
  { title: "Digital Contents", image: "", url: "https://www.instagram.com/mortarheadd_creative/" }
];

const serviceVisuals = {
  concept: "linear-gradient(135deg, #2828ff 0%, #9da0ff 48%, #f2ff57 100%)",
  poster: "linear-gradient(135deg, #ff4814 0%, #2828ff 55%, #111 100%)",
  motion: "radial-gradient(circle at 30% 28%, #f2ff57 0 18%, transparent 19%), linear-gradient(135deg, #111 0%, #2828ff 100%)",
  campaign: "linear-gradient(90deg, #2828ff 0 18%, #f2ff57 18% 36%, #ff4814 36% 58%, #f7f7f4 58% 78%, #111 78%)",
  digital: "repeating-linear-gradient(45deg, #2828ff 0 18px, #f2ff57 18px 36px, #111 36px 54px)"
};

function initRevealAnimation() {
  // [정렬 버그 수정]: 상단 Hero 그리드(.bs-card)는 CSS 타임라인이 처리하도록 타겟에서 완전히 제외합니다.
  const targets = document.querySelectorAll(".reveal-up, .reveal-text, .pipeline-card, .work-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  targets.forEach((target) => observer.observe(target));
}

function initSloganMotion() {
  const lines = document.querySelectorAll(".slogan-line");

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

function initServicesAccordion() {
  const items = document.querySelectorAll(".service-item");
  const preview = document.querySelector("#servicePreview");
  const previewImage = document.querySelector(".service-preview-image");

  if (!items.length) return;

  items.forEach((item) => {
    const trigger = item.querySelector(".service-trigger");
    const panel = item.querySelector(".service-panel");

    if (!trigger || !panel) return;

    trigger.addEventListener("click", () => {
      // 이미 열려있는지 확인
      const isActive = item.classList.contains("is-active");

      // 모든 아코디언 패널 초기화 (하나만 열리는 형태 원할 시)
      items.forEach((otherItem) => {
        otherItem.classList.remove("is-active");
        const otherPanel = otherItem.querySelector(".service-panel");
        if (otherPanel) {
          otherPanel.style.maxHeight = "0px";
        }
      });

      // 클릭한 요소 토글 처리
      if (!isActive) {
        item.classList.add("is-active");
        // 내부 스크롤 높이만큼 max-height를 dynamic하게 설정하여 부드럽게 펼침
        panel.style.maxHeight = `${panel.scrollHeight}px`;

        // 프리뷰 이미지 변경 스크립트 연동 (기존 기획 유지)
        if (preview && previewImage) {
          const key = item.dataset.service;
          previewImage.style.background = serviceVisuals[key] || serviceVisuals.concept;
          preview.classList.add("is-visible");
        }
      } else {
        // 이미 켜져있던 걸 다시 누르면 닫기
        item.classList.remove("is-active");
        panel.style.maxHeight = "0px";
        if (preview) preview.classList.remove("is-visible");
      }
    });
  });
}

async function loadInstagramPosts() {
  if (Array.isArray(window.MORTARHEADD_INSTAGRAM_POSTS)) {
    return window.MORTARHEADD_INSTAGRAM_POSTS;
  }

  try {
    const response = await fetch("./instagram.json", { cache: "no-store" });
    if (!response.ok) throw new Error("instagram.json not found");
    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.posts)) return data.posts;
  } catch (error) {
    return instagramFallbackPosts;
  }
  return instagramFallbackPosts;
}

function renderWorkPosts(posts) {
  const slider = document.querySelector("#workSlider");
  if (!slider) return;

  slider.innerHTML = "";

  posts.slice(0, 12).forEach((post, index) => {
    const card = document.createElement("article");
    card.className = "work-card reveal-up";

    const link = document.createElement("a");
    link.className = "work-thumb";
    link.href = post.url || "https://www.instagram.com/mortarheadd_creative/";
    link.target = "_blank";
    link.rel = "noopener";

    if (post.image) {
      const image = document.createElement("img");
      image.src = post.image;
      image.alt = post.title || "Selected work";
      image.loading = "lazy";
      link.appendChild(image);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "work-fallback";
      fallback.textContent = index % 2 === 0 ? "/ / /" : "PRDXX";
      fallback.style.background = ["#2828ff", "#f2ff57", "#ff4814", "#f2b4d2", "#111", "#cfcfcf"][index % 6];
      fallback.style.color = index === 1 || index === 3 || index === 5 ? "#111" : "#fff";
      link.appendChild(fallback);
    }

    const title = document.createElement("p");
    title.className = "work-title";
    title.textContent = post.title || "Selected Work";

    card.append(link, title);
    slider.appendChild(card);
  });

  initRevealAnimation();
}

function initWorkSlider() {
  const slider = document.querySelector("#workSlider");
  const prev = document.querySelector(".slider-btn.prev");
  const next = document.querySelector(".slider-btn.next");

  if (!slider || !prev || !next) return;

  prev.addEventListener("click", () => {
    slider.scrollBy({ left: -slider.clientWidth * 0.72, behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    slider.scrollBy({ left: slider.clientWidth * 0.72, behavior: "smooth" });
  });
}

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

function initSmoothAnchors() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
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

// 구형 mailto 가로채기 기능을 비활성화하고, HTML 하단의 GAS(Google Apps Script) 비동기 전송 로직과 일치시킵니다.
function initContactForm() {
  const form = document.querySelector("#contactForm");
  if (!form) return;
  // HTML 내부 인라인 스크립트가 폼 처리를 담당하므로 중복 이벤트 바인딩을 피하기 위해 비워둡니다.
}




function initObjectInsideParallax() {
  const parallaxObjects = document.querySelectorAll(
    ".card-media-placeholder img, .card-media-placeholder video, .placeholder-text-graphic"
  );

  if (!parallaxObjects.length) return;

  function animateObjects() {
    // 모바일(900px 이하) 환경에서는 연산 제외 및 트랜스폼 초기화
    if (window.innerWidth <= 900) {
      parallaxObjects.forEach((obj) => {
        obj.style.transform = "none";
      });
      return;
    }

    const windowHeight = window.innerHeight;

    parallaxObjects.forEach((obj) => {
      // 오브젝트가 속한 부모 카드의 화면 상 위치 측정
      const card = obj.closest(".bs-card");
      if (!card) return;

      const rect = card.getBoundingClientRect();
      
      // 카드가 화면 내에 들어와 있을 때만 연산 처리 (성능 최적화)
      if (rect.top < windowHeight && rect.bottom > 0) {
        // 화면 진입 시점부터 탈출 시점까지의 상대적 비율 계산 (0 ~ 1)
        const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
        
        // 각 열(Column)의 클래스에 따라 시차 속도와 방향 차별화
        const parentCol = obj.closest(".bs-card-col");
        let speedFactor = 30; // 기본 움직임 범위 (px)

        if (parentCol) {
          if (parentCol.classList.contains("scroll-slow")) {
            speedFactor = 45;  // 좌측 열: 좀 더 역동적으로 미끄러짐
          } else if (parentCol.classList.contains("scroll-fast")) {
            speedFactor = -35; // 우측 열: 반대 방향으로 교차 시차 부여
          }
        }

        // 중앙값(0.5)을 기준으로 자연스러운 Y축 오프셋 밀어주기 (살짝 스케일을 키워 여백 노출 방지)
        const moveY = (progress - 0.5) * speedFactor;
        obj.style.transform = `translateY(${moveY}px) scale(1.05)`;
      }
    });
  }

  // 스크롤 이벤트 최적화 결합
  window.addEventListener("scroll", () => {
    window.requestAnimationFrame(animateObjects);
  }, { passive: true });

  window.addEventListener("resize", animateObjects);
  animateObjects(); // 초기 실행
}

// DOMContentLoaded 바인더 스택 유지 및 재가동
document.addEventListener("DOMContentLoaded", async () => {
  initSmoothAnchors();
  initRevealAnimation();
  initSloganMotion();
  initServicesAccordion();
  initWorkSlider();
  initContactDrag();
  initContactForm();
  
  // 패러랙스 함수 엔진 실행
  initObjectInsideParallax();

  const posts = await loadInstagramPosts();
  renderWorkPosts(posts);
});
