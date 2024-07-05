// HTTP加载器对象
function LoaderHTTP() {
    this.m_szUrl = null;          // URL信息
    this.m_nSeq = 0;              // 加载序号
    this.m_bIsStream = true;      // 流类型（直播、回放）

    this.m_pFetchCtl = null;      // Fetch控制器

    this.m_nTimeout = g_nTimeout_Default;    // 超时时间（默认周期）
    this.m_nTimeoutCount = 0;                 // 超时计数

    this.m_nChunkSize = g_nChunkSize_Default; // 数据块大小

    this.m_bRun = false;           // 执行状态
    this.m_pLogger = new Logger("LoaderHTTP"); // 日志记录器
}

// 初始化加载器
LoaderHTTP.prototype.fnInit = function(url, isStream, seq, timeout) {
    if (url == null) {
        return Error_Loader_Param; // 参数错误
    }

    if (this.m_pFetchCtl) {
        this.m_pFetchCtl.abort(); // 如果存在Fetch控制器，则终止
        this.m_pFetchCtl = null;
    }

    this.m_bIsStream = isStream;
    this.m_szUrl = url;
    this.m_nSeq = seq;
    this.m_nTimeout = timeout || g_nTimeout_Default; // 设置超时时间，默认为全局设置

    return EE_Loader_OK; // 返回加载器OK状态
};

// 开始加载数据
LoaderHTTP.prototype.fnStart = function() {
    var selfLoader = this;
    this.m_pFetchCtl = new AbortController(); // 创建AbortController来控制Fetch

    var signal = this.m_pFetchCtl.signal;
    signal.onabort = function() {
        selfLoader.m_pFetchCtl = null; // 终止后置空Fetch控制器
    };

    // 发起Fetch请求
    fetch(this.m_szUrl, {
        signal,
        mode: 'cors' // 使用CORS模式
    }).then(async function respond(response) {
        const reader = response.body.getReader(); // 获取响应体的Reader对象

        reader.read().then(function fnProcessData({ done, value }) {
            if (done) {
                selfLoader.m_pFetchCtl = null; // 数据传输完成后置空Fetch控制器
                selfLoader.m_pLogger.logInfo("Stream done."); // 记录日志

                var objData = {
                    t: kUriDataFinished // 发送数据完成消息
                };
                self.postMessage(objData); // 发送消息给主线程
                selfLoader.m_bRun = false; // 停止运行状态
                return;
            }

            if (!selfLoader.m_bRun) {
                return; // 如果已暂停，则不处理数据
            }

            var dataLen = value.byteLength;
            var offset = 0;

            // 按块发送数据
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
                    self.postMessage(objData, [objData.d]); // 发送数据消息给主线程
                } while (dataLen > 0);
            } else {
                var objData = {
                    t: kUriData,
                    d: value.buffer,
                    q: selfLoader.m_nSeq,
                };
                self.postMessage(objData, [objData.d]); // 发送数据消息给主线程
            }

            return reader.read().then(fnProcessData); // 继续读取数据
        }).catch(function handleException(error) {
            if (error.name === 'AbortError') {
                selfLoader.m_pLogger.logInfo("Fetch aborted."); // 记录Fetch终止日志
            } else {
                selfLoader.m_pLogger.logError("Fetch read error:", error); // 记录其他Fetch读取错误
                var objData = {
                    t: kUriDataError // 发送数据错误消息
                };
                self.postMessage(objData); // 发送消息给主线程
                selfLoader.m_bRun = false; // 停止运行状态
                selfLoader.m_pFetchCtl = null; // 置空Fetch控制器
            }
        });
    }).catch(err => {
        selfLoader.m_pLogger.logInfo("Fetch error:", err); // 记录Fetch请求错误
        var objData = {
            t: kUriDataError // 发送数据错误消息
        };
        self.postMessage(objData); // 发送消息给主线程
        selfLoader.m_bRun = false; // 停止运行状态
        selfLoader.m_pFetchCtl = null; // 置空Fetch控制器
    });

    this.m_bRun = true; // 设置运行状态为true
};

// 暂停加载数据
LoaderHTTP.prototype.fnPause = function() {
    var selfLoader = this;
    if (selfLoader.m_pFetchCtl) {
        selfLoader.m_pFetchCtl.abort(); // 终止Fetch请求
        selfLoader.m_pFetchCtl = null;
    }
    this.m_bRun = false; // 设置运行状态为false
    this.m_pLogger.logInfo("Pause."); // 记录日志，暂停状态
};

// 销毁加载器
LoaderHTTP.prototype.fnDestory = function() {
    this.fnPause(); // 先暂停加载器
    this.m_pLogger.logInfo("Destroy."); // 记录日志，销毁状态
};
