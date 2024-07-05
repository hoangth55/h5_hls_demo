// document.write('<script src="common.js" charset="utf-8"></script>');
self.importScripts("common.js");
self.importScripts("loader-hls.js");
self.importScripts("loader-http.js");

function Downloader() {
	this.loader = null;
	this.seq = 0;
	this.state = kStatePause;
    this.logger = new Logger("Downloader");
	this.bInit = 0;
	this.timerRequest = null;
}

Downloader.prototype.appendBuffer = function (buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
};

Downloader.prototype.reportMsg = function (msg) {
    self.postMessage(msg);
};

Downloader.prototype.reportData = function (value) {
	var dataLength = value.byteLength;
	//this.logger.logInfo(new Date() + " requestStream len=" + dataLength);
	var offset = 0;
	if (dataLength > 4096) {
		do {
			let len = Math.min(4096, dataLength);
			var data = value.slice(offset, offset + len);
			dataLength -= len;
			offset += len;
			var objData = {
				t: kUriData,
				d: data,
				q: this.seq
			};
			self.postMessage(objData, [objData.d]);
		} while (dataLength > 0)
	} else {
		var objData = {
			t: kUriData,
			d: value,
			q: this.seq
		};
		self.postMessage(objData, [objData.d]);
	}
};

Downloader.prototype.fnInit_DL = function (proto, url, isStream, seq, uuid) {
	this.seq = seq;
	if (this.loader) {
		this.loader.fnDestory();
		this.loader = null;
	}
	let _this = this;
	fetch('./profile.ini').then((response) => {
		response.text().then((text) => {
			// var objRet = {
			// 	t: kRsp_ProfileData,
			// 	data: JSON.parse(text)
			// };
			// self.postMessage(objRet);
			_this.m_szLic = text;
		});
	});
	
    switch (proto) {
        case kProtoType_HTTP_M3U8:
			this.loader = new LoaderHLS();
			this.loader.fnInit(url, isStream, g_nTimeout_Default);
			this.loader.fnStart();
			this.state = kStateDownloading;
			// this.state = kStatePause;
			// this.start();
            break;
		case kProtoType_HTTP:
			this.loader = new LoaderHTTP();
			this.loader.fnInit(url, isStream, seq, g_nTimeout_Default);
			this.state = kStatePause;
			this.loader.fnStart();
			this.state = kStateDownloading;
			break;
        default:
            this.logger.logError("Invalid protocol " + proto);
            break;
    }
	
	var objRet = {
		t: kRsp_DownloadStart,
		e: 0,
		q: self.downloader.seq,
		u: uuid
	};
	self.postMessage(objRet);
}

Downloader.prototype.start = function () {
	if(this.loader == null){
		return -1;
	}
	
	// this.startTimer();
	this.state = kStateDownloading;
}

Downloader.prototype.stop = function () {
	if(this.loader != null){
		this.loader.fnDestory();
		this.loader = null;
		this.state = kStatePause;
	}
	var objRet = {
		t: kRsp_DownloadStop,
		e: 0,
		q: this.seq
	};
	self.postMessage(objRet);
}

Downloader.prototype.pause = function () {
	if(this.loader != null){
		this.loader.fnPause();
		this.state = kStatePause;
	}
	var objRet = {
		t: kRsp_DownloadPause,
		e: 0,
		q: this.seq
	};
	self.postMessage(objRet);
}

Downloader.prototype.resume = function () {
	if(this.loader != null){
		this.loader.fnStart();
		this.state = kStateDownloading;
	}
	var objRet = {
		t: kRsp_DownloadResume,
		e: 0,
		q: this.seq
	};
	self.postMessage(objRet);
}

// Downloader.prototype.startTimer = function() {
// 	var downloader = this;
// 	this.timerRequest = setInterval(function() {
// 		downloader.loader.fnOnRequest();
// 	}, 200);
// };

// Downloader.prototype.stopTimer = function() {
// 	if (this.timerRequest != null) {
// 		clearInterval(this.timerRequest);
// 		this.timerRequest = null;
// 	}
// };

Downloader.prototype.skipTime = function(info){
	if (this.loader != null) {
		this.loader.fnJumpTime(info)
	}
	let objRet={
		t: kRsp_DownloadChangeTime, 
		s: info.index,
		e:0,
		q:this.seq
	}
	self.postMessage(objRet); 
}

self.downloader = new Downloader();

self.onmessage = function (evt) {
	let _this = this;
	//console.log("----5-----"+new Date());
    if (!self.downloader) {
        console.log("[ER] Downloader not initialized!");
		var objRet = {
			t: kRsp_DownloadStart,
			e: -1
		};
		self.postMessage(objRet);
        return;
    }

    var objData = evt.data;
    switch (objData.t) {
        case kReq_DownloadStart:{
			self.downloader.fnInit_DL(objData.p, objData.u, objData.i, objData.q, objData.k);
		}break;
        case kReq_DownloadStop:{
			self.downloader.stop();
		}break;
        case kReq_DownloadPause:{
			self.downloader.pause();
		}break;
        case kReq_DownloadResume:{
			self.downloader.resume();
		}break;
		case kReq_DecoderSkipTime: { 
			self.downloader.skipTime(objData); 
		} break;
        default:
            self.downloader.logger.logError("Unsupport messsage " + objData.t);
    }
};
