/* ============================================================
   app.js — Game controller
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var BEATS = { rock: 'paper', paper: 'scissors', scissors: 'rock' };
  var LABEL = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
  var STORAGE_KEY = 'rps.record.v1';

  /* ——— State ——— */
  var state = {
    mode: 'house',        // 'house' | 'friend'
    length: 5,            // best-of-N
    target: 3,            // wins needed
    round: 1,
    you: 0,               // your round wins
    house: 0,             // opponent's round wins
    pendingFriend: null,  // gesture chosen by player 1, awaiting player 2
    awaitingPlayerTwo: false,
    activePlayer: 1,
    over: false,
    opponent: null,       // RPSHouse instance — NOT the score counter
    log: [],
    // persistent record
    record: { matches: 0, wins: 0, losses: 0, ties: 0, streak: 0, best: 0, picks: { rock: 0, paper: 0, scissors: 0 } }
  };

  var el = {};
  var soundOn = true;

  /* ============================================================
     Persistence
     ============================================================ */
  function loadRecord() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.keys(state.record).forEach(function (k) {
          if (parsed[k] !== undefined && parsed[k] !== null) state.record[k] = parsed[k];
        });
      }
    } catch (e) { /* storage unavailable — record stays in memory */ }
  }

  function saveRecord() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.record)); }
    catch (e) { /* ignore */ }
  }

  /* ============================================================
     Boot
     ============================================================ */
  function init() {
    cacheEls();
    loadRecord();
    bindEvents();
    renderRecord();
    showSetup();
  }

  function cacheEls() {
    ['setup', 'setup-hint', 'setup-length', 'start-btn', 'shield', 'shield-btn', 'shield-who',
     'result', 'result-title', 'result-detail', 'rematch-btn', 'change-btn',
     'round-label', 'arena-heading', 'you-name', 'house-name', 'you-slot', 'house-slot',
     'you-use', 'house-use', 'you-state', 'house-state', 'verdict', 'verdict-word',
     'verdict-detail', 'plates', 'arena-prompt', 'advance-btn', 'restart-btn',
     'score-you', 'score-house', 'ladder', 'ladder-you', 'ladder-house', 'log', 'log-empty',
     'stat-matches', 'stat-wins', 'stat-losses', 'stat-ties', 'stat-streak', 'stat-best',
     'fave', 'fave-name', 'fave-bar', 'reset-stats', 'sound-toggle', 'sound-icon',
     'length-select', 'confetti'
    ].forEach(function (id) {
      var node = $(id);
      el[id] = node;
      // Also expose a camelCase alias (advance-btn -> advanceBtn) so call
      // sites can read naturally whichever form they use.
      el[id.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = node;
    });
  }

  function bindEvents() {
    // Gesture plates
    el.plates.addEventListener('click', function (e) {
      var plate = e.target.closest('.plate');
      if (plate) choose(plate.dataset.gesture);
    });

    // Keyboard 1 / 2 / 3
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.setup.hidden === false) return;          // setup is modal
      if (el.result.hidden === false) return;
      var map = { '1': 'rock', '2': 'paper', '3': 'scissors' };
      var g = map[e.key];
      if (g) { e.preventDefault(); choose(g); }
    });

    el.advanceBtn.addEventListener('click', nextRound);
    el.restartBtn.addEventListener('click', function () { showSetup(); });

    el.startBtn.addEventListener('click', function () {
      var checked = document.querySelector('input[name="opponent"]:checked');
      state.mode = checked ? checked.value : 'house';
      state.length = parseInt(el['length-select'].value, 10) || 5;
      el['setup-length'].textContent = state.length;
      el.setup.hidden = true;
      newMatch();
    });

    el.shieldBtn.addEventListener('click', function () {
      el.shield.hidden = true;
      // Player 2 now picks on the same plates
      state.awaitingPlayerTwo = true;
      el['house-state'].textContent = 'Player 2 to choose';
      setPrompt('Player 2, pick a gesture.');
      el.plates.style.pointerEvents = 'auto';
      var firstPlate = el.plates.querySelector('.plate');
      if (firstPlate) firstPlate.focus();
    });

    el.rematchBtn.addEventListener('click', function () {
      el.result.hidden = true;
      newMatch();
    });

    el.changeBtn.addEventListener('click', function () {
      el.result.hidden = true;
      showSetup();
    });

    el['reset-stats'].addEventListener('click', function () {
      state.record = { matches: 0, wins: 0, losses: 0, ties: 0, streak: 0, best: 0, picks: { rock: 0, paper: 0, scissors: 0 } };
      saveRecord();
      renderRecord();
    });

    // Sound
    el['sound-toggle'].addEventListener('click', function () {
      soundOn = !soundOn;
      el['sound-toggle'].setAttribute('aria-pressed', String(soundOn));
      el['sound-toggle'].querySelector('.visually-hidden').textContent = soundOn ? 'Sound on' : 'Sound off';
      el['sound-icon'].setAttribute('href', soundOn ? '#i-sound' : '#i-mute');
      if (window.RPSAudio) window.RPSAudio.setEnabled(soundOn);
    });

    // Length change mirrors into setup
    el['length-select'].addEventListener('change', function () {
      el['setup-length'].textContent = el['length-select'].value;
    });
  }

  /* ============================================================
     Match flow
     ============================================================ */
  function newMatch() {
    state.round = 1;
    state.you = 0;
    state.house = 0;
    state.length = parseInt(el['length-select'].value, 10) || 5;
    state.target = Math.ceil(state.length / 2);
    state.over = false;
    state.pendingFriend = null;
    state.awaitingPlayerTwo = false;
    state.activePlayer = 1;
    state.log = [];
    state.opponent = new window.RPSHouse();

    el['you-name'].textContent = state.mode === 'friend' ? 'Player 1' : 'You';
    el['house-name'].textContent = state.mode === 'friend' ? 'Player 2' : 'The house';

    el.log.innerHTML = '';
    el['log-empty'].hidden = false;

    resetSlots();
    clearVerdict();
    renderScore();
    renderLadder();
    updateRoundLabel();
    setPrompt('Pick a gesture to start the round.');
    el['advance-btn'].hidden = true;
    el['restart-btn'].hidden = true;
    el.plates.style.pointerEvents = 'auto';
    el.plates.setAttribute('aria-hidden', 'false');
  }

  function showSetup() {
    el.setup.hidden = false;
    el['setup-length'].textContent = el['length-select'].value;
  }

  function updateRoundLabel() {
    el['round-label'].textContent = 'Round ' + state.round + ' of ' + state.length;
    el['arena-heading'].textContent = 'First to ' + state.target;
  }

  function setPrompt(text) {
    el['arena-prompt'].textContent = text;
  }

  function resetSlots() {
    [el['you-slot'], el['house-slot']].forEach(function (slot) {
      slot.dataset.gesture = '';
      slot.classList.remove('filled', 'is-winner');
    });
    el['you-state'].textContent = state.mode === 'friend' ? 'Waiting' : 'Choose your gesture';
    el['you-state'].className = 'contestant__state';
    el['house-state'].textContent = 'Waiting';
    el['house-state'].className = 'contestant__state';
    el['you-use'].setAttribute('href', '#g-rock');
    el['house-use'].setAttribute('href', '#g-rock');
  }

  function clearVerdict() {
    el.verdict.dataset.tone = '';
    el.verdict.classList.remove('stamped');
    el['verdict-word'].textContent = '';
    el['verdict-detail'].textContent = '';
  }

  function choose(gesture) {
    if (state.over) return;

    // Friend mode: player 2's turn is routed separately
    if (state.mode === 'friend' && state.awaitingPlayerTwo) {
      chooseAsPlayerTwo(gesture);
      return;
    }
    if (state.mode === 'friend' && state.activePlayer === 2) return;

    if (soundOn && window.RPSAudio) window.RPSAudio.select();

    // Mark the plate
    Array.prototype.forEach.call(el.plates.querySelectorAll('.plate'), function (p) {
      p.classList.toggle('is-picked', p.dataset.gesture === gesture);
    });

    if (state.mode === 'friend') {
      // Player 1 has chosen — hide the screen before player 2 plays
      state.pendingFriend = gesture;
      state.activePlayer = 2;
      el.shield.hidden = false;
      el['shield-who'].textContent = 'Player 2';
      el['shield-btn'].focus();
      return;
    }

    // Player vs the house
    var houseGesture = state.opponent.choose(gesture);
    state.record.picks[gesture] = (state.record.picks[gesture] || 0) + 1;
    saveRecord();
    reveal(gesture, houseGesture);
  }

  /* Player 2's gesture in friend mode. */
  function chooseAsPlayerTwo(gesture) {
    if (state.mode !== 'friend' || !state.awaitingPlayerTwo) return;
    state.awaitingPlayerTwo = false;
    state.activePlayer = 1;
    state.record.picks[gesture] = (state.record.picks[gesture] || 0) + 1;
    saveRecord();

    Array.prototype.forEach.call(el.plates.querySelectorAll('.plate'), function (p) {
      p.classList.toggle('is-picked', p.dataset.gesture === gesture);
    });

    reveal(state.pendingFriend, gesture);
  }

  function reveal(yours, theirs) {
    el['you-slot'].dataset.gesture = yours;
    el['you-slot'].classList.add('filled');
    el['you-use'].setAttribute('href', '#g-' + yours);

    el['house-slot'].dataset.gesture = theirs;
    el['house-slot'].classList.add('filled');
    el['house-use'].setAttribute('href', '#g-' + theirs);

    el['you-state'].textContent = LABEL[yours];
    el['house-state'].textContent = LABEL[theirs];

    var outcome = decide(yours, theirs);

    // Brief pause so the reveal lands before the verdict
    window.setTimeout(function () {
      applyOutcome(outcome, yours, theirs);
    }, 420);
  }

  function decide(yours, theirs) {
    if (yours === theirs) return 'tie';
    // BEATS maps a gesture to the gesture that defeats it,
    // so yours wins when theirs is the one beaten BY yours.
    return BEATS[theirs] === yours ? 'you' : 'house';
  }

  function applyOutcome(outcome, yours, theirs) {
    var word, detail, tone;

    if (outcome === 'tie') {
      word = 'Tie';
      detail = LABEL[yours] + ' matches ' + LABEL[theirs] + '. The round replays.';
      tone = 'tie';
      if (soundOn && window.RPSAudio) window.RPSAudio.tie();
    } else if (outcome === 'you') {
      word = 'You win';
      detail = LABEL[yours] + ' beats ' + LABEL[theirs] + '.';
      tone = 'win';
      state.you++;
      el['you-slot'].classList.add('is-winner');
      el['you-state'].classList.add('is-win');
      if (soundOn && window.RPSAudio) window.RPSAudio.win();
    } else {
      word = 'You lose';
      detail = LABEL[theirs] + ' beats ' + LABEL[yours] + '.';
      tone = 'lose';
      state.house++;
      el['house-slot'].classList.add('is-winner');
      el['house-state'].classList.add('is-lose');
      if (soundOn && window.RPSAudio) window.RPSAudio.lose();
    }

    el.verdict.dataset.tone = tone;
    el['verdict-word'].textContent = word;
    el['verdict-detail'].textContent = detail;
    el.verdict.classList.remove('stamped');
    void el.verdict.offsetWidth;  // restart the animation
    el.verdict.classList.add('stamped');
    if (soundOn && window.RPSAudio) window.RPSAudio.stamp();

    state.log.push({ round: state.round, yours: yours, theirs: theirs, outcome: outcome });

    renderScore();
    renderLadder();
    renderLog();

    // Disable the plates until the next round is requested
    el.plates.style.pointerEvents = 'none';

    var target = state.target;
    if (state.you >= target || state.house >= target) {
      endMatch();
    } else if (outcome === 'tie') {
      setPrompt('Tied round. Play it again.');
      el['advance-btn'].hidden = false;
      el['advance-btn'].textContent = 'Replay round';
      el.plates.style.pointerEvents = 'auto';
    } else {
      setPrompt('Round over.');
      el['advance-btn'].hidden = false;
      el['advance-btn'].textContent = 'Next round';
    }
  }

  function nextRound() {
    el['advance-btn'].hidden = true;
    el.plates.style.pointerEvents = 'auto';

    var last = state.log[state.log.length - 1];
    if (last && last.outcome === 'tie') {
      // A tied round does not advance the counter
    } else {
      state.round++;
    }

    resetSlots();
    clearVerdict();
    updateRoundLabel();
    setPrompt('Pick a gesture to start the round.');

    Array.prototype.forEach.call(el.plates.querySelectorAll('.plate'), function (p) {
      p.classList.remove('is-picked');
    });

    if (state.mode === 'friend') {
      state.activePlayer = 1;
      state.pendingFriend = null;
      state.awaitingPlayerTwo = false;
      el['you-state'].textContent = 'Waiting';
    }
  }

  function endMatch() {
    state.over = true;
    el.plates.style.pointerEvents = 'none';
    el['advance-btn'].hidden = true;
    el['restart-btn'].hidden = false;

    var youWon = state.you > state.house;
    var drew = state.you === state.house;

    state.record.matches++;
    if (drew) {
      state.record.ties++;
      state.record.streak = 0;
    } else if (youWon) {
      state.record.wins++;
      state.record.streak++;
      if (state.record.streak > state.record.best) state.record.best = state.record.streak;
    } else {
      state.record.losses++;
      state.record.streak = 0;
    }
    saveRecord();
    renderRecord();

    var oppName = state.mode === 'friend' ? 'Player 2' : 'the house';
    el['result-title'].textContent = drew ? 'The match is drawn' : (youWon ? 'You win the match' : 'You lose the match');
    el['result-detail'].textContent = 'You took ' + state.you + ', ' + oppName + ' took ' + state.house + '.';
    el.result.hidden = false;

    if (youWon) {
      if (soundOn && window.RPSAudio) window.RPSAudio.matchWin();
      burstConfetti();
    }
  }

  /* ============================================================
     Rendering
     ============================================================ */
  function renderScore() {
    el['score-you'].textContent = state.you;
    el['score-house'].textContent = state.house;
  }

  function renderLadder() {
    el.ladder.innerHTML = '';
    var rungs = state.length;
    for (var i = 0; i < rungs; i++) {
      var rung = document.createElement('div');
      rung.className = 'ladder__rung';

      // Fill rungs the player has won, then the house's
      if (i < state.you) {
        rung.dataset.owner = 'you';
        rung.style.setProperty('--g', 'var(--ring-lit)');
      } else if (i < state.you + state.house) {
        rung.dataset.owner = 'house';
        rung.style.setProperty('--g', 'var(--flare)');
      }
      el.ladder.appendChild(rung);
    }
  }

  function renderLog() {
    if (!state.log.length) return;
    el['log-empty'].hidden = true;
    el.log.innerHTML = '';

    state.log.slice().reverse().forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'log__row';

      var round = document.createElement('span');
      round.className = 'log__round';
      round.textContent = 'R' + entry.round;

      var moves = document.createElement('span');
      moves.className = 'log__moves';

      var m1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      m1.setAttribute('class', 'log__move');
      m1.setAttribute('data-g', entry.yours);
      m1.setAttribute('viewBox', '0 0 100 100');
      m1.setAttribute('aria-hidden', 'true');
      var u1 = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      u1.setAttribute('href', '#g-' + entry.yours);
      m1.appendChild(u1);

      var sep = document.createElement('span');
      sep.textContent = '/';

      var m2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      m2.setAttribute('class', 'log__move');
      m2.setAttribute('data-g', entry.theirs);
      m2.setAttribute('viewBox', '0 0 100 100');
      m2.setAttribute('aria-hidden', 'true');
      var u2 = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      u2.setAttribute('href', '#g-' + entry.theirs);
      m2.appendChild(u2);

      moves.appendChild(m1);
      moves.appendChild(sep);
      moves.appendChild(m2);

      var out = document.createElement('span');
      out.className = 'log__out';
      out.dataset.r = entry.outcome === 'you' ? 'you' : (entry.outcome === 'house' ? 'house' : 'tie');
      out.textContent = entry.outcome === 'you' ? 'You' : (entry.outcome === 'house' ? 'House' : 'Tie');

      li.appendChild(round);
      li.appendChild(moves);
      li.appendChild(out);
      el.log.appendChild(li);
    });
  }

  function renderRecord() {
    var r = state.record;
    el['stat-matches'].textContent = r.matches;
    el['stat-wins'].textContent = r.wins;
    el['stat-losses'].textContent = r.losses;
    el['stat-ties'].textContent = r.ties;
    el['stat-streak'].textContent = r.streak;
    el['stat-best'].textContent = r.best;

    var picks = r.picks || { rock: 0, paper: 0, scissors: 0 };
    var total = picks.rock + picks.paper + picks.scissors;
    if (!total) { el.fave.hidden = true; return; }

    el.fave.hidden = false;
    var best = null, bestN = -1;
    ['rock', 'paper', 'scissors'].forEach(function (g) {
      if (picks[g] > bestN) { bestN = picks[g]; best = g; }
    });
    el['fave-name'].textContent = LABEL[best].toLowerCase();

    el['fave-bar'].innerHTML = '';
    ['rock', 'paper', 'scissors'].forEach(function (g) {
      var seg = document.createElement('div');
      seg.className = 'fave__seg';
      seg.dataset.g = g;
      seg.style.setProperty('--pct', (picks[g] / total * 100) + '%');
      seg.title = LABEL[g] + ': ' + picks[g];
      el['fave-bar'].appendChild(seg);
    });
  }

  /* ============================================================
     Confetti
     ============================================================ */
  function burstConfetti() {
    var canvas = el.confetti;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var colors = ['#FF4A21', '#1A3FA8', '#F4F1E6', '#2E5BE0'];
    var bits = [];
    for (var i = 0; i < 110; i++) {
      bits.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.5,
        y: h * 0.42 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 11,
        vy: (Math.random() - 0.9) * 12,
        size: 5 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: colors[i % colors.length],
        life: 1
      });
    }

    var start = performance.now();
    function frame(now) {
      var elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      var alive = false;
      bits.forEach(function (b) {
        b.vy += 0.34;
        b.vx *= 0.992;
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        b.life = Math.max(0, 1 - elapsed / 1900);
        if (b.life > 0) {
          alive = true;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.globalAlpha = b.life;
          ctx.fillStyle = b.color;
          ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.62);
          ctx.restore();
        }
      });
      if (alive && elapsed < 2100) {
        window.requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    }
    window.requestAnimationFrame(frame);
  }

  /* ============================================================
     Go
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
