const {test,expect}=require('@playwright/test');

test('간단한 화면에서 기존·신규 문제집을 선택하고 기록을 분리한다',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');
  await expect(page).toHaveTitle('중간고사 대비 문제풀기');
  await expect(page.locator('h1')).toHaveText('중간고사 대비 문제풀기');
  await expect(page.locator('body')).not.toContainText('차곡');
  await expect(page.locator('#setSelect option')).toHaveCount(2);
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
  await expect(page.locator('#next')).toBeDisabled();
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
  await page.goto('./');await page.locator('input[value="2"]').check();await page.locator('#submitAnswer').click();
  await expect(page.locator('#feedback')).toHaveText('정답');
  await expect(page.locator('#saveStatus')).toContainText('저장할 수 없습니다');
});
