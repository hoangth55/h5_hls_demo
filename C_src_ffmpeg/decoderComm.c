
#include "decoderComm.h"


// 音频初始缓存
const int k_n32PcmBufferSize_Default = 128 * 1024;
// 视频画面缓存默认值
const int g_n32VideoSize_Default = 64 * 1024;
// 临时缓存默认大小
const int g_n32RecvBufferSize_Default = 512 * 1024;
const int g_n32RecvBufferSize_Max = 64 * 1024 * 1024;
// 判定FLV流解码出错时间默认值
const int g_n32SecsOfNoPkts_Default = 5;

const int g_n32FifoBufferSize_Default = 512 * 1024;
const int g_n32BufferSize_Default = 512 * 1024;

const int g_n32Height_Default = 480;
const int g_n32Width_Default = 720;

const int g_n32PlaybackTime_PriDefault = 30;

ENUM_LogLevel g_enumLogLv = kLogLevel_None;
uint8_t g_bVerPrint = 0;


// ====================Functions Export================

void fnDecoder_Printf(const char* funName, int line, const char* buffName, const unsigned char* buff, int size)
{
	if (g_enumLogLv == kLogLevel_None) {
		return;
	}
	
	printf("%s:[%d]:: %s=", funName, line, buffName);
	for (int i = 0; i < size; ++i)
	{
		printf(" %02x", buff[i]);
	}
	printf("\n");
};

void fnSimpleLog_Comm(const char* format, ...)
{
	if (g_enumLogLv == kLogLevel_None) {
		return;
	}

	char szBuffer[1024] = { 0 };
	char szTime[32] = { 0 };
	char* p = NULL;
	int nPrefixLen = 0;
	const char* tag = "Core";
	struct tm tmTime;
	struct timeb tb;
	ftime(&tb);
	localtime_r(&tb.time, &tmTime);

	if (1) {
		int tmYear = tmTime.tm_year + 1900;
		int tmMon = tmTime.tm_mon + 1;
		int tmMday = tmTime.tm_mday;
		int tmHour = tmTime.tm_hour;
		int tmMin = tmTime.tm_min;
		int tmSec = tmTime.tm_sec;
		int tmMillisec = tb.millitm;
		sprintf(szTime, "%d-%d-%d %d:%d:%d.%d", tmYear, tmMon, tmMday, tmHour, tmMin, tmSec, tmMillisec);
	}

	nPrefixLen = sprintf(szBuffer, "[%s][%s][DT] ", szTime, tag);
	p = szBuffer + nPrefixLen;

	if (1) {
		va_list ap;
		va_start(ap, format);
		vsnprintf(p, 1024 - nPrefixLen, format, ap);
		va_end(ap);
	}

	printf("%s\n", szBuffer);
};


void fnFfmpegLogCallback_Comm(void* ptr, int level, const char* fmt, va_list vl)
{
	static int printPrefix = 1;
	static int count = 0;
	static char prev[1024] = { 0 };
	char line[1024] = { 0 };
	static int is_atty;
	AVClass* avc = ptr ? *(AVClass**)ptr : NULL;
	if (level > AV_LOG_DEBUG) {
		return;
	}

	line[0] = 0;

	if (printPrefix && avc) {
		if (avc->parent_log_context_offset) {
			AVClass** parent = *(AVClass***)(((uint8_t*)ptr) + avc->parent_log_context_offset);
			if (parent && *parent) {
				snprintf(line, sizeof(line), "[%s @ %p] ", (*parent)->item_name(parent), parent);
			}
		}
		snprintf(line + strlen(line), sizeof(line) - strlen(line), "[%s @ %p] ", avc->item_name(ptr), ptr);
	}

	vsnprintf(line + strlen(line), sizeof(line) - strlen(line), fmt, vl);
	line[strlen(line) + 1] = 0;
	fnSimpleLog_Comm("%s", line);
};


int fnRoundUp_Comm(int numToRound, int multiple)
{
	return (numToRound + multiple - 1) & -multiple;
};

uint32_t fnReadB2_Comm(uint8_t* array, int index)
{
	return (((array[index] << 8) |
		(array[index + 1])) & 0xffff);
};

uint32_t fnReadBig32_Comm(uint8_t* array, int index)
{
	return (((array[index] << 24) |
		(array[index + 1] << 16) |
		(array[index + 2] << 8) |
		(array[index + 3])) & 0xffffffff);
};

int fnReadBytes_Comm(uint8_t* dst, int len, uint8_t* src1, int lenSrc1, uint8_t* src2, int lenSrc2, int offset)
{
	if (lenSrc1 + lenSrc2 < offset + len)
	{
		fnSimpleLog_Comm("%s:: error lenSrc1=%d, lenSrc2=%d, offset=%d, len=%d.", __FUNCTION__, lenSrc1, lenSrc2, offset, len);
		int nLenCount = lenSrc1 + lenSrc2;
		int nIndex = 0;
		if (nLenCount > offset)
		{
			if (offset > lenSrc1)
			{
				nIndex = offset - lenSrc1;
			}

			for (; nIndex < lenSrc2; ++nIndex)
			{
				printf("[%02x]", src2[nIndex]);
			}
			printf("\n");
		}
		return -1;
	}

	if (offset > lenSrc1)
	{
		offset -= lenSrc1;
		memcpy(dst, src2 + offset, len);
	}
	else
	{
		if (offset + len < lenSrc1)
		{
			memcpy(dst, src1 + offset, len);
		}
		else
		{
			int nLenSrc1 = lenSrc1 - offset;
			memcpy(dst, src1 + offset, nLenSrc1);
			memcpy(dst + nLenSrc1, src2, len - nLenSrc1);
		}
	}
	return len;
};

int fnResizeBuffer_Comm(uint8_t** buff, int* size, int len, int lenNeed, int max)
{
	if(buff == NULL || size == NULL)
	{
		fnSimpleLog_Comm("%s:[%d]:: buff[%ld] size[%ld].", __FUNCTION__, __LINE__, buff, size);
		return kErrorCode_NULL_Pointer;
	}
	
	int nSize = *size;
	if(nSize > lenNeed)
	{
		return kErrorCode_Success;
	}
	
	uint8_t* pBuff = *buff;
	while (lenNeed > nSize)
    {
        nSize <<= 1;
        if (nSize > max)
        {
            fnSimpleLog_Comm("%s:: pBuff[%d] size[%d] is too big, max[%d] error probably.", __FUNCTION__, pBuff, nSize, max);
        }
    }

    uint8_t* pBufTmp = av_mallocz(nSize);
	if(pBufTmp == NULL)
	{
		fnSimpleLog_Comm("%s:[%d]:: av_mallocz(%d) error.", __FUNCTION__, __LINE__, nSize);
		return kErrorCode_NULL_Pointer;
	}
	
    memcpy(pBufTmp, pBuff, len);
    *buff = pBufTmp;
	*size = nSize;
    av_freep(&pBuff);
    return kErrorCode_Success;
};

int fnInitBuffer_Comm(uint8_t** buff, int* size)
{
	if(buff == NULL || size == NULL)
	{
		return kErrorCode_NULL_Pointer;
	}
	
	if(*buff != NULL)
	{
		av_freep(buff);
	}
	
	if(*size <= g_n32BufferSize_Default)
	{
		*size = g_n32BufferSize_Default;
	}
	*buff = av_mallocz(*size);
	
	return kErrorCode_Success;
};


int fnDiffAVPacket_Comm(const AVPacket* pktL, const AVPacket* pktR)
{
    if (pktL == NULL || pktR == NULL || pktL->size != pktR->size)
    {
        return -1;
    }

    for (int i = 0; i < pktL->size; ++i)
    {
        if (pktL->data[i] != pktR->data[i])
        {
            return -1;
        }
    }
    return 0;
};

void fnExchangeAVPacket_Comm(AVPacket** pktDst, AVPacket** pktSrc)
{
    AVPacket* pktTmp = *pktDst;
    *pktDst = *pktSrc;
    *pktSrc = pktTmp;
};

AVPacketList* fnGetFirstAVPacketList_Comm(AVPacketList** pktListFirst, AVPacketList** pktListLast, int* count)
{
	if (*pktListLast == NULL || count == NULL)
	{
		return NULL;
	}

	AVPacketList* pPktList = NULL;
	pPktList = *pktListFirst;
	(*pktListFirst) = pPktList->next;
	if ((*pktListLast) == pPktList)
	{
		(*pktListLast) = NULL;
	}
	--(*count);
	return pPktList;
};

int fnCopyYuvData_Comm(AVFrame* frame, unsigned char* buffer)
{
	int nRet = kErrorCode_Success;
	unsigned char* src = NULL;
	unsigned char* dst = buffer;
	int i = 0;
	do {
		if (frame == NULL || buffer == NULL) {
			fnSimpleLog_Comm("%s:: (frame[%x] == NULL || buffer[%x] == NULL)", __FUNCTION__, frame, buffer);
			nRet = kErrorCode_Invalid_Param;
			break;
		}

		if (!frame->data[0] || !frame->data[1] || !frame->data[2]) {
			fnSimpleLog_Comm("%s:: (!frame->data[0][%x] || !frame->data[1][%x] || !frame->data[2][%x])", __FUNCTION__, frame->data[0], frame->data[1], frame->data[2]);
			nRet = kErrorCode_Invalid_Param;
			break;
		}

		int height = frame->height;
		int width = frame->width;

		for (i = 0; i < height; i++) {
			src = frame->data[0] + i * frame->linesize[0];
			memcpy(dst, src, width);
			dst += width;
		}

		for (i = 0; i < height / 2; i++) {
			src = frame->data[1] + i * frame->linesize[1];
			memcpy(dst, src, width / 2);
			dst += width / 2;
		}

		for (i = 0; i < height / 2; i++) {
			src = frame->data[2] + i * frame->linesize[2];
			memcpy(dst, src, width / 2);
			dst += width / 2;
		}
	} while (0);

	return nRet;
};

int fnWriteToFifo_Comm(AVFifoBuffer** fifoBuf, uint8_t* buff, int size)
{
	AVFifoBuffer* pFifoBuf = *fifoBuf;
	
	int nSpace = 0;
	if(pFifoBuf != NULL)
	{
		nSpace = av_fifo_space(pFifoBuf);
	}
	int nGrow = 0;
	while (nSpace < size)
	{
		nGrow += g_n32FifoBufferSize_Default;
		nSpace += g_n32FifoBufferSize_Default;
	}
	
	if (pFifoBuf == NULL)
	{
		fnSimpleLog_Comm("%s:: pFifoBuf == NULL", __FUNCTION__);
		*fifoBuf = av_fifo_alloc(nSpace);
		pFifoBuf = *fifoBuf;
		if (pFifoBuf == NULL)
		{
			return 0;
		}
	}
	else if(nGrow > 0)
	{
		fnSimpleLog_Comm("%s:: av_fifo_grow1 nGrow=%d, nSpace= %d\n", __FUNCTION__, nGrow, nSpace);
		av_fifo_grow(pFifoBuf, nGrow);
	}
	// printf("%s:: av_fifo_grow2 nGrow=%d, nSpace= %d\n", __FUNCTION__, nGrow, nSpace);
	return av_fifo_generic_write(pFifoBuf, buff, size, NULL);
};

AVPacketList* fnCreatePacketFromFifoBuffer_Comm(AVFifoBuffer* fifoBuf, int streamIndex, int64_t pts, int64_t dts)
{
	if (fifoBuf == NULL)
	{
		return NULL;
	}

	int nLen = av_fifo_size(fifoBuf);
	if (nLen <= 0)
	{
		return NULL;
	}

	AVPacketList* pPktList = NULL;
	pPktList = av_malloc(sizeof(AVPacketList));
	if (pPktList == NULL)
	{
		return NULL;
	}

	// printf("%s:: nLen=%d nCache=%d pts=%lld dts=%lld\n", __FUNCTION__, nLen, av_fifo_space(fifoBuf), pts, dts);

	av_new_packet(&pPktList->pkt, nLen);
	av_fifo_generic_read(fifoBuf, pPktList->pkt.data, nLen, NULL);
	pPktList->pkt.pts = pts;
	if(dts > 0)
	{
		pPktList->pkt.dts = dts;
	}
	else
	{
		pPktList->pkt.dts = pts;
	}
	// Decoder_Printf(__FUNCTION__, __LINE__, "pktData", pPktList->pkt.data, 20);
	pPktList->pkt.stream_index = streamIndex;
	return pPktList;
};

int fnInitAvframe_Comm(AVFrame** frame)
{
	if(frame == NULL)
	{
		return kErrorCode_Invalid_Param;
	}
	
	if (*frame == NULL)
    {
        *frame = av_frame_alloc();
        if (*frame == NULL)
        {
            fnSimpleLog_Comm("%s:[%d]:: av_frame_alloc error.", __FUNCTION__, __LINE__);
            return kErrorCode_NULL_Pointer;
        }
        fnSimpleLog_Comm("%s:[%d]:: av_frame_alloc success.", __FUNCTION__, __LINE__);
    }
    return kErrorCode_Success;
};

const char* fnGetDomainFromUrl_Comm(const char* url, int len)
{
	if(url == NULL || 3 > len) {
		fnSimpleLog_Comm("%s:: error.", __FUNCTION__);
		return NULL;
	}

	// 去掉域名前的参数
	char* pDomain = strstr(url, "\:\/\/");
	if(NULL == pDomain){
		pDomain = url;
	}else{
		pDomain += 3;
	}

	// 去掉域名后的参数
	char* pTail = strstr(pDomain, "\/");
	if(NULL != pTail){
		pTail[0] = '\0';
	}

	// 最多只取前127字节
	int nLenDomain = strlen(pDomain);
	if(127 < nLenDomain){
		nLenDomain = 127;
		pDomain[127] = '\0';
	}

	// 去掉端口
	char* pPort = strstr(pDomain, ":");
	if(NULL != pPort){
		pPort[0] = '\0';
	}
	return pDomain;
};