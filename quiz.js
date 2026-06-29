
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue, update } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCwnU6ZEYUTrKCc0Afru7JPjvRif-g_gbA",
  authDomain: "norgeelfenbenkysten.firebaseapp.com",
  databaseURL: "https://norgeelfenbenkysten-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "norgeelfenbenkysten",
  storageBucket: "norgeelfenbenkysten.firebasestorage.app",
  messagingSenderId: "950269622806",
  appId: "1:950269622806:web:97e5ce88e223f783fc5337"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Show live count in status bar
onValue(ref(db, 'entries'), function(snap) {
  var count = snap.exists() ? snap.size : 0;
  document.getElementById('fbStatus').innerHTML = 'Firebase koplet - ' + count + ' deltakere';
});

// Deadline
var DEADLINE = new Date('2026-06-30T19:00:00');
window._manualLocked = false;

function isLocked() {
  return window._manualLocked || new Date() >= DEADLINE;
}

// Sync lock state across devices
onValue(ref(db, 'meta/locked'), function(snap) {
  window._manualLocked = snap.val() === true;
  applyLockState();
});

function applyLockState() {
  var locked = isLocked();
  var expired = new Date() >= DEADLINE;
  document.getElementById('lockBanner').style.display = locked ? 'block' : 'none';
  document.getElementById('countdownBox').style.display = locked ? 'none' : 'block';
  document.getElementById('lockReason').textContent = expired
    ? 'Fristen kl. 19:00 er passert - ingen flere svar mottas.'
    : 'Låst manuelt av arrangør.';
  var btn = document.getElementById('submitBtn');
  if (btn) btn.disabled = locked;
  document.getElementById('manualLockBtn').style.display = !locked ? 'block' : 'none';
  document.getElementById('manualUnlockBtn').style.display = (locked && !expired) ? 'block' : 'none';
}

// Countdown timer
function tick() {
  var diff = DEADLINE - new Date();
  var el = document.getElementById('countdownNum');
  if (!el) return;
  if (diff <= 0) { applyLockState(); el.textContent = 'Fristen er ute!'; return; }
  var h = Math.floor(diff / 3600000);
  var m = Math.floor((diff % 3600000) / 60000);
  var s = Math.floor((diff % 60000) / 1000);
  el.textContent = (h > 0 ? h + 't ' : '') + m + 'm ' + s + 's igjen';
  setTimeout(tick, 1000);
}
tick();
applyLockState();

// Quiz state
var sc = {q3a:0,q3b:0,q4:0,q5:0,q6:0,q9:0,q10:0,q11:0,q12:0,q13:0,
          a3a:0,a3b:0,a4:0,a5:0,a6:0,a9:0,a10:0,a11:0,a12:0,a13:0};
var opts = {};
var selAvatar = null;
var selEmoji = '⚽';
var avNames = {haaland:'Haaland',odegaard:'Ødegaard',nusa:'Nusa',ajer:'Ajer',
               bobb:'Bobb',berge:'Berge',nyland:'Nyland',sorloth:'Sørloth'};

// Expose all onclick functions to window scope
window.showTab = function(t) {
  document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
  document.querySelectorAll('.pane').forEach(function(x) { x.classList.remove('active'); });
  document.getElementById('tab-' + t).classList.add('active');
  document.getElementById('pane-' + t).classList.add('active');
};

window.selAv = function(btn) {
  document.querySelectorAll('.av-btn').forEach(function(b) { b.classList.remove('sel'); });
  btn.classList.add('sel');
  selAvatar = btn.dataset.av;
  selEmoji = btn.dataset.emoji;
};

window.selOpt = function(qid, btn, val) {
  document.querySelectorAll('#' + qid + ' .opt').forEach(function(b) { b.classList.remove('sel'); });
  btn.classList.add('sel');
  opts[qid] = val;
};

window.adjSc = function(k, d) {
  sc[k] = Math.max(0, Math.min(200, (sc[k] || 0) + d));
  var el = document.getElementById(k + '-val');
  if (el) el.textContent = sc[k];
};

window.manualLock = function() {
  if (!confirm('Vil du låse tippekonkurransen nå?')) return;
  set(ref(db, 'meta/locked'), true);
};

window.manualUnlock = function() {
  set(ref(db, 'meta/locked'), false);
};

window.submitEntry = async function() {
  if (isLocked()) { alert('Beklager - tippefristen er passert!'); return; }
  var name = document.getElementById('playerName').value.trim();
  if (!name) { alert('Skriv inn navn først!'); return; }
  if (!selAvatar) { alert('Velg en spiller!'); return; }
  if (!opts.q1) { alert('Hvem tror du vinner?'); return; }

  var nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  try {
    var existing = await get(ref(db, 'entries/' + nameKey));
    if (existing.exists()) {
      var overwrite = confirm(name + ' er allerede registrert! Vil du overskrive svaret?');
      if (!overwrite) return;
    }

    var entry = {
      name: name, avatar: selAvatar, emoji: selEmoji,
      q1: opts.q1 || '', q2: opts.q2 || '',
      q3: sc.q3a + '-' + sc.q3b,
      q4: sc.q4, q5: sc.q5, q6: sc.q6,
      q7: document.getElementById('q7').value || '',
      q8: opts.q8 || '', q9: sc.q9,
      q10: sc.q10, q11: sc.q11, q12: sc.q12, q13: sc.q13,
      pts: 0, ts: Date.now()
    };

    await set(ref(db, 'entries/' + nameKey), entry);
    document.getElementById('successEmoji').textContent = selEmoji;
    document.getElementById('successName').textContent = name.toUpperCase() + ' ER MED!';
    document.getElementById('successSub').textContent = avNames[selAvatar] + ' heier på deg! Lykke til!';
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('successBox').style.display = 'block';
  } catch (err) {
    alert('Feil ved lagring: ' + err.message);
  }
};

window.resetForm = function() {
  document.getElementById('playerName').value = '';
  document.querySelectorAll('.av-btn').forEach(function(b) { b.classList.remove('sel'); });
  document.querySelectorAll('.opt').forEach(function(b) { b.classList.remove('sel'); });
  selAvatar = null; selEmoji = '⚽';
  ['q3a','q3b','q4','q5','q6','q9','q10','q11','q12','q13'].forEach(function(k) {
    sc[k] = 0;
    var el = document.getElementById(k + '-val');
    if (el) el.textContent = '0';
  });
  document.getElementById('q7').value = '';
  document.getElementById('successBox').style.display = 'none';
  document.getElementById('submitBtn').style.display = 'block';
};

window.calcAndSaveScores = async function() {
  var ans = {
    q1: opts.a1 || '', q2: opts.a2 || '',
    q3: sc.a3a + '-' + sc.a3b,
    q4: sc.a4, q5: sc.a5, q6: sc.a6,
    q7: document.getElementById('a7').value || '',
    q8: opts.a8 || '', q9: sc.a9,
    q10: sc.a10, q11: sc.a11, q12: sc.a12, q13: sc.a13
  };
  await set(ref(db, 'meta/answers'), ans);

  try {
    var snap = await get(ref(db, 'entries'));
    if (!snap.exists()) { alert('Ingen deltakere funnet.'); return; }
    var updates = {};
    snap.forEach(function(child) {
      var e = child.val();
      var p = 0;
      if (ans.q1 && e.q1 === ans.q1) p += 1;
      if (ans.q2 && e.q2 === ans.q2) p += 1;
      if (ans.q3 && e.q3 === ans.q3) p += 5;
      if (parseInt(e.q4) === parseInt(ans.q4)) p += 2;
      if (parseInt(e.q5) === parseInt(ans.q5)) p += 2;
      if (parseInt(e.q6) === parseInt(ans.q6)) p += 3;
      if (ans.q7 && e.q7 && e.q7 === ans.q7) p += 3;
      if (ans.q8 && e.q8 === ans.q8) p += 3;
      if (parseInt(e.q9) === parseInt(ans.q9)) p += 3;
      if (parseInt(e.q10) === parseInt(ans.q10)) p += 3;
      if (parseInt(e.q11) === parseInt(ans.q11)) p += 3;
      if (parseInt(e.q12) === parseInt(ans.q12)) p += 3;
      if (parseInt(e.q13) === parseInt(ans.q13)) p += 3;
      updates['entries/' + child.key + '/pts'] = p;
    });
    await update(ref(db), updates);
    alert('Poeng oppdatert for alle!');
  } catch (err) {
    alert('Feil: ' + err.message);
  }
};

// Avatar SVGs for leaderboard
var avatarSVGs = {
  haaland: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Anton,sans-serif">9</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,24 Q17,12 28,11 Q39,12 40,24 Q36,16 28,16 Q20,16 16,24Z" fill="#D4A355"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  odegaard: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Anton,sans-serif">8</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5CBA7"/><path d="M16,26 Q16,11 28,10 Q40,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#8B6A34"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  nusa: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Anton,sans-serif">11</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#8B5A2B"/><path d="M16,27 Q15,11 28,10 Q41,11 40,27 Q37,17 28,17 Q19,17 16,27Z" fill="#1a0a00"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  ajer: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Anton,sans-serif">6</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,26 Q15,11 28,10 Q41,11 40,26 Q37,18 28,18 Q19,18 16,26Z" fill="#C8943A"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  bobb: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Anton,sans-serif">22</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#6B3A1F"/><path d="M16,27 Q15,11 28,10 Q41,11 40,27 Q37,17 28,17 Q19,17 16,27Z" fill="#1a0a00"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  berge: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Anton,sans-serif">23</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,26 Q15,11 28,10 Q41,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#333"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  nyland: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#FFD700"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="#003087" font-family="Anton,sans-serif">1</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#FFD700"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#FFD700"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,26 Q15,11 28,10 Q41,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#555"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  sorloth: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Anton,sans-serif">20</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5CBA7"/><path d="M16,26 Q16,11 28,10 Q40,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#8B6A34"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>'
};

// Live leaderboard with SVG avatars
var medals = ['🥇','🥈','🥉'];
onValue(ref(db, 'entries'), function(snap) {
  var list = document.getElementById('lbList');
  var empty = document.getElementById('lbEmpty');
  if (!snap.exists()) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  var arr = [];
  snap.forEach(function(child) { arr.push(child.val()); });
  arr.sort(function(a, b) { return b.pts - a.pts; });
  var maxPts = 37;
  list.innerHTML = arr.map(function(e, i) {
    var cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    var rank = medals[i] || (i + 1) + '.';
    var bar = Math.min(100, Math.round((e.pts / maxPts) * 100));
    var avatarHtml = avatarSVGs[e.avatar] || '<div style="font-size:26px;text-align:center;">' + (e.emoji || '⚽') + '</div>';
    return '<div class="lb-row ' + cls + '">'
      + '<div class="lb-rank">' + rank + '</div>'
      + '<div style="width:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' + avatarHtml + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div class="lb-name">' + e.name + '</div>'
      + '<div class="lb-sub">' + (avNames[e.avatar] || '') + '</div>'
      + '<div style="background:#e0e0e0;border-radius:4px;height:5px;margin-top:4px;overflow:hidden;">'
      + '<div style="background:#003087;height:5px;width:' + bar + '%;border-radius:4px;"></div>'
      + '</div></div>'
      + '<div class="lb-pts">' + e.pts + ' pts</div>'
      + '</div>';
  }).join('');
  document.getElementById('lb-info').textContent =
    'Live - ' + arr.length + ' deltakere - ' + new Date().toLocaleTimeString('no-NO');
});
