
function LoaderHTTP() {
	this.m_szUrl = null;
	this.m_nSeq = 0;
	this.m_bIsStream = true;
	
	this.m_pFetchCtl = null;

	this.m_nTimeout = g_nTimeout_Default;
	this.m_nTimeoutCount = 0;
	
	this.m_nChunkSize = g_nChunkSize_Default;
	
	this.m_bRun = false;
	this.m_pLogger = new Logger("LoaderHTTP");
};

LoaderHTTP.prototype.fnInit = function(url, isStream, seq, timeout) {
	if (url == null) {
		return Error_Loader_Param;
	}
	
	if (this.m_pFetchCtl) {
		this.m_pFetchCtl.abort();
		this.m_pFetchCtl = null;
	}
	
	this.m_bIsStream = isStream;
	this.m_szUrl = url;
	this.m_nSeq = seq;
	this.m_nTimeout = timeout || g_nTimeout_Default;
	return EE_Loader_OK;
}

LoaderHTTP.prototype.fnStart = function() {
	var selfLoader = this;
	this.m_pFetchCtl = new AbortController();
	var signal = this.m_pFetchCtl.signal;
	signal.onabort = function(){
		selfLoader.m_pFetchCtl = null;
	}
	
	fetch(this.m_szUrl, {
		signal,
		mode: 'cors'
		//headers:{'Range':'bytes=0-'},
	}).then(async function respond(response) {
		const reader = response.body.getReader();
		reader.read().then(function fnProcessData({
			done,
			value
		}) {
			if (done) {
				selfLoader.m_pFetchCtl = null;
				selfLoader.m_pLogger.logInfo("Stream done.");
				var objData = {
					t: kUriDataFinished
				};
				self.postMessage(objData);
				selfLoader.m_bRun = false;
				return;
			}
	
			if (!selfLoader.m_bRun) {
				return;
			}
	
			var dataLen = value.byteLength;
			//this.logger.logInfo(new Date() + " requestStream len=" + dataLen);
			var offset = 0;
			if (dataLen > selfLoader.m_nChunkSize) {
				do {
					let len = Math.min(selfLoader.m_nChunkSize, dataLen);
					var data = value.buffer.slice(offset, offset + len);
					dataLen -= len;
					offset += len;
					var objData = {
						t: kUriData,
						d: data,
						q: selfLoader.m_nSeq,
					};
					self.postMessage(objData, [objData.d]);
				} while (dataLen > 0)
			} else {
				var objData = {
					t: kUriData,
					d: value.buffer,
					q: selfLoader.m_nSeq,
				};
				self.postMessage(objData, [objData.d]);
			}
			return reader.read().then(fnProcessData);
		});
	}).catch(err => {
		selfLoader.m_pLogger.logInfo("Stream error.");
		var objData = {
			t: kUriDataError
		};
		self.postMessage(objData);
		selfLoader.m_bRun = false;
		selfLoader.m_pFetchCtl = null;
	});
	
	this.m_bRun = true;
}

LoaderHTTP.prototype.fnPause = function() {
	var selfLoader = this;
	if (selfLoader.m_pFetchCtl) {
		selfLoader.m_pFetchCtl.abort();
		selfLoader.m_pFetchCtl = null;
	}
	this.m_bRun = false;
	this.m_pLogger.logInfo("Pause.");
}

LoaderHTTP.prototype.fnDestory = function() {
	this.fnPause();
	this.m_pLogger.logInfo("Destory.");
}