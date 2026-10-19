const {test,expect}=require('@playwright/test');

// Existing scenarios continue saved sessions in the original sequence.
test.beforeEach(async ({page}, testInfo) => {
  if (testInfo.title.startsWith('shuffle:')) return;
  await page.addInitScript(() => {
    if (sessionStorage.getItem('test-seeded')) return;
    for (const id of ['health-70','health-law-60','medical-records-66','quality-safety-29','hospital-finance-70']) {
      localStorage.setItem('chagok-quiz:v1:' + id + ':1', JSON.stringify({answers:{}}));
    }
    sessionStorage.setItem('test-seeded','1');
  });
});

test('shuffle: fresh sessions shuffle, resume preserves order, reset reshuffles', async ({page}) => {
  await page.goto('./');
  const order = () => page.locator('#questionSelect option').evaluateAll(items => items.map(item => item.value));
  const first = await order();
  const original = await page.evaluate(() => window.QUIZ_SETS[0].questions.map(q => String(q.id)));
  expect(first).not.toEqual(original);
  expect([...first].sort()).toEqual([...original].sort());
  await page.getByRole('radio').first().check();
  await page.locator('#submitAnswer').click();
  const feedback = await page.locator('#feedback').textContent();
  await page.locator('#next').click();
  await page.reload();
  expect(await order()).toEqual(first);
  await expect(page.locator('#questionSelect')).toHaveValue(first[1]);
  await page.locator('#prev').click();
  await expect(page.locator('#feedback')).toHaveText(feedback);
  await page.locator('#setSelect').selectOption('health-law-60');
  const secondSet = await order();
  await page.locator('#setSelect').selectOption('health-70');
  expect(await order()).toEqual(first);
  page.once('dialog',dialog => dialog.dismiss());
  await page.locator('#reset').click();
  expect(await order()).toEqual(first);
  page.once('dialog',dialog => dialog.accept());
  await page.locator('#reset').click();
  const reset = await order();
  expect(reset).not.toEqual(first);
  expect([...reset].sort()).toEqual([...first].sort());
  await expect(page.locator('#position')).toHaveText('1 / 70');
  await expect(page.locator('#stats')).toContainText('0/70');
  await page.reload();
  expect(await order()).toEqual(reset);
  await page.locator('#setSelect').selectOption('health-law-60');
  expect(await order()).toEqual(secondSet);
});

test('간단한 화면에서 기존·신규 문제집을 선택하고 기록을 분리한다',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');
  await expect(page).toHaveTitle('중간고사 대비 문제풀기');
  await expect(page.locator('h1')).toHaveText('중간고사 대비 문제풀기');
  await expect(page.locator('body')).not.toContainText('차곡');
  await expect(page.locator('#setSelect option')).toHaveCount(5);
  await expect(page.locator('#questionSelect option')).toHaveCount(70);
  await page.locator('input[value="2"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await page.locator('#setSelect').selectOption('health-law-60');
  await expect(page.locator('#questionSelect option')).toHaveCount(60);
  await expect(page.locator('#questionTitle')).toContainText('보건의료기본법의 목적');
  await page.locator('input[value="2"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await expect(page.locator('#explanation')).toHaveAttribute('open','');
  await page.locator('#next').click();
  await expect(page.locator('#category')).toContainText('2번');
  await page.reload();
  await expect(page.locator('#setSelect')).toHaveValue('health-law-60');
  await expect(page.locator('#category')).toContainText('2번');
  await expect(page.locator('#stats')).toContainText('푼 문제 1/60');
  await page.locator('#setSelect').selectOption('health-70');
  await expect(page.locator('#stats')).toContainText('푼 문제 1/70');
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(size.scroll).toBeLessThanOrEqual(size.width);
  expect(errors).toEqual([]);
});

test('미응답 처리, 복수정답, 해설 열람, 마지막 문항, 초기화',async({page})=>{
  await page.goto('./');
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#notice')).toHaveText('답을 선택하세요.');
  await page.locator('#explanation summary').click();
  await expect(page.locator('#correctAnswer')).toBeVisible();
  await expect(page.locator('#stats')).toContainText('푼 문제 0/70');
  await page.locator('#questionSelect').selectOption('9');
  await expect(page.locator('#instruction')).toHaveText('정답을 모두 선택하세요.');
  await page.locator('input[value="2"]').check();
  await page.locator('input[value="3"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await page.locator('#setSelect').selectOption('health-law-60');
  await page.locator('#questionSelect').selectOption('24');
  await page.locator('input[value="1"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await expect(page.locator('#explanationText')).toContainText('선고유예');
  await page.locator('#questionSelect').selectOption('60');
  await expect(page.locator('#next')).toHaveText('미응답 풀기 →');
  await page.locator('#next').click();
  await expect(page.locator('#questionSelect')).toHaveValue('1');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#reset').click();
  await expect(page.locator('#stats')).toContainText('푼 문제 0/60');
  await page.locator('#setSelect').selectOption('health-70');
  await expect(page.locator('#stats')).toContainText('푼 문제 1/70');
});

test('기존 기록과 OX·단답형을 계속 사용할 수 있다',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('chagok-quiz:v1:health-70:1',JSON.stringify({answers:{1:2},currentId:1,category:'보건의료법규'}));
    window.QUIZ_SETS=[{id:'test',version:1,title:'테스트',questions:[{id:1,type:'boolean',title:'OX 문제',category:'기본',options:['O','X'],answer:1,explanation:'해설'},{id:2,type:'short',title:'영어로 신장',category:'기본',answers:['kidney'],explanation:'해설'}]}];
  });
  await page.goto('./');
  await page.locator('#questionSelect').selectOption('1');
  await page.locator('input[value="1"]').check();await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await page.locator('#next').click();await page.locator('input[name="short"]').fill(' KIDNEY ');
  await page.locator('#submitAnswer').click();await expect(page.locator('#feedback')).toHaveText('정답');
  await page.locator('#setSelect').selectOption('health-70');
  await expect(page.locator('#stats')).toContainText('푼 문제 1/70');
  await expect(page.locator('input[value="2"]')).toBeChecked();
});

test('저장소가 손상되거나 저장이 막혀도 문제를 풀 수 있다',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('chagok-quiz:v1:health-70:1','{invalid');Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('blocked');}});});
  await page.goto('./');await page.locator('#questionSelect').selectOption('1');await page.locator('input[value="2"]').check();await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await expect(page.locator('#saveStatus')).toContainText('저장할 수 없습니다');
});


test('제출 전 선택은 문제 이동·새로고침·문제집 전환 후에도 유지된다', async ({page}) => {
  await page.goto('./');
  await page.locator('input[value="1"]').check();
  await page.locator('#next').click();
  await page.locator('#prev').click();
  await expect(page.locator('input[value="1"]')).toBeChecked();
  await expect(page.locator('#stats')).toContainText('푼 문제 0/70');
  await page.reload();
  await expect(page.locator('input[value="1"]')).toBeChecked();
  await page.locator('#setSelect').selectOption('health-law-60');
  await page.locator('input[value="2"]').check();
  await page.locator('#setSelect').selectOption('health-70');
  await expect(page.locator('input[value="1"]')).toBeChecked();
  await page.locator('#questionSelect').selectOption('9');
  await page.locator('input[value="2"]').check();
  await page.reload();
  await expect(page.locator('input[value="2"]')).toBeChecked();
  await expect(page.locator('input[value="3"]')).not.toBeChecked();
  await page.locator('input[value="3"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
});

test('답 수정·취소 및 재제출은 같은 문항을 중복 집계하지 않는다', async ({page}) => {
  await page.goto('./');
  await page.locator('input[value="1"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#stats')).toContainText('정답 0 · 오답 1');
  await page.locator('#editAnswer').click();
  await expect(page.locator('input[value="2"]')).toBeEnabled();
  await page.locator('input[value="2"]').check();
  await page.locator('#next').click();
  await page.locator('#prev').click();
  await expect(page.locator('input[value="2"]')).toBeChecked();
  await page.reload();
  await expect(page.locator('#instruction')).toHaveText('답 수정 중');
  await expect(page.locator('#stats')).toContainText('정답 0 · 오답 1');
  await page.locator('#editAnswer').click();
  await expect(page.locator('input[value="1"]')).toBeChecked();
  await expect(page.locator('#feedback')).toHaveText('오답');
  await page.locator('#editAnswer').click();
  await page.locator('input[value="2"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await expect(page.locator('#stats')).toHaveText('푼 문제 1/70 · 정답 1 · 오답 0');
  await page.reload();
  await expect(page.locator('#stats')).toHaveText('푼 문제 1/70 · 정답 1 · 오답 0');
});

test('마지막 문항 제출 시 완료와 최종 개수를 표시하고 초기화 취소를 지원한다', async ({page}) => {
  await page.goto('./');
  await page.evaluate(() => {
    const set = window.QUIZ_SETS[0];
    const answers = Object.fromEntries(set.questions.slice(0,-1).map(q => [q.id,q.answer]));
    localStorage.setItem('chagok-quiz:v1:health-70:1', JSON.stringify({answers,currentId:70}));
  });
  await page.reload();
  await expect(page.locator('#completion')).toBeHidden();
  await page.locator('input[value="4"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#completion')).toHaveText('문제집 풀이 완료 · 정답 70/70 · 오답 0');
  await expect(page.locator('#next')).toHaveText('풀이 완료');
  await expect(page.locator('#next')).toBeDisabled();
  await page.locator('#editAnswer').click();
  await page.locator('input[value="1"]').check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#completion')).toContainText('정답 69/70 · 오답 1');
  await expect(page.locator('#reset')).toHaveText('문제집 초기화');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#reset').click();
  await expect(page.locator('#stats')).toContainText('푼 문제 70/70');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#reset').click();
  await expect(page.locator('#completion')).toBeHidden();
  await expect(page.locator('#stats')).toContainText('푼 문제 0/70');
});

test('긴 해설 아래에서 이동하면 새 문제 상단으로 스크롤된다', async ({page}) => {
  await page.goto('./');
  await page.locator('input[value="2"]').check();
  await page.locator('#submitAnswer').click();
  await page.locator('#explanationText').evaluate(el => { el.textContent = '긴 해설\n'.repeat(80); });
  await page.locator('#next').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(1000);
  await page.locator('#next').click();
  await expect(page.locator('#questionSelect')).toHaveValue('2');
  await expect(page.locator('#questionTitle')).toBeFocused();
  const position = await page.locator('#questionTitle').evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: innerHeight, scroll: scrollY };
  });
  // A short question may leave too little page height to align the card at 16px.
  // Require the new heading to be visible and the previous deep scroll to be gone.
  expect(position.top).toBeGreaterThanOrEqual(0);
  expect(position.bottom).toBeLessThanOrEqual(position.viewport);
  expect(position.scroll).toBeLessThan(before);
});


test('의무기록 문제집의 원본 번호·5지선다·줄바꿈·풀이 저장', async ({page}) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');
  await page.locator('#setSelect').selectOption('medical-records-66');
  await expect(page.locator('#questionSelect option')).toHaveCount(66);
  await expect(page.locator('#questionSelect')).toHaveValue('2');
  await expect(page.locator('#position')).toHaveText('1 / 66');
  await expect(page.getByRole('radio')).toHaveCount(5);
  await page.getByRole('radio').nth(2).check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await page.locator('#next').click();
  await expect(page.locator('#questionSelect')).toHaveValue('5');
  await expect(page.locator('#questionTitle')).toContainText('다음 설명에 해당하는');
  await expect(page.locator('#questionTitle')).not.toContainText('<br>');
  expect(await page.locator('#questionTitle').textContent()).toContain('\n- 보건의료 데이터를');
  await page.locator('#questionSelect').selectOption('18');
  await page.getByRole('radio').nth(1).check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await expect(page.locator('#explanationText')).toContainText('의료기사 등에 관한 법률');
  await page.locator('#questionSelect').selectOption('200');
  await expect(page.locator('#position')).toHaveText('66 / 66');
  await page.getByRole('radio').nth(3).check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await page.reload();
  await expect(page.locator('#setSelect')).toHaveValue('medical-records-66');
  await expect(page.locator('#questionSelect')).toHaveValue('200');
  await expect(page.locator('#stats')).toContainText('푼 문제 3/66');
  await page.locator('#prev').click();
  await expect(page.locator('#questionSelect')).toHaveValue('197');
  await page.locator('#setSelect').selectOption('health-70');
  await expect(page.locator('#stats')).toContainText('푼 문제 0/70');
  expect(errors).toEqual([]);
});

test('연속되지 않은 번호의 66문항을 완료하면 완료 개수와 수정 결과가 맞는다',async({page})=>{
  await page.goto('./');
  await page.evaluate(()=>{
    const set=window.QUIZ_SETS.find(s=>s.id==='medical-records-66');
    const answers=Object.fromEntries(set.questions.map(q=>[q.id,q.answer]));
    localStorage.setItem('chagok-quiz:v1:medical-records-66:1',JSON.stringify({answers,currentId:200}));
    localStorage.setItem('chagok-quiz:last-set',set.id);
  });
  await page.reload();
  await expect(page.locator('#completion')).toContainText('정답 66/66 · 오답 0');
  await expect(page.locator('#next')).toHaveText('풀이 완료');
  await page.locator('#editAnswer').click();
  await page.getByRole('radio').nth(0).check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#completion')).toContainText('정답 65/66 · 오답 1');
});


test('교체 전 39문항 기록은 새 66문항 문제집에 섞이지 않는다',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('chagok-quiz:last-set','medical-records-39');
    localStorage.setItem('chagok-quiz:v1:medical-records-39:1',JSON.stringify({answers:{2:3},drafts:{5:4},currentId:131}));
    localStorage.setItem('chagok-quiz:v1:health-law-60:1',JSON.stringify({answers:{1:2},currentId:1}));
  });
  await page.goto('./');
  await expect(page.locator('#setSelect option')).toHaveCount(5);
  await expect(page.locator('#setSelect option[value="medical-records-39"]')).toHaveCount(0);
  await page.locator('#setSelect').selectOption('medical-records-66');
  await expect(page.locator('#stats')).toContainText('푼 문제 0/66');
  await expect(page.locator('#questionSelect')).toHaveValue('2');
  await expect(page.locator('#questionSelect option')).toHaveCount(66);
  await page.locator('#questionSelect').selectOption('132');
  await page.getByRole('radio').nth(2).check();
  await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await page.locator('#setSelect').selectOption('health-law-60');
  await expect(page.locator('#stats')).toContainText('푼 문제 1/60');
});


test('네 그림 문제의 이미지·원본 확대·채점·모바일 크기가 정상이다',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');await page.locator('#setSelect').selectOption('quality-safety-29');
  await expect(page.locator('#questionSelect option')).toHaveCount(29);
  for(const [id,answer] of [[68,2],[80,5],[81,2],[82,1]]){
    await page.locator('#questionSelect').selectOption(String(id));
    await expect(page.locator('#questionImage')).toHaveAttribute('src','assets/quality/question-'+id+'.jpg');
    await expect(page.locator('#questionFigure')).toBeVisible();
    await expect.poll(()=>page.locator('#questionImage').evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
    await expect(page.locator('#imageError')).toBeHidden();
    await expect(page.locator('#imageLink')).toHaveAttribute('href','assets/quality/question-'+id+'.jpg');
    const dimensions=await page.locator('#questionImage').evaluate(img=>({width:img.getBoundingClientRect().width,viewport:innerWidth}));
    expect(dimensions.width).toBeLessThan(dimensions.viewport);
    await page.getByRole('radio').nth(answer-1).check();await page.locator('#submitAnswer').click();
    await expect(page.locator('#feedback')).toHaveText('정답');
  }
  await expect(page.locator('#stats')).toContainText('푼 문제 4/29');
  const popupPromise=page.waitForEvent('popup');
  await page.locator('#imageLink').click();
  const popup=await popupPromise;await popup.waitForLoadState();
  expect(popup.url()).toContain('/assets/quality/question-82.jpg');await popup.close();
  await page.locator('#next').click();
  await expect(page.locator('#questionSelect')).toHaveValue('84');
  await expect(page.locator('#questionFigure')).toBeHidden();
  await expect(page.locator('#questionImage')).not.toHaveAttribute('src',/./);
  await page.locator('#questionSelect').selectOption('74');
  await expect(page.locator('#questionTitle')).not.toContainText('아래 그림');
  await page.locator('#setSelect').selectOption('health-70');
  await expect(page.locator('#questionFigure')).toBeHidden();
  expect(errors).toEqual([]);
});

test('이미지 로드 실패 시 안내하고 다른 문제에 실패 상태를 남기지 않는다',async({page})=>{
  await page.route('**/assets/quality/question-68.jpg',route=>route.abort());
  await page.goto('./');await page.locator('#setSelect').selectOption('quality-safety-29');
  await page.locator('#questionSelect').selectOption('68');
  await expect(page.locator('#imageError')).toBeVisible();
  await page.locator('#questionSelect').selectOption('74');
  await expect(page.locator('#questionFigure')).toBeHidden();
  await expect(page.locator('#imageError')).toBeHidden();
});

test('병원회계·재무관리 문제집의 70문항, 채점, 법령 해설과 저장',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');await page.locator('#setSelect').selectOption('hospital-finance-70');await expect(page.locator('#questionSelect option')).toHaveCount(70);await expect(page.locator('#questionTitle')).toContainText('관리회계');await expect(page.getByRole('radio')).toHaveCount(4);await page.getByRole('radio').nth(2).check();await page.locator('#submitAnswer').click();await expect(page.locator('#feedback')).toHaveText('정답');await page.locator('#questionSelect').selectOption('57');await expect(page.locator('#questionTitle')).toContainText('최소 병상 기준');await page.locator('#explanation summary').click();await expect(page.locator('#sources a')).toHaveAttribute('href',/law.go.kr/);await page.locator('#questionSelect').selectOption('69');await expect(page.locator('#questionTitle')).toContainText('원가 항목으로 분류될 수 있는');await page.getByRole('radio').nth(1).check();await page.locator('#submitAnswer').click();await expect(page.locator('#feedback')).toHaveText('정답');await page.reload();await expect(page.locator('#setSelect')).toHaveValue('hospital-finance-70');await expect(page.locator('#stats')).toContainText('푼 문제 2/70');expect(errors).toEqual([]);});
