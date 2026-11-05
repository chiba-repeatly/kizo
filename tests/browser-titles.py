from browser_support import launch_browser, ARTIFACTS
"""Run after npm start; uses the same Playwright/Chromium setup as browser-smoke.py."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json
with sync_playwright() as p:
 b=launch_browser(p)
 page=b.new_page(viewport={'width':1440,'height':1200},locale='ja-JP',timezone_id='Asia/Tokyo')
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.goto('http://127.0.0.1:8000/')
 expect(page.locator('#title-count')).to_have_text('0 / 115 獲得')
 page.locator('.title-collection > summary').click()
 assert page.locator('.title-tile').count()==115
 assert page.locator('.title-tile button:enabled').count()==0
 page.evaluate('''async()=>{const{initial,today,foods}=await import('./core.js');const s=initial();s.workouts=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i*2);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return{id:`demo-${i}`,date,name:i%2?'プッシュアップ':'スクワット',group:i%2?'胸':'脚',weight:0,reps:10,sets:3}});s.meals=s.workouts.map((w,i)=>({...foods[0],id:`meal-${i}`,date:w.date,grams:100,slot:'昼食'}));localStorage.setItem('kizo.v1',JSON.stringify(s));}''')
 page.reload()
 expect(page.locator('#adventure')).to_contain_text('ハルク級')
 page.locator('.title-collection > summary').click()
 page.locator('#title-category').select_option('自重')
 page.locator('#title-status').select_option('earned')
 assert page.locator('.title-tile').count()==6
 page.locator('[data-title="bodyweight-1"]').click()
 expect(page.locator('#adventure')).to_contain_text('自分が相棒')
 page.reload()
 expect(page.locator('#adventure')).to_contain_text('自分が相棒')
 page.locator('.title-collection > summary').click()
 page.locator('#title-status').select_option('locked')
 assert page.locator('.title-tile button:enabled').count()==0
 page.locator('#title-status').select_option('all')
 page.locator('#title-category').select_option('種目探検')
 assert page.locator('.title-tile').count()==10
 page.locator('#title-category').select_option('')
 # Preview capture shows the live collection with sample records.
 page.locator('.play-label').evaluate("e=>e.textContent='サンプルデータ'")
 page.locator('.title-collection').screenshot(path=str(ARTIFACTS / 'kizo-titles-desktop.png'))
 page.set_viewport_size({'width':390,'height':1100})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('.title-collection').screenshot(path=str(ARTIFACTS / 'kizo-titles-mobile.png'))
 with page.expect_download() as download:
  page.locator('#export').click()
 data=json.loads(Path(download.value.path()).read_text())
 assert data['selectedTitle']=='bodyweight-1' and data['exportCount']==1
 page.locator('#title-category').select_option('バックアップ')
 expect(page.locator('[data-title="export-1"]')).to_be_enabled()
 page.locator('#reset').click()
 expect(page.locator('#title-count')).to_have_text('0 / 115 獲得')
 assert not errors,errors
 b.close()
 print('PASS: 115-title gallery, empty state, filters, locked controls, selection persistence, export, reset, desktop/mobile; no browser exceptions')
