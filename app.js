'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const core = QuizCore;
  const sets = window.QUIZ_SETS || [];
  try {
    core.validate(sets);
  } catch (error) {
    $('questionTitle').textContent = '문제를 불러오지 못했습니다.';
    $('notice').textContent = error.message;
    $('notice').hidden = false;
    return;
  }

  // Keep the existing storage keys so earlier answers remain available.
  const lastSetKey = 'chagok-quiz:last-set';
  let set = sets[0];
  let answers = {};
  let index = 0;
  let draft = null;
  try {
    set = sets.find(item => item.id === localStorage.getItem(lastSetKey)) || set;
  } catch {}

  const storageKey = () => 'chagok-quiz:v1:' + set.id + ':' + set.version;
  function save() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify({ answers, currentId: set.questions[index].id }));
      localStorage.setItem(lastSetKey, set.id);
      $('saveStatus').hidden = true;
    } catch {
      $('saveStatus').textContent = '풀이 기록을 저장할 수 없습니다.';
      $('saveStatus').hidden = false;
    }
  }

  function restore() {
    answers = {};
    index = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()) || 'null');
      if (saved && saved.answers && typeof saved.answers === 'object') {
        for (const question of set.questions) {
          if (core.validAnswer(question, saved.answers[question.id])) {
            answers[question.id] = saved.answers[question.id];
          }
        }
        index = Math.max(0, set.questions.findIndex(question => question.id === saved.currentId));
      }
    } catch {}
  }

  function answerLabel(question) {
    if (question.type === 'short') return question.answers.join(' / ');
    const numbers = question.type === 'multiple' ? question.answer : [question.answer];
    return numbers.map(number => number + '. ' + question.options[number - 1]).join(' / ');
  }

  function render(focus = false) {
    const question = set.questions[index];
    const saved = answers[question.id];
    const answered = core.validAnswer(question, saved);
    const stats = core.stats(set.questions, answers);
    draft = null;
    $('notice').hidden = true;
    $('category').textContent = question.category + ' · ' + question.id + '번';
    $('questionTitle').textContent = question.title;
    $('stats').textContent = '푼 문제 ' + stats.answered + '/' + stats.total + ' · 정답 ' + stats.correct + ' · 오답 ' + stats.wrong;
    $('position').textContent = (index + 1) + ' / ' + set.questions.length;
    $('prev').disabled = index === 0;
    $('next').disabled = index === set.questions.length - 1;
    $('instruction').textContent = question.type === 'multiple' ? '정답을 모두 선택하세요.' : '';
    $('feedback').textContent = '';
    $('submitAnswer').hidden = answered;
    $('explanation').open = answered;
    $('correctAnswer').textContent = '정답: ' + answerLabel(question);
    $('explanationText').textContent = question.explanation;
    $('options').replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = '정답 선택';
    $('options').append(legend);

    if (question.type === 'short') {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'short';
      input.className = 'short-input';
      input.maxLength = 500;
      input.autocomplete = 'off';
      input.setAttribute('aria-label', '단답형 정답');
      input.value = answered ? saved : '';
      input.disabled = answered;
      input.addEventListener('input', () => { draft = input.value; });
      $('options').append(input);
    } else {
      question.options.forEach((text, offset) => {
        const number = offset + 1;
        const label = document.createElement('label');
        label.className = 'option';
        const input = document.createElement('input');
        input.type = question.type === 'multiple' ? 'checkbox' : 'radio';
        input.name = 'answer';
        input.value = number;
        input.disabled = answered;
        input.checked = answered && (Array.isArray(saved) ? saved.includes(number) : saved === number);
        const content = document.createElement('span');
        content.textContent = number + '. ' + text;
        label.append(input, content);
        if (answered) {
          const correct = question.type === 'multiple' ? question.answer.includes(number) : question.answer === number;
          if (correct) label.classList.add('correct');
          else if (input.checked) label.classList.add('incorrect');
        }
        input.addEventListener('change', () => {
          draft = question.type === 'multiple'
            ? [...$('options').querySelectorAll('input:checked')].map(item => +item.value)
            : number;
        });
        $('options').append(label);
      });
    }

    if (answered) {
      const correct = core.isCorrect(question, saved);
      $('feedback').className = correct ? 'correct-text' : 'wrong-text';
      $('feedback').textContent = correct ? '정답' : '오답';
    }
    $('sources').replaceChildren();
    for (const source of question.sources || []) {
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:') continue;
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = source.title;
        $('sources').append(link);
      } catch {}
    }
    $('questionSelect').replaceChildren();
    for (const item of set.questions) {
      const done = core.validAnswer(item, answers[item.id]);
      const status = done ? (core.isCorrect(item, answers[item.id]) ? ' · 정답' : ' · 오답') : '';
      $('questionSelect').add(new Option(item.id + '번' + status, String(item.id)));
    }
    $('questionSelect').value = String(question.id);
    if (focus) $('questionTitle').focus({ preventScroll: true });
  }

  $('answerForm').addEventListener('submit', event => {
    event.preventDefault();
    const question = set.questions[index];
    if (core.validAnswer(question, answers[question.id])) return;
    if (!core.validAnswer(question, draft)) {
      $('notice').textContent = question.type === 'short' ? '정답을 입력하세요.' : '답을 선택하세요.';
      $('notice').hidden = false;
      return;
    }
    answers[question.id] = draft;
    save();
    render();
  });
  $('prev').addEventListener('click', () => {
    if (index > 0) { index--; render(true); save(); }
  });
  $('next').addEventListener('click', () => {
    if (index < set.questions.length - 1) { index++; render(true); save(); }
  });
  $('questionSelect').addEventListener('change', event => {
    index = set.questions.findIndex(question => String(question.id) === event.target.value);
    render(true);
    save();
  });
  $('setSelect').addEventListener('change', event => {
    save();
    set = sets.find(item => item.id === event.target.value);
    restore();
    render();
    save();
  });
  $('reset').addEventListener('click', () => {
    if (!confirm('선택한 문제집의 풀이 기록을 지울까요?')) return;
    answers = {};
    index = 0;
    render();
    save();
  });

  for (const item of sets) $('setSelect').add(new Option(item.title, item.id));
  $('setSelect').value = set.id;
  restore();
  render();
})();
