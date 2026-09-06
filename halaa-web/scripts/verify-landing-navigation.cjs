const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const base=process.env.BASE_URL||'http://localhost:3000';
  try {
    for(const lang of ['ar','en']) {
      const context=await browser.newContext({viewport:{width:390,height:844}});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`${base}/${lang}`);
      await page.getByRole('button',{name:lang==='ar'?'فتح القائمة':'Open menu',exact:true}).click();
      await page.locator('#mobile-navigation a[href$="/login"]').click();
      await page.waitForURL(`**/${lang}/login`);
      await page.locator('input[name="phoneNumber"]').waitFor();
      const loginText=await page.locator('body').innerText();
      assert.doesNotMatch(loginText,/login\.[a-zA-Z]|signup\.[a-zA-Z]/);
      assert.ok(loginText.includes(lang==='ar'?'تسجيل الدخول':'Login'));
      // Routing hints permit checking dictionary serialization in initial HTML;
      // they are NOT authentication. Do not access real account APIs or claim
      // authenticated workflow coverage from these shell checks.
      // Admin requires a real server-validated session. Its namespace choice is
      // unit-tested; authenticated admin flow remains a release smoke check.
      for(const [role,route] of [['host','host'],['vendor','vendor-dashboard']]) {
        const response=await fetch(`${base}/${lang}/${route}`,{headers:{cookie:`userType=${role}; profileCompleted=true; NEXT_LOCALE=${lang}`}});
        assert.equal(response.status,200);
        const html=await response.text();
        assert.match(html,/noindex/);
        assert.match(html,/adminDashboard/);
      }
      // Fresh anonymous context for language/keyboard and public metadata.
      await context.clearCookies();
      await page.goto(`${base}/${lang}`);
      const other=lang==='ar'?'en':'ar';
      await page.locator('header a[aria-label][href="/'+other+'"]').filter({visible:true}).click();
      await page.waitForURL(`**/${other}`);
      assert.equal(await page.locator('html').getAttribute('lang'),other);
      assert.equal(await page.locator('html').getAttribute('dir'),other==='ar'?'rtl':'ltr');
      const tab=page.locator('[role="tab"]').first();
      await tab.focus();
      await tab.press(other==='ar'?'ArrowLeft':'ArrowRight');
      assert.equal(await page.locator('[role="tab"][aria-selected="true"]').getAttribute('aria-controls'),'how-it-works-panel-1');
      assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-selected')),'true');
      for(const suffix of ['', '/privacy','/market-place']) {
        await page.goto(`${base}/${other}${suffix}`);
        for(const name of ['og:image','twitter:image']) {
          const image=await page.locator(`meta[property="${name}"],meta[name="${name}"]`).first().getAttribute('content');
          assert.ok(image?.startsWith('https://halaa.com.sa/'), `${name}: ${image}`);
        }
      }
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({lang,clientLoginNavigation:true,roleShells:'initial HTML dictionaries/noindex only',languageSwitch:true,keyboardTour:true,absoluteSocialImages:true,errors}));
      await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
