/* ============================================================
   audio.js — WebAudio feedback, no asset files
   ============================================================ */
(function (global) {
  'use strict';

  var ctx = null;
  var enabled = true;

  function ensureCtx() {
    if (!ctx) {
      var Ctor = global.AudioContext || global.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* A single shaped tone: type, frequency, duration, gain, delay */
  function tone(freq, dur, gainVal, type, delay) {
    if (!enabled) return;
    var ac = ensureCtx();
    if (!ac) return;

    var t0 = ac.currentTime + (delay || 0);
    var osc = ac.createOscillator();
    var amp = ac.createGain();

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);

    // Fast attack, exponential tail — reads as a clean "thock"
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gainVal || 0.12, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* Short filtered noise burst — used for the stamp impact */
  function noise(dur, gainVal, freq) {
    if (!enabled) return;
    var ac = ensureCtx();
    if (!ac) return;

    var frames = Math.floor(ac.sampleRate * dur);
    var buffer = ac.createBuffer(1, frames, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2.2);
    }

    var src = ac.createBufferSource();
    src.buffer = buffer;
    var filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq || 1400;
    filter.Q.value = 0.9;
    var amp = ac.createGain();
    amp.gain.value = gainVal || 0.16;

    src.connect(filter);
    filter.connect(amp);
    amp.connect(ac.destination);
    src.start();
  }

  var Audio = {
    setEnabled: function (v) { enabled = !!v; if (!v && ctx) ctx.suspend(); },
    isEnabled: function () { return enabled; },
    unlock: function () { ensureCtx(); },
    select: function () { tone(520, 0.09, 0.07, 'triangle'); },
    reveal: function () { tone(300, 0.14, 0.09, 'sine'); },
    win: function () {
      tone(523.25, 0.16, 0.11, 'triangle', 0);
      tone(659.25, 0.16, 0.10, 'triangle', 0.08);
      tone(783.99, 0.30, 0.11, 'triangle', 0.16);
    },
    lose: function () {
      tone(311.13, 0.18, 0.10, 'sawtooth', 0);
      tone(233.08, 0.34, 0.09, 'sawtooth', 0.11);
    },
    tie: function () {
      tone(392, 0.13, 0.08, 'square', 0);
      tone(392, 0.16, 0.06, 'square', 0.09);
    },
    matchWin: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone(f, 0.34, 0.11, 'triangle', i * 0.11);
      });
      noise(0.22, 0.10, 2600);
    },
    stamp: function () { noise(0.13, 0.17, 1200); }
  };

  global.RPSAudio = Audio;
})(window);
