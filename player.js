function Signature() {

};

Signature.fnGetSignature = function(uuid, appkey, appsecret, timeMillis, movedcard) {
  var encryptStr = uuid + appkey + appsecret + timeMillis;
  var arrEncrypt = Signature.fnStr2Byte(encryptStr);
  var arrEncrypt_change = Signature.fnChange(encryptStr, movedcard);
  var arrMerge = Signature.fnMerge(arrEncrypt, arrEncrypt_change);

  return md5.hex(arrMerge);
}

Signature.fnChange = function(encryptStr, movedcard) {
  var arrEncrypt = Signature.fnStr2Byte(encryptStr);
  var len = arrEncrypt.length;
  for (var idx = 0; idx < len; ++idx) {
    var tmp = ((idx % movedcard) > ((len - idx) % movedcard)) ? arrEncrypt[idx] : arrEncrypt[len - (idx + 1)];
    arrEncrypt[idx] = arrEncrypt[len - (idx + 1)];
    arrEncrypt[len - (idx + 1)] = tmp;
  }
  return arrEncrypt;
}

Signature.fnStr2Byte = function(str) {
  let bytes = new Array();
  let length = str.length;
  let char;

  for (let i = 0; i < length; i++) {
    char = str.charCodeAt(i);
    if (char >= 0x010000 && char <= 0x10FFFF) {
      bytes.push(((char >> 18) & 0x07) | 0xF0);
      bytes.push(((char >> 12) & 0x3F) | 0x80);
      bytes.push(((char >> 6) & 0x3F) | 0x80);
      bytes.push((char & 0x3F) | 0x80);
    } else if (char >= 0x000800 && char <= 0x00FFFF) {
      bytes.push(((char >> 12) & 0x0F) | 0xE0);
      bytes.push(((char >> 6) & 0x3F) | 0x80);
      bytes.push((char & 0x3F) | 0x80);
    } else if (char >= 0x000080 && char <= 0x0007FF) {
      bytes.push(((char >> 6) & 0x1F) | 0xC0);
      bytes.push((char & 0x3F) | 0x80);
    } else {
      bytes.push(char & 0xFF);
    }
  }
  return bytes;
}

Signature.fnByte2Str = function(byte) {
  return byte.map(function(x) {
    x = x.toString(16);
    x = ('00' + x).substr(-2);
    return x
  }).join('');
}

Signature.fnMerge = function(encryptByte, changeByte) {
  let length = encryptByte.length;
  let doubleLength = length * 2;
  let temp = new Array(doubleLength);

  for (let i = 0; i < length; i++) {
    temp[i] = encryptByte[i];
    temp[doubleLength - 1 - i] = changeByte[i];
  }

  return temp;
}

Signature.getDomainFromUrl = function() {  
    var domain;  
	var url = window.location.href;
    var index = url.indexOf("://");  
    if (index != -1) {  
        var domainUrl = url.substring(index + 3);  
        index = domainUrl.indexOf("/");  
        if (index != -1) {  
            domain = domainUrl.substring(0, index);  
        } else {  
            domain = domainUrl;  
        }  
        index = domain.indexOf(":");  
        if (index != -1) {  
            domain = domain.substring(0, index);  
        }  
    }  
    return domain;  
}  

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== String Operation =========================
String.prototype.startWith = function(str) {
	var reg = new RegExp("^" + str);
	return reg.test(this);
};

String.prototype.endWith = function(str) {
	var reg = new RegExp(str + "$");
	return reg.test(this);
};

function IsEmptyStr(str) {
	if (str == undefined || str == null || str == '') {
		return true;
	}
	return false;
}


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== TimerCheck Operation =========================
function TimerCheck(timeout) {
	var nTimeout = timeout || g_nTimeout_Default;
	this.fnSetTimeout_TimerChk(nTimeout);
}

TimerCheck.prototype.fnUpdate_TimerChk = function() {
	this._tTimeoutNext = Date.now() + this._tTimeout;
}

TimerCheck.prototype.fnSetTimeout_TimerChk = function(timeout) {
	this._tTimeout = timeout;
	this.fnUpdate_TimerChk();
}

TimerCheck.prototype.fnCheckTimeout_TimerChk = function(tnow) {
	return (this._tTimeoutNext > tnow);
}


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== FileInfo Operation =========================
function FileInfo(urlInfo) {
	this.url = urlInfo.url;
	this.chunkSize = urlInfo.checkSize || g_nChunkSize_Default;
	this.isStream = urlInfo.isStream === undefined ? true : urlInfo.isStream;
	this.waitHeaderLen = urlInfo.waitHeaderLen;
	this.bufferDuration = urlInfo.bufferDuration || g_nBufferDuration_Default;
	this.timeoutRecv = urlInfo.timeoutRecv || g_nTimeout_Default;
	this.timeoutDec = urlInfo.timeoutDec || g_nTimeout_Default;
	this.intervalDec = urlInfo.intervalDec || g_nIntervalDec_Default;
	this.intervalTrack = urlInfo.intervalTrack || g_nInterval_Default;
	this.speed = urlInfo.speed || g_nSpeed_Default;
	this.logLv = urlInfo.logLv || g_nLogLv_Default;
	this.proto = urlInfo.proto;
	this.type = urlInfo.type;
	this.urlProto = urlInfo.urlProto;
	this.leftShiftBits = urlInfo.leftShiftBits || g_nLeftShiftBits_Default;
	this.rightShiftBits = urlInfo.rightShiftBits || g_nRightShiftBits_Default;
	this.milliSecsOfBuff = urlInfo.milliSecsOfBuff || g_nMilliSecsOfBuff_Set;
	this.startDate = urlInfo.startDate || g_nDateStr_Default;
	this.endDate = urlInfo.endDate || g_nDateStr_Default;

	var proto_type = urlInfo.urlProto;
	var infoRet = {
		proto: kProtoType_NONE,
		type: STREAM_TYPE_NONE
	};
	if (proto_type == "httpFlv") {
		infoRet.proto = kProtoType_HTTP;
		infoRet.type = STREAM_TYPE_FLV;
	} else if (proto_type == "httpHls") {
		infoRet.proto = kProtoType_HTTP_M3U8;
		infoRet.type = STREAM_TYPE_HLS;
	} else if (proto_type == "ws") {
		infoRet.proto = kProtoType_WS;
		infoRet.type = STREAM_TYPE_NALU;
	} else if (proto_type == "http") {
		infoRet.proto = kProtoType_HTTP;
		infoRet.type = STREAM_TYPE_NALU;
	} else {
		infoRet = this.fnGetStreamTypeByUrl(this.url);
	}

	if (this.proto == undefined) {
		this.proto = infoRet.proto;
	}

	if (this.type == undefined) {
		this.type = infoRet.type;
	}
};

//计算时间差，返回单位：毫秒
function calculateTimeDifference(timeStr1, timeStr2) {  
    // 定义日期时间字符串的格式  
    const format = "YYYY-MM-DD HH:mm:ss";  
      
    // 解析字符串为 Date 对象  
    function parseDateTime(timeStr) {  
        const parts = timeStr.split(/[- :]/);  
        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));  
    }  
  
    // 计算时间差  
    const dateTime1 = parseDateTime(timeStr1);  
    const dateTime2 = parseDateTime(timeStr2);  
    const difference = dateTime1 - dateTime2;  
  
    return difference;  
} 

FileInfo.prototype.fnGetStreamTypeByUrl = function(url) {
	var pattHttp = /^http/;
	var pattRtsp = /^rtsp/;
	var pattWs = /^ws{1,2}:/;

	if (pattRtsp.test(url)) {
		var infoRet = {
			p: kProtoType_RTSP,
			t: STREAM_TYPE_NALU
		};
		return infoRet;
	} else if (pattWs.test(url)) {
		var infoRet = {
			p: kProtoType_WS,
			t: STREAM_TYPE_NALU
		};
		return infoRet;
	} else if (pattHttp.test(url)) {
		var pattM3u8 = /.m3u8$/;
		var pattFlv = /.flv$/;
		if (pattFlv.test(url)) {
			var infoRet = {
				p: kProtoType_HTTP,
				t: STREAM_TYPE_FLV
			};
			return infoRet;
		} else if (pattM3u8.test(url)) {
			var infoRet = {
				p: kProtoType_HTTP_M3U8,
				t: STREAM_TYPE_HLS
			};
			return infoRet;
		} else {
			var infoRet = {
				p: kProtoType_NONE,
				t: STREAM_TYPE_NONE
			};
			return infoRet;
		}
	} else {
		var infoRet = {
			p: kProtoType_NONE,
			t: STREAM_TYPE_NONE
		};
		return infoRet;
	}
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== FunExtend Stream Operation =========================
function FunsExtend_Stream() {

};

FunsExtend_Stream.prototype = {
	fnPause: function() {
		this.m_stStreamParams = {
			// urlInfo:{
			// 	url: this.m_FileInfo.url,
			// 	proto: this.m_nProto,
			// 	type: this.m_nType,
			// 	headerLenWait: this.m_nHeaderLenWait,
			// 	isStream: true
			// },
			urlInfo: this.m_pUrlInfo,
			canvas: this.m_pCanvas,
			callback: this.m_fnCallback
		}

		this.logger.logInfo("Stop in stream pause.");
		// this.fnStop();
		
		//Pause audio context.
		if (this.m_pPcmPlayer) {
			this.m_pPcmPlayer.pause();
		}
		this.m_nState = emState_Pausing;
		
		this.fnPauseDownloader();
		this.fnPauseDecoder();
		this.fnStopTimerTrack();
		this.fnHideLoading();
		this.fnStopBuffering()
		this.fnClearBufferFrames();

		var ret = {
			e: 0,
			m: "Success"
		};

		return ret;
	},
	fnResume: function(fromseek) {
		// if (this.m_nState != emState_Idle || this.m_stStreamParams == null) {
		// 	var ret = {
		// 		e: -1,
		// 		m: "Not pausing"
		// 	};
		// 	return ret;
		// }
		
		//Resume audio context.
		if (this.m_pPcmPlayer) {
			this.m_pPcmPlayer.resume();
		}

		this.m_nState = emState_Running;
		
		this.fnResumeDownloader()
		this.fnResumeDecoder()
		this.fnHideLoading();
		this.fnStartBuffering()

		this.logger.logInfo("Play in stream resume.");
		this.fnPlay(this.m_stStreamParams.urlInfo,this.m_stStreamParams.canvas,this.m_stStreamParams.callback);
		this.m_stStreamParams = null;

		var ret = {
			e: 0,
			m: "Success"
		};

		this.fnCallbackMessage(CallBack_Playing);
		return ret;
	}
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== FunExtend NotStream Operation =========================
function FunExtend_NotStream() {

};

FunExtend_NotStream.prototype = {
	fnPause: function() {
		this.m_stStreamParams = {
			urlInfo: this.m_pUrlInfo,
			canvas: this.m_pCanvas,
			callback: this.m_fnCallback
		}
		
		//Pause audio context.
		if (this.m_pPcmPlayer) {
			this.m_pPcmPlayer.pause();
		}
		this.m_tLocalMsecsFirst = 0;
		this.m_nState = emState_Pausing;

		// this.fnPauseDownloader();
		// this.fnPauseDecoder();
		// this.fnPauseTimerTrack(0);
		this.fnHideLoading();
		// this.fnStopBuffering()
		// this.fnClearBufferFrames();

		var ret = {
			e: 0,
			m: "Success"
		};

		this.fnCallbackMessage(CallBack_Pause);
		return ret;
	},
	fnResume: function(fromseek) {
		this.logger.logInfo("Resume.");

		if (this.m_nState != emState_Pausing) {
			var ret = {
				e: -1,
				m: "Not pausing"
			};
			return ret;
		}

		//Pause audio context.
		if (this.m_pPcmPlayer) {
			this.m_pPcmPlayer.resume();
		}
		this.m_tLocalMsecsFirst = 0;
		this.m_nState = emState_Running;

		// this.m_tPtsLast
		// this.fnResumeDownloader()
		// this.fnResumeDecoder()
		this.fnHideLoading();
		// this.fnStartBuffering()

		this.logger.logInfo("Play in stream resume.");
		this.fnPlay(this.m_stStreamParams.urlInfo,this.m_stStreamParams.canvas,this.m_stStreamParams.callback);
		this.m_stStreamParams = null;

		var ret = {
			e: 0,
			m: "Success"
		};
		this.fnCallbackMessage(CallBack_Playing);
		return ret;
	}
}

function Player(options) {
	this.fnClearAuthStroeSession();
	this.nReqAuthCount = 0;
	this.nextRequestAuth = 0;
	this.nextRequestProfile = 0;

	this.m_szVersion = "";
	this.options = options;
	// this == Player
	// buffer time
	this.m_nSeq = 0;
	this.m_bRegisterEvent = false;
	this.m_pTimerCheck_Recv = null;
	this.m_pTimerCheck_DecFrame = null;

	// 针对实时播放和回放相关方法的特殊处理
	this.m_pFunsExtend = null;

	// local millisecs
	this.m_tLocalMsecsFirst = 0;
	this.m_tLocalMsecsLast = 0;
	// pts of frame
	this.m_tPtsFirst = 0;
	this.m_tPtsLast = 0;

	// 外部传入参数
	this.m_pUrlInfo = null; // 链接相关信息
	this.m_pCanvas = null; // 画布
	this.m_fnCallback = null;

	this.m_pPcmPlayer = null; // aduio
	this.m_pWebGLPlayer = null; // video

	// 画面信息
	this.m_nDuration = 0;
	this.m_nPixFmt = 0;
	this.m_nWidth = 0;
	this.m_nHeight = 0;
	this.m_nYLen = 0;
	this.m_nUVLen = 0;

	// 音频信息
	this.m_bHasAudio = false;
	this.m_szEncodingPcm = 0;
	this.m_nChannelsPcm = 0;
	this.m_nSampleRatePcm = 0;
	this.m_bGetFirstFrame = false;
	this.m_nBeginTime_Pcm = 0;

	this.m_nState = emState_Idle;
	this.m_nState_Dld = null;
	this.m_nState_Dec = emState_Idle; 
	this.m_nTimerInterval_Dec = g_nIntervalDec_Default; 

	this.m_pTimeLabel = null;
	this.m_pTimeTrack = null;
	this.m_pTimer_Track = null;
	this.m_szDurationDisplay = "00:00:00";
	this.m_nTimerInterval_Track = g_nInterval_Default;

	this.m_pLoadingDiv = null; // 缓冲时圈动画

	// 未发送至Decoder的数据
	this.m_arrCache = new Array();

	//进度条模块
	this.m_pProgressBarModal = null; //进度条模块（用于显示、隐藏）
	this.m_fDurationSecs = 0; //记录回放url （m3u8）文件总时长

	// 帧缓冲
	this.m_bBuffering = false;
	this.arrBufferFrames = [];
	this.arrBufferPcms = [];
	// buffer control
	this.m_nLeftShiftBits = g_nLeftShiftBits_Default; // 左移位数
	this.m_nRightShiftBits = g_nRightShiftBits_Default; // 右移位数
	this.m_tMilliSecsOfBuff_Set = g_nMilliSecsOfBuff_Set; // 缓冲设置时间
	this.m_tDuration = 0; // 单切片最大时间
	this.m_bIsRealTime = true; // 是否增强实时性
	this.m_tMilliSecsOfBuff_2X = g_nMilliSecsOfBuff_Set + 500; // 实时播放时最大延时累积时间
	this.m_tMilliSecsOfBuff_Min = Math.max((g_nMilliSecsOfBuff_Set >> this.m_nRightShiftBits),
		g_nMilliSecsOfBuff_Min_Default); // 最小缓冲时间 
	this.m_tMilliSecsOfBuff_Max = Math.min((g_nMilliSecsOfBuff_Set << this.m_nLeftShiftBits),
		g_nMilliSecsOfBuff_Max_Default); // 最大缓冲时间 

	// 实时流时存放url相关信息
	this.m_stStreamParams = null;
	this.m_arrBufferFrames = []; //缓冲帧数组信息
	this.m_pWorker_Dld = null; //创建的worker downloader.js 对象
	this.m_pWorker_Dec = null; //创建的worker decoder.js 对象
	this.m_nSpeed = 1; //播放速率
	this.m_nState_SkipPlayer = false; //跳转播放状态（统计文件总时长业务区分）
	this.m_time_SkipPlayer = 0; //跳转时间点

	this.logger = new Logger("Player");
	this.fnNewWorkerDownloader();
	this.fnNewWorkerDecoder();

	this.m_bSendProfile = false;
	this.m_bSendAuth = true;
};

Player.prototype.fnClearAuthStroeSession = function() {
	for (var i = 0; i < ProfileKey_Note.length; i++) {
	    let key = ProfileKey_Note[i];
		window.sessionStorage.removeItem(key);
	}
}

Player.prototype.fnParseProfile = function(data) {
	var uuid = data["uuid"];
	var appkey = data['appkey'];
	var appsecret = data['appsecret'];
	var movedcard = data['movedcard'];
	if (uuid && appkey && appsecret && movedcard) {
		window.sessionStorage.setItem(ProfileKey_Note[0], uuid);
		window.sessionStorage.setItem(ProfileKey_Note[1], appkey);
		window.sessionStorage.setItem(ProfileKey_Note[2], appsecret);
		window.sessionStorage.setItem(ProfileKey_Note[3], movedcard.toString());
		return 0;
	}
	
	return -1;
};

Player.prototype.fnGetProfile = function() {
	var uuid = window.sessionStorage.getItem(ProfileKey_Note[0]);
	if (uuid) {
		this.AuthErrorByStop()
		console.error("The authentication information is incorrect, please check");
		return;
	}

	if (this.nextRequestProfile > Date.now()) {
		return;
	}

	let _this = this;
	fetch('./profile.ini').then((response) => {
		response.json().then((data) => {
			var uuid = data["uuid"];
			var appkey = data['appkey'];
			var appsecret = data['appsecret'];
			var movedcard = data['movedcard'];
			if (uuid && appkey && appsecret && movedcard) {
				window.sessionStorage.setItem(ProfileKey_Note[0], uuid);
				window.sessionStorage.setItem(ProfileKey_Note[1], appkey);
				window.sessionStorage.setItem(ProfileKey_Note[2], appsecret);
				window.sessionStorage.setItem(ProfileKey_Note[3], movedcard.toString());
				_this.fnRequestAuth();
			}
		}).catch(error => {
			console.log("ERROR:", error);
			++_this.nReqAuthCount;
		});
	}).catch(error => {
		console.log("ERROR:", error);
		++_this.nReqAuthCount;
	});

	// 确定下次请求时间
	this.nextRequestProfile = Date.now() + 1000 * 5;
};

Player.prototype.fnRequestAuth = function() {
	let _this = this;
	var uuid = window.sessionStorage.getItem(ProfileKey_Note[0]);
	var appkey = window.sessionStorage.getItem(ProfileKey_Note[1]);
	var appsecret = window.sessionStorage.getItem(ProfileKey_Note[2]);
	var movedcardStr = window.sessionStorage.getItem(ProfileKey_Note[3]);
	if (!uuid || !appkey || !appsecret || !movedcardStr) {
		this.AuthErrorByStop()
		console.error("The authentication information is incorrect, please check");
		return;
	}
	
	if (this.nextRequestAuth > Date.now()) {
		return;
	}
	this.nextRequestAuth = Date.now() + AuthRate_Error;
	
	var movedcard = parseInt(movedcardStr);
	var timeMillis = new Date().getTime().toString().padStart(20, '0');
	
	var signature = Signature.fnGetSignature(uuid, appkey, appsecret, timeMillis, movedcard);
	
	var domain = Signature.getDomainFromUrl();
	let code = {
		"Host":domain
	}
	
	let encrypted = ECB.encrypt(JSON.stringify(code),timeMillis,uuid);
	
	var url = AuthURL_Note;
	
	var hdr = new Headers();
	hdr.append("Content-Type", "application/x-www-form-urlencoded");
	hdr.append("uuid", uuid);
	hdr.append("appKey", appkey);
	hdr.append("timeMillis", timeMillis);
	hdr.append("signature", signature);

	var reqInit = {
		method: 'POST',
		headers: hdr,
		mode: 'cors',
		cache: 'default',
		body:encrypted
	};
	fetch(url, reqInit).then((response) => {
		response.json().then((data) => {
			let code = data['code'];
			let msg = data['msg'];
			let dt =  data['data'];
			if(code == 2000 || code == 15074){
				this.nextRequestAuth = Date.now() + AuthRate_Default;
				window.sessionStorage.setItem(AuthKey_Note, dt);
				_this.nReqAuthCount = 0;
			}else{
				this.fnStop();
				console.error(msg);
			}	 
		}).catch(error => {
			console.log("ERROR:", error);
			this.AuthError();
		});
	}).catch(error => {
		console.log("ERROR:", error);
		this.AuthError();
	});

	
};

Player.prototype.AuthErrorByStop = function() {
	++this.nReqAuthCount;
};

Player.prototype.AuthError = function() {
	++this.nReqAuthCount;
};

Player.prototype.fnGetVersion = function() {
	return this.m_szVersion;
};

Player.prototype.fnSetRealTime = function(isRealTime) {
	this.m_bIsRealTime = isRealTime;
};


Player.prototype.fnPlay = function(urlInfo, canvas, callback) {
	this.logger.logInfo("Play " + urlInfo.url + ".");
	urlInfo.url = removeQueryParam(urlInfo.url,"seekFromBegin");
	var ret = {
		e: 0,
		m: "Success"
	};
	
	this.nReqAuthCount = 0;
	this.fnParseProfile(this.options);
	this.fnServerUUID();
	this.fnNetDomain();

	do {
		if (this.m_nState == emState_Pausing) {
			ret = this.fnResume();
			break;
		}

		if (this.m_nState == emState_Running) {
			break;
		}

		if (!urlInfo) {
			ret = {
				e: -1,
				m: "Invalid url"
			};
			success = false;
			this.logger.logError("[ER] playVideo error, url empty.");
			break;
		}

		if (!canvas) {
			ret = {
				e: -2,
				m: "Canvas not set"
			};
			success = false;
			this.logger.logError("[ER] playVideo error, canvas empty.");
			break;
		}

		this.m_pUrlInfo = new FileInfo(urlInfo);
		if (this.m_pUrlInfo.isStream) {
			this.m_pFunsExtend = new FunsExtend_Stream();
		} else {
			this.m_pFunsExtend = new FunExtend_NotStream();
		}

		// download数据计时器
		this.m_pTimerCheck_Recv = new TimerCheck(this.m_pUrlInfo.timeoutRecv);
		// decoder数据计时器
		this.m_pTimerCheck_DecFrame = new TimerCheck(this.m_pUrlInfo.timeoutDec);
		this.m_pCanvas = canvas;
		this.m_fnCallback = callback;

		this.m_nTimerInterval_Track = this.m_pUrlInfo.intervalTrack;
		this.m_nTimerInterval_Dec = this.m_pUrlInfo.intervalDec;
		this.fnInitTimerTrack();
		this.fnStartTimerTrack();

		this.m_nSpeed = this.m_pUrlInfo.speed;
		this.fnSetMilliSecsOfBuff(this.m_pUrlInfo.milliSecsOfBuff, this.m_pUrlInfo.leftShiftBits, this.m_pUrlInfo
			.rightShiftBits);
		this.fnClearBufferFrames();

		//var playCanvasContext = playCanvas.getContext("2d"); //If get 2d, webgl will be disabled.
		this.m_pWebGLPlayer = new WebGLPlayer(this.m_pCanvas, {
			preserveDrawingBuffer: false
		});

		if (!this.m_bRegisterEvent) {
			var player = this;
			this.fnRegisterVisibilityEvent(function(visible) {
				if (visible) {
					player.fnResume();
				} else {
					player.fnPause();
				}
			});
			this.m_bRegisterEvent = true;
		}

		this.m_bBuffering = false;
		this.m_nState_Dld = emState_Idle;
		this.m_nState_Dec = emState_Idle;
		this.fnStartDownloader();
		this.fnStartDecoder();
		this.m_nState_Dec = emState_Running;
		this.fnStartBuffering();

		++this.m_nSeq;
		this.m_nState = emState_Running;
		this.fnDisplayLoop();
		this.fnCallbackMessage(CallBack_Playing);
	} while (false);

	return ret;
};

Player.prototype.fnPause = function() {
	this.logger.logInfo("Pause.");
	if (this.m_nState != emState_Running) {
		var ret = {
			e: -1,
			m: "Not playing"
		};
		return ret;
	}

	return this.m_pFunsExtend.fnPause.call(this);
};

Player.prototype.fnResume = function(fromSeek) {
	this.logger.logInfo("Resume.");
	
	if (this.m_nState != emState_Pausing) {
		var ret = {
			e: -1,
			m: "Not pausing"
		};
		return ret;
	}
	
	return this.m_pFunsExtend.fnResume.call(this, fromSeek);
};

Player.prototype.fnStop = function() {
	if (this.m_nState == emPlayerState_Idle) {
		var ret = {
			e: -1,
			m: "Not playing"
		};
		return ret;
	}
	this.m_nState = emState_Idle;
	this.m_nState_SkipPlayer = false;
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

	if (this.m_pTimerCheck_Recv) {  
	    this.m_pTimerCheck_Recv = null;  
	}  
	  
	if (this.m_pTimerCheck_DecFrame) {  
	    this.m_pTimerCheck_DecFrame = null;  
	}
	
	if (this.m_pWebGLPlayer) {
	    this.m_pWebGLPlayer.destroy(); // 假设有 destroy 方法
	    this.m_pWebGLPlayer = null;
	}

	this.m_pUrlInfo = null;
	this.m_pCanvas = null;
	this.m_pWebGLPlayer = null;
	this.m_pCallback = null;
	this.m_nLenRecv = 0;

	this.m_bGetFirstFrame = false;

	if (this.m_pPcmPlayer) {
		this.m_pPcmPlayer.destroy();
		this.m_pPcmPlayer = null;
		this.logger.logInfo("Pcm player released.");
	}

	this.fnInitTimerTrack();
	if (this.m_pTimeLabel) {
		this.m_pTimeLabel.innerHTML =  this.fnFormatTime(0) + "/" +  this.fnFormatTime(0);
	}

	this.logger.logInfo("Closing decoder.");
	return ret;
};

Player.prototype.fnClear = function() {
	if (this.m_pWebGLPlayer) {
		this.m_pWebGLPlayer.clear();
	}
};

Player.prototype.fnFullscreen = function() {
	if (this.m_pWebGLPlayer) {
		this.m_pWebGLPlayer.fullscreen();
	}
};

Player.prototype.fnGetState = function() {
	return this.m_nState;
};

Player.prototype.fnSetSpeed = function(speed) {
	if (speed < 0.125 || speed > 4.0) {
		return false;
	}

	if (this.m_nSpeed == speed) {
		return true;
	}

	if (this.m_pUrlInfo) {
		this.m_pUrlInfo.speed = speed;
	}
	this.m_nSpeed = speed;
	this.m_tLocalMsecsFirst = 0;

	return true;
};

Player.prototype.fnSetMilliSecsOfBuff = function(milliSecs, leftShiftBits, rightShiftBits) {
	this.m_nLeftShiftBits = leftShiftBits || this.m_nLeftShiftBits;
	this.m_nRightShiftBits = rightShiftBits || this.m_nRightShiftBits;
	this.m_tMilliSecsOfBuff_Set = milliSecs || g_nMilliSecsOfBuff_Set;
	this.m_tMilliSecsOfBuff_2X = this.m_tMilliSecsOfBuff_Set + 500;
	this.m_tMilliSecsOfBuff_Min = Math.max((this.m_tMilliSecsOfBuff_Set >> this.m_nRightShiftBits),
		g_nMilliSecsOfBuff_Min_Default);
	this.m_tMilliSecsOfBuff_Max = Math.min((this.m_tMilliSecsOfBuff_Set << this.m_nLeftShiftBits),
		g_nMilliSecsOfBuff_Max_Default);
};


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Audio About =========================

Player.prototype.fnOnAudioInfo = function(objData) {
	if (this.m_nState != emState_Running) {
		return;
	}
	this.logger.logInfo("OnAudioInfo " + objData.e + ".");
	if (objData.e == 0) {
		this.fnOnAudioParam(objData.a);
		this.logger.logInfo("OnAudioInfo.");
	} else {
		this.fnReportErrorPlayer(Error_Decoder_AudioInfo);
	}
};

Player.prototype.fnOnAudioParam = function(a) {
	if (this.m_nState != emState_Running) {
		return;
	}

	this.logger.logInfo("Audio param sampleFmt:" + a.f + " channels:" + a.c + " sampleRate:" + a.r + ".");

	var nHasAudio = a.s;
	this.m_bHasAudio = (nHasAudio > 0);
	if (!this.m_bHasAudio) {
		return;
	}

	var nSampleFmt = a.f;
	var nChannels = a.c;
	var nSampleRate = a.r;

	var szEncoding = "16bitInt";
	switch (nSampleFmt) {
		case 0:
			szEncoding = "8bitInt";
			break;
		case 1:
			szEncoding = "16bitInt";
			break;
		case 2:
			szEncoding = "32bitInt";
			break;
		case 3:
			szEncoding = "32bitFloat";
			break;
		case 4:
			szEncoding = "64bitFloat";
			break;
		case 5:
			szEncoding = "8bitInt";
			break;
		case 6:
			szEncoding = "16bitInt";
			break;
		case 7:
			szEncoding = "32bitInt";
			break;
		case 8:
			szEncoding = "32bitFloat";
			break;
		case 9:
			szEncoding = "64bitFloat";
			break;
		case 10:
		case 11:
			szEncoding = "64bitInt";
			break;
		default:
			this.logger.logError("Unsupported audio sampleFmt " + nSampleFmt + "!");
	}
	this.logger.logInfo("Audio encoding " + szEncoding + ".");

	this.m_pPcmPlayer = new PCMPlayer({
		encoding: szEncoding,
		channels: nChannels,
		sampleRate: nSampleRate,
		flushingTime: 5000
	});

	this.m_szEncodingPcm = szEncoding;
	this.m_nChannelsPcm = nChannels;
	this.m_nSampleRatePcm = nSampleRate;
};

Player.prototype.fnRestartPcm = function() {
	if (this.m_pPcmPlayer) {
		this.m_pPcmPlayer.destroy();
		this.m_pPcmPlayer = null;
	}

	this.m_pPcmPlayer = new PCMPlayer({
		encoding: this.m_szEncodingPcm,
		channels: this.m_nChannelsPcm,
		sampleRate: this.m_nSampleRatePcm,
		flushingTime: 5000
	});
};

Player.prototype.fnDisplayAudioFrame = function(frame) {
	if (this.m_nState != emState_Running) {
		return false;
	}

	// if (!this.m_bGetFirstFrame) {
	// 	this.m_bGetFirstFrame = true;
	// 	this.m_nBeginTime_Pcm = frame.s;
	// }
	this.m_pPcmPlayer?.play(new Uint8Array(frame.d), this.m_nSpeed);
	return true;
};

Player.prototype.fnOnAudioFrame = function(frame) {
	let player = this;
	if (this.m_nState != emState_Running) {
		return;
	}
	
	this.arrBufferPcms.push(frame);
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Video About =========================

Player.prototype.fnOnVideoInfo = function(objData) {
	if (objData.e == 0) {
		this.fnOnVideoParam(objData.v);
	} else {
		this.fnReportErrorPlayer(Error_Decoder_VideoInfo);
	}
};

Player.prototype.fnOnVideoParam = function(v) {
	if (this.m_nState == emState_Idle) {
		return;
	}

	this.m_nDuration = v.d;
	this.m_nPixFmt = v.p;
	this.m_nWidth = v.w;
	this.m_nHeight = v.h;
	this.m_nYLen = this.m_nWidth * this.m_nHeight;
	this.m_nUVLen = (this.m_nWidth / 2) * (this.m_nHeight / 2);

	// TimeTrack info
	this.fnUpdateTimerTrackMax(this.m_nDuration);
};

Player.prototype.fnOnVideoFrame = function(frame) {
	this.fnPushBufferFrame(frame);
};

Player.prototype.fnDisplayVideoFrame = function(frame) {
	//this.logger.logInfo("displayVideoFrame begin");
	if (this.m_nState != emState_Running) {
		return false;
	}

	var nTimestampAudio = -1;
	var nDelay = -1;
	// if (this.m_pPcmPlayer) {
	// 	if (!this.m_bGetFirstFrame) {
	// 		this.m_bGetFirstFrame = true;
	// 		this.m_nBeginTime_Pcm = frame.s;
	// 	}
	// 	var nCurTsAudio = this.m_pPcmPlayer.getTimestamp();
	// 	nTimestampAudio = nCurTsAudio + this.m_nBeginTime_Pcm;
	// 	nDelay = frame.s - nTimestampAudio;
	// }

	//this.logger.logInfo("displayVideoFrame delay=" + delay + "=" + " " + frame.s  + " - (" + audioCurTs  + " + " + this.beginTimeOffset + ")" + "->" + audioTimestamp);

	if (nTimestampAudio <= 0 || nDelay <= 0) {
		//this.logger.logInfo("displayVideoFrame ");
		try {
		    // 检查数据大小
		    // console.log("frame.d 的长度:", frame.d.length);
		
		    // 确保数据大小在合理范围内
		    if (frame.d.length > 0 && frame.d.length < Number.MAX_SAFE_INTEGER) {
		        var data = new Uint8Array(frame.d);
		        // console.log("Uint8Array 分配成功");
				var width = frame.w;
				var height = frame.h;
				var yLen = frame.y;
				var uvLen = frame.u;
				//this.logger.logInfo("displayVideoFrame data:" + data[0] +" width:" + width + " height:" + height +" yLen:" + yLen+" uvLen:" + uvLen);
				this.fnRenderVideoFrame(data, width, height, yLen, uvLen);
				return true;
		    } else {
		        console.error("数据大小超出合理范围");
		    }
		} catch (e) {
		    if (e instanceof RangeError) {
		        console.error("内存分配失败:", e);
		    } else {
		        console.error("发生其他错误:", e);
		    }
		}
		
		
	}

	return false;

};

Player.prototype.fnRenderVideoFrame = function(data, width, height, yLen, uvLen) {
	this.m_pWebGLPlayer.renderFrame(data, width, height, yLen, uvLen);
};
Player.prototype.fnSendMarkerData = function(e){
	this.m_pWebGLPlayer.parseAIdata(e);
};
Player.prototype.fnOnRequestData = function(offset, available) {
	// need to add later
};

Player.prototype.fnOnVersion = function(version) {
	this.m_szVersion = version;
};

var g_time = 0
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Display Loop =========================

Player.prototype.fnDisplayLoop = function() {
	if (this.m_arrBufferFrames.length > MAX_BUFFER_SIZE) {
	    this.m_arrBufferFrames.splice(0, this.m_arrBufferFrames.length - MAX_BUFFER_SIZE);
	}

	if (this.m_nState !== emState_Idle) {
		requestAnimationFrame(this.fnDisplayLoop.bind(this));
	}

	if (this.m_nState !== emState_Running) {
		return;
	}

	if (this.m_bBuffering) {
		return;
	}

	if (this.m_arrBufferFrames.length == 0) {
		if (this.m_nState_Dec == emState_Finished) {
			this.fnUpdateTimerTrack();
			this.fnCallbackMessage(CallBack_Finished);
			this.fnStop();
		}
		return;
	}

	// requestAnimationFrame may be 60fps, if stream fps too large,
	// we need to render more frames in one loop, otherwise display
	// fps won't catch up with source fps, leads to memory increasing,
	// set to 2 now.
	var i = 0;
	for (i = 0; i < 10;) {
		if (this.m_arrBufferFrames.length == 0) {
			break;
		}

		var frame = this.m_arrBufferFrames[0];
		var tMilliNow = Date.now();
		if (this.m_tLocalMsecsFirst > 0 && ((frame.s - this.m_tPtsFirst) > (this.m_nSpeed * (tMilliNow - this
				.m_tLocalMsecsFirst)))) {
			break;
		}

		var nTimeAudio = frame.s + 500;
		while (this.arrBufferPcms.length > 0) {
			if (this.arrBufferPcms[0].s > nTimeAudio) {
				break;
			}
			this.fnDisplayAudioFrame(this.arrBufferPcms[0]);
			this.arrBufferPcms.shift();
		}

		switch (frame.t) {
			case kAudioFrame:
				if (this.fnDisplayAudioFrame(frame)) {
					this.m_arrBufferFrames.shift();
				}
				break;
			case kVideoFrame:
				if (this.fnDisplayVideoFrame(frame)) {
					if (this.m_tLocalMsecsFirst <= 0) {
						if(!this.m_pUrlInfo.isStream){
							this.m_tLocalMsecsFirst = tMilliNow - this.m_time_SkipPlayer * 1000;
						}else{
							this.m_tLocalMsecsFirst = tMilliNow;
						}
						this.m_tPtsFirst = frame.s;
					}
					this.m_tLocalMsecsLast = tMilliNow;
					this.m_tPtsLast = frame.s;
					this.m_arrBufferFrames.shift();
				}
				++i;
				break;
			default:
				break;
		}
	}

	if (this.m_nState_Dec == emState_Finished) {
		if (this.m_arrBufferFrames.length == 0) {
			this.fnUpdateTimerTrack();
			this.fnCallbackMessage(CallBack_Finished);
			this.fnStop();
		}
	}

	var nDuration = this.fnGetDurationOfBufferFrames();
	if(!this.m_nState_SkipPlayer){
		var nDuration = this.fnGetDurationOfBufferFrames();
		if (nDuration < this.m_tMilliSecsOfBuff_Set) {
			if (this.m_nState_Dec == emState_Pausing) {
				this.fnResumeDecoder();
			}

			// 因实时延时累积导致加速后的速度恢复
			if (this.m_pUrlInfo && this.m_pUrlInfo.isStream && this.m_nSpeed != this.m_pUrlInfo.speed) {
				this.m_nSpeed = this.m_pUrlInfo.speed;
				this.m_tLocalMsecsFirst = 0;
			}

			if (nDuration < this.m_tMilliSecsOfBuff_Min) {
				if (this.m_nState_Dec != emState_Finished) {
					this.fnStartBuffering();
				}

				// // 因实时延时累积导致加速后的速度恢复
				// if (this.m_pUrlInfo && this.m_pUrlInfo.isStream && this.m_nSpeed != this.m_pUrlInfo.speed) {
				// 	this.m_nSpeed = this.m_pUrlInfo.speed;
				// 	this.m_tLocalMsecsFirst = 0;
				// }
			}
		}
		//因实时延时累积后进行加速播放。
		else if (this.m_pUrlInfo.isStream && this.m_bIsRealTime && nDuration > this.m_tMilliSecsOfBuff_2X) {
			if (this.m_nSpeed == this.m_pUrlInfo.speed) {
				this.m_nSpeed = this.m_pUrlInfo.speed * 2;
				this.m_tLocalMsecsFirst = 0;
			}
		}
		
	}
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Downloader Operation =========================
Player.prototype.fnNewWorkerDownloader = function() {
	var player = this;
	this.m_pWorker_Dld = new Worker(this.options.dir + "/downloader.js");
	this.m_pWorker_Dld.onmessage = function(evt) {
		var objData = evt.data;
		switch (objData.t) {
			case kRsp_DownloadStart:
				player.fnOnDownloaderStart(objData);
				break;
			case kRsp_DownloadStop:
				player.fnOnDownloaderStop(objData);
				break;
			case kRsp_DownloadPause:
				player.fnOnDownloaderPause(objData);
				break;
			case kRsp_DownloadResume:
				player.fnOnDownloaderResume(objData);
				break;
			case kRsp_DurationChange:
				player.fnOnDurationChange(objData);
				break;
			case kUriData:
				player.fnOnUriData(objData.d, objData.q);
				break;
			case kUriDataFinished:
				player.fnOnDownloaderFinished(objData);
				break;
			case kRsp_ProfileData:
				player.fnParseProfile(objData.data);
				break;
			case kRsp_FileTimeLength: 
				let proto = player.m_pUrlInfo.proto
				if(kProtoType_HTTP_M3U8 == proto){
					let duration = objData.d;
					if(!player.m_nState_SkipPlayer){
						player.m_fDurationSecs = duration;
						player.m_pTimeTrack.max = duration;
					}else{
						player.m_time_SkipPlayer = player.m_fDurationSecs - duration;
					}
				}
				break;
			case kRsp_DownloadChangeTime:
				player.fnStartDownloader();
				player.fnStartDecoder();
				player.fnStartBuffering();
				break;
		}
	}
};

//清除url指定参数
function removeQueryParam(url, paramName) {  
    // 创建一个新的URL对象  
    let urlObj = new URL(url);  
      
    // 获取URL的搜索参数  
    let params = urlObj.searchParams;  
      
    // 删除指定的查询参数  
    params.delete(paramName);  
      
    // 重新构建URL（不包括原始的查询字符串）  
    urlObj.search = params.toString();  
      
    // 返回修改后的URL  
    return urlObj.toString();  
} 

Player.prototype.fnCheckAndNewDownloader = function() {
	if (!this.m_pWorker_Dld && this.m_nState_Dld != emState_Finished) {
		this.fnNewWorkerDownloader();
	}
};

Player.prototype.fnStartDownloader = function() {
	this.fnCheckAndNewDownloader();
	var msgReq = {
		t: kReq_DownloadStart,
		p: this.m_pUrlInfo.proto,
		u: this.m_pUrlInfo.url,
		i: this.m_pUrlInfo.isStream,
		q: this.m_nSeq,
		k: window.sessionStorage.getItem(ProfileKey_Note[0])
	};
	this.m_pWorker_Dld.postMessage(msgReq);
};

Player.prototype.fnStopDownloader = function() {
	if (!this.m_pWorker_Dld) {
		return;
	}

	switch (this.m_nState_Dld) {
		case emState_Idle: {

		}
		break;
		case emState_Pausing:
		case emState_Running:
		case emState_Finished: {
			var msgReq = {
				t: kReq_DownloadStop
			};
			this.m_pWorker_Dld.postMessage(msgReq);
		}
		break;
		default:
			break;
	}
};

Player.prototype.fnResumeDownloader = function() {
	this.fnCheckAndNewDownloader();
	switch (this.m_nState_Dld) {
		case emState_Idle: {
			this.fnStartDownloader();
		}
		break;
		case emState_Finished:
		case emState_Running: {

		}
		break;
		case emState_Pausing: {
			var msgReq = {
				t: kReq_DownloadResume
			};
			this.m_pWorker_Dld.postMessage(msgReq);
		}
		break;
		default:
			break;
	}
};

Player.prototype.fnPauseDownloader = function() {
	this.fnCheckAndNewDownloader();
	switch (this.m_nState_Dld) {
		case emState_Idle: {
			// error for didnot init
			// this.fnStartDownload();
		}
		break;
		case emState_Running: {
			var msgReq = {
				t: kReq_DownloadPause
			};
			this.m_pWorker_Dld.postMessage(msgReq);

		}
		break;
		case emState_Pausing:
		case emState_Finished: {}
		break;
		default:
			break;
	}
};

Player.prototype.fnOnDownloaderStart = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dld = emState_Running;
		this.m_pWorker_Dec.postMessage(objData);
	} else {
		this.fnReportErrorPlayer(Error_Downloader_Start);
		this.fnStop();
	}
};

Player.prototype.fnOnDownloaderStop = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dld = emState_Idle;
	} else {
		this.fnReportErrorPlayer(Error_Downloader_Stop);
	}
};

Player.prototype.fnOnDownloaderPause = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dld = emState_Pausing;
	} else {
		this.fnReportErrorPlayer(Error_Downloader_Pause);
	}
};

Player.prototype.fnOnDownloaderResume = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dld = emState_Running;
	} else {
		this.fnReportErrorPlayer(Error_Downloader_Resume);
	}
};

Player.prototype.fnOnDownloaderFinished = function(objData) {
	this.m_nState_Dld = emState_Finished;
	objData.t = kDataFinished;
	this.m_pWorker_Dec.postMessage(objData);
};

Player.prototype.fnOnDurationChange = function(objData) {
	this.fnSetDuration(objData.n);
};

Player.prototype.fnOnUriData = function(data, seq) {
	if (this.m_nState != emState_Pausing && this.m_nState != emState_Running) {
		return;
	}

	if (this.m_nState_Dec == emState_Finished) {
		return;
	}

	if (this.m_pWorker_Dec == null || this.m_nState_Dec == emState_Idle) {

		this.m_arrCache.push(data);
		return;
	}

	if (this.m_arrCache.length > 0) {
		for (var i = 0; i < this.m_arrCache.length; i++) {
			var obj = this.m_arrCache[i];
			var objData = {
				t: kFeedData,
				d: obj
			};

			this.m_pWorker_Dec.postMessage(objData, [objData.d]);
		}
		this.m_arrCache.length = 0;
	}

	var objData = {
		t: kFeedData,
		d: data
	};
	this.m_pWorker_Dec.postMessage(objData, [objData.d]);
};


Player.prototype.fnPlayerSkipTime = function (info) {
	let player = this;
	
	//更新标识
	player.m_nState_SkipPlayer = true;
	player.m_time_SkipPlayer = info;
	
	//更新地址（seekFromBegin={secs}）
	player.m_pUrlInfo.url = removeQueryParam(player.m_pUrlInfo.url,"seekFromBegin");
	player.m_pUrlInfo.url = player.m_pUrlInfo.url + "?seekFromBegin=" + info;

	//标识重置
	player.arrBufferPcms = [];
	player.m_arrBufferFrames = [];
	player.fnClearBufferFrames();
	player.m_tPtsFirst = 0;
	player.m_tPtsLast = 0;
	
	//区分url类型
	let proto = this.m_pUrlInfo.proto
	if(kProtoType_HTTP == proto){
		player.fnStartDownloader();
		player.fnStartDecoder();
		player.fnStartBuffering();
	}else{
		let msgReq={
			t: kReq_DecoderSkipTime, // 消息类型：跳帧（时间）
			index:info, //跳帧下标
			streamType:player.m_pUrlInfo.proto //流类型
		}
		player.m_pWorker_Dld.postMessage(msgReq);
		
	}
	
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Decoder Operation =========================
Player.prototype.fnNewWorkerDecoder = function() {
	var player = this;
	this.m_pWorker_Dec = new Worker(this.options.dir + "/decoder.js");
	this.m_pWorker_Dec.onmessage = function(evt) {
		var objData = evt.data;
		switch (objData.t) {
			case kReq_DecoderPause:
				player.fnOnDecoderPause(objData);
				break;
			case kReq_DecoderResume:
				player.fnOnDecoderResume(objData);
				break;
			case kVideoInfo:
				player.fnOnVideoInfo(objData);
				break;
			case kAudioInfo:
				player.fnOnAudioInfo(objData);
				break;
			case kVideoFrame:
				player.fnOnVideoFrame(objData);
				break;
			case kAudioFrame:
				player.fnOnAudioFrame(objData);
				break;
			case kFinishedEvt:
				player.fnOnDecoderFinished(objData);
				break;
			case kAuthErr:
				player.fnOnDecoderAuthErr(objData);
				break;
			case kDecoderDataFull:
				player.fnPauseDownloader();
				break;
			case kDecoderDataMore:
				player.fnResumeDownloader();
				break;
			case kRequestDataEvt:
				player.fnOnRequestData(objData.o, objData.a);
				break;
			case kRsp_DecoderSeekTo:
				// player.fnOnSeekToRsp(objData.r);
				break;
			// case kRsp_DecoderStart:
			// 	player.fnOnDecoderStart(objData);
			// 	break;
			case kWriteFrame: {
				// if(objData.l > 0)
				// {
				// 	player.Stream.push(objData.d);
				// }
				// else{
				// 	var len = 0;
				// 	for(var i=0;i<player.Stream.length;++i)
				// 	{
				// 		len += player.Stream[i].length;
				// 	}

				// 	var newStream = new Uint8Array(len);
				// 	var nIndex = 0;
				// 	for(var i=0;i<player.Stream.length;++i)
				// 	{
				// 		newStream.set(player.Stream[i], nIndex);
				// 		nIndex += player.Stream[i].length;
				// 	}

				// 	var blob = new Blob([newStream], {
				// 		type: "text/plain;charset=utf-8"
				// 	});

				// 	saveAs(blob, "file/file.txt"); //saveAs(blob,filename)
				// 	player.Stream = new Uint8Array();
				// }

			}
			break;
		case kVersion: {
			player.fnOnVersion(objData.v);
		}
		break;
		case kReauth: {
			if (!player.m_bSendAuth) {
				window.sessionStorage.removeItem(AuthKey_Note);
				player.m_bSendAuth = true;
				player.fnStartTimerAuth();
			}
		}
		break;
		}
	}
	this.m_nState_Dec = emState_Idle;
};

Player.prototype.fnCheckAndNewWorkerDecoder = function() {
	if (!this.m_pWorker_Dec) {
		this.fnNewWorkerDecoder();
	}
};

Player.prototype.fnServerUUID = function(){
	var uuid = window.sessionStorage.getItem(ProfileKey_Note[0]);
	if (uuid) {
		return;
	}
	
	var msgReq = {
		t: kReq_uuid,
		u: uuid
	};
	this.m_pWorker_Dec.postMessage(msgReq);
};

Player.prototype.fnNetDomain = function(){
	var domain = Signature.getDomainFromUrl(window.location.href);
	var msgReq = {
		t: kReq_domain,
		u: domain
	};
	this.m_pWorker_Dec.postMessage(msgReq);
};

Player.prototype.fnStartDecoder = function() {
	this.fnCheckAndNewWorkerDecoder();
	// this.m_bSendProfile = true;
	// this.m_bSendAuth = true;
	this.fnStartTimerAuth();
	var msgReq = {
		t: kReq_DecoderStart,
		c: this.m_pUrlInfo.chunkSize,
		i: this.m_pUrlInfo.type,
		v: this.m_nTimerInterval_Dec,
		l: this.m_pUrlInfo.logLv,
		k: window.sessionStorage.getItem(ProfileKey_Note[0]),
		u: window.location.href
	};
	this.m_pWorker_Dec.postMessage(msgReq);
};

Player.prototype.fnStopDecoder = function() {
	if (!this.m_pWorker_Dec) {
		return;
	}

	switch (this.m_nState_Dec) {
		case emState_Pausing:
		case emState_Running:
		case emState_Finished: {
			this.m_pWorker_Dec.postMessage({
				t: kReq_DecoderStop
			});
		}
		break;
	case emState_Idle:
		break;
	}
};

Player.prototype.fnResumeDecoder = function() {
	this.fnCheckAndNewWorkerDecoder();
	switch (this.m_nState_Dec) {
		case emState_Idle: 
			this.fnStartDecoder();
		break;
		case emState_Running:
			break;
		case emState_Pausing: 
			var msgReq = {
				t: kReq_DecoderResume
			};
			this.m_pWorker_Dec.postMessage(msgReq);
			break;
		case emState_Resume:
			break;
		case emState_Finished:
			break;
	}
};

Player.prototype.fnPauseDecoder = function() {
	this.fnCheckAndNewWorkerDecoder();
	switch (this.m_nState_Dec) {
		case emState_Idle:
		break;
		case emState_Running:
			break;
		case emState_Pausing: 
			var msgReq = {
				t: kReq_DecoderPause
			};
			this.m_pWorker_Dec.postMessage(msgReq);
			break;
		case emState_Resume:
			break;
		case emState_Finished:
			var msgReq = {
				t: kReq_DecoderStop
			};
			this.m_pWorker_Dec.postMessage(msgReq);
			break;
	}
};

Player.prototype.fnOnDecoderStart = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dec = emState_Running;
	} else {
		this.fnReportErrorPlayer(Error_Decoder_Start);
		this.fnStop();
	}
};

Player.prototype.fnOnDecoderPause = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dec = emState_Pausing;
	} else {
		this.fnReportErrorPlayer(Error_Decoder_Pause);
	}
};

Player.prototype.fnOnDecoderResume = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dec = emState_Running;
	} else {
		this.fnReportErrorPlayer(Error_Decoder_Resume);
	}
};

Player.prototype.fnOnDecoderStop = function(objData) {
	if (objData.e == 0) {
		this.m_nState_Dec = emState_Idle;
	} else {
		this.fnReportErrorPlayer(Error_Decoder_Stop);
	}
};

Player.prototype.fnOnDecoderFinished = function(objData) {
	// this.fnStopDecoder();
	this.m_nState_Dec = emState_Finished;
	this.fnStopBuffering();
	this.fnStopDownloader();
	this.fnStopTimerAuth();
	// this.fnCallbackMessage(CallBack_Finished);
};

Player.prototype.fnOnDecoderAuthErr = function(objData) {
	this.fnReportErrorPlayer(Error_Decoder_Auth);
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Buffering Frames =========================
Player.prototype.fnSetBufferTime = function(milliSecs) {
	if (this.m_pUrlInfo.type == STREAM_TYPE_HLS && milliSecs < this.m_tDuration) {
		return;
	}

	this.m_tMilliSecsOfBuff_Set = milliSecs;
	this.m_tMilliSecsOfBuff_2X = this.m_tMilliSecsOfBuff_Set + 500;
	this.m_tMilliSecsOfBuff_Min = Math.max(g_nMilliSecsOfBuff_Min_Default, (milliSecs >> this.m_nRightShiftBits));
	this.m_tMilliSecsOfBuff_Max = Math.min(g_nMilliSecsOfBuff_Max_Default, (milliSecs << this.m_nLeftShiftBits));
};

Player.prototype.fnSetDuration = function(milliSecs) {
	if (this.m_tDuration < milliSecs) {
		this.m_tDuration = milliSecs;
	}

	if (milliSecs <= this.m_tMilliSecsOfBuff_Set) {
		return;
	}
	this.fnSetBufferTime(milliSecs);
};

Player.prototype.fnGetDurationOfBufferFrames = function() {
	if (!this.m_arrBufferFrames || this.m_arrBufferFrames.length == 0) {
		return 0;
	}

	let oldest = this.m_arrBufferFrames[0];
	let newest = this.m_arrBufferFrames[this.m_arrBufferFrames.length - 1];
	return newest.s - oldest.s;
};

Player.prototype.fnPushBufferFrame = function(frame) {
	let player = this;
	let time = frame.s;
	if(time < this.m_tPtsFirst || time < this.m_tPtsLast){ 
		return;
	}
	
	player.m_arrBufferFrames.push(frame);
	player.fnUpdateTimerTrackMax(frame.s);
	var nDurationBuff = player.fnGetDurationOfBufferFrames();
	if (nDurationBuff >= player.m_tMilliSecsOfBuff_Set) {
		player.fnStopBuffering();
		if (nDurationBuff > player.m_tMilliSecsOfBuff_Max) {
			player.fnPauseDecoder();
		}
	
	}
	
	if (player.m_nState_Dec == emState_Finished) {
		player.fnStopBuffering();
	}
	
};

//执行存储bufferFrame业务
function pushBufferFrameModule(frame,player){
	player.m_arrBufferFrames.push(frame);
	player.fnUpdateTimerTrackMax(frame.s);
	var nDurationBuff = player.fnGetDurationOfBufferFrames();
	if (nDurationBuff >= player.m_tMilliSecsOfBuff_Set) {
		player.fnStopBuffering();
		if (nDurationBuff > player.m_tMilliSecsOfBuff_Max) {
			player.fnPauseDecoder();
		}
	
		 
	}
	
	if (player.m_nState_Dec == emState_Finished) {
		player.fnStopBuffering();
	}
}

Player.prototype.fnClearBufferFrames = function() {
	this.m_arrBufferFrames = [];
	this.m_tLocalMsecsFirst = 0;
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Buffering Operation =========================
Player.prototype.fnSetBuffering = function(istrue) {
	if (istrue) {
		this.fnShowLoading();
	} else {
		this.fnHideLoading();
	}
	this.m_bBuffering = istrue;
};

Player.prototype.fnStartBuffering = function() {
	if (this.m_bBuffering) {
		return;
	}

	this.fnSetBuffering(true);

	//Pause audio context.
	if (this.m_pPcmPlayer) {
		this.m_pPcmPlayer.pause();
	}

	// this.fnResumeDownloader();
	//Restart decoding.
	this.fnResumeDecoder();
	//Stop track timer.
	this.fnStopTimerTrack();

	// 初始化本地时间
	this.m_tLocalMsecsFirst = 0;
};

Player.prototype.fnStopBuffering = function() {
	if (!this.m_bBuffering) {
		return;
	}

	this.fnSetBuffering(false);

	if (this.m_pPcmPlayer && this.m_nState == emState_Running) {
		//Resume audio context.
		this.m_pPcmPlayer.resume();
	}

	//Restart track timer.
	this.fnStartTimerTrack();
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Timer Track =========================

Player.prototype.fnStartTimerTrack = function() {
	var player = this;
	if(player.m_pTimer_Track != null){
		window.clearInterval(player.m_pTimer_Track);
	}
	this.m_pTimer_Track = setInterval(function() {
		player.fnUpdateTimerTrack();
	}, this.m_nTimerInterval_Track);
};

Player.prototype.fnPauseTimerTrack = function() {
	if (this.m_pTimer_Track != null) {
		clearInterval(this.m_pTimer_Track);
		this.m_pTimer_Track = null;
	}
	
};

Player.prototype.fnStopTimerTrack = function() {
	if (this.m_pTimer_Track != null) {
		clearInterval(this.m_pTimer_Track);
		this.m_pTimer_Track = null;
	}
};

Player.prototype.fnInitTimerTrack = function() {
	if (this.m_pTimeTrack) {
		this.m_pTimeTrack.value = 0;
		this.m_pTimeTrack.max = 0;
		this.m_szDurationDisplay = "00:00:00";
	}

	if (this.m_pTimeLabel) {
		this.m_pTimeLabel.innerHTML = "00:00:00/00:00:00";
	}
};

Player.prototype.fnUpdateTimerTrackValue = function(pts) {
	if (this.m_pTimeTrack) {
		if (this.m_pTimeTrack.value == pts) {
			return false;
		}

		let time = Math.floor(pts / 1000);
		if(this.m_nState_SkipPlayer){ 
			time += this.m_time_SkipPlayer;
		}
		this.m_pTimeTrack.value =  time;
		if (this.m_pTimeTrack.max >= time) {
			if(this.formatTime){
				this.m_szDurationDisplay = this.formatTime(pts / 1000);
				
			}
		}else{
			return false;
		}
		
		return true;
	} else {
		return false;
	}
};

Player.prototype.fnUpdateTimerTrackMax = function(pts) {
	if (this.m_pTimeTrack) {
		this.m_szDurationDisplay = this.fnFormatTime(pts / 1000);
	}
};

// 定时执行程序
Player.prototype.fnUpdateTimerTrack = function() {
	if (this.m_nState != emState_Running && this.m_nState != emState_Pausing) {
		return;
	}

	if (this.m_pTimeTrack) {
		if (this.fnUpdateTimerTrackValue(this.m_tPtsLast)) {
			if (this.m_pTimeLabel) {
				var nSecsLastPts = this.m_tPtsLast / 1000;
				let currentPlayerTime = nSecsLastPts;
				if(this.m_nState_SkipPlayer){ 
					currentPlayerTime += this.m_time_SkipPlayer
				}
				this.m_pTimeLabel.innerHTML = this.fnFormatTime(currentPlayerTime) + "/" + this.fnFormatTime(this.m_fDurationSecs);
				
			}
		}
	}
};
//将秒数格式化为HH:MM:SS这种格式
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(secs).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Loading Operation =========================

Player.prototype.fnSetLoadingDiv = function(loadingDiv) {
	this.m_pLoadingDiv = loadingDiv;
};

Player.prototype.fnHideLoading = function() {
	if (!this.m_bBuffering) {
		return;
	}

	if (this.m_pLoadingDiv != null) {
		this.m_pLoadingDiv.style.display = "none";
	}

	this.fnCallbackMessage(CallBack_Loading, FALSE_XM, CallBack_Note[CallBack_Loading] + " " + Loading_Note[0]);
};

Player.prototype.fnShowLoading = function() {
	if (this.m_bBuffering) {
		return;
	}

	if (this.m_pLoadingDiv != null) {
		this.m_pLoadingDiv.style.display = "block";
	}

	this.fnCallbackMessage(CallBack_Loading, TRUE_XM, CallBack_Note[CallBack_Loading] + " " + Loading_Note[1]);
};


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Outside Operation =========================
Player.prototype.fnSetTrack = function(timeTrack, timeLabel, progressBarModal) {
	this.m_pTimeTrack = timeTrack;
	this.m_pTimeLabel = timeLabel;
	this.m_pProgressBarModal = progressBarModal;
	
	if (this.m_pTimeTrack) {
		// var player = this;
		// this.m_pTimeTrack.oninput = function() {
		// 	// if (!player.seeking) {
		// 	// 	player.seekTo(player.m_pTimeTrack.value);
		// 	// }
		// }
		// this.m_pTimeTrack.onchange = function() {
		// 	// if (!player.seeking) {
		// 	// 	player.seekTo(player.m_pTimeTrack.value);
		// 	// }
		// }
	}
	
	//是否隐藏进度条模块（特殊处理，在直播时隐藏、回放时显示）
	if(this.m_pProgressBarModal){
		if(this.m_pUrlInfo.isStream){
			this.m_pProgressBarModal.style.display = 'none';  
		}else{
			this.m_pProgressBarModal.style.display = '';  
		}
	}
	
	let isStream = this.m_pUrlInfo.isStream 
	
	//flv 回放统计时长
	let proto = this.m_pUrlInfo.proto
	if(kProtoType_HTTP == proto){
		if(!isStream){
			let duration = calculateTimeDifference(this.m_pUrlInfo.endDate, this.m_pUrlInfo.startDate);
			this.m_fDurationSecs = duration / 1000;
			this.m_pTimeTrack.max = duration / 1000;
		} 
	}
	
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ======================== Common Operation =========================

Player.prototype.fnFormatTime = function(s) {
	var hour = Math.floor(s / 3600) < 10 ? '0' + Math.floor(s / 3600) : Math.floor(s / 3600);
	var min = Math.floor((s / 60 % 60)) < 10 ? '0' + Math.floor((s / 60 % 60)) : Math.floor((s / 60 % 60));
	var sec = Math.floor((s % 60)) < 10 ? '0' + Math.floor((s % 60)) : Math.floor((s % 60));
	return szResult = hour + ":" + min + ":" + sec;
};

Player.prototype.fnCallbackMessage = function(ret, status, message) {
	if (this.m_fnCallback == null) {
		return -1;
	}

	var msg = {
		ret: ret,
		status: status || 0,
		message: message || CallBack_Note[ret]
	};
	this.m_fnCallback(msg);
	return 0;
};

Player.prototype.fnReportErrorPlayer = function(error, status, message) {
	var stErr = {
		ret: CallBack_Error,
		error: error || Error_Common,
		status: status || 0,
		message: message
	};

	if (this.m_fnCallback) {
		this.m_fnCallback(stErr);
	}
};

Player.prototype.fnRegisterVisibilityEvent = function(cb) {
	var szHidden = "hidden";

	// Standards:
	if (szHidden in document) {
		document.addEventListener("visibilitychange", fnOnchange);
	} else if ((szHidden = "mozHidden") in document) {
		document.addEventListener("mozvisibilitychange", fnOnchange);
	} else if ((szHidden = "webkitHidden") in document) {
		document.addEventListener("webkitvisibilitychange", fnOnchange);
	} else if ((szHidden = "msHidden") in document) {
		document.addEventListener("msvisibilitychange", fnOnchange);
	} else if ("onfocusin" in document) {
		// IE 9 and lower.
		document.onfocusin = document.onfocusout = fnOnchange;
	} else {
		// All others.
		window.onpageshow = window.onpagehide = window.onfocus = window.onblur = fnOnchange;
	}

	function fnOnchange(evt) {
		var v = true;
		var h = false;
		var evtMap = {
			focus: v,
			focusin: v,
			pageshow: v,
			blur: h,
			focusout: h,
			pagehide: h
		};

		evt = evt || window.event;
		var visible = v;
		if (evt.type in evtMap) {
			visible = evtMap[evt.type];
		} else {
			visible = this[szHidden] ? h : v;
		}
		cb(visible);
	}

	// set the initial state (but only if browser supports the Page Visibility API)
	if (document[szHidden] !== undefined) {
		fnOnchange({
			type: document[szHidden] ? "blur" : "focus"
		});
	}
};

Player.prototype.fnDealTimerAuth = function() {
	let player = this;
	if (!this.m_pWorker_Dec) {
		return;
	}

	if (this.m_bSendProfile) {
		var szProfile = window.sessionStorage.getItem(ProfileKey_Note[0]);
		if (szProfile) {
			var msgReq = {
				t: kReq_Profile,
				u: szProfile
			};
			this.m_pWorker_Dec.postMessage(msgReq);
			this.m_bSendProfile = false;
		} else {
			this.fnGetProfile();
		}
	}

	if (this.m_bSendAuth) {
		var szAuth = window.sessionStorage.getItem(AuthKey_Note);
		if (szAuth) {
			var msgReq = {
				t: kReq_Auth,
				a: szAuth
			};
			this.m_pWorker_Dec.postMessage(msgReq);
			this.m_bSendAuth = false
		    window.setTimeout(function(){
				window.sessionStorage.removeItem(AuthKey_Note);
				player.m_bSendAuth = true;
				player.fnStartTimerAuth();
			},g_nMilliSecsOfBuff_Set);
		} else {
			if (3 < this.nReqAuthCount) {
				this.AuthErrorByStop();
				console.error("Not authorized, please contact us");
			}
		}
		this.fnRequestAuth();
	}

	if (!this.m_bSendProfile && !this.m_bSendAuth) {
		this.fnStopTimerAuth();
	}
};

Player.prototype.fnStartTimerAuth = function() {
	if (this.m_pTimer_Auth) {
		return;
	}

	var player = this;
	this.m_pTimer_Auth = setInterval(function() {
		player.fnDealTimerAuth();
	}, AuthRate_time);
};

Player.prototype.fnStopTimerAuth = function() {
	if (this.m_pTimer_Auth) {
		clearInterval(this.m_pTimer_Auth);
		this.m_pTimer_Auth = null;
	}
};


//像素化
Player.prototype.pixelation = function (ctx, x, y, width, height, pixelSize) {
	const imageData = ctx.getImageData(x, y, width, height);
	const data = imageData.data;
	for (let i = 0; i < height; i += pixelSize) {
		for (let j = 0; j < width; j += pixelSize) {
			const red = data[((i * width + j) * 4)];
			const green = data[((i * width + j) * 4) + 1];
			const blue = data[((i * width + j) * 4) + 2];
			ctx.fillStyle = `rgb(${red},${green},${blue})`;
			ctx.fillRect(x + j, y + i, pixelSize, pixelSize);
		}
	}
}

//模糊化
Player.prototype.blurring = function (ctx, x, y, width, height, blurRadius) {
	const imageData = ctx.getImageData(x, y, width, height);
	const data = imageData.data;
	const tempData = new Uint8ClampedArray(data);

	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			let red = 0, green = 0, blue = 0, count = 0;
			for (let dy = -blurRadius; dy <= blurRadius; dy++) {
				for (let dx = -blurRadius; dx <= blurRadius; dx++) {
					const ny = i + dy;
					const nx = j + dx;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
						const index = (ny * width + nx) * 4;
						red += tempData[index];
						green += tempData[index + 1];
						blue += tempData[index + 2];
						count++;
					}
				}
			}
			const idx = (i * width + j) * 4;
			data[idx] = red / count;
			data[idx + 1] = green / count;
			data[idx + 2] = blue / count;
		}
	}
	ctx.putImageData(imageData, x, y);
}