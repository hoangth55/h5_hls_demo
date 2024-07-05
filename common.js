// Protocol type
const kProtoType_NONE = -99;
const kProtoType_RTSP = 0;
const kProtoType_WS = 1;
const kProtoType_HTTP = 2;
const kProtoType_HTTP_M3U8 = 3;

// Stream type
const STREAM_TYPE_NONE = -1;
const STREAM_TYPE_HLS = 0;
const STREAM_TYPE_FLV = 1;
const STREAM_TYPE_NALU = 2;


// //Player request.
// const kPlayVideoReq         = 0;
// const kPauseVideoReq        = 1;
// const kStopVideoReq         = 2;

// //Player response.
// const kPlayVideoRsp         = 0;
// const kAudioInfo            = 1;
// const kVideoInfo            = 2;
// const kAudioData            = 3;
// const kVideoData            = 4;

// player
const kReq_KFPT = 0;

//Downloader state
const kStateDownloading = 0;
const kStatePause = 1;
//Downloader request.
const kGetFileInfoReq = 0;
const kDownloadFileReq = 1;
const kReq_DownloadStart = 2;
const kReq_DownloadStop = 3;
const kReq_DownloadPause = 4;
const kReq_DownloadResume = 5;
//Downloader response.
const kGetFileInfoRsp = 0;
const kFileData = 1;
const kUriData = 2;
const kDownLoaderError = 3;
const kDownloadStartRsp = 4;
const kUriDataFinished = 5;
const kUriDataError = 6;
const kRsp_DownloadStart = 7;
const kRsp_DownloadStop = 8;
const kRsp_DownloadPause = 9;
const kRsp_DownloadResume = 10;
const kRsp_DurationChange = 11;
const kRsp_ProfileData = 12;
const kUriDataCors = 13;
const kRsp_DownloadChangeTime = 14;
const kRsp_FileTimeLength = 15;

//Decoder request.
const kReq_DecoderStart = 0;
const kReq_DecoderStop = 1;
const kReq_DecoderPause = 2;
const kReq_DecoderResume = 3;
const kReq_DecoderSeekTo = 4;
const kFeedData = 5;
const kDataFinished = 6;
const kReq_Profile = 7;
const kReq_Auth = 8;
const kReq_domain = 9;
const kReq_uuid = 10;
const kReq_DecoderRunning = 11;
const kReq_DecoderSkipTime = 12;
//Decoder response.
const kRsp_DecoderStart = 0;
const kRsp_DecoderStop = 1;
const kRsp_DecoderPause = 2;
const kRsp_DecoderResume = 3;
const kVideoFrame = 4;
const kAudioFrame = 5;
const kVideoInfo = 6;
const kAudioInfo = 7;
const kFinishedEvt = 8;
const kRequestDataEvt = 9;
const kRsp_DecoderSeekTo = 10;
const kDecoderDataFull = 11;
const kDecoderDataMore = 12;
const kWriteFrame = 13;
const kAuthErr = 14;
const kVersion = 15;
const kReauth = 16;

//Loader
const EE_Loader_OK = 0;
const EE_Err_Loader_Param = -1;
const EE_Err_Loader_Busy = -2;
const EE_Err_Loader_Timeout = -3;
const EE_Err_Loader_Net = -4;

const HLS_URL_TYPE_HLS = 0;
const HLS_URL_TYPE_TS = 1;
// const HLS_URL_TYPE_MAIN = 0;
// const HLS_URL_TYPE_SUBMAIN = 1;
// const HLS_URL_TYPE_TS = 2;

// callback Type
const CallBack_Error = 0;
const CallBack_Loading = 1;
const CallBack_Stop = 2;
const CallBack_Pause = 3;
const CallBack_Playing = 4;
const CallBack_Finished = 5;
const CallBack_DurationChange = 6; //资源时长已改变
const CallBack_ProgressChange = 7; //进度条已改变
const CallBack_AiInfo = 8; // AI信息
const CallBack_Cors = 9;//回调key--资源跨域

const CallBack_Note = ["Error", "Loading", "Stop", "Pause", "Playing", "Finished", "Duration Change", "Progress Change"];
const Loading_Note = ["End", "Begin"];

const ProfileKey_Note = ["uuid", "appkey", "appsecret", "movedcard","signature","timeMillis"];
const AuthKey_Note = "auth";
const AuthURL_Note = "https://api.jftechws.com/aops/oppf-aops/userWebPlayer/auth";
const AuthRate_Default = 30000
const AuthRate_Error = 5000
const AuthRate_time = 5000

// Error List
const Error_Common = 0;
const Error_Player_Loading = 1;
const Error_Player_MAX = 99;
const Error_Decoder_Init = 100;
const Error_Decoder_Open = 101;
const Error_Decoder_VideoInfo = 102;
const Error_Decoder_AudioInfo = 103;
const Error_Decoder_Auth = 104;
const Error_Decoder_MAX = 199;
const Error_DownLoader_FileInfo = 200;
const Error_Url_CORS = 201;

// True && False
const TRUE_XM = 1;
const FALSE_XM = 0;

//Decoder states.
const decoderStateIdle = 0;
const decoderStateInitializing = 1;
const decoderStateReady = 2;
const decoderStateFinished = 3;

const emState_Idle = 0;
// const emState_Initialized = 1;
const emState_Pausing = 2;
const emState_Running = 3;
const emState_Finished = 4;
const emState_Resume = 5;

//Player states.
const emPlayerState_Idle = 0;
const emPlayerState_Playing = 1;
const emPlayerState_Pausing = 2;

//Constant.
const downloadSpeedByteRateCoef = 2.0;

const g_nTimeoutCount_Max = 3;
const g_nTimeout_Default = 10000;
const g_nInterval_Default = 500;
const g_nIntervalDec_Default = 20;
const g_nBufferDuration_Default = 4000;
const g_nChunkSize_Default = 65536;
const g_nSpeed_Default = 1.0;
const g_nLogLv_Default = 0;

const g_nDateStr_Default = "1970-01-01 00:00:00" //默认日期

// Player Buffer
const g_nLeftShiftBits_Default = 2; // 左移2位 *4
const g_nRightShiftBits_Default = 8; // 右移8位 /256
const g_nMilliSecsOfBuff_Set = 2000; // 缓冲设置时间2秒
const g_nMilliSecsOfBuff_Min_Default = 50; // 最小缓冲时间0.05秒
const g_nMilliSecsOfBuff_Max_Default = 60000; // 最大缓冲时间60秒

const g_nLogLv_None = 0;
const g_nLogLv_Error = 10;
const g_nLogLv_Info = 20;
const g_nLogLv_Debug = 30;
const g_nLogLv_All = 40;

const g_szLicence = "";

const MAX_BUFFER_SIZE = 50 * 1024 * 1024; // 50MB，具体值根据实际需要调整

function Logger(module) {
	this.module = module;
	this.level = g_nLogLv_All;
}

Logger.prototype.setLevel = function(lev){
	if(lev > g_nLogLv_All)
	{
		this.level = g_nLogLv_All;
	}
	else if(lev < g_nLogLv_None)
	{
		this.level = g_nLogLv_None;
	}
}

Logger.prototype.log = function(line) {
	if(this.level < g_nLogLv_All)
	{
		return;
	}
	
	console.log("[" + this.currentTimeStr() + "][" + this.module + "]" + line);
}

Logger.prototype.logError = function(line) {
	if(this.level < g_nLogLv_Error)
	{
		return;
	}
	
	console.log("[" + this.currentTimeStr() + "][" + this.module + "][ER] " + line);
}

Logger.prototype.logInfo = function(line) {
	if(this.level < g_nLogLv_Info)
	{
		return;
	}
	
	console.log("[" + this.currentTimeStr() + "][" + this.module + "][IF] " + line);
}

Logger.prototype.logDebug = function(line) {
	if(this.level < g_nLogLv_Debug)
	{
		return;
	}
	
	console.log("[" + this.currentTimeStr() + "][" + this.module + "][DT] " + line);
}

Logger.prototype.currentTimeStr = function() {
	var now = new Date(Date.now());
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	var hour = now.getHours();
	var min = now.getMinutes();
	var sec = now.getSeconds();
	var ms = now.getMilliseconds();
	return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec + ":" + ms;
}
