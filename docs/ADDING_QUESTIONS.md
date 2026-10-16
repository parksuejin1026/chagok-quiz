# 문제집과 문제 유형 추가

1. data/my-questions.js 파일을 만듭니다.
2. 아래 형식으로 문제집을 등록합니다.
3. index.html에서 data/health.js 다음에 새 파일을 불러옵니다: <script defer src="data/my-questions.js"></script>
4. npm test 및 npm run build로 데이터 유효성을 확인합니다. 추가한 유형의 실제 화면은 npm run preview에서 확인합니다.
5. main에 push하면 자동으로 배포됩니다.

~~~js
window.QUIZ_SETS = window.QUIZ_SETS || [];
window.QUIZ_SETS.push({
  id: 'my-set',
  version: 1,
  title: '새 문제집',
  description: '문제집 소개',
  questions: [
    {
      id: 1, type: 'single', category: '기초',
      title: '1 + 1은?', options: ['1', '2', '3'],
      answer: 2, explanation: '1 + 1 = 2입니다.'
    },
    {
      id: 2, type: 'multiple', category: '기초',
      title: '짝수를 모두 고르세요.', options: ['1', '2', '4'],
      answer: [2, 3], explanation: '2와 4가 짝수입니다.'
    },
    {
      id: 3, type: 'boolean', category: '기초',
      title: '지구는 행성이다.', options: ['O', 'X'],
      answer: 1, explanation: '지구는 태양계의 행성입니다.'
    },
    {
      id: 4, type: 'short', category: '기초',
      title: '사과를 영어로 쓰세요.', answers: ['apple'],
      explanation: 'apple입니다.'
    }
  ]
});
~~~

- 복수정답은 모든 정답을 고르고 오답을 고르지 않았을 때만 정답입니다.
- 단답형은 대소문자, 앞뒤 공백, 연속 공백과 전각 문자를 정규화합니다. 동의어는 answers에 추가하세요. 문장 의미를 추론해 채점하지는 않습니다.
- category는 문제 상단의 분류로 표시됩니다.
- sources: [{ title: '공식 출처', url: 'https://...' }]를 문항에 추가하면 해설에 출처가 표시됩니다.
- 파일 이름에는 공백 없이 영문 소문자와 하이픈을 권장합니다.
- 원본 문항 ID를 변경하거나 재사용하지 마세요. 내용·정답을 변경했다면 version을 올려 기존 저장 답과 충돌을 피하세요.
- 위 예시는 작성 안내용이며 실제 사이트의 문제집으로 등록하지 않습니다.
