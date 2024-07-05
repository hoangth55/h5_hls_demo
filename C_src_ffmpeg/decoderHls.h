#ifndef _DECODER_HLS_H_
#define _DECODER_HLS_H_

#include "decoderComm.h"
#include "decoderMng.h"

#ifdef __cplusplus
extern "C" {
#endif


#ifndef STREAM_TYPE_VIDEO_MPEG4
#define STREAM_TYPE_VIDEO_MPEG4 0x10
#endif

#ifndef STREAM_TYPE_VIDEO_H264
#define STREAM_TYPE_VIDEO_H264 0x1b
#endif

#ifndef STREAM_TYPE_VIDEO_HEVC
#define STREAM_TYPE_VIDEO_HEVC 0x24
#endif

#ifndef STREAM_TYPE_AUDIO_AAC
#define STREAM_TYPE_AUDIO_AAC 0x0f
#endif

#ifndef STREAM_TYPE_AUDIO_MPEG1
#define STREAM_TYPE_AUDIO_MPEG1 0x03
#endif

#ifndef STREAM_TYPE_AUDIO_MPEG2
#define STREAM_TYPE_AUDIO_MPEG2 0x04
#endif

#ifndef STREAM_TYPE_AUDIO_AC3
#define STREAM_TYPE_AUDIO_AC3 0x81
#endif

#ifndef NB_PID_MAX
#define NB_PID_MAX 8192
#endif

typedef enum _ENUM_TS_STATE
{
	TS_STATE_PAT = 0,
	TS_STATE_PMT,
	TS_STATE_PES
}ENUM_TS_STATE;


typedef struct _ST_PID_INFO
{
	int nPid;
	uint8_t nEsType;
	uint8_t nType;
	int nCodecId;
}ST_PID_INFO;

typedef struct _ST_DecoderHLS
{
	int64_t n64Pts;
	int64_t n64Dts;

	// Pid infos
	ST_PID_INFO* pSTPidInfos[NB_PID_MAX];

	// For streaming.
	int n32PidPmt;
	ENUM_TS_STATE nTsState;

	// 当前帧临时缓存
	AVFifoBuffer* pFifoVideo;
	int n32PidFifoVideo;
	AVFifoBuffer* pFifoAudio;
	int n32PidFifoAudio;
} ST_DecoderHLS;

typedef struct _ST_AACADTSHeader
{
	uint32_t sample_rate;
	uint32_t samples;
	uint32_t size;
	uint8_t  crc_absent;
	uint8_t  object_type;
	uint8_t  chan_config;
}ST_AACADTSHeader;


// ====================Values Extern================
extern ST_DecoderFuncs g_stDecoderFuncs_HLS; // HLS 解析相关信息


// ====================Functions Export================
extern int fnUninit_HLS(void** dec);
extern int fnInit_HLS(void** dec);
extern int fnDealStreamData_HLS(ST_DecoderMng* decMng, unsigned char* buff, int size);
extern int fnDecodeOnePacket_HLS(ST_DecoderMng* decMng);



#ifdef __cplusplus
}
#endif

#endif
