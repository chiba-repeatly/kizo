from browser_support import launch_browser, ARTIFACTS
"""Run with npm start, Python Playwright, and /usr/bin/chromium."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json
with sync_playwright() as p:
 b=launch_browser(p)
 page=b.new_page(viewport={'width':390,'height':900},locale='ja-JP',timezone_id='Asia/Tokyo');errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.clock.install()
 page.goto('http://127.0.0.1:8000/#training')
 expect(page.locator('.heading')).not_to_be_visible()
 expect(page.locator('#workout-list')).to_contain_text('今日の最初の1セット')
 old={'version':1,'goals':{'kcal':2000,'p':120,'f':60,'c':245},'meals':[],'selectedTitle':'days-1','exportCount':2,'workouts':[{'id':'old','date':'2026-11-01','name':'ベンチプレス','group':'胸','weight':60,'reps':10,'sets':3},{'id':'future','date':'2026-12-01','name':'ベンチプレス','group':'胸','weight':90,'reps':5,'sets':3}]}
 raw=json.dumps(old,ensure_ascii=False)
 page.evaluate('(raw)=>localStorage.setItem("kizo.v1",raw)',raw)
 page.reload()
 assert page.evaluate('localStorage.getItem("kizo.v1")')==raw
 assert page.evaluate('localStorage.getItem("kizo.pre-v2")')==raw
 stored=json.loads(page.evaluate('localStorage.getItem("kizo.v2")'))
 assert stored['version']==2 and len(stored['workouts'][0]['sets'])==3
 assert all(s['completed'] for s in stored['workouts'][0]['sets'])
 assert not page.locator('#legacy-export').get_attribute('hidden')
 page.locator('#training-date').fill('2026-11-02');page.locator('#training-date').dispatch_event('change')
 form=page.locator('#workout-form');form.locator('[name=name]').fill(' ベンチプレス ')
 expect(page.locator('#previous-preview')).to_contain_text('2026-11-01')
 expect(page.locator('#previous-preview')).not_to_contain_text('90kg')
 page.locator('#copy-previous').click()
 assert page.locator('.set-row').count()==3
 expect(page.locator('#session-status')).to_contain_text('0セット完了')
 state=lambda:json.loads(page.evaluate('localStorage.getItem("kizo.v2")'))
 assert not any(s['completed'] for w in state()['workouts'] if w['date']=='2026-11-02' for s in w['sets'])
 page.locator('#timer-auto').check()
 page.locator('.set-complete').nth(0).click()
 expect(page.locator('#session-status')).to_contain_text('1セット完了')
 assert state()['timer']['status']=='running'
 page.locator('.timer-chip').click()
 expect(page.locator('.heading')).not_to_be_visible()
 page.locator('nav a[href="#training"]').click()
 page.clock.fast_forward(30000)
 expect(page.locator('#timer-display')).to_have_text('01:00')
 page.locator('#timer-pause').click();page.clock.fast_forward(120000)
 expect(page.locator('#timer-display')).to_have_text('01:00')
 # Timer changes must not erase text in the new exercise form.
 form.locator('[name=name]').fill('スクワット入力中')
 page.locator('#timer-resume').click()
 expect(form.locator('[name=name]')).to_have_value('スクワット入力中')
 page.reload()
 page.locator('#training-date').fill('2026-11-02');page.locator('#training-date').dispatch_event('change')
 assert state()['timer']['status']=='running'
 page.clock.fast_forward(61000)
 expect(page.locator('#timer-message')).to_contain_text('終了')
 assert state()['timer']['status']=='finished'
 page.locator('#timer-auto').uncheck()
 # Variable sets: 60x10, 60x8, 55x10 -> 1630kg, all completed.
 field=page.locator('.set-row').nth(1).locator('[name=reps]');field.fill('8');field.dispatch_event('change')
 field=page.locator('.set-row').nth(2).locator('[name=weight]');field.fill('55');field.dispatch_event('change')
 page.locator('.set-complete').nth(1).click();page.locator('.set-complete').nth(2).click()
 expect(page.locator('#history')).to_contain_text('1630kg')
 expect(page.locator('#history')).to_contain_text('60kg：最高10回')
 page.locator('.set-complete').first.click()
 expect(page.locator('#session-status')).to_contain_text('2セット完了')
 page.locator('.set-complete').first.click()
 expect(page.locator('#session-status')).to_contain_text('3セット完了')
 expect(page.locator('#history')).to_contain_text('単純な成長判定はしません')
 page.locator('[data-training-action=copy-set]').last.click()
 assert page.locator('.set-row').count()==4
 expect(page.locator('.set-row').last).to_contain_text('未完了・集計外')
 page.locator('[data-training-action=delete-set]').last.click()
 assert page.locator('.set-row').count()==3
 page.locator('#template-today').click()
 page.locator('#template-name').fill('胸の日')
 page.locator('#template-add').click()
 builder=page.locator('[data-editor-exercise]').last
 builder.locator('[name=name]').fill('デッドバグ');builder.locator('[name=group]').select_option('体幹')
 builder.locator('[data-editor-action=up]').click()
 expect(page.locator('[data-editor-exercise]').first.locator('[name=name]')).to_have_value('デッドバグ')
 page.locator('#template-form').get_by_role('button',name='テンプレート保存',exact=True).click()
 assert len(state()['templates'])==1
 page.locator('[data-template-action=apply]').click()
 expect(page.locator('#training-feedback')).to_contain_text('重複')
 page.locator('#training-date').fill('2026-11-03');page.locator('#training-date').dispatch_event('change')
 page.locator('[data-template-action=apply]').click()
 assert page.locator('.exercise-card').count()==2
 expect(page.locator('#session-status')).to_contain_text('0セット完了')
 page.locator('.set-complete').first.click()
 page.locator('#history-exercise').select_option('デッドバグ')
 expect(page.locator('#history')).to_contain_text('推定1RM 対象なし')
 expect(page.locator('#history svg')).to_have_attribute('aria-label','自重の合計回数の推移。日付・数値は下の表で確認できます。')
 page.locator('#finish-session').click()
 expect(page.locator('#session-result')).to_contain_text('1セット完了')
 expect(page.locator('#session-result')).to_contain_text('未完了3セットは集計外')
 page.locator('#timer-duration').fill('2');page.locator('#timer-duration').dispatch_event('change')
 page.locator('#timer-start').click()
 page.clock.fast_forward(5000)
 expect(page.locator('#timer-display')).to_have_text('00:00')
 page.locator('#timer-reset').click()
 page.reload()
 page.locator('#training-date').fill('2026-11-03');page.locator('#training-date').dispatch_event('change')
 assert page.locator('.exercise-card').count()==2
 assert state()['timer']['duration']==2
 assert len(state()['templates'])==1
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#training-date').fill('2026-11-02');page.locator('#training-date').dispatch_event('change')
 page.evaluate('document.activeElement.blur()')
 page.locator('#training-feedback').evaluate("e=>e.textContent='プレビュー · 検証用サンプルデータ'")
 page.screenshot(path=str(ARTIFACTS / 'kizo-training-mobile.png'))
 page.set_viewport_size({'width':1440,'height':1050})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#training').scroll_into_view_if_needed()
 page.screenshot(path=str(ARTIFACTS / 'kizo-training-desktop.png'))
 # Saved template editing and deletion do not alter today's workouts.
 page.locator('[data-template-action=edit]').click()
 page.locator('#template-name').fill('胸と体幹の日')
 page.locator('#template-form').get_by_role('button',name='テンプレート保存',exact=True).click()
 assert state()['templates'][0]['name']=='胸と体幹の日'
 page.locator('#new-template').click()
 page.locator('#template-name').fill('脚の日')
 page.locator('#template-exercises [name=name]').fill('スクワット')
 page.locator('#template-exercises [name=group]').select_option('脚')
 page.locator('#template-form').get_by_role('button',name='テンプレート保存',exact=True).click()
 assert len(state()['templates'])==2
 page.locator('[data-template-action=delete]').nth(1).click()
 assert len(state()['templates'])==1
 page.locator('#timer-sound').check()
 # JSON v2 retains templates, settings and set completion.
 page.evaluate('location.hash="#settings"')
 with page.expect_download() as d:page.locator('#export').click()
 backup=Path(d.value.path()).read_text();saved=json.loads(backup)
 assert saved['version']==2 and len(saved['templates'])==1 and saved['timer']['duration']==2 and saved['timer']['sound']
 page.locator('#reset').click();assert state()['workouts']==[]
 assert page.evaluate('localStorage.getItem("kizo.v1")') is None
 page.locator('#import').set_input_files({'name':'v2.json','mimeType':'application/json','buffer':backup.encode()})
 expect(page.locator('#notice')).to_contain_text('読み込みました')
 assert state()['templates']==saved['templates']
 page.locator('#import').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':raw.encode()})
 expect(page.locator('#notice')).to_contain_text('読み込みました')
 assert all(s['completed'] for w in state()['workouts'] for s in w['sets'])
 # A failed automatic migration must keep old bytes and expose recovery export.
 blocked=b.new_page()
 blocked.on('pageerror',lambda e:errors.append(str(e)))
 blocked.goto('http://127.0.0.1:8000/')
 blocked.evaluate('(raw)=>localStorage.setItem("kizo.v1",raw)',raw)
 blocked.add_init_script('''const nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='kizo.v2')throw new DOMException('quota','QuotaExceededError');return nativeSet.call(this,k,v);};''')
 blocked.reload()
 expect(blocked.locator('#notice')).to_contain_text('保存を停止')
 assert blocked.evaluate('localStorage.getItem("kizo.v1")')==raw
 assert blocked.evaluate('localStorage.getItem("kizo.v2")') is None
 with blocked.expect_download() as recovery:blocked.locator('#legacy-export').click()
 assert Path(recovery.value.path()).read_text()==raw
 blocked.close()
 assert not errors,errors
 b.close()
 print('PASS: legacy protection, per-set CRUD/completion, previous copy/date filtering, absolute timer, templates/order/duplicates, completed-only history/rewards, persistence, v1/v2 JSON, mobile/desktop')
