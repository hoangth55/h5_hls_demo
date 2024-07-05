#ifndef _DECODER_FLV_H_
#define _DECODER_FLV_H_

#include "decoderComm.h"
#include "decoderMng.h"


#ifdef __cplusplus
extern "C" {
#endif

typedef struct _ST_DecoderFLV
{
    // For streaming.
    uint8_t n8GotHeader;// 获取FLV头标识
    int64_t n8Duration;
	
    // 下一个FLV包信息
    int n32TagLenNext;
    uint8_t n8TagType;
	
	int64_t n64Pts;
	int64_t n64Dts;
    int n32TimeStamp;
    int n32StreamId;

    // 视频、音频流是否存在
    uint8_t n8HasVideo;
    uint8_t n8HasAudio;
    // 视频、音频流编码
    int n32StreamIdx_Video;
    int n32StreamIdx_Audio;
	
	int n32CodecID_Audio;
	uint8_t n8TagHeader_Audio;

    // 视频参数
    uint8_t n8CodecID;// 视频FLV类型
    uint8_t n8GotAvccFirst;// 第一帧AVCC
    AVPacket* pPkt_ExtData;
    int n8ExtDataNeedDecode;
    //AVPacket* pPktExtDataNeedDecode;
} ST_DecoderFLV;


// ====================Values Extern================
extern ST_DecoderFuncs g_stDecoderFuncs_FLV; // FLV解析相关信息


//////////////////////////////////Export methods////////////////////////////////////////

extern int fnUninit_FLV(void** dec);
extern int fnInit_FLV(void** dec);
extern int fnDealStreamData_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size);
extern int fnDecodeOnePacket_FLV(ST_DecoderMng* decMng);
	
#ifdef __cplusplus
}
#endif

#endif
