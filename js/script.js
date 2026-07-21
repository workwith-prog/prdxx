const container = document.querySelector('.container');
const left = document.querySelector('.left');
const right = document.querySelector('.right');

// [신규] 외부 HTML 파일을 불러와 특정 영역에 집어넣는 함수
function loadIncludedFiles() {
  // 1. 좌측 마케팅 페이지 로드
  fetch('marketing.html')
    .then(response => {
      if (!response.ok) throw new Error('marketing.html 로드 실패');
      return response.text();
    })
    .then(data => {
      document.getElementById('marketing-content').innerHTML = data;
    })
    .catch(error => console.error(error));

  // 2. 우측 크리에이티브 페이지 로드
  fetch('creative.html')
    .then(response => {
      if (!response.ok) throw new Error('creative.html 로드 실패');
      return response.text();
    })
    .then(data => {
      document.getElementById('creative-content').innerHTML = data;
    })
    .catch(error => console.error(error));
}

// 페이지 로드 시 바로 include 실행
window.addEventListener('DOMContentLoaded', loadIncludedFiles);


// --- 기존 인터랙션 코드 유지 ---

// 마우스 호버 효과
left.addEventListener('mouseenter', () => {
  if(!container.classList.contains('expanded-left') && !container.classList.contains('expanded-right')) {
    container.classList.add('hover-left');
  }
});
left.addEventListener('mouseleave', () => {
  container.classList.remove('hover-left');
});

right.addEventListener('mouseenter', () => {
  if(!container.classList.contains('expanded-left') && !container.classList.contains('expanded-right')) {
    container.classList.add('hover-right');
  }
});
right.addEventListener('mouseleave', () => {
  container.classList.remove('hover-right');
});

// 버튼 클릭 시 전체 화면 확장
function expandSection(side) {
  container.classList.remove('hover-left', 'hover-right');
  
  if (side === 'left') {
    container.classList.add('expanded-left');
    document.body.style.overflowY = 'auto';
  } else {
    container.classList.add('expanded-right');
    document.body.style.overflowY = 'auto';
  }
}

// 뒤로가기 버튼 클릭 시 다시 게이트웨이로 축소
function collapseSection(event) {
  event.stopPropagation();
  container.classList.remove('expanded-left', 'expanded-right');
  document.body.style.overflowY = 'hidden';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}