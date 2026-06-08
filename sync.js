(function () {
  const SUPABASE_URL = "https://mnafeujwfonrjkrirfh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_yll_Iy62ynartLOf6Fd7mg__z1dpm56";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const TABLE = "practice_app_state";

  let clientPromise = null;

  function loadSupabase() {
    if (window.supabase) return Promise.resolve(window.supabase);
    if (clientPromise) return clientPromise;

    clientPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SUPABASE_CDN;
      script.async = true;
      script.onload = () => window.supabase ? resolve(window.supabase) : reject(new Error("Supabase failed to load"));
      script.onerror = () => reject(new Error("Supabase network error"));
      document.head.appendChild(script);
    });
    return clientPromise;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function stampOf(value) {
    return Number(value && (value.__cloudUpdatedAt || value.updatedAt || value.lastSavedAt || 0)) || 0;
  }

  function statusText(text, tone) {
    const el = document.getElementById("cloudSyncStatus");
    if (!el) return;
    el.textContent = text;
    el.dataset.tone = tone || "";
  }

  function ensurePanel(appName) {
    if (document.getElementById("cloudSyncPanel")) return;

    const style = document.createElement("style");
    style.textContent = `
      .cloud-sync-panel {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(255, 247, 251, .94);
        backdrop-filter: blur(10px);
      }
      .cloud-sync-panel[hidden] { display: none; }
      .cloud-sync-box {
        width: min(430px, 100%);
        padding: 24px;
        border: 1px solid rgba(111, 76, 130, .16);
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 18px 45px rgba(168, 113, 170, .2);
        color: #41374b;
        font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      }
      .cloud-sync-box h2 { margin: 0 0 8px; font-size: 24px; letter-spacing: 0; }
      .cloud-sync-box p { margin: 0 0 16px; color: #74687c; line-height: 1.6; }
      .cloud-sync-box label { display: block; margin: 12px 0 6px; font-size: 14px; color: #64586e; }
      .cloud-sync-box input {
        width: 100%;
        min-height: 46px;
        padding: 10px 12px;
        border: 1px solid rgba(111, 76, 130, .24);
        border-radius: 8px;
        font: inherit;
      }
      .cloud-sync-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 16px;
      }
      .cloud-sync-box button {
        min-height: 44px;
        border: 0;
        border-radius: 8px;
        background: #ff8fc7;
        color: #fff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .cloud-sync-box button.secondary { background: #8fe5c8; color: #314d45; }
      .cloud-sync-box button.ghost { background: #f2edf6; color: #5e5168; }
      .cloud-sync-status {
        min-height: 22px;
        margin-top: 14px;
        color: #74687c;
        font-size: 14px;
        line-height: 1.5;
      }
      .cloud-sync-status[data-tone="error"] { color: #b9475b; }
      .cloud-sync-status[data-tone="ok"] { color: #2f8a6a; }
      .cloud-sync-mini {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 99998;
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 9px 10px;
        border: 1px solid rgba(111, 76, 130, .14);
        border-radius: 8px;
        background: rgba(255, 255, 255, .9);
        color: #64586e;
        box-shadow: 0 12px 28px rgba(168, 113, 170, .14);
        font: 13px "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      }
      .cloud-sync-mini button {
        border: 0;
        border-radius: 8px;
        padding: 6px 8px;
        background: #f2edf6;
        color: #5e5168;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = "cloudSyncPanel";
    panel.className = "cloud-sync-panel";
    panel.innerHTML = `
      <form class="cloud-sync-box" id="cloudSyncForm">
        <h2>${appName || "刷题网页"}登录</h2>
        <p>登录后，电脑、手机和平板会共享同一份进度、错题和星星。</p>
        <label for="cloudSyncEmail">邮箱</label>
        <input id="cloudSyncEmail" type="email" autocomplete="email" required>
        <label for="cloudSyncPassword">密码</label>
        <input id="cloudSyncPassword" type="password" autocomplete="current-password" minlength="6" required>
        <div class="cloud-sync-actions">
          <button type="submit">登录</button>
          <button class="secondary" type="button" id="cloudSyncSignUp">注册</button>
        </div>
        <div class="cloud-sync-status" id="cloudSyncStatus">请先登录。</div>
      </form>
    `;
    document.body.appendChild(panel);

    const mini = document.createElement("div");
    mini.id = "cloudSyncMini";
    mini.className = "cloud-sync-mini";
    mini.hidden = true;
    mini.innerHTML = `<span id="cloudSyncMiniText">云端同步已开启</span><button type="button" id="cloudSyncSignOut">退出</button>`;
    document.body.appendChild(mini);
  }

  async function createClient() {
    const supabaseLib = await loadSupabase();
    return supabaseLib.createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  window.practiceCloudSync = {
    async init(options) {
      const opts = {
        appName: "刷题网页",
        appKey: "practice",
        getState: () => ({}),
        setState: () => {},
        persistLocal: () => {},
        onStatus: () => {},
        ...options
      };

      ensurePanel(opts.appName);
      const panel = document.getElementById("cloudSyncPanel");
      const mini = document.getElementById("cloudSyncMini");
      const miniText = document.getElementById("cloudSyncMiniText");
      const form = document.getElementById("cloudSyncForm");
      const email = document.getElementById("cloudSyncEmail");
      const password = document.getElementById("cloudSyncPassword");
      const signUp = document.getElementById("cloudSyncSignUp");
      const signOut = document.getElementById("cloudSyncSignOut");

      let client;
      let user = null;
      let applyingRemote = false;
      let saveTimer = null;
      let channel = null;

      const report = (text, tone) => {
        statusText(text, tone);
        opts.onStatus(text);
      };

      const persist = (next) => {
        opts.persistLocal(next);
        opts.setState(next);
      };

      const pushNow = async () => {
        if (!user || applyingRemote) return;
        const next = clone(opts.getState());
        next.__cloudUpdatedAt = Date.now();
        opts.persistLocal(next);

        const { error } = await client.from(TABLE).upsert({
          user_id: user.id,
          app_key: opts.appKey,
          data: next,
          updated_at: next.__cloudUpdatedAt
        });

        if (error) {
          report("云端保存失败，请确认数据库表和权限已经设置好。", "error");
          return;
        }
        if (miniText) miniText.textContent = "云端同步已保存";
      };

      this.save = (next) => {
        if (applyingRemote) return;
        if (next && typeof next === "object") next.__cloudUpdatedAt = Date.now();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(pushNow, 500);
      };

      const pullAndMerge = async () => {
        const local = clone(opts.getState());
        const { data, error } = await client
          .from(TABLE)
          .select("data, updated_at")
          .eq("app_key", opts.appKey)
          .maybeSingle();

        if (error) {
          report("读取云端数据失败，请先完成数据库设置。", "error");
          return;
        }

        const remote = data && data.data ? data.data : null;
        if (remote && Number(data.updated_at || stampOf(remote)) >= stampOf(local)) {
          applyingRemote = true;
          persist(remote);
          applyingRemote = false;
          report("已载入云端进度。", "ok");
        } else {
          await pushNow();
          report("已把本机进度保存到云端。", "ok");
        }
      };

      const subscribe = () => {
        if (channel) client.removeChannel(channel);
        channel = client
          .channel(`${opts.appKey}-${user.id}`)
          .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: TABLE,
            filter: `app_key=eq.${opts.appKey}`
          }, payload => {
            const row = payload.new;
            if (!row || row.user_id !== user.id || !row.data) return;
            if (Number(row.updated_at || stampOf(row.data)) <= stampOf(opts.getState())) return;
            applyingRemote = true;
            persist(row.data);
            applyingRemote = false;
            if (miniText) miniText.textContent = "已同步其他设备更新";
          })
          .subscribe();
      };

      const applySession = async (session) => {
        user = session && session.user ? session.user : null;
        panel.hidden = !!user;
        mini.hidden = !user;
        if (!user) {
          report("请先登录。");
          return;
        }
        if (miniText) miniText.textContent = `已登录 ${user.email || ""}`;
        await pullAndMerge();
        subscribe();
      };

      try {
        client = await createClient();
      } catch (error) {
        report("连接云端组件失败，请检查网络后刷新。", "error");
        return;
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        report("正在登录...");
        const { data, error } = await client.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });
        if (error) return report(error.message, "error");
        await applySession(data.session);
      });

      signUp.addEventListener("click", async () => {
        report("正在注册...");
        const { data, error } = await client.auth.signUp({
          email: email.value.trim(),
          password: password.value
        });
        if (error) return report(error.message, "error");
        if (!data.session) {
          report("注册成功，请先到邮箱里点确认邮件，再回来登录。", "ok");
          return;
        }
        await applySession(data.session);
      });

      signOut.addEventListener("click", async () => {
        await client.auth.signOut();
        user = null;
        panel.hidden = false;
        mini.hidden = true;
        report("已退出登录。");
      });

      client.auth.onAuthStateChange((_event, session) => applySession(session));
      const { data } = await client.auth.getSession();
      await applySession(data.session);
    },
    save() {}
  };
})();
