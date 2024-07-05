#include "decoderComm.h"
#include "decoderHls.h"
#include "decoderFlv.h"
#include "decoderMng.h"

#include <emscripten.h>
#include <string.h>

static ST_DecoderFuncs* g_pDecodersFuncs[] = {
	&g_stDecoderFuncs_HLS,
	&g_stDecoderFuncs_FLV,
};

ST_DecoderMng* g_pDecoderMng = NULL;
//const char* getCurrPageAddr();

// ==================== Functions ================

int fnInitDecoder(int logLv, int streamType, long cbVideo, long cbAudio, long cbRequest, long cbDecodeInfo, uint8_t* uuid, int lenUuid, uint8_t* url, int lenUrl)
{
	int nRet = kErrorCode_Success;
	do{
		ST_DecoderFuncs* pFuncs = NULL;
		for(int i=0; g_pDecodersFuncs[i]; ++i)
		{
			if(g_pDecodersFuncs[i]->enumStreamType == streamType)
			{
				pFuncs = g_pDecodersFuncs[i];
				break;
			}
		}
		
		if(pFuncs == NULL)
		{
			nRet = kErrorCode_Invalid_Format;
			break;
		}
		
		g_enumLogLv = logLv;
		if(g_enumLogLv == kLogLevel_All)
		{
			av_log_set_callback(fnFfmpegLogCallback_Comm);
		}
		
		nRet = fnInit_Mng(&g_pDecoderMng, pFuncs, cbVideo, cbAudio, cbRequest, cbDecodeInfo);
		if(0 > nRet){
			break;
		}

		// uuid有设置时，保存至缓存
		if(127 < lenUuid){
			uuid[127] = '\0';
		}
		int nLenUuid = strlen(uuid);
		if(0 < nLenUuid){
			memcpy(g_pDecoderMng->sUUID, uuid, nLenUuid);
			printf("%s:: uuid: %s.\n", __FUNCTION__, g_pDecoderMng->sUUID);
		}
		

		// url有设置时，保存domain至缓存
		printf("%s:: url: %s.\n", __FUNCTION__, url);
		const char* pDomain = fnGetDomainFromUrl_Comm((const char*)url, lenUrl);
		if(NULL != pDomain){
			memcpy(g_pDecoderMng->sUrl, pDomain, strlen(pDomain));
			printf("%s:: pDomain: %s.\n", __FUNCTION__, pDomain);
		}
	}while(0);
	//const char *page_address = getCurrPageAddr();
	//printf("web-url:%s\n", page_address);
	return nRet;
};

int fnUninitDecoder()
{
	g_enumLogLv = kLogLevel_None;
	av_log_set_callback(NULL);
	return fnUninit_Mng(&g_pDecoderMng);
};

int fnSetCbAi(long cbAi)
{
	return fnSetCbAi_Mng(&g_pDecoderMng, cbAi);
};

// 0 -- 设置uuid
// 1 -- 加了密的license校验
// 2 -- 普通的音视频数据
int fnSendData(int type, uint8_t* buff, int size)
{
	if(0 == type)
	{
		return fnSetUuid_Mng(g_pDecoderMng, (char*)buff, size);
	}
	if(1 == type)
	{
		return fnAuth_Mng(g_pDecoderMng, (char*)buff, size);
	}
	
	int nRet = kErrorCode_Success;
	do{
		if(buff == NULL || size <= 0)
		{
			nRet = kErrorCode_Invalid_Data;
			break;
		}
		
		if(g_pDecoderMng == NULL)
		{
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		if(g_pDecoderMng->enumState != Decoder_State_Init)
		{
			nRet = kErrorCode_Invalid_State;
			break;
		}
		nRet = fnSendData_Mng(g_pDecoderMng, buff, size);
	}while(0);
	return nRet;
};

int fnDecoderOnePacket()
{
	int nRet = kErrorCode_Success;
	do{
		if(g_pDecoderMng == NULL)
		{
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		if(g_pDecoderMng->enumState != Decoder_State_Init)
		{
			nRet = kErrorCode_Invalid_State;
			break;
		}
		nRet = fnDecoderOnePacket_Mng(g_pDecoderMng);
	}while(0);
	return nRet;
};

int fnGetNumOfPktList()
{
	return fnGetNumOfPktList_Mng(g_pDecoderMng);
};

int fnGetDurationOfPktList()
{
	return fnGetDurationOfPktList_Mng(g_pDecoderMng);
};

int fnGetVersion(char* version, int size)
{
	if(NULL == version)
	{
		return -1;
	}
	
	const char* szVersion = fnGetCurVersion_Mng(g_pDecoderMng);
	int nLen = NULL == szVersion ? 0 : strlen(szVersion);
	if((nLen + 1) > size)
	{
		return -2;
	}
	memcpy(version, szVersion, nLen);
	version[nLen] = 0;
	return nLen;
}

void getCurrPageAddr(char* addr)
{
	printf("url-curr-in: %s\n", addr);
}

int main()
{
	/*EM_ASM(
		{
			var url = window.location.href;
			console.log("in-url: " + url);
		});*/
	//const char *page_address = __WASI_Sys_get_current_page_address();
	//const char *page_address = getCurrPageAddr();
	//printf("web-url:%s\n", page_address);
	return 0;
};

// 由 EM_ASM 宏调用的函数，用于接收和处理 JavaScript 传递的网址
//EMSCRIPTEN_KEEPALIVE
/*void setURL(char *url, int i) {
    // 将接收到的网址复制到 C 字符串
    strcpy(url, emscripten_asm_const_char_int(i));
    // 打印出网址
    printf("当前网页地址: %s\n", url);
}*/

/*const char* getCurrPageAddr() {
    return (const char*)EM_ASM_({
		var url = window.location.href;
		var lengthBytes = lengthBytesUTF8(url) + 1;
        var addressPointer = _malloc(lengthBytes);
        stringToUTF8(url, addressPointer, lengthBytes);
        return addressPointer;});
}*/

