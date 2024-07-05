#ifndef _DECODER_MNG_H_
#define _DECODER_MNG_H_

#include "decoderComm.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum _ENUM_STREAM_TYPE
{
	STREAM_TYPE_NONE = -1,
	STREAM_TYPE_HLS = 0,
	STREAM_TYPE_FLV,
	STREAM_TYPE_NALU
}ENUM_STREAM_TYPE;

struct _ST_DecoderMng;
typedef struct _ST_DecoderFuncs
{
	int n32PrivData;
	int (*fnDealStreamData)(struct _ST_DecoderMng* decoderMng, uint8_t* buff, int size);
	int (*fnInit)(void** decoder);
	int (*fnUninit)(void** decoder);
	int (*fnClose)(void** decoder);
	int (*fnDecodeOnePacket)(struct _ST_DecoderMng* decoderMng);
	ENUM_STREAM_TYPE enumStreamType;
}ST_DecoderFuncs;

typedef struct _ST_DecoderMng
{
	// Decoder infos
	void* pDecoder;
	ST_DecoderFuncs* pDecoderFuncs;
	
	// ffmpeg 解析结构
	AVCodecContext* pVideoCodecCtx;
	AVCodecContext* pAudioCodecCtx;
	
	AVRational avRationalVideo;
	int n32TicksPerFrame;
	
	// 回调函数
	VideoCallback fnCallbackVideo;
	AudioCallback fnCallbackAudio;
	RequestCallback fnCallbackRequest;
	DecodeInfoCallback fnCallbackDecodeInfo;
	AiInfoCallback fnCallbackAiInfo;
	
	ENUM_Decoder_State enumState;
	
	// Recved data
	uint8_t* szBuffer_Recv;
	int n32BufferLen_Recv;
	int n32BufferSize_Recv;
	
	uint8_t n8DataEnd;
	
	// 视频参数
	AVFrame *pAvFrame;
	int n32Height;
	int n32Width;
	int n32Len_Y;
	int n32Len_UV;
	int n32Pix_Fmt;
	int n32VideoSize;
	uint8_t n8YuvHasKeyFrame;// 视频画面是否已获取关键视频画面
	// 视频画布缓存
	uint8_t* szBuffer_Yuv;
	int n32BufferSize_Yuv;
	int64_t n64LastPtsVideo;
	int64_t n64LastPtsI;
	
	// 音频参数
	int n32SampleFmt;
	int n32Channels;
	int n32SampleRate;
	int64_t n64PtsAudio;
	
	// 调整解码帧速度
	int64_t n64MilliTimeNow;
	int64_t n64MilliTimeLastDec;
	int64_t n64CountDec;
	int n32MilliDuration;
	
	uint8_t* szBuffer_Pcm;
	int n32BufferLen_Pcm;
	int n32BufferSize_Pcm;
	
	// Nalu帧缓存
	AVPacketList* pPktList_First;
	AVPacketList* pPktList_Last;
	int n32PktList_Count;
	int64_t n64TimeStampLastDecode;
	
	char sVersion[64];
	
	char sUrl[128];
	char sUUID[128];
	char sDomains[64][128];
	int nDomainNum;
	
	time_t tInit;
	time_t tExpiration;
	time_t tExpirationSet;
	time_t tNxtAuthCode;
	uint8_t n8AuthType; // 0 none; 1 time; 2 domain; 3 time+domain
	
	uint8_t n8CheckPrint; // >0 是第1次检查url授权信息
}ST_DecoderMng;


extern int fnWriteToRecvBuffer_Mng(ST_DecoderMng* decMng, uint8_t* buff, int size, int offset);
extern int fnGetOnePktList_Mng(ST_DecoderMng* decMng, AVPacketList** pktlist);
extern int fnClearPktList_Mng(ST_DecoderMng* decMng);
extern int fnPacketPut_Mng(ST_DecoderMng* decMng, AVPacketList* pktList);
extern int fnInitYuvBuffer_Mng(ST_DecoderMng* decMng, int width, int height, int pix_fmt);
extern int fnOpenVideoCodecContext_Mng(ST_DecoderMng* decMng, int codecID, AVPacket* pkt_ExtData);
extern int fnOpenAudioCodecContext_Mng(ST_DecoderMng* decMng, int codecID, int sampleRate, int channels);
extern int fnCheckAndOpenVideoCodecCtx_Mng(ST_DecoderMng* decMng, int codecid);
extern int fnCheckAndOpenAudioCodecCtx_Mng(ST_DecoderMng* decMng, int codecid, int sampleRate, int channels);
extern int fnInitVideoParam_Mng(ST_DecoderMng* decMng, int width, int height, int pix_fmt);
extern int fnProcessDecodedVideoFrame_Mng(ST_DecoderMng* decMng);
extern int fnProcessDecodedAudioFrame_Mng(ST_DecoderMng* decMng);
extern int fnDecodePacket_Mng(ST_DecoderMng* decMng, const AVPacket* pkt, uint8_t isVideo);
extern int fnCheckAuthTime(ST_DecoderMng* decMng);

extern int fnSetCbAi_Mng(ST_DecoderMng** ppDecMng, long cbAi);
extern int fnUninit_Mng(ST_DecoderMng** decoderMng);
extern int fnInit_Mng(ST_DecoderMng** decoderMng, ST_DecoderFuncs* funcs, long callbackVideo, long callbackAudio, long callbackRequest, long callbackDecodeInfo);
extern int fnSendData_Mng(ST_DecoderMng* decoderMng, uint8_t* buff, int size);
extern int fnDecoderOnePacket_Mng(ST_DecoderMng* decoderMng);
extern int fnGetNumOfPktList_Mng(ST_DecoderMng* decMng);
extern int fnGetDurationOfPktList_Mng(ST_DecoderMng* decMng);
extern int fnSetUuid_Mng(ST_DecoderMng* decMng, char* uuid, const int size);
extern int fnAuth_Mng(ST_DecoderMng* decMng, char* auth, const int size);
extern const char* fnGetCurVersion_Mng(ST_DecoderMng* decMng);

#ifdef __cplusplus
}
#endif

#endif // _DECODER_MNG_H_
