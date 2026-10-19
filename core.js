/* Shared scoring and question validation. No DOM dependency. */
(function(root){
'use strict';
const normalize = value => String(value).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ko');
function validate(sets) {
 if (!Array.isArray(sets) || !sets.length) throw Error('문제집이 없습니다.');
 const setIds = new Set();
 for (const set of sets) {
  if (!set.id || setIds.has(set.id) || !set.title || !Array.isArray(set.questions) || !set.questions.length) throw Error('문제집 구성이 올바르지 않습니다.');
  setIds.add(set.id); const ids = new Set();
  for (const q of set.questions) {
   if (!q.id || ids.has(q.id) || !q.title || !q.explanation) throw Error('문항 ID, 제목, 해설을 확인하세요.');
   ids.add(q.id);
   if (q.image && (typeof q.image.src !== 'string' || !/^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(q.image.src) || typeof q.image.alt !== 'string' || !q.image.alt.trim())) throw Error('문제 이미지 경로와 설명을 확인하세요.');
   if (!['single','multiple','boolean','short'].includes(q.type)) throw Error('지원하지 않는 문항 유형: '+q.type);
   if (q.type === 'short') { if (!Array.isArray(q.answers) || !q.answers.length || q.answers.some(a=>typeof a!=='string'||!a.trim())) throw Error('단답형 정답을 확인하세요.'); }
   else {
    if (!Array.isArray(q.options) || q.options.length<2 || q.options.some(o=>typeof o!=='string'||!o.trim())) throw Error('선택지를 확인하세요.');
    if (q.type==='boolean' && q.options.length!==2) throw Error('OX 선택지는 두 개여야 합니다.');
    const answers = q.type==='multiple' ? q.answer : [q.answer];
    if (!Array.isArray(answers) || !answers.length || new Set(answers).size!==answers.length || answers.some(a=>!Number.isInteger(a)||a<1||a>q.options.length)) throw Error('정답 번호를 확인하세요.');
   }
  }
 }
 return sets;
}
function validAnswer(q,a) {
 if (q.type==='short') return typeof a==='string' && !!a.trim();
 if (q.type==='multiple') return Array.isArray(a)&&a.length>0&&new Set(a).size===a.length&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=q.options.length);
 return Number.isInteger(a)&&a>=1&&a<=q.options.length;
}
function isCorrect(q,a) {
 if (!validAnswer(q,a)) return false;
 if (q.type==='short') return q.answers.some(v=>normalize(v)===normalize(a));
 if (q.type==='multiple') return a.length===q.answer.length&&q.answer.every(n=>a.includes(n));
 return q.answer===a;
}
function stats(questions, answers) {
 let answered=0, correct=0;
 for(const q of questions) if(validAnswer(q,answers[q.id])) {answered++; if(isCorrect(q,answers[q.id]))correct++;}
 return {total:questions.length,answered,correct,wrong:answered-correct,unanswered:questions.length-answered,percent:Math.round(correct/questions.length*100)};
}
function shuffle(questions, random = Math.random) {
 const result = [...questions];
 for (let i = result.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [result[i], result[j]] = [result[j], result[i]];
 }
 if (result.length > 1 && result.every((q, i) => q.id === questions[i].id)) {
  [result[0], result[1]] = [result[1], result[0]];
 }
 return result;
}
root.QuizCore={validate,validAnswer,isCorrect,stats,shuffle};
})(globalThis);

