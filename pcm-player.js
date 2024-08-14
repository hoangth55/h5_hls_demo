"use strict";
function PCMPlayer(a) {
  this.init(a);
}
PCMPlayer.prototype.init = function (a) {
  this.option = Object.assign(
    {},
    { encoding: "16bitInt", channels: 1, sampleRate: 8e3, flushingTime: 50 },
    a
  );
  this.samples = new Float32Array();
  this.flush = this.flush.bind(this);
  this.interval = setInterval(this.flush, this.option.flushingTime);
  this.maxValue = this.getMaxValue();
  this.typedArray = this.getTypedArray();
  this.createContext();
};
PCMPlayer.prototype.getMaxValue = function () {
  let a = {
    "8bitInt": 128,
    "16bitInt": 32768,
    "32bitInt": 2147483648,
    "32bitFloat": 1,
  };
  return a[this.option.encoding] ? a[this.option.encoding] : a["16bitInt"];
};
PCMPlayer.prototype.getTypedArray = function () {
  let a = {
    "8bitInt": Int8Array,
    "16bitInt": Int16Array,
    "32bitInt": Int32Array,
    "32bitFloat": Float32Array,
  };
  return a[this.option.encoding] ? a[this.option.encoding] : a["16bitInt"];
};
PCMPlayer.prototype.createContext = function () {
  this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  this.gainNode = this.audioCtx.createGain();
  this.gainNode.gain.value = 1;
  this.gainNode.connect(this.audioCtx.destination);
  this.startTime = this.audioCtx.currentTime;
};
PCMPlayer.prototype.isTypedArray = function (a) {
  return a.byteLength && a.buffer && a.buffer.constructor == ArrayBuffer;
};
PCMPlayer.prototype.feed = function (a) {
  if (this.isTypedArray(a)) {
    a = this.getFormatedValue(a);
    var e = new Float32Array(this.samples.length + a.length);
    e.set(this.samples, 0);
    e.set(a, this.samples.length);
    this.samples = e;
  }
};
PCMPlayer.prototype.getFormatedValue = function (a) {
  a = new this.typedArray(a.buffer);
  let e = new Float32Array(a.length),
    c;
  for (c = 0; c < a.length; c++) e[c] = a[c] / this.maxValue;
  return e;
};
PCMPlayer.prototype.volume = function (a) {
  this.gainNode.gain.value = a;
};
PCMPlayer.prototype.destroy = function () {
  this.interval && clearInterval(this.interval);
  this.samples = null;
  this.audioCtx.close();
  this.audioCtx = null;
};
PCMPlayer.prototype.flush = function () {
  if (this.samples.length) {
    var a = this.audioCtx.createBufferSource(),
      e = this.samples.length / this.option.channels,
      c = this.audioCtx.createBuffer(
        this.option.channels,
        e,
        this.option.sampleRate
      ),
      g,
      b;
    for (g = 0; g < this.option.channels; g++) {
      var f = c.getChannelData(g);
      var d = g;
      var h = 50;
      for (b = 0; b < e; b++)
        (f[b] = this.samples[d]),
          50 > b && (f[b] = (f[b] * b) / 50),
          b >= e - 51 && (f[b] = (f[b] * h--) / 50),
          (d += this.option.channels);
    }
    this.startTime < this.audioCtx.currentTime &&
      (this.startTime = this.audioCtx.currentTime);
    a.buffer = c;
    a.connect(this.gainNode);
    a.start(this.startTime);
    this.startTime += c.duration;
    this.samples = new Float32Array();
  }
};
PCMPlayer.prototype.getTimestamp = function () {
  return this.audioCtx ? 1e3 * this.audioCtx.currentTime : 0;
};
PCMPlayer.prototype.play = function (a, e) {
  if (this.isTypedArray(a) && ((a = this.getFormatedValue(a)), a.length)) {
    var c = this.audioCtx.createBufferSource(),
      g = a.length / this.option.channels,
      b = this.audioCtx.createBuffer(
        this.option.channels,
        g,
        this.option.sampleRate
      ),
      f,
      d;
    for (f = 0; f < this.option.channels; f++) {
      var h = b.getChannelData(f);
      var k = f;
      var l = 50;
      for (d = 0; d < g; d++)
        (h[d] = a[k]),
          50 > d && (h[d] = (h[d] * d) / 50),
          d >= g - 51 && (h[d] = (h[d] * l--) / 50),
          (k += this.option.channels);
    }
    this.startTime < this.audioCtx.currentTime &&
      (this.startTime = this.audioCtx.currentTime);
    c.buffer = b;
    c.connect(this.gainNode);
    c.playbackRate.value = e;
    c.start(this.startTime);
    this.startTime += b.duration / e;
  }
};
PCMPlayer.prototype.pause = function () {
  this.audioCtx && this.audioCtx.suspend();
};
PCMPlayer.prototype.resume = function () {
  this.audioCtx && this.audioCtx.resume();
};
