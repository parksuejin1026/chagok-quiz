const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const context={window:{}};vm.createContext(context);for(const f of ['core.js','data/health.js','data/health-law.js','data/medical-records.js','data/quality-safety.js','data/hospital-finance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);const C=context.QuizCore,sets=context.window.QUIZ_SETS,q=sets[0].questions;
test('70문항 데이터와 정답 범위가 유효하다',()=>{C.validate(sets);assert.equal(q.length,70);});
test('전체 정답·오답·미응답을 구분한다',()=>{assert.equal(C.stats(q,{}).unanswered,70);const answers=Object.fromEntries(q.map(x=>[x.id,x.answer]));assert.equal(C.stats(q,answers).correct,70);assert.equal(C.stats(q,{1:1,2:1}).wrong,1);assert.equal(C.stats(q,{1:1,2:1}).unanswered,68);});
test('복수정답은 누락·과잉 선택을 오답 처리한다',()=>{const x=q.find(x=>x.id===9);assert.equal(C.isCorrect(x,[3,2]),true);assert.equal(C.isCorrect(x,[2]),false);assert.equal(C.isCorrect(x,[1,2,3]),false);assert.equal(C.validAnswer(x,[2,2]),false);});
test('단답형과 OX, 손상된 저장 답을 처리한다',()=>{const x={type:'short',answers:['Kidney','신장']};assert.equal(C.isCorrect(x,'  KIDNEY  '),true);assert.equal(C.isCorrect(x,''),false);assert.equal(C.validAnswer(q[0],999),false);assert.equal(C.validAnswer(q[0],{}),false);assert.equal(C.isCorrect({type:'boolean',options:['O','X'],answer:2},2),true);});
test('새 문제집의 중복 ID와 유효하지 않은 정답을 차단한다',()=>{const copy=JSON.parse(JSON.stringify(sets));copy[0].questions[1].id=1;assert.throws(()=>C.validate(copy));copy[0].questions[1].id=2;copy[0].questions[0].answer=99;assert.throws(()=>C.validate(copy));});

test('기존 두 문제집 130문항의 정답이 유효하다',()=>{C.validate(sets);assert.equal(sets.length,5);const added=sets[1].questions;assert.equal(added.length,60);assert.equal(q.length+added.length,130);assert.equal(added[0].answer,2);assert.equal(added[23].answer,1);const answers=Object.fromEntries(added.map(x=>[x.id,x.answer]));assert.equal(C.stats(added,answers).correct,60);});

test('의무기록 66문항의 원본 번호·5지선다·줄바꿈·정답 연결을 검증한다',()=>{const added=sets.find(s=>s.id==='medical-records-66');C.validate(sets);assert.equal(added.questions.length,66);assert.equal(sets.reduce((sum,s)=>sum+s.questions.length,0),295);assert.equal(added.questions[0].id,2);assert.equal(added.questions.at(-1).id,200);assert.equal(added.questions.find(q=>q.id===18).options[1].includes('보건의료정보관리사'),true);for(const item of added.questions){assert.equal(item.options.length,5);assert.equal(item.title.includes('<br>'),false);assert.equal(item.explanation.includes('<br>'),false);}const answers=Object.fromEntries(added.questions.map(q=>[q.id,q.answer]));assert.equal(C.stats(added.questions,answers).correct,66);});


test('질관리 29문항과 네 사진이 지정된 원본 번호에 연결된다',()=>{
  const set=sets.find(s=>s.id==='quality-safety-29');
  C.validate(sets);assert.equal(set.questions.length,29);
  const pictured=set.questions.filter(q=>q.image);
  assert.equal(JSON.stringify(pictured.map(q=>q.id)),JSON.stringify([68,80,81,82]));
  for(const [id,answer] of [[68,2],[80,5],[81,2],[82,1]]){
    const q=set.questions.find(q=>q.id===id);
    assert.equal(q.answer,answer);
    assert.equal(q.image.src,'assets/quality/question-'+id+'.jpg');
    assert.ok(q.image.alt.trim());
    const image=fs.readFileSync(q.image.src);
    assert.equal(image[0],0xff);assert.equal(image[1],0xd8);
  }
  assert.equal(set.questions.find(q=>q.id===98).answer,3);
  const answers=Object.fromEntries(set.questions.map(q=>[q.id,q.answer]));
  assert.equal(C.stats(set.questions,answers).correct,29);
});

test('이미지는 프로젝트 내부 파일과 대체 설명이 있어야 한다',()=>{
  const copy=JSON.parse(JSON.stringify(sets));
  const q=copy.find(s=>s.id==='quality-safety-29').questions.find(q=>q.image);
  q.image.src='../private.jpg';assert.throws(()=>C.validate(copy));
  q.image.src='https://example.com/image.jpg';assert.throws(()=>C.validate(copy));
  q.image.src='assets/quality/question-68.jpg';q.image.alt='';assert.throws(()=>C.validate(copy));
});

test('병원회계·재무관리 70문항의 정답과 현행 법령 출처를 검증한다',()=>{const set=sets.find(s=>s.id==='hospital-finance-70');C.validate(sets);assert.equal(set.questions.length,70);assert.equal(sets.reduce((sum,s)=>sum+s.questions.length,0),295);for(const q of set.questions){assert.equal(q.type,'single');assert.equal(q.options.length,4);assert.ok(q.answer>=1&&q.answer<=q.options.length);assert.ok(q.options.every(o=>!/^[①②③④⑤]/.test(o)));}const answers=Object.fromEntries(set.questions.map(q=>[q.id,q.answer]));assert.equal(C.stats(set.questions,answers).correct,70);for(const id of [57,58])assert.match(set.questions.find(q=>q.id===id).sources[0].url,/law.go.kr/);assert.match(set.questions.find(q=>q.id===17).explanation,/CI/);});
