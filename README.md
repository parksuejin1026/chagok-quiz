# 차곡퀴즈

로그인 없이 링크로 접속하는 학습용 퀴즈입니다.

- 사이트: https://parksuejin1026.github.io/chagok-quiz/
- 보건의료법규 · 의학용어 70문항
- 객관식, 복수정답, OX, 단답형 지원
- 문제집/범위 선택, 즉시 채점과 해설, 오답 검토, 미응답 이동
- 브라우저 자동 저장 및 텍스트 복사
- 외부 CDN, 폰트, 서버, 회원가입 없이 실행

## 실행

가장 간단한 방법은 index.html을 브라우저에서 여는 것입니다. 링크 복사 등 일부 기능은 HTTPS 또는 로컬 서버에서 사용하세요.

개발 및 검증:

~~~sh
npm ci
npm run preview
npm test
npx playwright install chromium
npm run test:browser
npm run build
~~~

미리보기: http://127.0.0.1:4173/chagok-quiz/

## 문제 추가

[문제 추가 안내](docs/ADDING_QUESTIONS.md)를 참고하세요. data/health.js는 현재 문제집이며, 화면 로직은 app.js, 공통 채점은 core.js입니다. 새 문제집은 data/ 안에 JavaScript 파일을 만들고 index.html에서 core.js보다 먼저 불러오면 목록에 자동으로 나타납니다.

문항 ID는 문제집 안에서 고유한 양의 정수로 유지하세요. 정답 번호는 1부터 시작합니다. 기존 문항의 정답이나 내용을 바꿀 때 문제집 version을 올리면 이전 기록과 분리됩니다.

## 배포

main에 push하면 GitHub Actions가 데이터와 채점을 검증하고 dist/의 공개 파일만 GitHub Pages에 배포합니다. 저장소 Settings → Pages → Source는 GitHub Actions를 사용합니다.

사용자의 답은 현재 기기·브라우저의 localStorage에만 남습니다. 기기 간 동기화나 운영자용 성적 수집 기능은 없습니다. 정답 데이터는 공개 학습 사이트 소스에 포함됩니다.

## 원본과 검수

잘린 quiz1.html을 복구하고 기존 주소는 첫 화면으로 연결했습니다. 원본 백업은 로컬 .local-backup/에 있으며 Git에 포함하지 않습니다.

수정 내역과 확인 출처: [문항 검수 기록](docs/CONTENT_REVIEW.md). 공식 자료를 확인한 문항에는 출처를 표시했습니다. 전체 70문항의 전문 감수 완료를 의미하지 않으며 향후 교재/시험 기준에 맞춰 검토를 이어갈 수 있습니다.
