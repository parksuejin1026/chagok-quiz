'use strict';
(() => {
const $ = id => document.getElementById(id), C = QuizCore;
const sets = window.QUIZ_SETS || [];
try { C.validate(sets); } catch(e) { $('questionTitle').textContent='문제를 불러오지 못했습니다.'; $('instruction').textContent=e.message; return; }
let set=sets[0], answers={}, index=0, mode='all', category='', draft=null, timer;
const key=()=> 'chagok-quiz:v1:'+set.id+':'+set.version;
const scope=()=>set.questions.filter(q=>!category||q.category===category);
const visible=()=>scope().filter(q=>mode!=='wrong'||(C.validAnswer(q,answers[q.id])&&!C.isCorrect(q,answers[q.id])));
function toast(message){clearTimeout(timer);$('toast').textContent=message;$('toast').hidden=false;timer=setTimeout(()=>$('toast').hidden=true,3500);}
function persist(){try{const q=visible()[index];localStorage.setItem(key(),JSON.stringify({answers,currentId:q?.id,category}));$('saveStatus').textContent='이 브라우저에 자동으로 저장됩니다.';}catch{$('saveStatus').textContent='저장 공간을 사용할 수 없어 이번 풀이만 유지됩니다.';}}
function restore(){answers={};index=0;category='';mode='all';try{const saved=JSON.parse(localStorage.getItem(key())||'null');if(saved&&saved.answers&&typeof saved.answers==='object'){for(const q of set.questions)if(C.validAnswer(q,saved.answers[q.id])) answers[q.id]=saved.answers[q.id];category=set.questions.some(q=>q.category===saved.category)?saved.category:'';index=Math.max(0,scope().findIndex(q=>q.id===saved.currentId));}}catch{$('saveStatus').textContent='이전 기록을 불러올 수 없어 새로 시작합니다.';}}
function loadSet(){restore();$('setDescription').textContent=set.description;const select=$('categorySelect');select.replaceChildren(new Option('전체 범위',''));for(const cat of new Set(set.questions.map(q=>q.category)))select.add(new Option(cat,cat));select.value=category;render();}
function answerLabel(q){if(q.type==='short')return q.answers.join(' / ');const nums=q.type==='multiple'?q.answer:[q.answer];return nums.map(n=>n+'. '+q.options[n-1]).join(' / ');}
function render(focus=false){
 const list=visible();index=Math.min(index,Math.max(0,list.length-1));const q=list[index],s=C.stats(scope(),answers);
 $('stats').replaceChildren();const strong=document.createElement('strong');strong.textContent=s.answered;$('stats').append(strong,document.createTextNode(' / '+s.total+'문항 완료'));const line=document.createElement('div');line.textContent='정답 '+s.correct+' · 오답 '+s.wrong+' · 미응답 '+s.unanswered;$('stats').append(line);$('progress').max=s.total;$('progress').value=s.answered;$('wrongBadge').textContent=s.wrong;
 for(const [id,active] of [['allMode',mode==='all'],['wrongMode',mode==='wrong']]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',active);}
 $('position').textContent=list.length?(index+1)+' / '+list.length+'문항':'0문항';
 $('options').replaceChildren();const legend=document.createElement('legend');legend.className='sr-only';legend.textContent='정답 선택';$('options').append(legend);$('feedback').textContent='';$('explanation').open=false;$('sources').replaceChildren();draft=null;
 $('answerForm').hidden=!q;$('explanation').hidden=!q;$('prev').disabled=!q||index===0;$('next').disabled=!q;
 if(!q){$('category').textContent='오답 복습';$('questionType').textContent='';$('questionTitle').textContent='아직 복습할 오답이 없어요.';$('instruction').textContent='전체 문제에서 학습을 계속해 보세요.';}
 else {
 const saved=answers[q.id], done=C.validAnswer(q,saved);
 $('category').textContent=q.category+' · '+q.id+'번';$('questionType').textContent=({single:'객관식',multiple:'복수정답',boolean:'OX',short:'단답형'})[q.type];$('questionTitle').textContent=q.title;
 $('instruction').textContent=done?'제출한 답은 유지됩니다. 해설을 확인하고 다음 문제로 이동하세요.':q.type==='multiple'?'맞는 답을 모두 선택한 뒤 확인하세요.':q.type==='short'?'정답을 입력한 뒤 확인하세요.':'답을 하나 선택한 뒤 확인하세요.';
 if(q.type==='short'){const input=document.createElement('input');input.type='text';input.className='short-input';input.name='short';input.maxLength=500;input.autocomplete='off';input.setAttribute('aria-label','단답형 정답');input.value=done?saved:'';input.disabled=done;input.addEventListener('input',()=>draft=input.value);$('options').append(input);}
 else q.options.forEach((text,i)=>{const n=i+1,label=document.createElement('label');label.className='option';const input=document.createElement('input');input.type=q.type==='multiple'?'checkbox':'radio';input.name='answer';input.value=n;input.disabled=done;input.checked=done&&(Array.isArray(saved)?saved.includes(n):saved===n);const number=document.createElement('span');number.className='number';number.textContent=String(n).padStart(2,'0');const content=document.createElement('span');content.textContent=text;label.append(input,number,content);if(done){const correct=q.type==='multiple'?q.answer.includes(n):q.answer===n;if(correct)label.classList.add('correct');else if(input.checked)label.classList.add('incorrect');}input.addEventListener('change',()=>{draft=q.type==='multiple'?[...$('options').querySelectorAll('input:checked')].map(el=>+el.value):n;});$('options').append(label);});
 $('submitAnswer').hidden=done;
 if(done){const correct=C.isCorrect(q,saved);$('feedback').className=correct?'correct-text':'wrong-text';$('feedback').textContent=correct?'✓ 정답이에요.':'× 아쉬워요. 해설을 확인해 보세요.';$('explanation').open=true;}
 $('correctAnswer').textContent='정답: '+answerLabel(q);$('explanationText').textContent=q.explanation;
 for(const source of q.sources||[]){try{const url=new URL(source.url);if(url.protocol!=='https:')continue;const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='참고: '+source.title;$('sources').append(a);}catch{}}
 $('next').textContent=index===list.length-1?'결과 확인 →':'다음 문제 →';
 }
 $('grid').replaceChildren();for(const [i,item] of list.entries()){const btn=document.createElement('button'),done=C.validAnswer(item,answers[item.id]);btn.textContent=item.id+(done?(C.isCorrect(item,answers[item.id])?' ✓':' ×'):' —');btn.className=(q?.id===item.id?'current ':'')+(done?(C.isCorrect(item,answers[item.id])?'correct':'incorrect'):'');btn.setAttribute('aria-label',item.id+'번 '+(done?(C.isCorrect(item,answers[item.id])?'정답':'오답'):'미응답'));if(q?.id===item.id)btn.setAttribute('aria-current','step');btn.addEventListener('click',()=>{index=i;render(true);persist();});$('grid').append(btn);}
 if(focus){$('questionTitle').focus({preventScroll:true});$('questionCard').scrollIntoView({block:'start',behavior:'instant'});}
}
function results(){const s=C.stats(scope(),answers);$('resultScope').textContent=set.title+' · '+(category||'전체 범위');$('resultStats').replaceChildren();for(const [value,label] of [[s.percent+'%','총 문항 기준 정답률'],[s.correct,'정답'],[s.wrong,'오답'],[s.unanswered,'미응답']]){const cell=document.createElement('div'),n=document.createElement('strong');n.textContent=value;cell.append(n,document.createTextNode(label));$('resultStats').append(cell);}$('resultMessage').textContent=s.unanswered?'아직 '+s.unanswered+'문항이 남아 있어요. 이어서 풀 수 있습니다.':'모든 문제를 풀었어요. 수고하셨습니다!';$('reviewWrong').disabled=!s.wrong;$('reviewUnanswered').disabled=!s.unanswered;$('resultDialog').showModal();}
$('answerForm').addEventListener('submit',event=>{event.preventDefault();const q=visible()[index];if(!q||C.validAnswer(q,answers[q.id]))return;if(!C.validAnswer(q,draft)){toast(q.type==='short'?'정답을 입력해 주세요.':'답을 선택해 주세요.');return;}answers[q.id]=draft;persist();render();});
$('prev').addEventListener('click',()=>{if(index>0){index--;render(true);persist();}});$('next').addEventListener('click',()=>{if(index<visible().length-1){index++;render(true);persist();}else results();});
$('results').addEventListener('click',results);
$('allMode').addEventListener('click',()=>{mode='all';index=0;render();persist();});$('wrongMode').addEventListener('click',()=>{mode='wrong';index=0;render();});
$('setSelect').addEventListener('change',event=>{persist();set=sets.find(s=>s.id===event.target.value);loadSet();});$('categorySelect').addEventListener('change',event=>{category=event.target.value;index=0;render();persist();});
$('reset').addEventListener('click',()=>{if(!confirm('현재 문제집의 모든 풀이 기록을 초기화할까요?'))return;answers={};index=0;mode='all';persist();render();toast('새로운 풀이를 시작합니다.');});
$('reviewWrong').addEventListener('click',()=>{$('resultDialog').close();mode='wrong';index=0;render(true);});$('reviewUnanswered').addEventListener('click',()=>{$('resultDialog').close();mode='all';index=Math.max(0,visible().findIndex(q=>!C.validAnswer(q,answers[q.id])));render(true);persist();});
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});}
$('textView').addEventListener('click',()=>{$('rawText').value=scope().map(q=>q.id+'. '+q.title+'\n'+(q.options?q.options.map((o,i)=>(i+1)+'. '+o).join('\n'):'')+'\n정답: '+answerLabel(q)+'\n해설: '+q.explanation).join('\n\n');$('textDialog').showModal();});
$('copyText').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('rawText').value);toast('전체 텍스트를 복사했어요.');}catch{$('rawText').focus();$('rawText').select();toast('자동 복사가 제한됐어요. 선택된 텍스트를 직접 복사해 주세요.');}});
$('share').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('퀴즈 링크를 복사했어요.');}catch{toast('주소창의 링크를 복사해서 공유해 주세요.');}});
for(const item of sets)$('setSelect').add(new Option(item.title,item.id));loadSet();
})();
