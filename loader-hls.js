// document.write('<script src="common.js" charset="utf-8"></script>');


function LoaderHLS() {

	this.szUrlMain = null; //主url
	this.szUrlHls = null;
	this.listM3u8 = []; //m3u8列表
	this.listTs = []; //ts列表
	this.szTsHeader = null; //ts url的前面部分
	this.szUrlHeader = null;
	this.nIndexTs = 0;
	this.nIndexTs_Sign = 0; //上次获取的Ts表第1个ts在缓存列表中的序号
	this.nIndexM3u8 = 0;
	this.bIsStream = true;

	this.szUrlTsLast = null;

	this.fDurationSecs = 0.0;
	this.fDuration = 0.0;

	this.FetchHttp = null;
	this.fetchController = null;

	this.XmlHttp = null;
	this.nUrlType = HLS_URL_TYPE_HLS;
	this.bRequesting = false;

	this.nTimeout = g_nTimeout_Default;
	this.nTimeoutCount = 0;

	this.timerRequest = null;
	this.nIntervalRequest = g_nInterval_Default;
	
	this.bFirstTime = true;
};

LoaderHLS.prototype.fnParseLine = function(text, separator) {
	var listLines = [];
	var nIndexPre = text.indexOf(separator);
	var nIndex = 0;
	while (true) {
		if (nIndexPre == -1) {
			break;
		}

		nIndex = text.indexOf(separator, nIndexPre + 1);
		if (nIndex == -1) {
			listLines.push(text.substring(nIndexPre));
		} else {
			listLines.push(text.substring(nIndexPre, nIndex));
		}
		nIndexPre = nIndex;
	}
	return listLines;
};

LoaderHLS.prototype.fnCallBack = function(rsp, url) {
	var arrayRsp = this.fnParseLine(rsp, "#");
	var listM3u8 = [];
	var listTs = [];
	var fDurationSecs = 0.0;
	var szParseTmp;
	var pattM3u8 = /.m3u8/;
	var pattTargetDuration = /^#EXT-X-TARGETDURATION/;
	var pattEXTINF = /^#EXTINF/;
	var pattEXT_X_STREAM_INF = /^#EXT-X-STREAM-INF/;
	var pattHTTP = /^http/;
	var pattEXTINFValue = /#EXTINF:\s*(\d*(?:\.\d+)?)(?:,[^\r\n]*[\r\n\s]+)?([^\r\n]*)(?:[\s\r\n]*)?/;
	var szUrlMain = url.substring(0, url.lastIndexOf("/") + 1);
	var szUrlTmp;
	var nFind = this.nIndexTs_Sign;
	var bFind = false;
	for (var index = 0; index < arrayRsp.length; ++index) {
		szParseTmp = arrayRsp[index];
		if (pattEXTINF.test(szParseTmp)) {
			var newLine = szParseTmp.replace('\r', ''); // Tags
			var match = /^#EXTINF:?([0-9\.]*)?,?(.*)?$/.exec(newLine);
			var values = pattEXTINFValue.exec(szParseTmp);
			var duration = parseFloat(values[1]);
			var szUrl = values[2];
			bFind = false;
			// check the url is in listTs
			for(var i=nFind; i<this.listTs.length; ++i){
				if(szUrl == this.listTs[i].f){
					nFind = i;
					bFind = true;
					break;
				}
			}
			// if the url in listTs -> ignore
			if(bFind){
				if(index == 0){
					this.nIndexTs_Sign = nFind;
				}
				continue;
			}
			
			if(index == 0){
				this.nIndexTs_Sign = this.listTs.length;
			}
			
			var val_ts = {
				d: duration,
				f: szUrl,
			};
			listTs.push(val_ts);
			fDurationSecs += duration;
		} else if (pattTargetDuration.test(szParseTmp)) {
			var arrayLines = szParseTmp.split(":");
			if(arrayLines.length != 2){
				continue;
			}
			var fDuration = parseFloat(arrayLines[1]);
			if(fDuration > this.fDuration){
				this.fDuration = fDuration;
				var nDuration = parseInt(fDuration * 1000);
				var objData = {
					t: kRsp_DurationChange,
					n: nDuration
				};
				self.postMessage(objData);
			}
		} else if (pattEXT_X_STREAM_INF.test(szParseTmp)) {
			var arrayLines = szParseTmp.split("\n");
			var szLine;
			for (var line = 1; line < arrayLines.length; ++line) {
				szLine = arrayLines[line];
				if (pattM3u8.test(szLine)) {
					if (pattHTTP.test(szLine)) {
						szUrlTmp = szLine;
					} else {
						szUrlTmp = szUrlMain + szLine;
					}

					listM3u8.push(szUrlTmp);
					// console.log("PUSH-M3u8::  " + szUrlTmp);
				}
			}
		}
	}

	if (listM3u8.length > 0) {
		if (this.listM3u8[0] == url) {
			this.listM3u8.splice(0, 1);
		}
		this.listM3u8 = listM3u8.concat(this.listM3u8);
	}

	if (listTs.length > 0) {
		this.listTs = this.listTs.concat(listTs);
		this.fDurationSecs += fDurationSecs;
		
		if(this.bFirstTime && this.bIsStream){
			this.nIndexTs = 0;//this.listTs.length - 1;
			this.bFirstTime = false;
		}
	}

	var objRet = {
		t: kRsp_FileTimeLength,
		d: this.fDurationSecs
	};
	self.postMessage(objRet);
};

LoaderHLS.prototype.fnStartTimer = function() {
	var self = this;
	if (this.timerRequest != null) {
		clearInterval(this.timerRequest);
	}
	
	this.timerRequest = setInterval(function() {
		self.fnOnRequest();
	}, this.nIntervalRequest);
};

LoaderHLS.prototype.fnStopTimer = function() {
	if (this.timerRequest != null) {
		clearInterval(this.timerRequest);
		this.timerRequest = null;
	}
};

LoaderHLS.prototype.fnOnRequest = function() {
	if (this.nLastRecvTime > Date.now() + 5000) {
		var objData = {
			t: kCommonRsp,
			r: EE_Err_Loader_Timeout
		};
		this.postMessage(objData);
	}

	if (this.bRequesting) {
		return;
	}

	if (this.listTs.length > 0 && this.nIndexTs < this.listTs.length) {
		var cTs = this.listTs[this.nIndexTs];
		if (this.fnRequest(cTs.f, HLS_URL_TYPE_TS) == EE_Loader_OK) {
			++this.nIndexTs;
			this.nUrlType = HLS_URL_TYPE_TS;
		}
	}else if(!this.bIsStream && this.listTs.length > 0){
		 var objData = {
		 	t: kUriDataFinished
		 };
		 self.postMessage(objData);
		 this.fnPause();
	}else if (this.listM3u8.length > 0) {
		if(this.nIndexM3u8 >= this.listM3u8.length){
			this.nIndexM3u8 = 0;
		}
		var szM3u8 = this.listM3u8[this.nIndexM3u8];
		if (this.fnRequest(szM3u8, HLS_URL_TYPE_HLS) == EE_Loader_OK) {
			++this.nIndexM3u8;
			this.nUrlType = HLS_URL_TYPE_HLS;
		}
	} else {
		this.fnRequest(this.szUrlHls, HLS_URL_TYPE_HLS);
		this.nUrlType = HLS_URL_TYPE_HLS;
	}
};

LoaderHLS.prototype.fnRequestM3u8 = function(url) {
	// if (this.XmlHttp == null) {
	// 	this.XmlHttp = this.fnCreateCORS("Get", url); //new XMLHttpRequest();
	// } else {
	// 	this.XmlHttp.abort();
	// }
	this.XmlHttp = this.fnCreateCORS("Get", url); //new XMLHttpRequest();

	var xmlHttp = this.XmlHttp;
	var selfLoader = this;
	xmlHttp.ontimeout = function() {
		++selfLoader.nTimeoutCount;
		if (selfLoader.nTimeoutCount > g_nTimeoutCount_Max) {
			// 返回超时错误
			var objData = {
				t: kUriDataError,
				r: EE_Err_Loader_Timeout
			};
			self.postMessage(objData);
		}
	}
	
	// console.log("fnRequestM3u8: " + url);
	// xmlHttp.addEventListener("loadstart", stateChange);
	// xmlHttp.addEventListener("loadend", stateChange);
	// xmlHttp.addEventListener("load", stateChange);
	// xmlHttp.addEventListener("progress", stateChange);
	// xmlHttp.addEventListener("error", stateChange);
	// xmlHttp.addEventListener("abort", stateChange);
	xmlHttp.onreadystatechange = function(){
		if (xmlHttp.readyState === XMLHttpRequest.DONE) {
			if (xmlHttp.status === 200) {
				// console.log("status 200");
				selfLoader.fnCallBack(xmlHttp.response, url);
			} else {
				// console.log("status " + xmlHttp.status);
				var objData = {
					t: kUriDataError,
					r: EE_Err_Loader_Net
				};
				self.postMessage(objData);
			}
			selfLoader.bRequesting = false;
		}
	}

	xmlHttp.onerror = function(){
		//跨域请求时触发
		var objData = {
		  t: kUriDataCors,
		  r: Error_Url_CORS
		};
		self.postMessage(objData);
	}
	
	if (HLS_URL_TYPE_HLS == HLS_URL_TYPE_TS) {
		xmlHttp.responseType = "arraybuffer";
	} else {
		xmlHttp.responseType = "text";
	}
	var nIdx_tmp = url.indexOf("://");
	this.szUrlHeader = url.substring(0, url.indexOf("/", (nIdx_tmp < 0 ? 0 : nIdx_tmp + 3)));
	this.szTsHeader = url.substring(0, url.lastIndexOf("/") + 1);
	this.bRequesting = true;
	xmlHttp.timeout = this.nTimeout;
	xmlHttp.send();
	// xmlHttp.onreadystatechange = stateChange;
	return EE_Loader_OK;
};

//十进制转 十六进制 格式数据
function tenToSixteen(ten) {
	var hex = ten.toString(16);
	var zero = '00000000';
	var tmp = 8 - hex.length;
	return '0x' + zero.substr(0, tmp) + hex;
}

//十进制转 十六进制 格式数据
function tenToBinary(ten) {
	var binary = ten.toString(2);
	var zero = '00000000';
	var tmp = 8 - binary.length;
	return zero.substr(0, tmp) + binary;
};

LoaderHLS.prototype.fnCreateCORS = function(method, url) {
	if (this.XmlHttp == null) {
		this.XmlHttp = new XMLHttpRequest();
	} else {
		this.XmlHttp.abort();
	}
	var xmlHttp = this.XmlHttp;

	if ('withCredentials' in xmlHttp) {
		xmlHttp.open(method, url, true);
	} else if (typeof XDomainRequest != 'undefined') {
		var xmlHttp = new XDomainRequest();
		xmlHttp.open(method, url);
	} else {
		xmlHttp = null;
	}
	return xmlHttp;
};

LoaderHLS.prototype.fnRequestTs = function(url) {
	var pattHTTP = /^http/;
	var szUrl = url;
	if(!pattHTTP.test(url)){
		if(url.charAt(0) == '/'){
			szUrl = this.szUrlHeader + url;
		}
		else{
			szUrl = this.szTsHeader + url;
		}
	}
	
	var selfLoader = this;
	var xmlHttp = this.fnCreateCORS("GET", szUrl);
	// var xmlHttp = this.fnCreateCORS();
	if (xmlHttp) {
		xmlHttp.responseType = 'arraybuffer';

		xmlHttp.ontimeout = function() {
			++selfLoader.nTimeoutCount;
			if (selfLoader.nTimeoutCount > 3) {
				// 返回超时错误
				var objData = {
					t: kUriDataError,
					r: EE_Err_Loader_Timeout
				};
				self.postMessage(objData);
			}
			--selfLoader.nIndexTs;
			selfLoader.bRequesting = false;
			console.log("ontimeout:" + selfLoader.nIndexTs);
		}
		
		function onerror(){
			++selfLoader.nTimeoutCount;
			if (selfLoader.nTimeoutCount > 3) {
				// 返回超时错误
				var objData = {
					t: kUriDataError,
					r: EE_Err_Loader_Timeout
				};
				self.postMessage(objData);
			}
			
			if(selfLoader.nIndexTs > 0){
				if(szUrl.find(selfLoader.listTs[selfLoader.nIndexTs])){
					
				}
				else{
					--selfLoader.nIndexTs;
				}
			}
			
			selfLoader.bRequesting = false;
			console.log("onerror:" + selfLoader.nIndexTs);
		}
		// xmlHttp.addEventListener("error", onerror);

		xmlHttp.onreadystatechange = function() {
			if (xmlHttp.readyState === XMLHttpRequest.DONE) {
				if (xmlHttp.status === 200) {
					downloader.reportData(xmlHttp.response);
				} else {
					var objData = {
						t: kUriDataError,
						r: EE_Err_Loader_Net
					};
					self.postMessage(objData);
				}
				selfLoader.bRequesting = false;
			}
		}

		// xmlHttp.open("GET", szUrl, true);
		xmlHttp.responseType = "arraybuffer";
		this.bRequesting = true;
		xmlHttp.timeout = this.nTimeout;
		xmlHttp.send();
		this.szUrlTsLast = szUrl;
	}
	return EE_Loader_OK;
};

// LoaderHLS.prototype.fnRequestTs = function(url) {
// 	var pattHTTP = /^http/;
// 	var szUrl = url;
// 	if(!pattHTTP.test(url)){
// 		szUrl = this.szTsHeader + url;
// 	}
// 	var selfLoader = this;
// 	this.fetchController = new AbortController();
// 	const signal = this.fetchController.signal;
// 	fetch(szUrl, {
// 		// signal,
// 		mode: 'no-cors',
// 	}).then(async function respond(response) {
// 		const reader = response.body.getReader();
// 		reader.read().then(function processData({
// 			done,
// 			value
// 		}) {
// 			if (done) {
// 				selfLoader.bRequesting = false;
// 				return;
// 			}

// 			// if (self.playerState != playerStatePlaying) {
// 			// 	return;
// 			// }

// 			selfLoader.tTimeOutCheck = Date.now() + selfLoader.tTimeOutSet;
// 			var data = value.buffer;
// 			downloader.reportData(data);
// 			var dataLength = value.byteLength;

// 			return reader.read().then(processData);
// 		});
// 	}).catch(err => {
// 		if (selfLoader.fnCallBackParent_Msg) {
// 			var objData = {
// 				t:kDownLoaderError,
// 				u:0,
// 				d:"on Ts"
// 			};
// 			selfLoader.fnCallBackParent_Msg(objData);
// 		}
// 		selfLoader.bRequesting = false;
// 	});

// 	this.bRequesting = true;
// 	this.szUrlTsLast = szUrl;
// 	return EE_Loader_OK;
// }

LoaderHLS.prototype.fnRequest = function(url, type) {
	if (url == null) {
		return Error_Loader_Param;
	}

	if (this.bRequesting) {
		return Error_Loader_Busy;
	}

	var selfLoader = this;
	switch (type) {
		case HLS_URL_TYPE_HLS:
			return selfLoader.fnRequestM3u8(url);
			break;
		case HLS_URL_TYPE_TS:
			return selfLoader.fnRequestTs(url);
			break;
		default:
			break;
	}
	return Error_Loader_Param;
};

LoaderHLS.prototype.fnInit = function(url, isStream, timeout) {
	if (url == null) {
		return Error_Loader_Param;
	}

	this.bIsStream = isStream;
	this.szUrlMain = url.substring(0, url.lastIndexOf("/") + 1);
	this.szUrlHls = url;
	this.nTimeout = timeout || g_nTimeout_Default;
	this.bFirstTime = true;
	return EE_Loader_OK;
};

LoaderHLS.prototype.fnStart = function() {
	this.fnStartTimer();
	this.nLastRecvTime = Date.now();
};

LoaderHLS.prototype.fnPause = function() {
	this.fnStopTimer();
};

LoaderHLS.prototype.fnDestory = function() {
	this.fnStopTimer();

	this.szUrlMain = null; //主url
	this.szUrlHls = null;
	this.listM3u8 = null; //m3u8列表
	this.listTs = null; //ts列表

	this.fDurationSecs = 0.0;

	if (this.fetchController) {
		this.fetchController.abort();
		this.fetchController = null;
	}
	this.FetchHttp = null;

	if (this.XmlHttp) {
		this.XmlHttp.abort();
		this.XmlHttp = null;
	}
	this.nUrlType = HLS_URL_TYPE_HLS;
	this.bRequesting = false;

	this.nTimeout = g_nTimeout_Default;
	this.nTimeoutCount = 0;

	this.nIntervalRequest = g_nInterval_Default;
};

LoaderHLS.prototype.fnJumpTime = function (info) {
	var loader = this;
	
	let index = 0;
	let nTime = info.index;
	let proto = index.streamType;
	//按类型处理（m3u8/flv）
	if(kProtoType_HTTP_M3U8 == proto){ //m3u8
		let sunTime = 0;
		// 采用ts分片index逻辑（放弃）
		index = loader.listTs.findIndex((item) => {
			sunTime += item.d;
			return sunTime > nTime;
		});
		console.log("=======时间跳转==ts==序号====",index)
	}else if(kProtoType_HTTP == proto){//flv
		//采用seekFormBegin逻辑
		index = 0; //默认从0开始
	}
	
	loader.bIsStream = false; //回放
	loader.nIndexTs = index;

	loader.fnStartTimer();
}