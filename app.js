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
  let drafts = {};
  let index = 0;
  let draft = null;
  try {
    set = sets.find(item => item.id === localStorage.getItem(lastSetKey)) || set;
  } catch {}

  const storageKey = () => 'chagok-quiz:v1:' + set.id + ':' + set.version;
  function save() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify({ answers, drafts, currentId: set.questions[index].id }));
      localStorage.setItem(lastSetKey, set.id);
      $('saveStatus').hidden = true;
    } catch {
      $('saveStatus').textContent = '풀이 기록을 저장할 수 없습니다.';
      $('saveStatus').hidden = false;
    }
  }

  function restore() {
    answers = {};
    drafts = {};
    index = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()) || 'null');
      if (saved && saved.answers && typeof saved.answers === 'object') {
        for (const question of set.questions) {
          if (core.validAnswer(question, saved.answers[question.id])) {
            answers[question.id] = saved.answers[question.id];
          }
        }
        for (const question of set.questions) {
          const value = saved.drafts?.[question.id];
          if (validDraft(question, value)) drafts[question.id] = value;
        }
        index = Math.max(0, set.questions.findIndex(question => question.id === saved.currentId));
      }
    } catch {}
  }

  function validDraft(question, value) {
    if (question.type === 'short') return typeof value === 'string' && value.length <= 500;
    if (question.type === 'multiple') {
      return Array.isArray(value) && new Set(value).size === value.length
        && value.every(number => Number.isInteger(number) && number >= 1 && number <= question.options.length);
    }
    return core.validAnswer(question, value);
  }

  function rememberDraft(value) {
    draft = value;
    drafts[set.questions[index].id] = value;
    save();
    $('notice').hidden = true;
  }

  function firstUnanswered() {
    return set.questions.findIndex(question => !core.validAnswer(question, answers[question.id]));
  }

  $('questionImage').addEventListener('load', () => { $('imageError').hidden = true; });
  $('questionImage').addEventListener('error', () => {
    if (!$('questionFigure').hidden) $('imageError').hidden = false;
  });

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
    const hasDraft = Object.hasOwn(drafts, question.id);
    const editing = answered && hasDraft;
    const locked = answered && !editing;
    const selected = hasDraft ? drafts[question.id] : saved;
    draft = hasDraft || editing ? selected : null;
    $('notice').hidden = true;
    $('category').textContent = question.category + ' · ' + question.id + '번';
    $('questionTitle').textContent = question.title;
    $('questionFigure').hidden = !question.image;
    $('imageError').hidden = true;
    if (question.image) {
      $('questionImage').alt = question.image.alt;
      $('questionImage').src = question.image.src;
      $('imageLink').href = question.image.src;
    } else {
      $('questionImage').removeAttribute('src');
      $('questionImage').alt = '';
      $('imageLink').removeAttribute('href');
    }
    $('stats').textContent = '푼 문제 ' + stats.answered + '/' + stats.total + ' · 정답 ' + stats.correct + ' · 오답 ' + stats.wrong;
    $('position').textContent = (index + 1) + ' / ' + set.questions.length;
    $('prev').disabled = index === 0;
    const last = index === set.questions.length - 1;
    const remaining = firstUnanswered();
    $('next').disabled = last && (remaining === -1 || remaining === index);
    $('next').textContent = last
      ? (remaining === -1 ? '풀이 완료' : remaining === index ? '마지막 문제' : '미응답 풀기 →')
      : '다음 문제 →';
    $('completion').hidden = stats.unanswered !== 0;
    $('completion').textContent = stats.unanswered === 0
      ? '문제집 풀이 완료 · 정답 ' + stats.correct + '/' + stats.total + ' · 오답 ' + stats.wrong
      : '';
    $('instruction').textContent = editing ? '답 수정 중' : question.type === 'multiple' ? '정답을 모두 선택하세요.' : '';
    $('feedback').textContent = '';
    $('submitAnswer').hidden = locked;
    $('submitAnswer').textContent = editing ? '수정한 답 확인' : '정답 확인';
    $('editAnswer').hidden = !answered;
    $('editAnswer').textContent = editing ? '수정 취소' : '답 수정';
    $('explanation').open = locked;
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
      input.value = selected ?? '';
      input.disabled = locked;
      input.addEventListener('input', () => rememberDraft(input.value));
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
        input.disabled = locked;
        input.checked = Array.isArray(selected) ? selected.includes(number) : selected === number;
        const content = document.createElement('span');
        content.textContent = number + '. ' + text;
        label.append(input, content);
        if (locked) {
          const correct = question.type === 'multiple' ? question.answer.includes(number) : question.answer === number;
          if (correct) label.classList.add('correct');
          else if (input.checked) label.classList.add('incorrect');
        }
        input.addEventListener('change', () => {
          rememberDraft(question.type === 'multiple'
            ? [...$('options').querySelectorAll('input:checked')].map(item => +item.value)
            : number);
        });
        $('options').append(label);
      });
    }

    if (locked) {
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
    if (focus) {
      $('questionTitle').focus({ preventScroll: true });
      $('questionCard').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  $('answerForm').addEventListener('submit', event => {
    event.preventDefault();
    const question = set.questions[index];
    if (core.validAnswer(question, answers[question.id]) && !Object.hasOwn(drafts, question.id)) return;
    if (!core.validAnswer(question, draft)) {
      $('notice').textContent = question.type === 'short' ? '정답을 입력하세요.' : '답을 선택하세요.';
      $('notice').hidden = false;
      return;
    }
    answers[question.id] = draft;
    delete drafts[question.id];
    save();
    render();
  });
  $('editAnswer').addEventListener('click', () => {
    const question = set.questions[index];
    if (Object.hasOwn(drafts, question.id)) {
      delete drafts[question.id];
    } else {
      const saved = answers[question.id];
      drafts[question.id] = Array.isArray(saved) ? [...saved] : saved;
    }
    render();
    save();
  });
  $('prev').addEventListener('click', () => {
    if (index > 0) { index--; render(true); save(); }
  });
  $('next').addEventListener('click', () => {
    if (index < set.questions.length - 1) index++;
    else {
      const remaining = firstUnanswered();
      if (remaining < 0) return;
      index = remaining;
    }
    render(true);
    save();
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
    render(true);
    save();
  });
  $('reset').addEventListener('click', () => {
    if (!confirm('선택한 문제집의 제출한 답과 작성 중인 답을 모두 지울까요?')) return;
    answers = {};
    drafts = {};
    index = 0;
    render();
    save();
  });

  for (const item of sets) $('setSelect').add(new Option(item.title, item.id));
  $('setSelect').value = set.id;
  restore();
  render();
})();
