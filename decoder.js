self.Module = {
	onRuntimeInitialized: function() {
		onWasmLoaded();
	}
};

if(self.importScripts != undefined){
	self.importScripts("common.js");
	self.importScripts("libwasm.js");
	
}

function Decoder() {
	this.logger = new Logger("Decoder");
	this.coreLogLevel = g_nLogLv_Default;
	this.accurateSeek = true;
	this.wasmLoaded = false;
	this.tmpReqQue = [];
	this.cacheBuffer = null;
	this.decodeTimer = null;
	this.videoCallback = null;
	this.audioCallback = null;
	this.requestCallback = null;
	this.decodeInfoCallback = null;
	this.intervalDec = g_nIntervalDec_Default;
	this.m_tDataFullSendNext = Date.now();
	this.m_tDataMoreSendNext = Date.now();
	this.m_bDataFinished = false;
};

Decoder.prototype.startDecoder = function(chunkSize, type, interval, logLv, uuid, media) {
	if(!uuid){
		return;
	}
	this.coreLogLevel = logLv || g_nLogLv_Default;
	var arrUuid = intArrayFromString(uuid).concat(0);
	var bufUuid = Module._malloc(arrUuid.length);
	Module.HEAPU8.set(arrUuid, bufUuid);
	var arrMedia = intArrayFromString(media).concat(0);
	var bufMedia = Module._malloc(arrMedia.length);
	Module.HEAPU8.set(arrMedia, bufMedia);
	var ret = Module._fnInitDecoder(this.coreLogLevel, type, this.videoCallback, this.audioCallback, this.requestCallback,
		this.decodeInfoCallback, bufUuid, arrUuid.length, bufMedia, arrMedia.length);
	if (0 == ret) {
		if (null == this.cacheBuffer) {
			this.cacheBuffer = Module._malloc(chunkSize);
		}
		this.intervalDec = interval || g_nIntervalDec_Default;
		this.startDecoding(this.intervalDec);
		this.m_bDataFinished = false;
	}
	
	Module._free(bufUuid);
	Module._free(bufMedia);
	var objData = {
		t: kRsp_DecoderStart,
		e: ret
	};
	self.postMessage(objData);
	
	// var uuid="65de95ade236f53f04090024";
	// this.seedKeyData(0, uuid);
	// var lic="A07K7Pwz6I6d8sYgMlp57gTpC:KtQhconz2MHRUchDneDgm05gdLWVy3vgzxpKzlLFjXFFDoPgdRiqqRqWYEjokprcQddeIwtMdi3SnK6olB3JKiP5GRSYnLTno0plW3UuUvGYU0DQz6CUdOP.3KdsDPqwSb==";
	// this.seedKeyData(1, lic);
};

Decoder.prototype.uninitDecoder = function() {
	var ret = Module._fnUninitDecoder();
	this.logger.logInfo("Uninit ffmpeg decoder return " + ret + ".");
	if (this.cacheBuffer != null) {
		Module._free(this.cacheBuffer);
		this.cacheBuffer = null;
	}
};

Decoder.prototype.stopDecoder = function() {
	this.logger.logInfo("closeDecoder.");
	this.uninitDecoder();

	if (this.decodeTimer) {
		clearInterval(this.decodeTimer);
		this.decodeTimer = null;
		this.logger.logInfo("Decode timer stopped.");
	}
	// this.logger.logInfo("Close ffmpeg decoder return " + ret + ".");

	var objData = {
		t: kRsp_DecoderStop,
		e: 0
	};
	self.postMessage(objData);
};

Decoder.prototype.startDecoding = function(interval) {
	//this.logger.logInfo("Start decoding.");
	if (this.decodeTimer) {
		clearInterval(this.decodeTimer);
	}
	//console.log("---4----" + interval);
	this.decodeTimer = setInterval(this.decode, interval);
	var objData = {
		t: kRsp_DecoderResume,
		e: 0
	};
	self.postMessage(objData);
};

Decoder.prototype.pauseDecoding = function() {
	//this.logger.logInfo("Pause decoding.");
	if (this.decodeTimer) {
		clearInterval(this.decodeTimer);
		this.decodeTimer = null;
	}
	var objData = {
		t: kRsp_DecoderPause,
		e: 0
	};
	self.postMessage(objData);
};

Decoder.prototype.decode = function() {
	var nCount = 0;
	while (nCount++ < 5) {
		var ret = Module._fnDecoderOnePacket();
		if (ret == -107) {
			self.decoder.logger.logInfo("Decoder finished.");
			self.decoder.pauseDecoding();
			var objData = {
				t: kFinishedEvt,
			};
			self.postMessage(objData);
			return;
		}

		while (ret == -109) {
			//self.decoder.logger.logInfo("One old frame");
			ret = Module._fnDecodeOnePacket();
		}

		var nDuration = Module._fnGetDurationOfPktList();
		// self.decoder.logger.logInfo("_fnDecoderOnePacket nDuration= " + nDuration);
		if (nDuration < 2000 && self.decoder.m_tDataMoreSendNext < Date.now()) {
			if (self.decoder.m_bDataFinished && nDuration <= 0) {
				self.decoder.logger.logInfo("Decoder finished.");
				self.decoder.pauseDecoding();
				var objData = {
					t: kFinishedEvt,
				};
				self.postMessage(objData);
			} else {
				self.postMessage({
					t: kDecoderDataMore
				});
				self.decoder.m_tDataMoreSendNext = Date.now() + 1000;
			}
		}
	}
};

Decoder.prototype.sendData = function(data) {
	var typedArray = new Uint8Array(data);
	//console.log(typedArray);
	Module.HEAPU8.set(typedArray, this.cacheBuffer);
	var nRet = Module._fnSendData(2, this.cacheBuffer, typedArray.length);
	if (0 > nRet) {
		if(-112 == nRet){
			var objData = {
				t: kReauth,
			};
			self.postMessage(objData);
		}else{
			if (-111 == nRet) {
				self.decoder.logger.logError("Error of your authorization, please contact us and get a new one.");
				var objData = {
					t: kAuthErr,
				};
				self.postMessage(objData);
			}else {
				self.decoder.logger.logError("Decoder sendData Error.");
			}
			self.decoder.pauseDecoding();
			var objData = {
				t: kFinishedEvt,
			};
			self.postMessage(objData);
			return;
		}
	}
	
	var nDuration = Module._fnGetDurationOfPktList();
	if (nDuration > 30000 && this.m_tDataFullSendNext < Date.now()) {
		var objData = {
			t: kDecoderDataFull,
		};
		self.postMessage(objData);
		this.m_tDataFullSendNext = Date.now() + 2000;
	}
};

Decoder.prototype.seedKeyData = function(key, data) {
	if(!data){
		return;
	}
	var tmp = intArrayFromString(data).concat(0);
	var bufHeap = Module._malloc(tmp.length + 1);
	Module.HEAPU8.set(tmp, bufHeap);
	Module._fnSendData(key, bufHeap, tmp.length);
	Module._free(bufHeap);
};

Decoder.prototype.seekTo = function(ms) {
	var accurateSeek = this.accurateSeek ? 1 : 0;
	var ret = Module._seekTo(ms, accurateSeek);
	var objData = {
		t: kRsp_DecoderSeekTo,
		r: ret
	};
	self.postMessage(objData);
};

Decoder.prototype.processReq = function(req) {
	//this.logger.logInfo("processReq " + req.t + ".");
	switch (req.t) {
		case kReq_DecoderStart:
			this.startDecoder(req.c, req.i, req.v, req.l, req.k, req.u);
			break;
		case kReq_DecoderStop:
			this.stopDecoder();
			break;
		case kReq_DecoderResume:
			this.startDecoding(req.i);
			break;
		case kReq_DecoderPause:
			this.pauseDecoding();
			break;
		case kFeedData:
			this.sendData(req.d);
			break;
		case kReq_DecoderSeekTo:
			this.seekTo(req.ms);
			break;
		case kDataFinished:
			this.m_bDataFinished = true;
			break;
		case kRsp_DownloadStart:
			this.seedKeyData(0, req.u);
			break;
		case kReq_Auth:
			this.seedKeyData(1, req.a);
			break;
		case kReq_Profile:
			this.seedKeyData(0, req.u);
			break;
		case kReq_domain:
			this.seedKeyData(0, req.u);
			break;	
		case kReq_uuid:
			this.seedKeyData(0, req.u);
			break;
		default:
			this.logger.logError("Unsupport messsage " + req.t);
	}
};

Decoder.prototype.cacheReq = function(req) {
	if (req) {
		this.tmpReqQue.push(req);
	}
};

Decoder.prototype.onWasmLoaded = function() {
	this.logger.logInfo("Wasm loaded.");
	this.wasmLoaded = true;
	
	this.getVersion();
	
	/*
	var addr = self.getCurrPageAddr1();
	const addrLen = lengthBytesUTF8(addr) + 1;
	const addrPtr = Module._malloc(addrLen);
	stringToUTF8(addr, addrPtr, addrLen);
	Module.ccall('getCurrPageAddr', null, ['string'], [addrPtr]);
	Module._free(addrPtr);
	*/
	

	this.videoCallback = Module.addFunction(function(buff, size, timestamp, width, height, yLen, uvLen) {
		/*width = 1920;
		height = 1080;
		yLen = 2073600;
		uvLen = 518400;*/
		//console.log("videoCallback timestamp=" + timestamp);
		//console.log("videoCallback11" + " width:" + width + " height:" + height + " yLen:" + yLen + " uvLen:" + uvLen);
		var outArray = Module.HEAPU8.subarray(buff, buff + size);
		var data = new Uint8Array(outArray);
		var objData = {
			t: kVideoFrame,
			s: timestamp,
			d: data,
			w: width,
			h: height,
			y: yLen,
			u: uvLen
		};

		//console.log("videoCallback" + " width:" + width + " height:" + height + " yLen:" + yLen + " uvLen:" + uvLen);
		self.postMessage(objData, [objData.d.buffer]);
	}, 'viiiiiii');

	this.audioCallback = Module.addFunction(function(buff, size, timestamp) {
		var outArray = Module.HEAPU8.subarray(buff, buff + size);
		var data = new Uint8Array(outArray);
		var objData = {
			t: kAudioFrame,
			s: timestamp,
			d: data
		};

		self.postMessage(objData, [objData.d.buffer]);
	}, 'viii');

	this.requestCallback = Module.addFunction(function(offset, availble) {
		var objData = {
			t: kRequestDataEvt,
			o: offset,
			a: availble
		};
		self.postMessage(objData);
	}, 'vii');

	this.decodeInfoCallback = Module.addFunction(function(type, buff, size) {
		switch (type) {
			case 1: //videoInfo
				{
					if (size < 4) {
						break;
					}

					var paramIntBuff = buff >> 2;
					var paramArray = Module.HEAP32.subarray(paramIntBuff, paramIntBuff + size);
					var duration = paramArray[0];
					var videoPixFmt = paramArray[1];
					var videoWidth = paramArray[2];
					var videoHeight = paramArray[3];
					/*var duration = 0;
					var videoPixFmt = 0;
					var videoWidth = 1920;
					var videoHeight = 1080;*/
					var objData = {
						t: kVideoInfo,
						e: 0,
						v: {
							d: duration,
							p: videoPixFmt,
							w: videoWidth,
							h: videoHeight
						}
					};

					self.postMessage(objData);
				}
				break;
			case 2: //audioInfo
				{
					if (size < 4) {
						break;
					}
					var paramIntBuff = buff >> 2;
					var paramArray = Module.HEAP32.subarray(paramIntBuff, paramIntBuff + size);
					var audioSampleFmt = paramArray[1];
					var audioChannels = paramArray[2];
					var audioSampleRate = paramArray[3];
					var hasAudio = paramArray[0];
					var objData = {
						t: kAudioInfo,
						e: 0,
						a: {
							f: audioSampleFmt,
							c: audioChannels,
							r: audioSampleRate,
							s: hasAudio
						}
					};

					self.postMessage(objData);
				}
				break;
			case 3:
				{
					if (self.fileWrite) {

					} else {
						// self.fileWriter = new ActiveXObject("ADODB.Stream");

					}
					if (size > 0) {

						var outArray = Module.HEAPU8.subarray(buff, buff + size);
						var data = new Uint8Array(outArray);
						var objData = {
							t: kWriteFrame,
							d: data,
							l: size
						};
						self.postMessage(objData, [objData.d.buffer]);

						// var content = "这是直接使用HTML5进行导出的";
						// var blob = new Blob([content], {
						// 	type: "text/plain;charset=utf-8"
						// });
						// saveAs(blob, "file/file.txt"); //saveAs(blob,filename)

						// var outArray = Module.HEAPU8.subarray(buff, buff + size);
						// var data = new Uint8Array(outArray);
						// var blob = new Blob([data], {
						// 	type:"text/plain;charset=utf-8"
						// });
						// saveAs(blob, "file/file.txt");
					} else {
						var objData = {
							t: kWriteFrame,
							l: 0
						};
						self.postMessage(objData);
					}
				}
				break;
			case -1:
				{
					var objData = {
						t: kRsp_DecoderStart,
						e: -1
					};
					self.postMessage(objData);
				}
				break;
		}
	}, 'viii');

	while (this.tmpReqQue.length > 0) {
		var req = this.tmpReqQue.shift();
		this.processReq(req);
	}
};

self.decoder = new Decoder;

//获取版本
Decoder.prototype.getVersion = function() {
	var szTmp128 = Module._malloc(128);
	try {
	    var nRet = Module._fnGetVersion(szTmp128, 128);
	    // 处理响应
		var array = Module.HEAPU8.subarray(szTmp128, szTmp128 + nRet);
		var version = "";
		for(var i=0;i<nRet;++i)
		{
			version += String.fromCharCode(array[i]);
		}
		Module._free(szTmp128);
		var objData = {
			t: kVersion,
			v: version
		};
		// console.log("=====向主线程发送消息==decoder==获取版本=========")
		self.postMessage(objData);
	} finally {
	    Module._free(szTmp128);
	}

};

self.onmessage = function(evt) {
	//console.log("----6----" + new Date());
	if (!self.decoder) {
		console.log("[ER] Decoder not initialized!");
		return;
	}

	var req = evt.data;
	if (!self.decoder.wasmLoaded) {
		self.decoder.cacheReq = function(req) {
			// 如果缓存超过限制，清理旧请求
			if (this.tmpReqQue.length > MAX_CACHE_SIZE) {
				this.tmpReqQue.shift(); // 移除最旧的请求
			}
			this.tmpReqQue.push(req);
		};

		self.decoder.logger.logInfo("Temp cache req " + req.t + ".");
		return;
	}

	self.decoder.processReq(req);
};

function onWasmLoaded() {
	if (self.decoder) {
		self.decoder.onWasmLoaded();
	} else {
		console.log("[ER] No decoder!");
	}
}
