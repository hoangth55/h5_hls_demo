"use strict";
const g_szVersion = "v1.0.0";
function Signature() {}
Signature.fnGetSignature = function (a, b, d, c, e) {
  b = a + b + d + c;
  a = Signature.fnStr2Byte(b);
  e = Signature.fnChange(b, e);
  e = Signature.fnMerge(a, e);
  return md5.hex(e);
};
Signature.fnChange = function (a, b) {
  a = Signature.fnStr2Byte(a);
  let d = a.length;
  for (let c = 0; c < d; ++c) {
    let e = c % b > (d - c) % b ? a[c] : a[d - (c + 1)];
    a[c] = a[d - (c + 1)];
    a[d - (c + 1)] = e;
  }
  return a;
};
Signature.fnStr2Byte = function (a) {
  let b = [],
    d = a.length,
    c;
  for (let e = 0; e < d; e++)
    (c = a.charCodeAt(e)),
      65536 <= c && 1114111 >= c
        ? (b.push(((c >> 18) & 7) | 240),
          b.push(((c >> 12) & 63) | 128),
          b.push(((c >> 6) & 63) | 128),
          b.push((c & 63) | 128))
        : 2048 <= c && 65535 >= c
        ? (b.push(((c >> 12) & 15) | 224),
          b.push(((c >> 6) & 63) | 128),
          b.push((c & 63) | 128))
        : 128 <= c && 2047 >= c
        ? (b.push(((c >> 6) & 31) | 192), b.push((c & 63) | 128))
        : b.push(c & 255);
  return b;
};
Signature.fnByte2Str = function (a) {
  return a
    .map(function (b) {
      b = b.toString(16);
      return (b = ("00" + b).substr(-2));
    })
    .join("");
};
Signature.fnMerge = function (a, b) {
  let d = a.length,
    c = 2 * d,
    e = Array(c);
  for (let f = 0; f < d; f++) (e[f] = a[f]), (e[c - 1 - f] = b[f]);
  return e;
};
Signature.getDomainFromUrl = function () {
  let a = window.location.href,
    b = a.indexOf("://");
  if (-1 != b) {
    var d = a.substring(b + 3);
    b = d.indexOf("/");
    d = -1 != b ? d.substring(0, b) : d;
    b = d.indexOf(":");
    -1 != b && (d = d.substring(0, b));
  }
  return d;
};
String.prototype.startWith = function (a) {
  return new RegExp("^" + a).test(this);
};
String.prototype.endWith = function (a) {
  return new RegExp(a + "$").test(this);
};
function IsEmptyStr(a) {
  return void 0 == a || null == a || "" == a ? !0 : !1;
}
function TimerCheck(a) {
  this.fnSetTimeout_TimerChk(a || g_nTimeout_Default);
}
TimerCheck.prototype.fnUpdate_TimerChk = function () {
  this._tTimeoutNext = Date.now() + this._tTimeout;
};
TimerCheck.prototype.fnSetTimeout_TimerChk = function (a) {
  this._tTimeout = a;
  this.fnUpdate_TimerChk();
};
TimerCheck.prototype.fnCheckTimeout_TimerChk = function (a) {
  return this._tTimeoutNext > a;
};
function FileInfo(a) {
  this.url = a.url;
  this.chunkSize = a.checkSize || g_nChunkSize_Default;
  this.isStream = void 0 === a.isStream ? !0 : a.isStream;
  this.waitHeaderLen = a.waitHeaderLen;
  this.bufferDuration = a.bufferDuration || g_nBufferDuration_Default;
  this.timeoutRecv = a.timeoutRecv || g_nTimeout_Default;
  this.timeoutDec = a.timeoutDec || g_nTimeout_Default;
  this.intervalDec = a.intervalDec || g_nIntervalDec_Default;
  this.intervalTrack = a.intervalTrack || g_nInterval_Default;
  this.speed = a.speed || g_nSpeed_Default;
  this.logLv = a.logLv || g_nLogLv_Default;
  this.proto = a.proto;
  this.type = a.type;
  this.urlProto = a.urlProto;
  this.leftShiftBits = a.leftShiftBits || g_nLeftShiftBits_Default;
  this.rightShiftBits = a.rightShiftBits || g_nRightShiftBits_Default;
  this.milliSecsOfBuff = a.milliSecsOfBuff || g_nMilliSecsOfBuff_Set;
  this.playTime = Math.ceil(Date.now() / 1e3);
  this.authCode = null;
  this.startDate = a.startDate || g_nDateStr_Default;
  this.endDate = a.endDate || g_nDateStr_Default;
  a = a.urlProto;
  let b = { proto: kProtoType_NONE, type: STREAM_TYPE_NONE };
  "httpFlv" == a
    ? ((b.proto = kProtoType_HTTP), (b.type = STREAM_TYPE_FLV))
    : "httpHls" == a
    ? ((b.proto = kProtoType_HTTP_M3U8), (b.type = STREAM_TYPE_HLS))
    : "ws" == a
    ? ((b.proto = kProtoType_WS), (b.type = STREAM_TYPE_NALU))
    : "http" == a
    ? ((b.proto = kProtoType_HTTP), (b.type = STREAM_TYPE_NALU))
    : (b = this.fnGetStreamTypeByUrl(this.url));
  void 0 == this.proto && (this.proto = b.proto);
  void 0 == this.type && (this.type = b.type);
}
function calculateTimeDifference(a, b) {
  function d(c) {
    c = c.split(/[- :]/);
    return new Date(Date.UTC(c[0], c[1] - 1, c[2], c[3], c[4], c[5]));
  }
  a = d(a);
  b = d(b);
  return a - b;
}
FileInfo.prototype.fnGetStreamTypeByUrl = function (a) {
  if (/^rtsp/.test(a)) return { p: kProtoType_RTSP, t: STREAM_TYPE_NALU };
  if (/^ws{1,2}:/.test(a)) return { p: kProtoType_WS, t: STREAM_TYPE_NALU };
  if (/^http/.test(a)) {
    let b = /.m3u8$/;
    return /.flv$/.test(a)
      ? { p: kProtoType_HTTP, t: STREAM_TYPE_FLV }
      : b.test(a)
      ? { p: kProtoType_HTTP_M3U8, t: STREAM_TYPE_HLS }
      : { p: kProtoType_NONE, t: STREAM_TYPE_NONE };
  }
  return { p: kProtoType_NONE, t: STREAM_TYPE_NONE };
};
function FunsExtend_Stream() {}
FunsExtend_Stream.prototype = {
  fnPause: function () {
    this.m_stStreamParams = {
      urlInfo: this.m_pUrlInfo,
      canvas: this.m_pCanvas,
      callback: this.m_fnCallback,
      node: this.m_pNodeFullscreen,
    };
    this.logger.logInfo("Stop in stream pause.");
    this.m_pPcmPlayer && this.m_pPcmPlayer.pause();
    this.m_nState = emState_Pausing;
    this.fnPauseDownloader();
    this.fnPauseDecoder();
    this.fnStopTimerTrack();
    this.fnStopBuffering();
    this.fnClearBufferFrames();
    this.fnCallbackMessage(CallBack_Pause);
    return { e: 0, m: "Success" };
  },
  fnResume: function (a) {
    this.m_pPcmPlayer && this.m_pPcmPlayer.resume();
    this.m_nState = emState_Running;
    this.fnStop();
    this.logger.logInfo("Play in stream resume.");
    this.fnPlay(
      this.m_stStreamParams.urlInfo,
      this.m_stStreamParams.canvas,
      this.m_stStreamParams.callback
    );
    this.m_stStreamParams = null;
    this.fnCallbackMessage(CallBack_Playing);
    return { e: 0, m: "Success" };
  },
};
function FunExtend_NotStream() {}
FunExtend_NotStream.prototype = {
  fnPause: function () {
    this.m_stStreamParams = {
      urlInfo: this.m_pUrlInfo,
      canvas: this.m_pCanvas,
      callback: this.m_fnCallback,
      node: this.m_pNodeFullscreen,
    };
    this.m_pPcmPlayer && this.m_pPcmPlayer.pause();
    this.m_tLocalMsecsFirst = 0;
    this.m_nState = emState_Pausing;
    this.fnPauseDownloader();
    this.fnPauseDecoder();
    this.fnPauseTimerTrack();
    this.fnStopBuffering();
    kProtoType_HTTP_M3U8 == this.m_pUrlInfo.proto && this.fnClearBufferFrames();
    this.fnCallbackMessage(CallBack_Pause);
    return { e: 0, m: "Success" };
  },
  fnResume: function (a) {
    this.logger.logInfo("Resume.");
    this.m_pPcmPlayer && this.m_pPcmPlayer.resume();
    this.m_tLocalMsecsFirst = 0;
    this.m_nState = emState_Running;
    kProtoType_HTTP_M3U8 == this.m_pUrlInfo.proto
      ? (this.fnResumeDownloader(),
        this.fnResumeDecoder(),
        this.fnStartBuffering(),
        ++this.m_nSeq,
        (this.m_bBuffering = !1),
        (this.m_nState_Dec = this.m_nState_Dld = emState_Idle),
        this.fnStartDownloader(),
        this.fnStartDecoder(),
        this.fnStartBuffering())
      : (this.fnHideLoading(), this.fnPlayerSkipTime(this.m_nPause_PauseTime));
    this.logger.logInfo("Play in stream resume.");
    this.fnStartTimerTrack();
    this.fnDisplayLoop();
    this.m_stStreamParams = null;
    this.fnCallbackMessage(CallBack_Playing);
    return { e: 0, m: "Success" };
  },
};
function Player(a) {
  this.fnClearAuthStroeSession();
  this.nextRequestProfile = this.nextRequestAuth = this.nReqAuthCount = 0;
  this.m_szVersion = "";
  this.options = a;
  this.m_nSeq = 0;
  this.m_bRegisterEvent = !1;
  this.m_pFunsExtend =
    this.m_pTimerCheck_DecFrame =
    this.m_pTimerCheck_Recv =
      null;
  this.m_tPtsLast =
    this.m_tPtsFirst =
    this.m_tLocalMsecsLast =
    this.m_tLocalMsecsFirst =
      0;
  this.m_pWebGLPlayer =
    this.m_pPcmPlayer =
    this.m_pNodeFullscreen =
    this.m_pCallback_AiInfo =
    this.m_fnCallback =
    this.m_pCanvas =
    this.m_pUrlInfo =
      null;
  this.m_nUVLen =
    this.m_nYLen =
    this.m_nHeight =
    this.m_nWidth =
    this.m_nPixFmt =
    this.m_nDuration =
      0;
  this.m_bHasAudio = !1;
  this.m_nSampleRatePcm = this.m_nChannelsPcm = this.m_szEncodingPcm = 0;
  this.m_bGetFirstFrame = !1;
  this.m_nBeginTime_Pcm = 0;
  this.m_nState = emState_Idle;
  this.m_nState_Dld = null;
  this.m_nState_Dec = emState_Idle;
  this.m_nTimerInterval_Dec = g_nIntervalDec_Default;
  this.m_pTimer_Track = this.m_pTimeTrack = this.m_pTimeLabel = null;
  this.m_szDurationDisplay = "00:00:00";
  this.m_nTimerInterval_Track = g_nInterval_Default;
  this.m_pLoadingDiv = null;
  this.m_arrCache = [];
  this.m_pProgressBarModal = null;
  this.m_fDurationSecs = 0;
  this.m_bBuffering = !1;
  this.arrBufferFrames = [];
  this.arrBufferPcms = [];
  this.m_nLeftShiftBits = g_nLeftShiftBits_Default;
  this.m_nRightShiftBits = g_nRightShiftBits_Default;
  this.m_tMilliSecsOfBuff_Set = g_nMilliSecsOfBuff_Set;
  this.m_tDuration = 0;
  this.m_bIsRealTime = !0;
  this.m_tMilliSecsOfBuff_2X = g_nMilliSecsOfBuff_Set + 500;
  this.m_tMilliSecsOfBuff_Min = Math.max(
    g_nMilliSecsOfBuff_Set >> this.m_nRightShiftBits,
    g_nMilliSecsOfBuff_Min_Default
  );
  this.m_tMilliSecsOfBuff_Max = Math.min(
    g_nMilliSecsOfBuff_Set << this.m_nLeftShiftBits,
    g_nMilliSecsOfBuff_Max_Default
  );
  this.m_stStreamParams = null;
  this.m_arrBufferFrames = [];
  this.m_pWorker_Dec = this.m_pWorker_Dld = null;
  this.m_nSpeed = 1;
  this.m_nState_SkipPlayer = !1;
  this.m_time_SkipPlayer = 0;
  this.m_nFlag_SkipOpt = !1;
  this.m_nPause_PauseTime = 0;
  this.logger = new Logger("Player");
  this.fnNewWorkerDownloader();
  this.fnNewWorkerDecoder();
  this.m_bSendProfile = !1;
  this.m_bSendAuth = !0;
}
Player.prototype.fnClearAuthStroeSession = function () {
  for (let a = 0; a < ProfileKey_Note.length; a++)
    window.sessionStorage.removeItem(ProfileKey_Note[a]);
};
Player.prototype.fnParseProfile = function (a) {
  let b = a.uuid,
    d = a.appkey,
    c = a.appsecret;
  a = a.movedcard;
  return b && d && c && a
    ? (window.sessionStorage.setItem(ProfileKey_Note[0], b),
      window.sessionStorage.setItem(ProfileKey_Note[1], d),
      window.sessionStorage.setItem(ProfileKey_Note[2], c),
      window.sessionStorage.setItem(ProfileKey_Note[3], a.toString()),
      0)
    : -1;
};
Player.prototype.fnGetProfile = function () {
  if (window.sessionStorage.getItem(ProfileKey_Note[0]))
    this.AuthErrorByStop(),
      console.error(
        "The authentication information is incorrect, please check"
      );
  else if (!(this.nextRequestProfile > Date.now())) {
    var a = this;
    fetch("./profile")
      .then((b) => {
        b.json()
          .then((d) => {
            if (d) {
              try {
                JSON.parse(d);
              } catch (m) {
                return;
              }
              var c = d.uuid,
                e = d.appkey,
                f = d.appsecret;
              d = d.movedcard;
              c &&
                e &&
                f &&
                d &&
                (window.sessionStorage.setItem(ProfileKey_Note[0], c),
                window.sessionStorage.setItem(ProfileKey_Note[1], e),
                window.sessionStorage.setItem(ProfileKey_Note[2], f),
                window.sessionStorage.setItem(ProfileKey_Note[3], d.toString()),
                a.fnRequestAuth());
            }
          })
          .catch((d) => {
            console.log("ERROR:", d);
            ++a.nReqAuthCount;
          });
      })
      .catch((b) => {
        console.log("ERROR:", b);
        ++a.nReqAuthCount;
      });
    this.nextRequestProfile = Date.now() + 5e3;
  }
};
Player.prototype.fnRequestAuth = function () {
  let a = this,
    b = window.sessionStorage.getItem(ProfileKey_Note[0]),
    d = window.sessionStorage.getItem(ProfileKey_Note[1]);
  var c = window.sessionStorage.getItem(ProfileKey_Note[2]),
    e = window.sessionStorage.getItem(ProfileKey_Note[3]);
  if (!(b && d && c && e))
    this.AuthErrorByStop(),
      console.error(
        "The authentication information is incorrect, please check"
      );
  else if (!(this.nextRequestAuth > Date.now())) {
    this.nextRequestAuth = Date.now() + AuthRate_Error;
    var f = parseInt(e);
    e = new Date().getTime().toString().padStart(20, "0");
    c = Signature.fnGetSignature(b, d, c, e, f);
    f = {
      Host: Signature.getDomainFromUrl(),
      StartTime: this.m_pUrlInfo.playTime,
    };
    f = ECB.encrypt(JSON.stringify(f), e, b);
    var m = AuthURL_Note,
      g = new Headers();
    g.append("Content-Type", "application/x-www-form-urlencoded");
    g.append("uuid", b);
    g.append("appKey", d);
    g.append("timeMillis", e);
    g.append("signature", c);
    fetch(m, {
      method: "POST",
      headers: g,
      mode: "cors",
      cache: "default",
      body: f,
    })
      .then((k) => {
        k.json()
          .then((h) => {
            let l = h.code;
            var n = h.msg;
            h = h.data;
            2e3 == l || 15074 == l
              ? ((this.nextRequestAuth = Date.now() + AuthRate_Default),
                (a.nReqAuthCount = 0),
                (n = Math.ceil(Date.now() / 1e3)),
                this.m_pUrlInfo.authCode
                  ? this.m_pUrlInfo.authCode != l
                    ? (this.m_pUrlInfo.playTime = n)
                    : window.sessionStorage.setItem(AuthKey_Note, h)
                  : ((this.m_pUrlInfo.playTime = n),
                    window.sessionStorage.setItem(AuthKey_Note, h)))
              : (this.fnStop(), console.error(n));
            this.m_pUrlInfo.authCode = l;
          })
          .catch((h) => {
            console.log("ERROR:", h);
            this.AuthError();
          });
      })
      .catch((k) => {
        console.log("ERROR:", k);
        this.AuthError();
      });
  }
};
Player.prototype.AuthErrorByStop = function () {
  ++this.nReqAuthCount;
};
Player.prototype.AuthError = function () {
  ++this.nReqAuthCount;
};
Player.prototype.fnGetVersion = function () {
  return g_szVersion;
};
Player.prototype.fnSetCbAiInfo = function (a) {
  this.m_pCallback_AiInfo = a;
};
Player.prototype.fnGetWasmVersion = function () {
  return this.m_szVersion;
};
Player.prototype.fnSetRealTime = function (a) {
  this.m_bIsRealTime = a;
};
Player.prototype.fnPlay = function (a, b, d, c) {
  a.url = removeQueryParam(a.url, "seekFromBegin");
  this.logger.logInfo("Play " + a.url + ".");
  let e = { e: 0, m: "Success" };
  this.nReqAuthCount = 0;
  this.fnParseProfile(this.options);
  this.fnServerUUID();
  this.fnNetDomain();
  this.m_nState == emState_Pausing
    ? (e = this.fnResume())
    : this.m_nState != emState_Running &&
      (a
        ? b
          ? ((this.m_pUrlInfo = new FileInfo(a)),
            (this.m_pFunsExtend = this.m_pUrlInfo.isStream
              ? new FunsExtend_Stream()
              : new FunExtend_NotStream()),
            (this.m_pTimerCheck_Recv = new TimerCheck(
              this.m_pUrlInfo.timeoutRecv
            )),
            (this.m_pTimerCheck_DecFrame = new TimerCheck(
              this.m_pUrlInfo.timeoutDec
            )),
            (this.m_pCanvas = b),
            (this.m_fnCallback = d),
            (this.m_pNodeFullscreen = c),
            (this.m_nTimerInterval_Track = this.m_pUrlInfo.intervalTrack),
            (this.m_nTimerInterval_Dec = this.m_pUrlInfo.intervalDec),
            this.fnInitTimerTrack(),
            this.fnStartTimerTrack(),
            (this.m_nSpeed = this.m_pUrlInfo.speed),
            this.fnSetMilliSecsOfBuff(
              this.m_pUrlInfo.milliSecsOfBuff,
              this.m_pUrlInfo.leftShiftBits,
              this.m_pUrlInfo.rightShiftBits
            ),
            this.fnClearBufferFrames(),
            (this.m_pWebGLPlayer = new WebGLPlayer(
              this.m_pCanvas,
              { preserveDrawingBuffer: !1 },
              this.m_pNodeFullscreen
            )),
            (this.m_bBuffering = !1),
            (this.m_nState_Dec = this.m_nState_Dld = emState_Idle),
            this.fnStartDownloader(),
            this.fnStartDecoder(),
            this.fnStartBuffering(),
            ++this.m_nSeq,
            (this.m_nState = emState_Running),
            this.fnDisplayLoop(),
            this.fnCallbackMessage(CallBack_Playing))
          : ((e = { e: -2, m: "Canvas not set" }),
            (success = !1),
            this.logger.logError("[ER] playVideo error, canvas empty."))
        : ((e = { e: -1, m: "Invalid url" }),
          (success = !1),
          this.logger.logError("[ER] playVideo error, url empty.")));
  return e;
};
Player.prototype.fnPause = function () {
  this.logger.logInfo("Pause.");
  return this.m_nState != emState_Running
    ? { e: -1, m: "Not playing" }
    : this.m_pFunsExtend.fnPause.call(this);
};
Player.prototype.fnResume = function (a) {
  this.logger.logInfo("Resume.");
  return this.m_nState != emState_Pausing
    ? { e: -1, m: "Not pausing" }
    : this.m_pFunsExtend.fnResume.call(this, a);
};
Player.prototype.fnStop = function () {
  if (this.m_nState == emPlayerState_Idle) return { e: -1, m: "Not playing" };
  this.m_nState = emState_Idle;
  this.m_nState_SkipPlayer = !1;
  this.m_time_SkipPlayer = 0;
  this.fnStopBuffering();
  this.fnStopDownloader();
  this.fnStopDecoder();
  this.fnStopTimerTrack();
  this.fnHideLoading();
  this.fnClearBufferFrames();
  this.fnCallbackMessage(CallBack_Stop);
  this.fnClear();
  this.fnStopTimerAuth();
  this.m_pTimerCheck_Recv && (this.m_pTimerCheck_Recv = null);
  this.m_pTimerCheck_DecFrame && (this.m_pTimerCheck_DecFrame = null);
  this.m_pWebGLPlayer &&
    (this.m_pWebGLPlayer.destroy(), (this.m_pWebGLPlayer = null));
  this.m_tPtsLast =
    this.m_tPtsFirst =
    this.m_tLocalMsecsLast =
    this.m_tLocalMsecsFirst =
      0;
  this.m_pCallback = this.m_pCanvas = this.m_pUrlInfo = null;
  this.m_nLenRecv = 0;
  this.m_pNodeFullscreen = null;
  this.m_arrBufferFrames = [];
  this.m_arrCache = [];
  this.m_pProgressBarModal = null;
  this.m_fDurationSecs = 0;
  this.m_bBuffering = !1;
  this.arrBufferFrames = [];
  this.arrBufferPcms = [];
  this.m_nPause_PauseTime = 0;
  this.m_bGetFirstFrame = !1;
  this.m_pPcmPlayer &&
    (this.m_pPcmPlayer.destroy(),
    (this.m_pPcmPlayer = null),
    this.logger.logInfo("Pcm player released."));
  this.fnInitTimerTrack();
  this.m_pTimeLabel &&
    (this.m_pTimeLabel.innerHTML =
      this.fnFormatTime(0) + "/" + this.fnFormatTime(0));
  this.logger.logInfo("Closing decoder.");
  return { e: -1, m: "Stop play" };
};
Player.prototype.fnDestroy = function () {
  this.m_pWorker_Dld && this.m_pWorker_Dld.terminate();
  this.m_pWorker_Dec && this.m_pWorker_Dec.terminate();
  this.m_pWorker_Dec = this.m_pWorker_Dld = null;
};
Player.prototype.fnClear = function () {
  this.m_pWebGLPlayer && this.m_pWebGLPlayer.clear();
};
Player.prototype.fnFullscreen = function () {
  this.m_pWebGLPlayer && this.m_pWebGLPlayer.fullscreen();
};
Player.prototype.fnExitFullscreen = function () {
  this.m_pWebGLPlayer
    ? this.m_pWebGLPlayer.exitFullscreen()
    : document.exitFullscreen
    ? document.exitFullscreen()
    : document.webkitExitFullscreen
    ? document.webkitExitFullscreen()
    : document.mozCancelFullScreen
    ? document.mozCancelFullScreen()
    : document.msExitFullscreen
    ? document.msExitFullscreen()
    : alert("Exit fullscreen doesn't work");
};
Player.prototype.fnGetState = function () {
  return this.m_nState;
};
Player.prototype.fnSetSpeed = function (a) {
  if (0.125 > a || 4 < a) return !1;
  if (this.m_nSpeed == a) return !0;
  this.m_pUrlInfo && (this.m_pUrlInfo.speed = a);
  this.m_nSpeed = a;
  this.m_tLocalMsecsFirst = 0;
  return !0;
};
Player.prototype.fnSetMilliSecsOfBuff = function (a, b, d) {
  this.m_nLeftShiftBits = b || this.m_nLeftShiftBits;
  this.m_nRightShiftBits = d || this.m_nRightShiftBits;
  this.m_tMilliSecsOfBuff_Set = a || g_nMilliSecsOfBuff_Set;
  this.m_tMilliSecsOfBuff_2X = this.m_tMilliSecsOfBuff_Set + 500;
  this.m_tMilliSecsOfBuff_Min = Math.max(
    this.m_tMilliSecsOfBuff_Set >> this.m_nRightShiftBits,
    g_nMilliSecsOfBuff_Min_Default
  );
  this.m_tMilliSecsOfBuff_Max = Math.min(
    this.m_tMilliSecsOfBuff_Set << this.m_nLeftShiftBits,
    g_nMilliSecsOfBuff_Max_Default
  );
};
Player.prototype.fnOnAudioInfo = function (a) {
  this.m_nState == emState_Running &&
    (this.logger.logInfo("OnAudioInfo " + a.e + "."),
    0 == a.e
      ? (this.fnOnAudioParam(a.a), this.logger.logInfo("OnAudioInfo."))
      : this.fnReportErrorPlayer(Error_Decoder_AudioInfo));
};
Player.prototype.fnOnAudioParam = function (a) {
  if (
    this.m_nState == emState_Running &&
    (this.logger.logInfo(
      "Audio param sampleFmt:" +
        a.f +
        " channels:" +
        a.c +
        " sampleRate:" +
        a.r +
        "."
    ),
    (this.m_bHasAudio = 0 < a.s))
  ) {
    var b = a.f,
      d = a.c;
    a = a.r;
    var c = "16bitInt";
    switch (b) {
      case 0:
        c = "8bitInt";
        break;
      case 1:
        c = "16bitInt";
        break;
      case 2:
        c = "32bitInt";
        break;
      case 3:
        c = "32bitFloat";
        break;
      case 4:
        c = "64bitFloat";
        break;
      case 5:
        c = "8bitInt";
        break;
      case 6:
        c = "16bitInt";
        break;
      case 7:
        c = "32bitInt";
        break;
      case 8:
        c = "32bitFloat";
        break;
      case 9:
        c = "64bitFloat";
        break;
      case 10:
      case 11:
        c = "64bitInt";
        break;
      default:
        this.logger.logError("Unsupported audio sampleFmt " + b + "!");
    }
    this.logger.logInfo("Audio encoding " + c + ".");
    this.m_pPcmPlayer = new PCMPlayer({
      encoding: c,
      channels: d,
      sampleRate: a,
      flushingTime: 5e3,
    });
    this.m_szEncodingPcm = c;
    this.m_nChannelsPcm = d;
    this.m_nSampleRatePcm = a;
  }
};
Player.prototype.fnRestartPcm = function () {
  this.m_pPcmPlayer &&
    (this.m_pPcmPlayer.destroy(), (this.m_pPcmPlayer = null));
  this.m_pPcmPlayer = new PCMPlayer({
    encoding: this.m_szEncodingPcm,
    channels: this.m_nChannelsPcm,
    sampleRate: this.m_nSampleRatePcm,
    flushingTime: 5e3,
  });
};
Player.prototype.fnDisplayAudioFrame = function (a) {
  if (this.m_nState != emState_Running) return !1;
  this.m_pPcmPlayer?.play(new Uint8Array(a.d), this.m_nSpeed);
  return !0;
};
Player.prototype.fnOnAudioFrame = function (a) {
  this.m_nState == emState_Running && this.arrBufferPcms.push(a);
};
Player.prototype.fnOnVideoInfo = function (a) {
  0 == a.e
    ? this.fnOnVideoParam(a.v)
    : this.fnReportErrorPlayer(Error_Decoder_VideoInfo);
};
Player.prototype.fnOnVideoParam = function (a) {
  this.m_nState != emState_Idle &&
    ((this.m_nDuration = a.d),
    (this.m_nPixFmt = a.p),
    (this.m_nWidth = a.w),
    (this.m_nHeight = a.h),
    (this.m_nYLen = this.m_nWidth * this.m_nHeight),
    (this.m_nUVLen = (this.m_nWidth / 2) * (this.m_nHeight / 2)),
    this.fnUpdateTimerTrackMax(this.m_nDuration));
};
Player.prototype.fnOnVideoFrame = function (a) {
  this.fnPushBufferFrame(a);
};
Player.prototype.fnDisplayVideoFrame = function (a) {
  if (this.m_nState != emState_Running) return !1;
  try {
    if (0 < a.d.length && a.d.length < Number.MAX_SAFE_INTEGER) {
      let b = new Uint8Array(a.d);
      this.fnRenderVideoFrame(b, a.w, a.h, a.y, a.u);
      return !0;
    }
    console.error(
      "\u6570\u636e\u5927\u5c0f\u8d85\u51fa\u5408\u7406\u8303\u56f4"
    );
  } catch (b) {
    b instanceof RangeError
      ? console.error("\u5185\u5b58\u5206\u914d\u5931\u8d25:", b)
      : console.error("\u53d1\u751f\u5176\u4ed6\u9519\u8bef:", b);
  }
  return !1;
};
Player.prototype.fnRenderVideoFrame = function (a, b, d, c, e) {
  this.m_pWebGLPlayer.renderFrame(a, b, d, c, e);
};
Player.prototype.fnSendMarkerData = function (a) {
  this.m_pWebGLPlayer.parseAIdata(a);
};
Player.prototype.fnOnRequestData = function (a, b) {};
Player.prototype.fnOnVersion = function (a) {
  this.m_szVersion = a;
};
Player.prototype.fnOnAiFrame = function (a) {
  this.fnPushBufferFrame(a);
};
Player.prototype.fnDisplayAiFrame = function (a) {
  if (this.m_nState != emState_Running || null == this.m_pCallback_AiInfo)
    return !1;
  this.m_pCallback_AiInfo({ k: CallBack_AiInfo, m: a.d, w: a.w, h: a.h });
  return !0;
};
Player.prototype.fnDisplayLoop = function () {
  this.m_arrBufferFrames.length > MAX_BUFFER_SIZE &&
    this.m_arrBufferFrames.splice(
      0,
      this.m_arrBufferFrames.length - MAX_BUFFER_SIZE
    );
  this.m_nState !== emState_Idle &&
    requestAnimationFrame(this.fnDisplayLoop.bind(this));
  this.m_nState !== emState_Running ||
    this.m_bBuffering ||
    (0 == this.m_arrBufferFrames.length
      ? this.m_nState_Dec == emState_Finished &&
        (this.fnUpdateTimerTrack(),
        this.fnCallbackMessage(CallBack_Finished),
        this.fnStop())
      : (this.processFrames(),
        this.m_nState_Dec == emState_Finished &&
          0 === this.m_arrBufferFrames.length &&
          (this.fnUpdateTimerTrack(),
          this.fnCallbackMessage(CallBack_Finished),
          this.fnStop()),
        this.handleBufferingAndPlaybackSpeed()));
};
Player.prototype.processFrames = function () {
  let a = 0;
  for (; 10 > a && 0 < this.m_arrBufferFrames.length; ) {
    let b = this.m_arrBufferFrames[0],
      d = Date.now();
    if (
      0 < this.m_tLocalMsecsFirst &&
      b.s - this.m_tPtsFirst > this.m_nSpeed * (d - this.m_tLocalMsecsFirst)
    )
      break;
    let c = b.s + 500;
    for (; 0 < this.arrBufferPcms.length && !(this.arrBufferPcms[0].s > c); )
      this.fnDisplayAudioFrame(this.arrBufferPcms[0]),
        this.arrBufferPcms.shift();
    this.displayFrame(b, d);
    a++;
  }
};
Player.prototype.displayFrame = function (a, b) {
  switch (a.t) {
    case kAudioFrame:
      this.fnDisplayAudioFrame(a) && this.m_arrBufferFrames.shift();
      break;
    case kVideoFrame:
      this.fnDisplayVideoFrame(a) &&
        (0 >= this.m_tLocalMsecsFirst &&
          ((this.m_tLocalMsecsFirst = this.m_pUrlInfo.isStream
            ? b
            : b - 1e3 * this.m_time_SkipPlayer),
          (this.m_tPtsFirst = a.s)),
        (this.m_tLocalMsecsLast = b),
        (this.m_tPtsLast = a.s),
        this.m_arrBufferFrames.shift(),
        kProtoType_HTTP === this.m_pUrlInfo.proto &&
          !this.m_pUrlInfo.isStream &&
          a.s / 1e3 >= this.m_pTimeTrack.max &&
          setTimeout(() => this.fnStop(), 1e3));
      break;
    case kAiFrame:
      this.fnDisplayAiFrame(a), this.m_arrBufferFrames.shift();
  }
};
Player.prototype.handleBufferingAndPlaybackSpeed = function () {
  if (!this.m_nState_SkipPlayer) {
    let a = this.fnGetDurationOfBufferFrames();
    a < this.m_tMilliSecsOfBuff_Set
      ? (this.m_nState_Dec === emState_Pausing && this.fnResumeDecoder(),
        this.m_pUrlInfo &&
          this.m_pUrlInfo.isStream &&
          this.m_nSpeed !== this.m_pUrlInfo.speed &&
          ((this.m_nSpeed = this.m_pUrlInfo.speed),
          (this.m_tLocalMsecsFirst = 0)),
        a < this.m_tMilliSecsOfBuff_Min &&
          this.m_nState_Dec !== emState_Finished &&
          this.fnStartBuffering())
      : this.m_pUrlInfo.isStream &&
        this.m_bIsRealTime &&
        a > this.m_tMilliSecsOfBuff_2X &&
        this.m_nSpeed === this.m_pUrlInfo.speed &&
        ((this.m_nSpeed = 2 * this.m_pUrlInfo.speed),
        (this.m_tLocalMsecsFirst = 0));
  }
};
Player.prototype.fnNewWorkerDownloader = function () {
  let a = this;
  this.m_pWorker_Dld = new Worker(this.options.dir + "/downloader.js");
  this.m_pWorker_Dld.onmessage = function (b) {
    b = b.data;
    switch (b.t) {
      case kRsp_DownloadStart:
        a.fnOnDownloaderStart(b);
        break;
      case kRsp_DownloadStop:
        a.fnOnDownloaderStop(b);
        break;
      case kRsp_DownloadPause:
        a.fnOnDownloaderPause(b);
        break;
      case kRsp_DownloadResume:
        a.fnOnDownloaderResume(b);
        break;
      case kRsp_DurationChange:
        a.fnOnDurationChange(b);
        break;
      case kUriData:
        a.fnOnUriData(b.d, b.q);
        break;
      case kUriDataFinished:
        a.fnOnDownloaderFinished(b);
        break;
      case kRsp_ProfileData:
        a.fnParseProfile(b.data);
        break;
      case kRsp_FileTimeLength:
        kProtoType_HTTP_M3U8 == a.m_pUrlInfo.proto &&
          ((b = b.d),
          a.m_nState_SkipPlayer
            ? (a.m_time_SkipPlayer = a.m_fDurationSecs - b)
            : ((a.m_fDurationSecs = b), (a.m_pTimeTrack.max = b)));
        break;
      case kRsp_DownloadChangeTime:
        a.fnStartDownloader(), a.fnStartDecoder(), a.fnStartBuffering();
    }
  };
};
function removeQueryParam(a, b) {
  a = new URL(a);
  let d = a.searchParams;
  d.delete(b);
  a.search = d.toString();
  return a.toString();
}
Player.prototype.fnCheckAndNewDownloader = function () {
  this.m_pWorker_Dld ||
    this.m_nState_Dld == emState_Finished ||
    this.fnNewWorkerDownloader();
};
Player.prototype.fnStartDownloader = function () {
  this.fnCheckAndNewDownloader();
  let a = {
    t: kReq_DownloadStart,
    p: this.m_pUrlInfo.proto,
    u: this.m_pUrlInfo.url,
    i: this.m_pUrlInfo.isStream,
    q: this.m_nSeq,
    k: window.sessionStorage.getItem(ProfileKey_Note[0]),
  };
  this.m_pWorker_Dld.postMessage(a);
};
Player.prototype.fnStopDownloader = function () {
  if (this.m_pWorker_Dld)
    switch (this.m_nState_Dld) {
      case emState_Pausing:
      case emState_Running:
      case emState_Finished:
        this.m_pWorker_Dld.postMessage({ t: kReq_DownloadStop });
    }
};
Player.prototype.fnResumeDownloader = function () {
  this.fnCheckAndNewDownloader();
  switch (this.m_nState_Dld) {
    case emState_Idle:
      this.fnStartDownloader();
      break;
    case emState_Pausing:
      this.m_pWorker_Dld.postMessage({ t: kReq_DownloadResume });
  }
};
Player.prototype.fnPauseDownloader = function () {
  this.fnCheckAndNewDownloader();
  switch (this.m_nState_Dld) {
    case emState_Running:
      this.m_pWorker_Dld.postMessage({ t: kReq_DownloadPause });
      break;
    case emState_Pausing:
      this.m_pWorker_Dld.postMessage({ t: kReq_DownloadPause });
  }
};
Player.prototype.fnOnDownloaderStart = function (a) {
  0 == a.e
    ? ((this.m_nState_Dld = emState_Running), this.m_pWorker_Dec.postMessage(a))
    : (this.fnReportErrorPlayer(Error_Downloader_Start), this.fnStop());
};
Player.prototype.fnOnDownloaderStop = function (a) {
  0 == a.e
    ? (this.m_nState_Dld = emState_Idle)
    : this.fnReportErrorPlayer(Error_Downloader_Stop);
};
Player.prototype.fnOnDownloaderPause = function (a) {
  0 == a.e
    ? (this.m_nState_Dld = emState_Pausing)
    : this.fnReportErrorPlayer(Error_Downloader_Pause);
};
Player.prototype.fnOnDownloaderResume = function (a) {
  0 == a.e
    ? (this.m_nState_Dld = emState_Running)
    : this.fnReportErrorPlayer(Error_Downloader_Resume);
};
Player.prototype.fnOnDownloaderFinished = function (a) {
  this.m_nState_Dld = emState_Finished;
  a.t = kDataFinished;
  this.m_pWorker_Dec.postMessage(a);
};
Player.prototype.fnOnDurationChange = function (a) {
  this.fnSetDuration(a.n);
};
Player.prototype.fnOnUriData = function (a, b) {
  if (
    (this.m_nState == emState_Pausing || this.m_nState == emState_Running) &&
    this.m_nState_Dec != emState_Finished
  )
    if (null == this.m_pWorker_Dec || this.m_nState_Dec == emState_Idle)
      this.m_arrCache.push(a);
    else {
      if (0 < this.m_arrCache.length) {
        for (b = 0; b < this.m_arrCache.length; b++) {
          let d = { t: kFeedData, d: this.m_arrCache[b] };
          this.m_pWorker_Dec.postMessage(d, [d.d]);
        }
        this.m_arrCache.length = 0;
      }
      a = { t: kFeedData, d: a };
      this.m_pWorker_Dec.postMessage(a, [a.d]);
    }
};
Player.prototype.fnPlayerSkipTime = function (a) {
  this.m_nState_SkipPlayer = !0;
  this.m_time_SkipPlayer = a;
  this.m_pTimeLabel.innerHTML =
    this.fnFormatTime(a) + "/" + this.fnFormatTime(this.m_fDurationSecs);
  this.m_pUrlInfo.url = removeQueryParam(this.m_pUrlInfo.url, "seekFromBegin");
  this.m_pUrlInfo.url = this.m_pUrlInfo.url + "?seekFromBegin=" + a;
  this.arrBufferPcms = [];
  this.m_arrBufferFrames = [];
  this.fnClearBufferFrames();
  this.m_tPtsLast = this.m_tPtsFirst = 0;
  this.fnShowLoading();
  kProtoType_HTTP == this.m_pUrlInfo.proto
    ? (this.fnStartDownloader(), this.fnStartDecoder(), this.fnStartBuffering())
    : this.m_pWorker_Dld.postMessage({
        t: kReq_DecoderSkipTime,
        index: a,
        streamType: this.m_pUrlInfo.proto,
      });
  this.m_nFlag_SkipOpt = !1;
};
Player.prototype.fnNewWorkerDecoder = function () {
  let a = this;
  this.m_pWorker_Dec = new Worker(this.options.dir + "/decoder.js");
  this.m_pWorker_Dec.onmessage = function (b) {
    b = b.data;
    switch (b.t) {
      case kReq_DecoderPause:
        a.fnOnDecoderPause(b);
        break;
      case kReq_DecoderResume:
        a.fnOnDecoderResume(b);
        break;
      case kVideoInfo:
        a.fnOnVideoInfo(b);
        break;
      case kAudioInfo:
        a.fnOnAudioInfo(b);
        break;
      case kVideoFrame:
        a.fnOnVideoFrame(b);
        break;
      case kAudioFrame:
        a.fnOnAudioFrame(b);
        break;
      case kAiFrame:
        a.fnOnAiFrame(b);
        break;
      case kFinishedEvt:
        a.fnOnDecoderFinished(b);
        break;
      case kAuthErr:
        a.fnOnDecoderAuthErr(b);
        break;
      case kDecoderDataFull:
        a.fnPauseDownloader();
        break;
      case kDecoderDataMore:
        a.fnResumeDownloader();
        break;
      case kRequestDataEvt:
        a.fnOnRequestData(b.o, b.a);
        break;
      case kVersion:
        a.fnOnVersion(b.v);
        break;
      case kReauth:
        a.m_bSendAuth ||
          (window.sessionStorage.removeItem(AuthKey_Note),
          (a.m_bSendAuth = !0),
          a.fnStartTimerAuth());
    }
  };
  this.m_nState_Dec = emState_Idle;
};
Player.prototype.fnCheckAndNewWorkerDecoder = function () {
  this.m_pWorker_Dec || this.fnNewWorkerDecoder();
};
Player.prototype.fnServerUUID = function () {
  let a = window.sessionStorage.getItem(ProfileKey_Note[0]);
  a || this.m_pWorker_Dec.postMessage({ t: kReq_uuid, u: a });
};
Player.prototype.fnNetDomain = function () {
  let a = Signature.getDomainFromUrl(window.location.href);
  this.m_pWorker_Dec.postMessage({ t: kReq_domain, u: a });
};
Player.prototype.fnStartDecoder = function () {
  this.fnCheckAndNewWorkerDecoder();
  this.fnStartTimerAuth();
  let a = {
    t: kReq_DecoderStart,
    c: this.m_pUrlInfo.chunkSize,
    i: this.m_pUrlInfo.type,
    v: this.m_nTimerInterval_Dec,
    l: this.m_pUrlInfo.logLv,
    k: window.sessionStorage.getItem(ProfileKey_Note[0]),
    u: window.location.href,
  };
  this.m_pWorker_Dec.postMessage(a);
};
Player.prototype.fnStopDecoder = function () {
  if (this.m_pWorker_Dec)
    switch (this.m_nState_Dec) {
      case emState_Pausing:
      case emState_Running:
      case emState_Finished:
        this.m_pWorker_Dec.postMessage({ t: kReq_DecoderStop });
    }
};
Player.prototype.fnResumeDecoder = function () {
  this.fnCheckAndNewWorkerDecoder();
  switch (this.m_nState_Dec) {
    case emState_Pausing:
      this.m_pWorker_Dec.postMessage({ t: kReq_DecoderResume });
      break;
    case emState_Idle:
      this.fnStartDecoder();
  }
};
Player.prototype.fnPauseDecoder = function () {
  this.fnCheckAndNewWorkerDecoder();
  switch (this.m_nState_Dec) {
    case emState_Running:
    case emState_Finished:
      this.m_pWorker_Dec.postMessage({ t: kReq_DecoderPause });
  }
};
Player.prototype.fnOnDecoderStart = function (a) {
  0 == a.e
    ? (this.m_nState_Dec = emState_Running)
    : (this.fnReportErrorPlayer(Error_Decoder_Start), this.fnStop());
};
Player.prototype.fnOnDecoderPause = function (a) {
  0 == a.e
    ? (this.m_nState_Dec = emState_Pausing)
    : this.fnReportErrorPlayer(Error_Decoder_Pause);
};
Player.prototype.fnOnDecoderResume = function (a) {
  0 == a.e
    ? (this.m_nState_Dec = emState_Running)
    : this.fnReportErrorPlayer(Error_Decoder_Resume);
};
Player.prototype.fnOnDecoderStop = function (a) {
  0 == a.e
    ? (this.m_nState_Dec = emState_Idle)
    : this.fnReportErrorPlayer(Error_Decoder_Stop);
};
Player.prototype.fnOnDecoderFinished = function (a) {
  this.m_nState_Dec = emState_Finished;
  this.fnStopBuffering();
  this.fnStopDownloader();
};
Player.prototype.fnOnDecoderAuthErr = function (a) {
  this.fnReportErrorPlayer(Error_Decoder_Auth);
};
Player.prototype.fnSetBufferTime = function (a) {
  (this.m_pUrlInfo.type == STREAM_TYPE_HLS && a < this.m_tDuration) ||
    ((this.m_tMilliSecsOfBuff_Set = a),
    (this.m_tMilliSecsOfBuff_2X = this.m_tMilliSecsOfBuff_Set + 500),
    (this.m_tMilliSecsOfBuff_Min = Math.max(
      g_nMilliSecsOfBuff_Min_Default,
      a >> this.m_nRightShiftBits
    )),
    (this.m_tMilliSecsOfBuff_Max = Math.min(
      g_nMilliSecsOfBuff_Max_Default,
      a << this.m_nLeftShiftBits
    )));
};
Player.prototype.fnSetDuration = function (a) {
  this.m_pUrlInfo.isStream &&
    (this.m_tDuration < a && (this.m_tDuration = a),
    a <= this.m_tMilliSecsOfBuff_Set || this.fnSetBufferTime(a));
};
Player.prototype.fnGetDurationOfBufferFrames = function () {
  return this.m_arrBufferFrames && 0 != this.m_arrBufferFrames.length
    ? this.m_arrBufferFrames[this.m_arrBufferFrames.length - 1].s -
        this.m_arrBufferFrames[0].s
    : 0;
};
Player.prototype.fnPushBufferFrame = function (a) {
  let b = a.s;
  b < this.m_tPtsFirst ||
    b < this.m_tPtsLast ||
    (this.m_arrBufferFrames.push(a),
    this.fnUpdateTimerTrackMax(a.s),
    (a = this.fnGetDurationOfBufferFrames()),
    a >= this.m_tMilliSecsOfBuff_Set &&
      (this.fnStopBuffering(),
      a > this.m_tMilliSecsOfBuff_Max && this.fnPauseDecoder()),
    this.m_nState_Dec == emState_Finished && this.fnStopBuffering());
};
Player.prototype.fnClearBufferFrames = function () {
  this.m_arrBufferFrames = [];
  this.m_tLocalMsecsFirst = 0;
};
Player.prototype.fnSetBuffering = function (a) {
  a ? this.fnShowLoading() : this.fnHideLoading();
  this.m_bBuffering = a;
};
Player.prototype.fnStartBuffering = function () {
  this.m_bBuffering ||
    (this.fnSetBuffering(!0),
    this.m_pPcmPlayer && this.m_pPcmPlayer.pause(),
    this.fnResumeDecoder(),
    this.fnStopTimerTrack(),
    (this.m_tLocalMsecsFirst = 0));
};
Player.prototype.fnStopBuffering = function () {
  this.m_bBuffering &&
    (this.fnSetBuffering(!1),
    this.m_pPcmPlayer &&
      this.m_nState == emState_Running &&
      this.m_pPcmPlayer.resume(),
    this.fnStartTimerTrack());
};
Player.prototype.fnStartTimerTrack = function () {
  let a = this;
  null != a.m_pTimer_Track && window.clearInterval(a.m_pTimer_Track);
  this.m_pTimer_Track = setInterval(function () {
    a.m_nFlag_SkipOpt || a.fnUpdateTimerTrack();
  }, this.m_nTimerInterval_Track);
};
Player.prototype.fnPauseTimerTrack = function () {
  null != this.m_pTimer_Track &&
    (clearInterval(this.m_pTimer_Track), (this.m_pTimer_Track = null));
};
Player.prototype.fnStopTimerTrack = function () {
  null != this.m_pTimer_Track &&
    (clearInterval(this.m_pTimer_Track), (this.m_pTimer_Track = null));
  this.m_tPtsLast = 0;
};
Player.prototype.fnInitTimerTrack = function () {
  this.m_pTimeTrack &&
    ((this.m_pTimeTrack.value = 0),
    (this.m_pTimeTrack.max = 0),
    (this.m_szDurationDisplay = "00:00:00"));
  this.m_pTimeLabel && (this.m_pTimeLabel.innerHTML = "00:00:00/00:00:00");
};
Player.prototype.fnUpdateTimerTrackValue = function (a) {
  if (this.m_pTimeTrack) {
    if (this.m_pTimeTrack.value == a) return !1;
    let b = Math.floor(a / 1e3);
    this.m_nState_SkipPlayer && (b += this.m_time_SkipPlayer);
    this.m_pTimeTrack.value = b;
    if (this.m_pTimeTrack.max >= b)
      this.formatTime && (this.m_szDurationDisplay = this.formatTime(a / 1e3));
    else return !1;
    return !0;
  }
  return !1;
};
Player.prototype.fnUpdateTimerTrackMax = function (a) {
  this.m_pTimeTrack && (this.m_szDurationDisplay = this.fnFormatTime(a / 1e3));
};
Player.prototype.fnUpdateTimerTrack = function () {
  if (
    (this.m_nState == emState_Running ||
      this.m_nState == emState_Pausing ||
      !this.m_nFlag_SkipOpt) &&
    this.m_pTimeTrack &&
    this.fnUpdateTimerTrackValue(this.m_tPtsLast) &&
    this.m_pTimeLabel
  ) {
    let a = this.m_tPtsLast / 1e3;
    this.m_nState_SkipPlayer && (a += this.m_time_SkipPlayer);
    this.m_pTimeLabel.innerHTML =
      this.fnFormatTime(a) + "/" + this.fnFormatTime(this.m_fDurationSecs);
    this.m_nPause_PauseTime = Math.floor(a);
  }
};
function formatDuration(a) {
  var b = Math.floor((a % 3600) / 60),
    d = a % 60;
  a = String(Math.floor(a / 3600)).padStart(2, "0");
  b = String(b).padStart(2, "0");
  d = String(d).padStart(2, "0");
  return `${a}:${b}:${d}`;
}
Player.prototype.fnSetLoadingDiv = function (a) {
  this.m_pLoadingDiv = a;
};
Player.prototype.fnHideLoading = function () {
  this.m_bBuffering &&
    (null != this.m_pLoadingDiv && (this.m_pLoadingDiv.style.display = "none"),
    this.fnCallbackMessage(
      CallBack_Loading,
      FALSE_XM,
      CallBack_Note[CallBack_Loading] + " " + Loading_Note[0]
    ));
};
Player.prototype.fnShowLoading = function () {
  this.m_bBuffering ||
    (null != this.m_pLoadingDiv && (this.m_pLoadingDiv.style.display = "block"),
    this.fnCallbackMessage(
      CallBack_Loading,
      TRUE_XM,
      CallBack_Note[CallBack_Loading] + " " + Loading_Note[1]
    ));
};
Player.prototype.fnSetTrack = function (a, b, d) {
  this.m_pTimeTrack = a;
  this.m_pTimeLabel = b;
  if ((this.m_pProgressBarModal = d))
    this.m_pProgressBarModal.style.display = this.m_pUrlInfo.isStream
      ? "none"
      : "";
  a = this.m_pUrlInfo.isStream;
  kProtoType_HTTP != this.m_pUrlInfo.proto ||
    a ||
    ((a = calculateTimeDifference(
      this.m_pUrlInfo.endDate,
      this.m_pUrlInfo.startDate
    )),
    (this.m_fDurationSecs = a / 1e3),
    (this.m_pTimeTrack.max = a / 1e3));
};
Player.prototype.fnFormatTime = function (a) {
  return (
    (10 > Math.floor(a / 3600)
      ? "0" + Math.floor(a / 3600)
      : Math.floor(a / 3600)) +
    ":" +
    (10 > Math.floor((a / 60) % 60)
      ? "0" + Math.floor((a / 60) % 60)
      : Math.floor((a / 60) % 60)) +
    ":" +
    (10 > Math.floor(a % 60) ? "0" + Math.floor(a % 60) : Math.floor(a % 60))
  );
};
Player.prototype.fnCallbackMessage = function (a, b, d) {
  if (null == this.m_fnCallback) return -1;
  this.m_fnCallback({ ret: a, status: b || 0, message: d || CallBack_Note[a] });
  return 0;
};
Player.prototype.fnReportErrorPlayer = function (a, b, d) {
  a = {
    ret: CallBack_Error,
    error: a || Error_Common,
    status: b || 0,
    message: d,
  };
  this.m_fnCallback && this.m_fnCallback(a);
};
Player.prototype.fnRegisterVisibilityEvent = function (a) {
  function b(c) {
    let e = {
      focus: !0,
      focusin: !0,
      pageshow: !0,
      blur: !1,
      focusout: !1,
      pagehide: !1,
    };
    c = c || window.event;
    a(c.type in e ? e[c.type] : this[d] ? !1 : !0);
  }
  let d = "hidden";
  d in document
    ? document.addEventListener("visibilitychange", b)
    : (d = "mozHidden") in document
    ? document.addEventListener("mozvisibilitychange", b)
    : (d = "webkitHidden") in document
    ? document.addEventListener("webkitvisibilitychange", b)
    : (d = "msHidden") in document
    ? document.addEventListener("msvisibilitychange", b)
    : "onfocusin" in document
    ? (document.onfocusin = document.onfocusout = b)
    : (window.onpageshow =
        window.onpagehide =
        window.onfocus =
        window.onblur =
          b);
  void 0 !== document[d] && b({ type: document[d] ? "blur" : "focus" });
};
Player.prototype.fnDealTimerAuth = function () {
  let a = this;
  if (this.m_pWorker_Dec) {
    if (this.m_bSendProfile) {
      var b = window.sessionStorage.getItem(ProfileKey_Note[0]);
      b
        ? (this.m_pWorker_Dec.postMessage({ t: kReq_Profile, u: b }),
          (this.m_bSendProfile = !1))
        : this.fnGetProfile();
    }
    this.m_bSendAuth &&
      ((b = window.sessionStorage.getItem(AuthKey_Note))
        ? (this.m_pWorker_Dec.postMessage({ t: kReq_Auth, a: b }),
          (this.m_bSendAuth = !1),
          window.setTimeout(function () {
            window.sessionStorage.removeItem(AuthKey_Note);
            a.m_bSendAuth = !0;
            a.fnStartTimerAuth();
          }, g_nMilliSecsOfBuff_Set))
        : 3 < this.nReqAuthCount &&
          (this.AuthErrorByStop(),
          console.error("Not authorized, please contact us")),
      this.fnRequestAuth());
    this.m_bSendProfile || this.m_bSendAuth || this.fnStopTimerAuth();
  }
};
Player.prototype.fnStartTimerAuth = function () {
  if (!this.m_pTimer_Auth) {
    var a = this;
    this.m_pTimer_Auth = setInterval(function () {
      a.fnDealTimerAuth();
    }, AuthRate_time);
  }
};
Player.prototype.fnStopTimerAuth = function () {
  this.m_pTimer_Auth &&
    (clearInterval(this.m_pTimer_Auth), (this.m_pTimer_Auth = null));
};
Player.prototype.pixelation = function (a, b, d, c, e, f) {
  const m = a.getImageData(b, d, c, e).data;
  for (let g = 0; g < e; g += f)
    for (let k = 0; k < c; k += f)
      (a.fillStyle = `rgb(${m[4 * (g * c + k)]},${m[4 * (g * c + k) + 1]},${
        m[4 * (g * c + k) + 2]
      })`),
        a.fillRect(b + k, d + g, f, f);
};
Player.prototype.blurring = function (a, b, d, c, e, f) {
  const m = a.getImageData(b, d, c, e),
    g = m.data,
    k = new Uint8ClampedArray(g);
  for (let n = 0; n < e; n++)
    for (let p = 0; p < c; p++) {
      let u = 0,
        v = 0,
        w = 0,
        q = 0;
      for (var h = -f; h <= f; h++)
        for (let r = -f; r <= f; r++) {
          var l = n + h;
          const t = p + r;
          0 <= t &&
            t < c &&
            0 <= l &&
            l < e &&
            ((l = 4 * (l * c + t)),
            (u += k[l]),
            (v += k[l + 1]),
            (w += k[l + 2]),
            q++);
        }
      h = 4 * (n * c + p);
      g[h] = u / q;
      g[h + 1] = v / q;
      g[h + 2] = w / q;
    }
  a.putImageData(m, b, d);
};
Player.prototype.changeVolume = function(value){
    if(this.m_pPcmPlayer != null){
        this.m_pPcmPlayer.volume(value)
    }
}
