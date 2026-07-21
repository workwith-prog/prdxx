document.getElementById('yr').textContent = new Date().getFullYear();

// sticky nav
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

// mobile menu
const header = document.querySelector('header.nav');
document.getElementById('burger').addEventListener('click', () => header.classList.toggle('mobile-open'));
document.querySelectorAll('#navlinks a').forEach(a => a.addEventListener('click', () => header.classList.remove('mobile-open')));

// language toggle
const koBtn = document.getElementById('ko'), enBtn = document.getElementById('en');
function setLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-ko]').forEach(el => {
    const v = el.getAttribute('data-' + lang);
    if (v !== null) el.innerHTML = v;
  });
  document.querySelectorAll('[data-placeholder-ko]').forEach(el => {
    const v = el.getAttribute('data-placeholder-' + lang);
    if (v !== null) el.setAttribute('placeholder', v);
  });
  koBtn.classList.toggle('on', lang === 'ko');
  enBtn.classList.toggle('on', lang === 'en');
}
koBtn.addEventListener('click', () => setLang('ko'));
enBtn.addEventListener('click', () => setLang('en'));

// count-up
function animateCount(el) {
  const target = parseFloat(el.dataset.target);
  const dec = parseInt(el.dataset.dec || '0', 10);
  const pre = el.dataset.pre || '';
  const suf = el.dataset.suf || '';
  const dur = 1500;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = (target * eased).toFixed(dec);
    el.innerHTML = pre + val + `<span class="suf-decor">${suf}</span>`;
    if (p < 1) requestAnimationFrame(tick);
    else el.innerHTML = pre + target.toFixed(dec) + `<span class="suf-decor">${suf}</span>`;
  }
  requestAnimationFrame(tick);
}

// reveal + trigger counters
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      e.target.querySelectorAll('.cnt').forEach(c => {
        if (!c.dataset.done) {
          c.dataset.done = '1';
          animateCount(c);
        }
      });
      io.unobserve(e.target);
    }
  });
}, { threshold: .18 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// pause hero video when off-screen (perf)
const hv = document.querySelector('.hero video');
if (hv) {
  const vio = new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? hv.play().catch(() => { }) : hv.pause(); }), { threshold: .05 });
  vio.observe(hv);
}

/* ============ FAQ ACCORDION INTERACTION ============ */
document.addEventListener("DOMContentLoaded", function () {
  const faqItems = document.querySelectorAll(".faq-section .faq-item");

  faqItems.forEach(item => {
    if (item.classList.contains("active")) {
      const panel = item.querySelector(".faq-panel");
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
  });

  faqItems.forEach(item => {
    const trigger = item.querySelector(".faq-trigger");
    const panel = item.querySelector(".faq-panel");

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      const isActive = item.classList.contains("active");

      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains("active")) {
          otherItem.classList.remove("active");
          otherItem.querySelector(".faq-panel").style.maxHeight = null;
        }
      });

      if (isActive) {
        item.classList.remove("active");
        panel.style.maxHeight = null;
      } else {
        item.classList.add("active");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });
});




/* ============ 새 창 팝업으로 문의페이지 열기 ============ */
document.addEventListener("DOMContentLoaded", function() {
  // 1. getElementById 대신 querySelectorAll을 사용하여 class가 openModalBtn인 모든 요소를 찾습니다.
  const openModalBtns = document.querySelectorAll(".openModalBtn");
  const contactUrl = "https://script.google.com/a/mortarheadd.com/macros/s/AKfycbzi7Vop79vTVS0tORw1HrW_8EUISKtzkUjk5YJVMLs20-J0k0bZM_MYsjzKXiswkr9c/exec?page=contact";

  // 2. 찾은 요소가 있다면 forEach를 통해 각각의 버튼에 클릭 이벤트를 걸어줍니다.
  if (openModalBtns.length > 0) {
    openModalBtns.forEach(function(btn) {
      btn.addEventListener("click", function(e) {
        e.preventDefault();
        
        // 모바일에서는 새 탭, PC에서는 적절한 크기의 팝업창으로 분기 처리 가능
        const width = 600;
        const height = 1050;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        window.open(
          contactUrl, 
          "PRDXX_Contact", 
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );
      });
    });
  }
});