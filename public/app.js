const app = document.querySelector("#app");
const storageKey = "bazi-content-engine-user";
const runtime = {
  config: {},
  supabase: null,
};

const stems = [
  { key: "jia", name: "甲", element: "wood", polarity: "陽", title: "開拓策展者" },
  { key: "yi", name: "乙", element: "wood", polarity: "陰", title: "細節編織者" },
  { key: "bing", name: "丙", element: "fire", polarity: "陽", title: "舞台擴散者" },
  { key: "ding", name: "丁", element: "fire", polarity: "陰", title: "洞察點燈者" },
  { key: "wu", name: "戊", element: "earth", polarity: "陽", title: "系統承載者" },
  { key: "ji", name: "己", element: "earth", polarity: "陰", title: "關係調和者" },
  { key: "geng", name: "庚", element: "metal", polarity: "陽", title: "標準制定者" },
  { key: "xin", name: "辛", element: "metal", polarity: "陰", title: "精準美學家" },
  { key: "ren", name: "壬", element: "water", polarity: "陽", title: "流動戰略家" },
  { key: "gui", name: "癸", element: "water", polarity: "陰", title: "直覺研究者" },
];

const branches = [
  { name: "子", element: "water" },
  { name: "丑", element: "earth" },
  { name: "寅", element: "wood" },
  { name: "卯", element: "wood" },
  { name: "辰", element: "earth" },
  { name: "巳", element: "fire" },
  { name: "午", element: "fire" },
  { name: "未", element: "earth" },
  { name: "申", element: "metal" },
  { name: "酉", element: "metal" },
  { name: "戌", element: "earth" },
  { name: "亥", element: "water" },
];

const monthStartTerms = [
  { month: 2, day: 4, order: 0 },
  { month: 3, day: 6, order: 1 },
  { month: 4, day: 5, order: 2 },
  { month: 5, day: 6, order: 3 },
  { month: 6, day: 6, order: 4 },
  { month: 7, day: 7, order: 5 },
  { month: 8, day: 8, order: 6 },
  { month: 9, day: 8, order: 7 },
  { month: 10, day: 8, order: 8 },
  { month: 11, day: 7, order: 9 },
  { month: 12, day: 7, order: 10 },
  { month: 1, day: 6, order: 11 },
];

const elementCreates = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const hiddenStemRatios = {
  子: [{ stem: "癸", ratio: 1 }],
  丑: [{ stem: "己", ratio: 0.33 }, { stem: "癸", ratio: 0.33 }, { stem: "辛", ratio: 0.33 }],
  寅: [{ stem: "甲", ratio: 0.5 }, { stem: "丙", ratio: 0.4 }, { stem: "戊", ratio: 0.1 }],
  卯: [{ stem: "乙", ratio: 1 }],
  辰: [{ stem: "戊", ratio: 0.33 }, { stem: "癸", ratio: 0.33 }, { stem: "乙", ratio: 0.33 }],
  巳: [{ stem: "丙", ratio: 0.5 }, { stem: "戊", ratio: 0.4 }, { stem: "庚", ratio: 0.1 }],
  午: [{ stem: "丁", ratio: 0.5 }, { stem: "己", ratio: 0.5 }],
  未: [{ stem: "己", ratio: 0.4 }, { stem: "丁", ratio: 0.3 }, { stem: "乙", ratio: 0.3 }],
  申: [{ stem: "庚", ratio: 0.5 }, { stem: "壬", ratio: 0.4 }, { stem: "戊", ratio: 0.1 }],
  酉: [{ stem: "辛", ratio: 1 }],
  戌: [{ stem: "戊", ratio: 0.4 }, { stem: "辛", ratio: 0.3 }, { stem: "丁", ratio: 0.3 }],
  亥: [{ stem: "壬", ratio: 0.7 }, { stem: "甲", ratio: 0.3 }],
};

const pillarWeights = {
  year: { stem: 10, branch: 10 },
  month: { stem: 12, branch: 30 },
  day: { stem: 0, branch: 15 },
  hour: { stem: 8, branch: 10 },
};

const elementNames = {
  wood: "創意擴展",
  fire: "表達影響",
  earth: "整合承載",
  metal: "規則精準",
  water: "洞察流動",
};

const elementIndustries = {
  wood: ["AI 教育產品", "內容策展", "品牌策略", "創意顧問"],
  fire: ["短影音教練", "直播銷售", "個人品牌", "社群行銷"],
  earth: ["營運 PM", "社群平台經營", "知識產品管理", "客戶成功"],
  metal: ["AI 流程顧問", "數據分析", "法遵與標準化", "高端服務設計"],
  water: ["市場研究", "AI 自動化顧問", "跨界商務", "策略諮詢"],
};

const tenTalentMap = [
  { id: "resource", label: "學習吸收力", note: "擅長研究、整理、建立安全感與知識框架。" },
  { id: "peer", label: "社群連結力", note: "擅長合作、號召、與同儕互相激勵。" },
  { id: "output", label: "創作表達力", note: "擅長把想法變成內容、作品、方法論。" },
  { id: "wealth", label: "變現執行力", note: "擅長資源配置、銷售轉化、把成果做成收入。" },
  { id: "influence", label: "規範領導力", note: "擅長承擔責任、面對壓力、制定規則與決策。" },
];

const tabs = [
  { id: "home", label: "定位首頁", icon: "⌂" },
  { id: "scripts", label: "腳本主題", icon: "✎" },
  { id: "achievements", label: "成就紀錄", icon: "✓" },
  { id: "wall", label: "影片牆", icon: "▦" },
  { id: "review", label: "AI 評分", icon: "◎" },
];

const state = {
  page: "home",
  user: readUser(),
  wall: readWall(),
  selectedVideo: null,
};

await setupRuntime();
render();

function render() {
  if (!state.user) {
    app.innerHTML = renderAuth();
    bindAuth();
    return;
  }

  const profile = buildProfile(state.user);
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">命</div>
          <div>
            <strong>命定內容引擎</strong>
            <span>BaZi x AI Creator OS</span>
          </div>
        </div>
        <nav class="nav" aria-label="主選單">
          ${tabs.map((tab) => `
            <button class="${state.page === tab.id ? "active" : ""}" data-page="${tab.id}">
              <span>${tab.icon}</span>${tab.label}
            </button>
          `).join("")}
        </nav>
        <div class="mini-profile">
          <span>${profile.dayMaster.name}</span>
          <strong>${escapeHtml(state.user.name)}</strong>
          <small>${profile.dayMaster.title} · ${profile.energyState}</small>
        </div>
        <button class="quiet-button" data-action="logout">登出</button>
      </aside>
      <main class="content">
        ${renderPage(profile)}
      </main>
    </div>
  `;
  bindShell(profile);
}

function renderAuth() {
  return `
    <main class="auth">
      <section class="auth-visual">
        <div class="phone-frame">
          <div class="story-card">
            <span>AI 定位建議</span>
            <strong>把你的天賦變成可拍、可發、可累積的內容賽道</strong>
          </div>
          <div class="energy-ring">
            ${Object.values(elementNames).map((name) => `<i>${name.slice(0, 2)}</i>`).join("")}
          </div>
        </div>
      </section>
      <section class="auth-panel">
        <p class="eyebrow">Sign up</p>
        <h1>用出生資料與真實生活，建立你的 AI 時代發展方向。</h1>
        <form id="auth-form" class="auth-form">
          <div class="form-row">
            <label>名字<input name="name" required maxlength="20" placeholder="Nancy" /></label>
            <label>性別
              <select name="gender" required>
                <option value="">請選擇</option>
                <option>女性</option>
                <option>男性</option>
                <option>非二元 / 不透露</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label>電話<input name="phone" type="tel" required minlength="8" placeholder="09xx-xxx-xxx" /></label>
            <label>密碼<input name="password" type="password" required minlength="6" placeholder="至少 6 碼" /></label>
          </div>
          <div class="form-row">
            <label>出生年月日<input name="birthDate" type="date" required /></label>
            <label>出生時刻<input name="birthTime" type="time" required /></label>
          </div>
          <label>出生地 / 經度<input name="birthPlace" placeholder="台北 / 121.56E" /></label>
          <label>現在的工作<input name="work" required placeholder="例如：品牌顧問、設計師、業務、學生" /></label>
          <label>喜好<input name="hobbies" required placeholder="例如：命理、寫作、拍片、整理知識" /></label>
          <label>一天 24 小時花最多時間的事<input name="focus" required placeholder="例如：研究 AI 工具、照顧客戶、拍短影音" /></label>
          <button type="submit">建立我的定位儀表板</button>
        </form>
      </section>
    </main>
  `;
}

async function setupRuntime() {
  try {
    if (window.EIGHTLATTER_CONFIG) {
      runtime.config = window.EIGHTLATTER_CONFIG;
      if (runtime.config.supabaseUrl && runtime.config.supabaseAnonKey && window.supabase) {
        runtime.supabase = window.supabase.createClient(runtime.config.supabaseUrl, runtime.config.supabaseAnonKey);
      }
      return;
    }

    const response = await fetch("/app-config");
    runtime.config = response.ok ? await response.json() : {};

    if (runtime.config.supabaseUrl && runtime.config.supabaseAnonKey && window.supabase) {
      runtime.supabase = window.supabase.createClient(runtime.config.supabaseUrl, runtime.config.supabaseAnonKey);
    }
  } catch (error) {
    console.warn("Supabase config unavailable; using local prototype mode.", error);
  }
}

function renderPage(profile) {
  if (state.page === "scripts") return renderScripts(profile);
  if (state.page === "achievements") return renderAchievements(profile);
  if (state.page === "wall") return renderWall(profile);
  if (state.page === "review") return renderReview(profile);
  return renderHome(profile);
}

function renderHome(profile) {
  const topIndustries = getCareerDirections(profile);
  return `
    <section class="hero">
      <div>
        <p class="eyebrow">今日定位</p>
        <h2>${escapeHtml(state.user.name)}，你的核心能量是「${profile.dayMaster.title}」。</h2>
        <p>${profile.summary}</p>
      </div>
      <div class="chart-card ${profile.dayMaster.element}">
        <span>${profile.dayMaster.name}</span>
        <strong>${profile.fourPillars}</strong>
        <small>真太陽時與節氣換月需於正式版接天文 API 校正</small>
      </div>
    </section>

    <section class="section-grid two">
      <article class="panel">
        <div class="panel-title">
          <span>01</span>
          <h3>AI 時代可能發展方向</h3>
        </div>
        <div class="career-list">
          ${topIndustries.map((item) => `
            <div class="career-item">
              <strong>${item.title}</strong>
              <p>${item.reason}</p>
            </div>
          `).join("")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-title">
          <span>02</span>
          <h3>十神能量轉譯成擅長</h3>
        </div>
        <div class="talent-list">
          ${profile.talents.map((talent) => `
            <div class="talent-row">
              <div>
                <strong>${talent.label}</strong>
                <small>${talent.note}</small>
              </div>
              <meter min="0" max="100" value="${talent.value}"></meter>
              <b>${talent.value}</b>
            </div>
          `).join("")}
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-title">
        <span>03</span>
        <h3>今天最適合投入的內容角度</h3>
      </div>
      <div class="daily-cards">
        <article><strong>內容主軸</strong><p>${profile.contentAxis}</p></article>
        <article><strong>拍攝任務</strong><p>用 30 到 90 秒說清楚一個「你比觀眾多懂兩步」的問題。</p></article>
        <article><strong>風險提醒</strong><p>${profile.riskNote}</p></article>
      </div>
    </section>
  `;
}

function renderScripts(profile) {
  const scripts = buildScripts(profile);
  return `
    <header class="page-header">
      <p class="eyebrow">Script Studio</p>
      <h2>依你的定位產生 3 個短影音主題</h2>
    </header>
    <section class="script-grid">
      ${scripts.map((script, index) => `
        <article class="script-card">
          <span>主題 ${index + 1}</span>
          <h3>${script.title}</h3>
          <p>${script.angle}</p>
          <div class="script-block">
            <strong>開頭 3 秒</strong>
            <p>${script.hook}</p>
          </div>
          <div class="script-block">
            <strong>內容結構</strong>
            <p>${script.body}</p>
          </div>
          <div class="script-block">
            <strong>CTA</strong>
            <p>${script.cta}</p>
          </div>
          <div class="script-block transcript">
            <strong>30 到 40 秒逐字稿</strong>
            <p>${script.transcript}</p>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderAchievements() {
  const received = getReceivedEncouragements();
  return `
    <header class="page-header">
      <p class="eyebrow">Progress</p>
      <h2>成就紀錄</h2>
    </header>
    <section class="stat-grid">
      <article class="stat"><span>${state.user.posts || 0}</span><strong>已發布影片</strong><small>每支影片都是定位資料</small></article>
      <article class="stat"><span>${state.user.likesGiven || 0}</span><strong>幫別人按讚</strong><small>互動也是成長任務</small></article>
      <article class="stat"><span>${state.user.heartsGiven || 0}</span><strong>送出愛心</strong><small>累積社群正循環</small></article>
      <article class="stat"><span>${state.user.encouragements || 0}</span><strong>鼓勵留言</strong><small>讓社群有溫度</small></article>
    </section>
    <section class="panel">
      <div class="panel-title">
        <span>Badge</span>
        <h3>目前徽章</h3>
      </div>
      <div class="badges">
        <span class="badge unlocked">完成註冊</span>
        <span class="badge ${state.user.posts >= 1 ? "unlocked" : ""}">第一支影片</span>
        <span class="badge ${state.user.likesGiven >= 5 ? "unlocked" : ""}">互動暖場者</span>
        <span class="badge ${state.user.posts >= 7 ? "unlocked" : ""}">七日創作者</span>
      </div>
    </section>
    <section class="panel praise-panel">
      <div class="panel-title">
        <span>Praise</span>
        <h3>收到的鼓勵與稱讚</h3>
      </div>
      ${received.length ? `
        <div class="praise-list">
          ${received.map((item) => `
            <article>
              <strong>${escapeHtml(item.topic)}</strong>
              <p>${escapeHtml(item.comment)}</p>
            </article>
          `).join("")}
        </div>
      ` : `
        <p class="empty-note">你上傳影片後，別人在影片牆留下的鼓勵會集中出現在這裡。</p>
      `}
    </section>
  `;
}

function renderWall() {
  return `
    <header class="page-header wall-header">
      <div>
        <p class="eyebrow">Daily Wall</p>
        <h2>今日影片紀錄牆</h2>
      </div>
      <button data-action="upload-sample">模擬上傳今天影片</button>
    </header>
    <section class="wall-grid">
      ${state.wall.map((video) => `
        <article class="video-card">
          <div class="video-thumb ${video.color}">
            <span>${video.length}</span>
            <strong>${video.topic}</strong>
          </div>
          <div class="video-meta">
            <strong>${video.author}</strong>
            <p>${video.position}</p>
          </div>
          <div class="video-actions">
            <button data-action="like" data-id="${video.id}">讚 ${video.likes}</button>
            <button data-action="heart" data-id="${video.id}">愛心 ${video.hearts}</button>
          </div>
          <form class="encourage-form" data-id="${video.id}">
            <input name="message" placeholder="送出一句鼓勵" />
            <button type="submit">送出</button>
          </form>
          <div class="comments">
            ${video.comments.slice(-2).map((comment) => `<small>${escapeHtml(comment)}</small>`).join("")}
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderReview(profile) {
  const video = state.selectedVideo || state.wall.find((item) => item.author === state.user.name) || state.wall[0];
  const review = reviewVideo(profile, video);
  return `
    <header class="page-header">
      <p class="eyebrow">AI Review</p>
      <h2>依你的個人定位分析今日影片</h2>
    </header>
    <section class="review-layout">
      <article class="panel upload-panel">
        <div class="video-thumb ${video.color}">
          <span>${video.length}</span>
          <strong>${video.topic}</strong>
        </div>
        <label>上傳 90 秒內短影音
          <input type="file" accept="video/*" data-action="file" />
        </label>
        <small>原型版以模擬資料呈現；正式版會串接影片轉文字、畫面偵測與 AI 評分。</small>
      </article>
      <article class="score-card">
        <span>${review.grade}</span>
        <strong>${review.score}</strong>
        <p>${review.level}</p>
      </article>
      <article class="panel">
        <div class="panel-title">
          <span>優點</span>
          <h3>值得保留的地方</h3>
        </div>
        <ul>${review.strengths.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
      <article class="panel">
        <div class="panel-title">
          <span>注意</span>
          <h3>下一支影片要修正</h3>
        </div>
        <ul>${review.improvements.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
    </section>
  `;
}

function bindAuth() {
  document.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.user = {
      ...data,
      posts: 0,
      likesGiven: 0,
      heartsGiven: 0,
      encouragements: 0,
      createdAt: new Date().toISOString(),
    };
    writeUser(state.user);
    await syncProfileToSupabase(state.user);
    render();
  });
}

function bindShell() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      render();
    });
  });

  document.querySelector("[data-action='logout']")?.addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    state.user = null;
    render();
  });

  document.querySelector("[data-action='upload-sample']")?.addEventListener("click", async () => {
    const profile = buildProfile(state.user);
    const sample = {
      id: crypto.randomUUID(),
      author: state.user.name,
      topic: `${profile.contentAxis}的一分鐘拆解`,
      position: profile.dayMaster.title,
      length: "01:18",
      likes: 0,
      hearts: 0,
      comments: ["加油，這個方向很清楚！"],
      color: profile.dayMaster.element,
    };
    sample.remoteId = await syncVideoToSupabase(sample, profile);
    state.wall = [sample, ...state.wall];
    state.user.posts += 1;
    writeUser(state.user);
    writeWall(state.wall);
    render();
  });

  document.querySelectorAll("[data-action='like']").forEach((button) => {
    button.addEventListener("click", () => updateVideo(button.dataset.id, "likes"));
  });

  document.querySelectorAll("[data-action='heart']").forEach((button) => {
    button.addEventListener("click", () => updateVideo(button.dataset.id, "hearts"));
  });

  document.querySelectorAll(".encourage-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = form.elements.message;
      const message = input.value.trim();
      if (!message) return;
      const comment = `${state.user.name}：${message}`;
      const targetVideo = state.wall.find((video) => video.id === form.dataset.id);
      state.wall = state.wall.map((video) => video.id === form.dataset.id
        ? { ...video, comments: [...video.comments, comment] }
        : video);
      state.user.encouragements += 1;
      input.value = "";
      await syncCommentToSupabase(targetVideo, message);
      writeUser(state.user);
      writeWall(state.wall);
      render();
    });
  });
}

async function updateVideo(id, key) {
  const targetVideo = state.wall.find((video) => video.id === id);
  state.wall = state.wall.map((video) => video.id === id ? { ...video, [key]: video[key] + 1 } : video);
  if (key === "likes") state.user.likesGiven += 1;
  if (key === "hearts") state.user.heartsGiven += 1;
  await syncReactionToSupabase(targetVideo, key === "likes" ? "like" : "heart");
  writeUser(state.user);
  writeWall(state.wall);
  render();
}

function getReceivedEncouragements() {
  return state.wall
    .filter((video) => video.author === state.user.name)
    .flatMap((video) => video.comments.map((comment) => ({
      topic: video.topic,
      comment,
    })))
    .slice(-8)
    .reverse();
}

async function syncProfileToSupabase(user) {
  if (!runtime.supabase) return null;

  const credentials = {
    phone: normalizePhone(user.phone),
    password: user.password,
  };

  const authUser = await getOrCreateSupabaseUser(credentials);
  if (!authUser) return null;

  const profile = buildProfile(user);
  const { error: profileError } = await runtime.supabase
    .from("eightlatter_profiles")
    .upsert({
      eightlatter_id: authUser.id,
      eightlatter_display_name: user.name,
      eightlatter_gender: user.gender,
      eightlatter_phone: credentials.phone,
      eightlatter_birth_date: user.birthDate,
      eightlatter_birth_time: user.birthTime,
      eightlatter_birth_place: user.birthPlace || null,
      eightlatter_current_work: user.work,
      eightlatter_hobbies: user.hobbies,
      eightlatter_daily_focus: user.focus,
      eightlatter_positioning_summary: profile.summary,
    });

  if (profileError) {
    console.warn("Supabase profile sync failed", profileError);
    return null;
  }

  const { error: chartError } = await runtime.supabase
    .from("eightlatter_bazi_charts")
    .insert({
      eightlatter_user_id: authUser.id,
      eightlatter_year_pillar: profile.chart.year.name,
      eightlatter_month_pillar: profile.chart.month.name,
      eightlatter_day_pillar: profile.chart.day.name,
      eightlatter_hour_pillar: profile.chart.hour.name,
      eightlatter_day_master: profile.dayMaster.name,
      eightlatter_day_master_element: profile.dayMaster.element,
      eightlatter_energy_state: profile.energyState,
      eightlatter_talent_distribution: profile.talents,
    });

  if (chartError) console.warn("Supabase chart sync failed", chartError);

  user.supabaseUserId = authUser.id;
  writeUser(user);
  return authUser;
}

async function getOrCreateSupabaseUser(credentials) {
  const { data: signUpData, error: signUpError } = await runtime.supabase.auth.signUp(credentials);

  if (signUpData?.user) return signUpData.user;

  if (signUpError) {
    const { data: signInData, error: signInError } = await runtime.supabase.auth.signInWithPassword(credentials);
    if (signInError) {
      console.warn("Supabase auth failed", signInError);
      return null;
    }
    return signInData.user;
  }

  return null;
}

async function syncVideoToSupabase(video, profile) {
  const userId = await ensureSupabaseUserId();
  if (!runtime.supabase || !userId) return null;

  const { data, error } = await runtime.supabase
    .from("eightlatter_videos")
    .insert({
      eightlatter_user_id: userId,
      eightlatter_title: video.topic,
      eightlatter_positioning: profile.dayMaster.title,
      eightlatter_duration_seconds: durationToSeconds(video.length),
      eightlatter_ai_score: null,
      eightlatter_ai_grade: null,
    })
    .select("eightlatter_id")
    .single();

  if (error) {
    console.warn("Supabase video sync failed", error);
    return null;
  }

  return data.eightlatter_id;
}

async function syncReactionToSupabase(video, reactionType) {
  const userId = await ensureSupabaseUserId();
  if (!runtime.supabase || !userId || !video?.remoteId) return;

  const { error } = await runtime.supabase
    .from("eightlatter_video_reactions")
    .upsert({
      eightlatter_video_id: video.remoteId,
      eightlatter_user_id: userId,
      eightlatter_reaction_type: reactionType,
    }, {
      onConflict: "eightlatter_video_id,eightlatter_user_id,eightlatter_reaction_type",
    });

  if (error) console.warn("Supabase reaction sync failed", error);
}

async function syncCommentToSupabase(video, message) {
  const userId = await ensureSupabaseUserId();
  if (!runtime.supabase || !userId || !video?.remoteId) return;

  const { error } = await runtime.supabase
    .from("eightlatter_video_comments")
    .insert({
      eightlatter_video_id: video.remoteId,
      eightlatter_user_id: userId,
      eightlatter_body: message,
    });

  if (error) console.warn("Supabase comment sync failed", error);
}

async function ensureSupabaseUserId() {
  if (state.user?.supabaseUserId) return state.user.supabaseUserId;
  const authUser = await syncProfileToSupabase(state.user);
  return authUser?.id || null;
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function durationToSeconds(value) {
  const [minutes, seconds] = String(value || "0:00").split(":").map(Number);
  return (minutes || 0) * 60 + (seconds || 0);
}

function buildProfile(user) {
  const chart = calculateBazi(user.birthDate, user.birthTime);
  const seed = hash(`${user.birthDate}${user.birthTime}${user.name}${chart.fourPillars}`);
  const dayMaster = chart.day.stem;
  const values = calculateTalentDistribution(chart);
  const strongest = values[0];

  return {
    seed,
    dayMaster,
    chart,
    fourPillars: chart.fourPillars,
    talents: values,
    energyState: seed % 2 ? "偏旺，需要透過輸出與挑戰釋放能量" : "偏弱，適合借助系統、導師與社群放大成果",
    summary: `你目前花最多時間在「${escapeHtml(user.focus)}」，這會成為內容定位的原料。建議把「${escapeHtml(user.work)}」的經驗與「${escapeHtml(user.hobbies)}」的興趣結合，做成可被 AI 放大的知識型短影音。`,
    contentAxis: `${strongest.label} x ${elementNames[dayMaster.element]}`,
    riskNote: seed % 2 ? "避免同時開太多主題，讓強能量分散。每支影片只講一個痛點。" : "避免過度追求完美，先用模板與社群回饋建立穩定輸出。",
  };
}

function getCareerDirections(profile) {
  const base = elementIndustries[profile.dayMaster.element];
  return base.slice(0, 3).map((title, index) => ({
    title,
    reason: [
      `適合把你的${elementNames[profile.dayMaster.element]}轉成可複製的方法論。`,
      `能結合 AI 工具，把一天最常做的事變成產品化服務。`,
      `可透過 Reels、輪播與社群任務建立可信任的個人品牌。`,
    ][index],
  }));
}

function calculateBazi(birthDate, birthTime) {
  const { year, month, day } = parseDateParts(birthDate);
  const hour = Number((birthTime || "00:00").split(":")[0]);
  const adjustedYear = isBeforeLiChun(year, month, day) ? year - 1 : year;
  const yearIndex = mod(adjustedYear - 1984, 60);
  const yearPillar = pillarFromIndex(yearIndex);

  const monthOrder = getSolarMonthOrder(month, day);
  const monthBranchIndex = mod(monthOrder + 2, 12);
  const monthStemIndex = mod((yearPillar.stemIndex % 5) * 2 + 2 + monthOrder, 10);
  const monthPillar = makePillar(monthStemIndex, monthBranchIndex);

  const dayIndex = mod(julianDayNumber(year, month, day) + 49, 60);
  const dayPillar = pillarFromIndex(dayIndex);

  const hourBranchIndex = hour === 23 ? 0 : Math.floor((hour + 1) / 2);
  const hourStemStart = mod((dayPillar.stemIndex % 5) * 2, 10);
  const hourPillar = makePillar(hourStemStart + hourBranchIndex, hourBranchIndex);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    fourPillars: [yearPillar, monthPillar, dayPillar, hourPillar].map((pillar) => pillar.name).join(" · "),
  };
}

function parseDateParts(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function isBeforeLiChun(year, month, day) {
  return month < 2 || (month === 2 && day < 4);
}

function getSolarMonthOrder(month, day) {
  if (month === 1) return day >= 6 ? 11 : 10;
  const term = monthStartTerms.find((item) => item.month === month);
  if (term && day >= term.day) return term.order;
  const previous = monthStartTerms.find((item) => item.month === month - 1);
  return previous ? previous.order : 10;
}

function calculateTalentDistribution(chart) {
  const totals = Object.fromEntries(tenTalentMap.map((talent) => [talent.id, 0]));
  const dayStem = chart.day.stem;
  const pillars = [
    ["year", chart.year],
    ["month", chart.month],
    ["day", chart.day],
    ["hour", chart.hour],
  ];

  for (const [position, pillar] of pillars) {
    const weights = pillarWeights[position];

    if (weights.stem > 0) {
      totals[getTalentGroup(dayStem, pillar.stem)] += weights.stem;
    }

    for (const hidden of hiddenStemRatios[pillar.branch.name] || []) {
      const hiddenStem = stems.find((stem) => stem.name === hidden.stem);
      totals[getTalentGroup(dayStem, hiddenStem)] += weights.branch * hidden.ratio;
    }
  }

  const max = Math.max(...Object.values(totals), 1);

  return tenTalentMap
    .map((talent) => ({
      ...talent,
      value: Math.round((totals[talent.id] / max) * 100),
      raw: Number(totals[talent.id].toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);
}

function getTalentGroup(dayStem, targetStem) {
  if (!targetStem) return "resource";

  if (targetStem.element === dayStem.element) {
    return "peer";
  }

  if (elementCreates[targetStem.element] === dayStem.element) {
    return "resource";
  }

  if (elementCreates[dayStem.element] === targetStem.element) {
    return "output";
  }

  if (elementControls(dayStem.element) === targetStem.element) {
    return "wealth";
  }

  if (elementControls(targetStem.element) === dayStem.element) {
    return "influence";
  }

  return "resource";
}

function elementControls(element) {
  return {
    wood: "earth",
    earth: "water",
    water: "fire",
    fire: "metal",
    metal: "wood",
  }[element];
}

function julianDayNumber(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function pillarFromIndex(index) {
  return makePillar(index, index);
}

function makePillar(stemIndex, branchIndex) {
  const stem = stems[mod(stemIndex, 10)];
  const branch = branches[mod(branchIndex, 12)];
  return {
    stem,
    branch,
    stemIndex: mod(stemIndex, 10),
    branchIndex: mod(branchIndex, 12),
    name: `${stem.name}${branch.name}`,
  };
}

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function buildScripts(profile) {
  return [
    {
      title: `你不是沒方向，是還沒把「${profile.contentAxis}」變成定位`,
      angle: "反直覺觀點，適合開發陌生受眾。",
      hook: `先別滑走，如果你每天很忙卻不知道要拍什麼，問題可能不是你不夠努力。`,
      body: `1. 點出觀眾混亂感。2. 說明你的能量擅長。3. 示範如何把工作、喜好、24 小時重心交叉成一個內容主軸。`,
      cta: "留言「定位」，我給你一個三題檢核表。",
      transcript: `先別滑走。如果你每天都很忙，卻不知道短影音到底要拍什麼，通常不是你沒有才華，而是你還沒把才華變成定位。你可以先寫下三件事：第一，你現在靠什麼工作賺錢；第二，你平常最常研究什麼；第三，你一天花最多時間解決哪一類問題。把這三個答案交叉起來，就是你的內容主軸。不要先追熱門題目，先找到你能連續講三十天的主題。留言「定位」，我給你三題檢核表。`,
    },
    {
      title: `用 60 秒拆解：${profile.dayMaster.title}如何在 AI 時代變現`,
      angle: "實操指南，強調可保存。",
      hook: `如果你的優勢是${elementNames[profile.dayMaster.element]}，這三種 AI 職涯方向最值得先試。`,
      body: `列出三個方向：服務、內容、產品。每個方向搭配一個可立即做的行動。字幕保持每幕 7 字內。`,
      cta: "儲存這支，下次規劃副業時打開用。",
      transcript: `如果你的優勢是${elementNames[profile.dayMaster.element]}，在 AI 時代不要只問自己適合做什麼工作，而是問：我可以把哪個能力變成系統？第一，你可以做服務，幫別人解決一個明確問題。第二，你可以做內容，把你的方法拍成短影音，累積信任。第三，你可以做產品，把流程變成表格、模板、課程或顧問包。先不要三個都做，選一個你最容易開始的方向，連續測試七天。儲存這支，下次規劃副業時打開用。`,
    },
    {
      title: `我如何把日常工作變成短影音選題資料庫`,
      angle: "故事型內容，用個人經驗建立信任。",
      hook: `POV：你以為你的工作很普通，但它其實是最好的內容素材。`,
      body: `用 PASTOR：痛點、放大、故事、教學、提供價值、行動。結尾給出 3 個紀錄欄位：問題、解法、結果。`,
      cta: "標記一位也想開始拍片的朋友。",
      transcript: `POV：你以為你的工作很普通，但它其實是最好的內容素材。我以前也會覺得，今天做的事沒什麼好拍，直到我開始記三個欄位。第一，今天有人問我什麼問題？第二，我怎麼解決？第三，解決後對方得到什麼結果？只要把這三個答案寫下來，你就有一支短影音。開頭講問題，中間講做法，結尾講結果。你不需要每天等靈感，你只需要每天記錄一次。標記一位也想開始拍片的朋友。`,
    },
  ];
}

function reviewVideo(profile, video) {
  const score = 60 + (profile.seed % 31);
  const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : "C";
  return {
    score,
    grade,
    level: score >= 80 ? "定位清楚，具備發布潛力" : "基本方向成立，需要提升留存",
    strengths: [
      `主題和「${profile.contentAxis}」有連結，能累積個人品牌記憶點。`,
      `影片長度 ${video.length} 符合 90 秒內深度內容限制。`,
      "若前 3 秒直接說痛點，會更容易進入興趣池推薦。",
    ],
    improvements: [
      "開頭避免寒暄，直接用結果、數字或反直覺句切入。",
      "每 2 秒安排一次畫面變化，降低滑走率。",
      "結尾 CTA 要具體，例如留言關鍵字、儲存、標記朋友。",
    ],
  };
}

function hash(text) {
  return [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function writeUser(user) {
  localStorage.setItem(storageKey, JSON.stringify(user));
}

function readWall() {
  try {
    return JSON.parse(localStorage.getItem(`${storageKey}-wall`)) || defaultWall();
  } catch {
    return defaultWall();
  }
}

function writeWall(wall) {
  localStorage.setItem(`${storageKey}-wall`, JSON.stringify(wall));
}

function defaultWall() {
  return [
    { id: "v1", author: "Mina", topic: "AI 幫我找到內容定位", position: "洞察研究者", length: "00:42", likes: 18, hearts: 9, comments: ["很清楚！", "這個鉤子有中"], color: "water" },
    { id: "v2", author: "Leo", topic: "三步驟整理客戶問題", position: "系統承載者", length: "01:12", likes: 24, hearts: 11, comments: ["節奏很好"], color: "earth" },
    { id: "v3", author: "Ariel", topic: "別再追熱門音樂了", position: "舞台擴散者", length: "00:15", likes: 37, hearts: 21, comments: ["想看下一集"], color: "fire" },
  ];
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}
