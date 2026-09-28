# Sliding Panels

macOS 화면보호기 "슬라이드 패널"을 웹의 한 영역에 재현하는 의존성 없는 웹 컴포넌트.

## 사용

```html
<script type="module" src="sliding-panels.js"></script>
<sliding-panels folder="images/" style="width:100%;height:480px"></sliding-panels>
```

| 속성 | 기본값 | 설명 |
|---|---|---|
| folder | `images/` | 이미지 폴더 |
| images | — | 쉼표로 구분한 URL 목록 (folder 대신) |
| panels | 자동(3~9) | 패널 개수 |
| interval | 3500 | 패널 교체 간격(ms) |
| duration | 1100 | 슬라이드 시간(ms) |
| gap | 4 | 패널 간격(px) |
| relayout | 14 | N번 교체 후 배치 전체 재구성 (0=안 함) |
| background | #000 | 배경색 |

JS 제어: `el.pause()`, `el.play()`, `el.next()`

## 폴더 이미지 목록

브라우저는 폴더를 직접 읽을 수 없어서 다음 순서로 찾는다.

1. `images/manifest.json` — 이미지를 추가/삭제한 뒤 `node tools/make-manifest.mjs images` 실행
2. 서버의 디렉터리 목록 페이지 (http-server, `npx serve` 등)에서 이미지 링크 자동 추출

`file://`로 직접 열면 동작하지 않으므로 로컬 서버로 연다: `npx http-server . -p 5178`
