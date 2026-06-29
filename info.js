
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

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
document.getElementById('fbStatus').innerHTML = '🟢 Koblet til Firebase';

var kidCount = 1;

window.adjKids = function(d) {
  kidCount = Math.max(1, Math.min(10, kidCount + d));
  document.getElementById('kidCount').textContent = kidCount;
};

window.submitReg = function() {
  var name = document.getElementById('parentName').value.trim();
  if (!name) { alert('Skriv inn navnet ditt forst!'); return; }
  var key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  set(ref(db, 'registrations/' + key), { name: name, kids: kidCount, ts: Date.now() })
    .then(function() {
      document.getElementById('regFormInner').style.display = 'none';
      document.getElementById('successReg').style.display = 'block';
      document.getElementById('regSuccessName').textContent = name.toUpperCase() + ' ER REGISTRERT!';
      document.getElementById('regSuccessSub').textContent = kidCount + ' barn - Takk! Vi gleder oss!';
    })
    .catch(function(err) { alert('Feil: ' + err.message); });
};

window.resetReg = function() {
  document.getElementById('regFormInner').style.display = 'flex';
  document.getElementById('successReg').style.display = 'none';
};

// Live registration list
onValue(ref(db, 'registrations'), function(snap) {
  var wrap = document.getElementById('regListWrap');
  var list = document.getElementById('regList');
  if (!snap.exists()) { wrap.style.display = 'none'; return; }
  var arr = [];
  snap.forEach(function(child) { arr.push(child.val()); });
  arr.sort(function(a, b) { return a.name.localeCompare(b.name); });
  var total = arr.reduce(function(s, r) { return s + r.kids; }, 0);
  document.getElementById('totalKids').textContent = total;
  list.innerHTML = arr.map(function(r) {
    return '<div class="reg-row">'
      + '<div class="reg-name">' + r.name + '</div>'
      + '<div class="reg-count">' + r.kids + '</div>'
      + '<div class="reg-badge">barn</div>'
      + '</div>';
  }).join('');
  wrap.style.display = 'block';
});
