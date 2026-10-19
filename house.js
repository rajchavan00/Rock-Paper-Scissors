/* ============================================================
   house.js — The opponent
   A weighted, pattern-aware computer player. It mixes:
     - a base random choice (so it stays unpredictable)
     - an exploit term (counters whatever you favour)
     - a repetition term (plays what you just played, sometimes)
     - a Markov-ish follow-up that punishes predictable habits
   ============================================================ */
(function (global) {
  'use strict';

  var GESTURES = ['rock', 'paper', 'scissors'];

  /* What beats what. */
  var BEATS = {
    rock:     'paper',    // paper covers rock
    paper:    'scissors', // scissors cuts paper
    scissors: 'rock'      // rock crushes scissors
  };

  function House() {
    this.history = [];        // your recent gestures, newest last
    this.exploit = 0.34;      // how strongly it counters your habits
    this.repeat = 0.16;       // how often it echoes you
    this.difficulty = 0.5;    // 0 = random, 1 = ruthless
  }

  House.prototype.reset = function () {
    this.history = [];
  };

  House.prototype.observed = function () {
    return this.history.slice(-12);
  };

  /* Most frequent gesture in recent history, with its share (0..1). */
  House.prototype.favourite = function () {
    var seen = this.observed();
    if (!seen.length) return { gesture: null, share: 0 };
    var counts = {};
    seen.forEach(function (g) { counts[g] = (counts[g] || 0) + 1; });
    var top = null, best = 0;
    for (var g in counts) {
      if (counts[g] > best) { best = counts[g]; top = g; }
    }
    return { gesture: top, share: best / seen.length };
  };

  /* Which gesture would beat your most recent one. */
  House.prototype.counter = function () {
    if (!this.history.length) return null;
    return BEATS[this.history[this.history.length - 1]];
  };

  House.prototype.choose = function (playerGesture) {
    var self = this;
    var d = this.difficulty;

    // 1. Base — uniform random
    var pick = GESTURES[Math.floor(Math.random() * 3)];
    var r = Math.random();

    // 2. Exploit — counter your demonstrated favourite.
    //    Strength scales with how consistent you are and with difficulty.
    var fav = this.favourite();
    if (fav.gesture && fav.share > 0.34) {
      var exploitChance = d * Math.min(1, (fav.share - 0.3) / 0.45) * 0.75;
      if (r < exploitChance) {
        pick = BEATS[fav.gesture];
        r = Math.random();
      }
    }

    // 3. Repeat — echo your last gesture (this is what makes it feel human).
    if (this.history.length && r < this.repeat * (0.5 + d * 0.5)) {
      pick = this.history[this.history.length - 1];
      r = Math.random();
    }

    // 4. Counter your last move directly — the sharpest read.
    var c = this.counter();
    if (c && r < d * 0.32) {
      pick = c;
    }

    if (playerGesture) {
      this.history.push(playerGesture);
      if (this.history.length > 40) this.history.shift();
    }
    return pick;
  };

  House.GESTURES = GESTURES;
  House.BEATS = BEATS;
  global.RPSHouse = House;
})(window);
