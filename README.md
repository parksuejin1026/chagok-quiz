# 중간고사 대비 문제풀기

사이트: https://parksuejin1026.github.io/chagok-quiz/

## 문제집

- 보건의료법규 및 의학용어: 70문항
- 보건의료기본법 및 의료법: 60문항
- 보건의료정보관리 및 의무기록: 39문항

문제집과 문항을 선택하고, 답을 제출하면 채점과 해설을 볼 수 있습니다. 제출 전에도 정답·해설을 펼칠 수 있습니다. 풀이 기록과 제출 전 선택은 같은 브라우저에 자동 저장되며 문제집별로 분리됩니다. 제출한 답은 답 수정 버튼으로 변경할 수 있습니다. 전 문항을 제출하면 완료와 최종 정답·오답 개수를 표시합니다. 문제집 초기화는 선택한 문제집의 제출 답과 작성 중인 답을 모두 지웁니다.

## 실행과 검증

~~~sh
npm ci
npm run preview
npm test
npx playwright install chromium
npm run test:browser
npm run build
~~~

미리보기: http://127.0.0.1:4173/chagok-quiz/

index.html을 브라우저에서 직접 열어도 사용할 수 있습니다. main에 push하면 GitHub Actions가 데이터를 검증하고 공개 파일을 GitHub Pages에 자동 배포합니다.

## 문제 추가

[문제 추가 방법](docs/ADDING_QUESTIONS.md)

- data/health.js: 기존 70문항
- data/health-law.js: 보건의료기본법·의료법 60문항
- data/medical-records.js: 보건의료정보관리·의무기록 39문항
- app.js: 화면과 풀이 저장
- core.js: 데이터 검증과 채점

객관식·복수정답·OX·단답형을 지원합니다. 문제 ID는 유지하고 기존 내용이나 정답을 변경하면 문제집 version을 올려 저장 기록과 구분하세요.

[문항 교정 기록](docs/CONTENT_REVIEW.md). 원본 파일은 .local-backup/에 보관하며 Git에 포함하지 않습니다. 전체 문항에 대한 전문 감수 완료를 의미하지는 않습니다.
