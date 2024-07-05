#ifndef _DECODER_COMM_H_
#define _DECODER_COMM_H_

#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>
#include <sys/timeb.h>
#include <unistd.h>

#include "decoderVersion.h"


#ifdef __cplusplus
extern "C" {
#endif

#include "libavcodec/avcodec.h"
#include "libavcodec/codec_id.h"
#include "libavformat/avformat.h"
#include "libavformat/flv.h"
#include "libavutil/avutil.h"
#include "libavutil/fifo.h"
#include "libavutil/imgutils.h"
#include "libswscale/swscale.h"
#include "libavutil/aes.h"
#include "libavutil/base64.h"


#ifndef STREAM_TYPE_VIDEO_MPEG4
#define STREAM_TYPE_VIDEO_MPEG4 0x10
#endif

#ifndef STREAM_TYPE_VIDEO_H264
#define STREAM_TYPE_VIDEO_H264 0x1b
#endif

#ifndef STREAM_TYPE_VIDEO_HEVC
#define STREAM_TYPE_VIDEO_HEVC 0x24
#endif

#ifndef NB_PID_MAX
#define NB_PID_MAX 8192
#endif

#define VERSION_MAIN "1.0."
#define AUTH_VER_AES_IV_PRE "XJMF-PLYER-VER-"
#define AUTH_VER_AES_KEY_PRE "Ver-"

// uuid方式解码的key
#define AUTH_LIC_AES_IV_PRE "XJMF-PLAYER-"
#define AUTH_LIC_AES_KEY_PRE "PLAYER584A6D66_506C61796572_"

#define LICCODE_KEY_DOMAIN "domain"
#define LICCODE_KEY_EXPIRE "expire"

// uuid 校验时，传入的信息中的key
// uuid=xxxxxx&authcode=0&expiretime=123456795&
// uuid=xxxxxx&authcode=0&expiretime=123456795&domain=xxxxx&
#define LICCODE_KEY_UUID "uuid" // 用户uuid
#define LICCODE_KEY_AUTHCODE "authcode" // 鉴权值
#define LICCODE_KEY_EXPIRETIME "expiretime" // 超时时间unixtime
#define LICCODE_SEPARATOR '&' // 分隔符
#define LICCODE_TO '=' // key/value中间符

#define LICCODE_CHECK_LEN 4

typedef enum
{
	Decoder_Recall_Type_Error = -1,
	Decoder_Recall_Type_None = 0,
	Decoder_Recall_Type_Video,
	Decoder_Recall_Type_Audio,
	Decoder_Recall_Type_DataEnd,
}ENUM_Decoder_Recall_Type;

typedef enum
{
	Decoder_State_None = 0,
	Decoder_State_Init,
	Decoder_State_Open,
	Decoder_State_Close
}ENUM_Decoder_State;

typedef enum ErrorCode {
	kErrorCode_Success = 0,
	kErrorCode_Invalid_Param = -100,
	kErrorCode_Invalid_State = -102,
	kErrorCode_Invalid_Data = -103,
	kErrorCode_Invalid_Format = -104,
	kErrorCode_NULL_Pointer = -105,
	kErrorCode_Open_File_Error = -106,
	kErrorCode_Eof = -107,
	kErrorCode_FFmpeg_Error = -108,
	kErrorCode_Old_Frame = -109,
	kErrorCode_Data_Lost = -110,
	kErrorCode_Auth = -111,
	kErrorCode_AuthRefresh = -112
} ErrorCode;

typedef enum LogLevel {
	kLogLevel_None, //Not logging.
	kLogLevel_Core, //Only logging core module(without ffmpeg).
	kLogLevel_All   //Logging all, with ffmpeg.
} ENUM_LogLevel;


typedef void(*VideoCallback)(uint8_t* buff, int size, int timestamp, int width, int height, int ylen, int uvlen);
typedef void(*AudioCallback)(uint8_t* buff, int size, int timestamp);
typedef void(*RequestCallback)(int offset, int available);
typedef void(*DecodeInfoCallback)(int type, int* buff, int size);
typedef void(*AiInfoCallback)(int type, int timestamp, int width, int height, char* buff, int size);

/*设置输出前景色*/
#define PRINTF_FONT_BLA  printf("\033[30m"); //黑色
#define PRINTF_FONT_RED  printf("\033[31m"); //红色
#define PRINTF_FONT_GRE  printf("\033[32m"); //绿色
#define PRINTF_FONT_YEL  printf("\033[33m"); //黄色
#define PRINTF_FONT_BLU  printf("\033[34m"); //蓝色
#define PRINTF_FONT_PUR  printf("\033[35m"); //紫色
#define PRINTF_FONT_CYA  printf("\033[36m"); //青色
#define PRINTF_FONT_WHI  printf("\033[37m"); //白色



// 音频初始缓存
extern const int k_n32PcmBufferSize_Default;
// 视频画面缓存默认值
extern const int g_n32VideoSize_Default;
// 临时缓存默认大小
extern const int g_n32RecvBufferSize_Default;
extern const int g_n32RecvBufferSize_Max;
// 判定FLV流解码出错时间默认值
extern const int g_n32SecsOfNoPkts_Default;

extern const int g_n32FifoBufferSize_Default;
extern const int g_n32BufferSize_Default;

extern const int g_n32Height_Default;
extern const int g_n32Width_Default;

extern const int g_n32PlaybackTime_PriDefault;


// ====================Values Extern================
extern ENUM_LogLevel g_enumLogLv; // 日志等级
extern uint8_t		g_bVerPrint;


// ====================Functions Export================
extern void fnDecoder_Printf(const char* funName, int line, const char* buffName, const unsigned char* buff, int size);
extern void fnSimpleLog_Comm(const char* format, ...);
extern void fnFfmpegLogCallback_Comm(void* ptr, int level, const char* fmt, va_list vl);

extern int fnRoundUp_Comm(int numToRound, int multiple);
extern uint32_t fnReadB2_Comm(uint8_t* array, int index);
extern uint32_t fnReadBig32_Comm(uint8_t* array, int index);
extern int fnReadBytes_Comm(uint8_t* dst, int len, uint8_t* src1, int lenSrc1, uint8_t* src2, int lenSrc2, int offset);
extern int fnResizeBuffer_Comm(uint8_t** buff, int* size, int len, int lenNeed, int max);
extern int fnInitBuffer_Comm(uint8_t** buff, int* size);
extern int fnDiffAVPacket_Comm(const AVPacket* pktL, const AVPacket* pktR);
extern void fnExchangeAVPacket_Comm(AVPacket** pktDst, AVPacket** pktSrc);
extern AVPacketList* fnGetFirstAVPacketList_Comm(AVPacketList** pktListFirst, AVPacketList** pktListLast, int* count);
extern int fnCopyYuvData_Comm(AVFrame* frame, unsigned char* buffer);
extern int fnWriteToFifo_Comm(AVFifoBuffer** fifoBuf, uint8_t* buff, int size);
extern AVPacketList* fnCreatePacketFromFifoBuffer_Comm(AVFifoBuffer* fifoBuf, int streamIndex, int64_t pts, int64_t dts);
extern int fnInitAvframe_Comm(AVFrame** frame);

extern const char* fnGetDomainFromUrl_Comm(const char* url, int len);

#ifdef __cplusplus
}
#endif

#endif // _DECODER_COMM_H_
