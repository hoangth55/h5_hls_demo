#include "decoderMng.h"
#include <string.h>
#include <time.h>

#define Auth_Play_Time_Min_Def 5
// #define TEST 1

#define Auth_Fixed_Key "73385d578F7fB5d48E4c5Cc2724E9bEf"

const char* fnGetCurVersion()
{
	int nSecs = BUILD_HOUR * 3600 + BUILD_MIN * 60 + BUILD_SEC;
	char szVersion[64] = { 0 };
	sprintf(szVersion, "V%s%c%c%c%c%c%c%c%c.%d", VERSION_MAIN, BUILD_YEAR_CH0, BUILD_YEAR_CH1, BUILD_YEAR_CH2, BUILD_YEAR_CH3, BUILD_MONTH_CH0, BUILD_MONTH_CH1, BUILD_DAY_CH0, BUILD_DAY_CH1, nSecs);
	return szVersion;
};

int fnWriteToRecvBuffer_Mng(ST_DecoderMng* decMng, uint8_t* buff, int size, int offset)
{
	if (offset < decMng->n32BufferLen_Recv)
	{
		int nLeft = decMng->n32BufferLen_Recv - offset;
		memcpy(decMng->szBuffer_Recv, decMng->szBuffer_Recv + offset, nLeft);
		memcpy(decMng->szBuffer_Recv + nLeft, buff, size);
		decMng->n32BufferLen_Recv = nLeft + size;
	}
	else
	{
		int nIndex = offset - decMng->n32BufferLen_Recv;
		decMng->n32BufferLen_Recv = size - nIndex;
		memcpy(decMng->szBuffer_Recv, buff + nIndex, decMng->n32BufferLen_Recv);
	}
	return decMng->n32BufferLen_Recv;
};

int fnGetOnePktList_Mng(ST_DecoderMng* decMng, AVPacketList** pktlist)
{
	int nRet = kErrorCode_Success;
	do{
		if (decMng->pPktList_Last == NULL)
		{
			if (decMng->n8DataEnd > 0)
			{
				return kErrorCode_Eof;
			}
			break;
		}

		int64_t tNow = time(NULL);
		//fnSimpleLog_Comm("decodeOnePacket begin. 1");
		*pktlist = fnGetFirstAVPacketList_Comm(&(decMng->pPktList_First), &(decMng->pPktList_Last), &(decMng->n32PktList_Count));
		if (*pktlist == NULL)
		{
			if (tNow > (decMng->n64TimeStampLastDecode + g_n32SecsOfNoPkts_Default))
			{
				fnSimpleLog_Comm("%s:: first pkt = NULL and tNow=%lld n64TimeStampLastDecode=%lld.", __FUNCTION__, tNow, decMng->n64TimeStampLastDecode);
			}
			break;
		}
		else
		{
			decMng->n64MilliTimeLastDec = (*pktlist)->pkt.pts;
		}
		decMng->n64TimeStampLastDecode = tNow;
	}while(0);
	return nRet;
};

int fnClearPktList_Mng(ST_DecoderMng* decMng)
{
	if(decMng == NULL)
	{
		return 0;
	}
	
	int nCount = 0;
	AVPacketList* pPktList = NULL;
	while (1)
	{
		pPktList = fnGetFirstAVPacketList_Comm(&(decMng->pPktList_First), &(decMng->pPktList_Last), &(decMng->n32PktList_Count));
		if (pPktList == NULL)
		{
			break;
		}
		av_packet_unref(&(pPktList->pkt));
		av_freep(&pPktList);
		++nCount;
	}
	
	decMng->pPktList_First = NULL;
	decMng->pPktList_Last = NULL;
	decMng->n32PktList_Count = 0;
	return nCount;
};

int fnPacketPut_Mng(ST_DecoderMng* decMng, AVPacketList* pktList)
{
	if(decMng == NULL || pktList == NULL)
	{
		return kErrorCode_NULL_Pointer;
	}
	
	// printf("%s:: pts:%lld\n", __FUNCTION__,  pktList->pkt.dts);
	// printf("%s:: n32PktList_Count=%d\n", __FUNCTION__, decMng->n32PktList_Count);
	// fnDecoder_Printf(__FUNCTION__, __LINE__, "pktList", pktList->pkt.data, 10);
	if (decMng->pPktList_Last == NULL)		//判断q->last_pkt是否为空，
	{
		decMng->pPktList_First = pktList;        //为空的话，则让first_pkt指向这个pktl这个结构体
	}
	else
	{
		decMng->pPktList_Last->next = pktList;	//如果q->last_pkt不为空，也就是q->last_pkt指向一个pkl类型的结构体
	}
	decMng->pPktList_Last = pktList;           //任何时候都会执行到这一句，q->last_pkt指向最新进来的pkl类型
	++decMng->n32PktList_Count;
	return kErrorCode_Success;
};

int fnInitYuvBuffer_Mng(ST_DecoderMng* decMng, int width, int height, int pix_fmt)
{
	int nVideoSize = av_image_get_buffer_size(
		pix_fmt,
		width,
		height,
		1);
	// fnSimpleLog_Comm("%s:: nVideoSize=%d", __FUNCTION__, nVideoSize);
	if (decMng->n32VideoSize < nVideoSize)
	{
		decMng->n32VideoSize = nVideoSize;
	}
	else if (decMng->n32VideoSize <= 0)
	{
		decMng->n32VideoSize = g_n32VideoSize_Default;
	}

	int n3VideoSize = 3 * decMng->n32VideoSize;
	if (n3VideoSize > decMng->n32BufferSize_Yuv)
	{
		decMng->n32BufferSize_Yuv = n3VideoSize;
		if (decMng->szBuffer_Yuv != NULL)
		{
			av_freep(&decMng->szBuffer_Yuv);
			decMng->szBuffer_Yuv = NULL;
		}
	}


	if (decMng->szBuffer_Yuv == NULL)
	{
		decMng->szBuffer_Yuv = (unsigned char*)av_mallocz(decMng->n32BufferSize_Yuv);
		fnSimpleLog_Comm("%s:: videoSize[%d] n32BufferSize_Yuv[%d].", __FUNCTION__, decMng->n32VideoSize, decMng->n32BufferSize_Yuv);
	}
	return kErrorCode_Success;
};

int fnOpenVideoCodecContext_Mng(ST_DecoderMng* decMng, int codecID, AVPacket* pkt_ExtData)
{
    // fnSimpleLog_Comm("%s:: codecID[%d].",__FUNCTION__, codecID);
    AVCodec* pDec = avcodec_find_decoder(codecID);
    if (!pDec)
    {
        fnSimpleLog_Comm("%s:: avcodec_find_decoder error, codecID=%d.", __FUNCTION__, codecID);
        return -3;
    }

    if (decMng->pVideoCodecCtx != NULL)
    {
        avcodec_free_context(&(decMng->pVideoCodecCtx));
        fnSimpleLog_Comm("%s:: avcodec_free_context.", __FUNCTION__);
    }
    decMng->pVideoCodecCtx = avcodec_alloc_context3(pDec);
    if (decMng->pVideoCodecCtx == NULL)
    {
        fnSimpleLog_Comm("%s:: avcodec_alloc_context3 error.", __FUNCTION__);
        return -4;
    }

    decMng->pVideoCodecCtx->width = decMng->n32Width;//视频宽
    decMng->pVideoCodecCtx->height = decMng->n32Height;//视频高
    //decMng->pVideoCodecCtx->coded_width = decMng->nWidth;//视频宽
    //decMng->pVideoCodecCtx->coded_height = decMng->nHeight;//视频高
    decMng->pVideoCodecCtx->pix_fmt = decMng->n32Pix_Fmt;// AV_PIX_FMT_YUV420P;
    decMng->pVideoCodecCtx->bit_rate = 0; //比特率，解码设为0表示有效。初始化为0
    decMng->pVideoCodecCtx->time_base.den = 25;
    decMng->pVideoCodecCtx->time_base.num = 1;
    decMng->pVideoCodecCtx->frame_number = 1; //每包一个视频帧  
    decMng->pVideoCodecCtx->qmin = 5;
    decMng->pVideoCodecCtx->qmax = 30;
    decMng->pVideoCodecCtx->max_b_frames = 2;
    decMng->pVideoCodecCtx->skip_frame = AVDISCARD_NONREF; // 跳过非参考帧
    decMng->pVideoCodecCtx->err_recognition =
        AV_EF_CRCCHECK | AV_EF_BITSTREAM | AV_EF_EXPLODE | AV_EF_COMPLIANT;

    // set extradata
    if (pkt_ExtData != NULL)
    {
        fnSimpleLog_Comm("%s:: extraData exist, size=%d.", __FUNCTION__, pkt_ExtData->size);
		fnDecoder_Printf(__FUNCTION__, __LINE__, "pkt_ExtData", pkt_ExtData->data, pkt_ExtData->size);
        decMng->pVideoCodecCtx->extradata_size = pkt_ExtData->size;
        decMng->pVideoCodecCtx->extradata = (uint8_t*)av_mallocz(pkt_ExtData->size + AV_INPUT_BUFFER_PADDING_SIZE);
        if (decMng->pVideoCodecCtx->extradata == NULL)
        {
            fnSimpleLog_Comm("%s:: extradata av_mallocz error.", __FUNCTION__);
        }
        memcpy(decMng->pVideoCodecCtx->extradata, pkt_ExtData->data, pkt_ExtData->size);
    }


    AVDictionary* pOpts = NULL;
    av_dict_set(&pOpts, "preset", "ultrafast", 0);
    av_dict_set(&pOpts, "tune", "stillimage,fastdecode,zerolatency", 0);

    if ((avcodec_open2(decMng->pVideoCodecCtx, pDec, /*&pOpts*/NULL)) != 0)
    {
        fnSimpleLog_Comm("%s:: Failed to open %d codec.", __FUNCTION__, codecID);
        return -5;
    }

    // fnSimpleLog_Comm("%s:: width=%d height=%d pix_fmt=%d", __FUNCTION__, decMng->pVideoCodecCtx->width, decMng->pVideoCodecCtx->height, decMng->pVideoCodecCtx->pix_fmt);
    avcodec_flush_buffers(decMng->pVideoCodecCtx);

    fnInitYuvBuffer_Mng(decMng, decMng->pVideoCodecCtx->width, decMng->pVideoCodecCtx->height, decMng->pVideoCodecCtx->pix_fmt);
    fnInitAvframe_Comm(&(decMng->pAvFrame));

    return kErrorCode_Success;
};

int fnOpenAudioCodecContext_Mng(ST_DecoderMng* decMng, int codecID, int sampleRate, int channels)
{
    // fnSimpleLog_Comm("%s:: codecID[%d].",__FUNCTION__, codecID);
    AVCodec* pDec = avcodec_find_decoder(codecID);
    if (!pDec)
    {
        fnSimpleLog_Comm("%s:: avcodec_find_decoder error, codecID=%d.", __FUNCTION__, codecID);
        return -3;
    }

    if (decMng->pAudioCodecCtx != NULL)
    {
        avcodec_free_context(&(decMng->pAudioCodecCtx));
        fnSimpleLog_Comm("%s:: avcodec_free_context.", __FUNCTION__);
    }
    decMng->pAudioCodecCtx = avcodec_alloc_context3(pDec);
    if (decMng->pAudioCodecCtx == NULL)
    {
        fnSimpleLog_Comm("%s:: avcodec_alloc_context3 error.", __FUNCTION__);
        return -4;
    }

    decMng->pAudioCodecCtx->sample_fmt = AV_SAMPLE_FMT_S16;
    decMng->pAudioCodecCtx->sample_rate = sampleRate;
    decMng->pAudioCodecCtx->channels = channels;
    decMng->pAudioCodecCtx->channel_layout = AV_CH_LAYOUT_STEREO;

    if ((avcodec_open2(decMng->pAudioCodecCtx, pDec, /*&pOpts*/NULL)) != 0)
    {
        fnSimpleLog_Comm("%s:: Failed to open %d codec.", __FUNCTION__, codecID);
		avcodec_free_context(&(decMng->pAudioCodecCtx));
        return -5;
    }
    return kErrorCode_Success;
};

int fnCheckAndOpenVideoCodecCtx_Mng(ST_DecoderMng* decMng, int codecid)
{
	int nRet = kErrorCode_Success;
	do{
		AVCodecContext* pCodecCtx = decMng->pVideoCodecCtx;
		if(pCodecCtx == NULL || pCodecCtx->codec_id != codecid)
		{
			int nRetTmp = fnOpenVideoCodecContext_Mng(decMng, codecid, NULL);
			if(nRetTmp != kErrorCode_Success)
			{
				nRet = kErrorCode_NULL_Pointer;
				fnSimpleLog_Comm("%s:[%d]::error open CodecContext error[%d].", __FUNCTION__, __LINE__, nRetTmp);
			}
		}
		
	}while(0);
	return nRet;
};



int fnCheckAndOpenAudioCodecCtx_Mng(ST_DecoderMng* decMng, int codecid, int sampleRate, int channels)
{
	int nRet = kErrorCode_Success;
	do{
		AVCodecContext* pCodecCtx = decMng->pAudioCodecCtx;
		if(pCodecCtx == NULL || pCodecCtx->codec_id != codecid || pCodecCtx->sample_rate != sampleRate || pCodecCtx->channels != channels)
		{
			int nRetTmp = fnOpenAudioCodecContext_Mng(decMng, codecid, sampleRate, channels);
			if(nRetTmp != kErrorCode_Success)
			{
				nRet = kErrorCode_NULL_Pointer;
				fnSimpleLog_Comm("%s:[%d]::error open CodecContext error[%d].", __FUNCTION__, __LINE__, nRetTmp);
			}
			
			fnSimpleLog_Comm("%s:[%d]::success open Audio CodecContext codecid=%d sampleRate=%d channels=%d.", __FUNCTION__, __LINE__, codecid, sampleRate, channels);
		}
		
	}while(0);
	return nRet;
};

int fnInitVideoParam_Mng(ST_DecoderMng* decMng, int width, int height, int pix_fmt)
{
	decMng->n32Width = width;
	decMng->n32Height = height;
	decMng->n32Pix_Fmt = pix_fmt;
	decMng->n32Len_Y = width * height;
	decMng->n32Len_UV = (decMng->n32Len_Y >> 2);

	int params[4] = { 0 };
	params[0] = 0 + 5;
	//params[0] = 1000 * (decMng->avformatContext->duration + 5000) / AV_TIME_BASE;
	params[1] = pix_fmt;
	params[2] = width;
	params[3] = height;
	// fnSimpleLog_Comm("%s:: decodeInfoCallback[%x] width=%d height=%d before pix_fmt=%d params[%d].", __FUNCTION__, decMng->fnCallbackDecodeInfo, width, height, pix_fmt, params);
	
	if (decMng->fnCallbackDecodeInfo != NULL)
	{
		decMng->fnCallbackDecodeInfo(Decoder_Recall_Type_Video, params, 16);
	}

	fnInitYuvBuffer_Mng(decMng, width, height, pix_fmt);
	return kErrorCode_Success;
};

int fnProcessDecodedVideoFrame_Mng(ST_DecoderMng* decMng)
{
	int nRet = kErrorCode_Success;
	double dTimestamp = 0.0f;
	AVFrame* pFrame = decMng->pAvFrame;
	do {
		if (pFrame == NULL ||
			decMng->fnCallbackVideo == NULL) {
			nRet = kErrorCode_Invalid_Param;
			fnSimpleLog_Comm("%s:: fnCallbackVideo[%x] szBuffer_Yuv[%x] n32BufferSize_Yuv[%d]", __FUNCTION__, decMng->fnCallbackVideo, decMng->szBuffer_Yuv, decMng->n32BufferSize_Yuv);
			break;
		}

		if (decMng->pVideoCodecCtx->pix_fmt != AV_PIX_FMT_YUV420P && decMng->pVideoCodecCtx->pix_fmt != AV_PIX_FMT_YUVJ420P) {
			fnSimpleLog_Comm("%s:: Not YUV420P, but unsupported format %d.", __FUNCTION__, decMng->pVideoCodecCtx->pix_fmt);
			nRet = kErrorCode_Invalid_Format;
			break;
		}

		if (decMng->n8YuvHasKeyFrame <= 0)
		{
			decMng->n8YuvHasKeyFrame = pFrame->key_frame;
			if (decMng->n8YuvHasKeyFrame <= 0)
			{
				fnSimpleLog_Comm("%s:: n8YuvHasKeyFrame[%d] <= 0", __FUNCTION__, decMng->n8YuvHasKeyFrame);
				break;
			}
		}
		
		if(pFrame->key_frame > 0)
		{
			decMng->n64PtsAudio = pFrame->best_effort_timestamp;
			decMng->n64LastPtsI = pFrame->best_effort_timestamp;
		}

		if (decMng->n32Height != pFrame->height || decMng->n32Width != pFrame->width || decMng->n32Pix_Fmt != decMng->pVideoCodecCtx->pix_fmt)
		{
			nRet = fnInitVideoParam_Mng(decMng, pFrame->width, pFrame->height, decMng->pVideoCodecCtx->pix_fmt);
			if (nRet != kErrorCode_Success)
			{
				break;
			}
		}
		//fnSimpleLog_Comm("copyYuvData before pFrame=%x decMng->yuvBuffer=%x", pFrame, decMng->yuvBuffer);
		nRet = fnCopyYuvData_Comm(pFrame, decMng->szBuffer_Yuv);
		if (nRet != kErrorCode_Success) {
			break;
		}

		if (decMng->n32TicksPerFrame != decMng->pVideoCodecCtx->ticks_per_frame || decMng->avRationalVideo.num != decMng->pVideoCodecCtx->time_base.num || decMng->avRationalVideo.den != decMng->pVideoCodecCtx->time_base.den)
		{
			decMng->n32TicksPerFrame = decMng->pVideoCodecCtx->ticks_per_frame;
			decMng->avRationalVideo.num = decMng->pVideoCodecCtx->time_base.num;
			decMng->avRationalVideo.den = decMng->pVideoCodecCtx->time_base.den;
			decMng->n32MilliDuration = 1000 * av_q2d(decMng->pVideoCodecCtx->time_base) * decMng->pVideoCodecCtx->ticks_per_frame;
			fnSimpleLog_Comm("%s:: timebase num=%d den=%d ticks_per_frame=%d n32MilliDuration=%d", __FUNCTION__, decMng->pVideoCodecCtx->time_base.num, decMng->pVideoCodecCtx->time_base.den, decMng->pVideoCodecCtx->ticks_per_frame, decMng->n32MilliDuration);
		}

		// fnSimpleLog_Comm("%s:: decMng->nTimeStampLastSum=%lld decMng->nTimeStampLast=%lld", __FUNCTION__, decMng->nTimeStampLastSum, decMng->nTimeStampLast);
		decMng->fnCallbackVideo(decMng->szBuffer_Yuv, decMng->n32VideoSize, pFrame->best_effort_timestamp, pFrame->width, pFrame->height, decMng->n32Len_Y, decMng->n32Len_UV);
		decMng->n64LastPtsVideo = pFrame->best_effort_timestamp;
		
	/*printf("frame: key_frame:%d, cb:%p\n", pFrame->key_frame, decMng->fnCallbackAiInfo);
		if(pFrame->key_frame > 0 && decMng->fnCallbackAiInfo)
		{
			printf("callback ai info:: timestamp:%lld, width:%d, height:%d.\n", pFrame->best_effort_timestamp, pFrame->width, pFrame->height);
			static const char* szJson = TEST_AI_JSON;
			int nLenJson = strlen(szJson);
			decMng->fnCallbackAiInfo(0, pFrame->best_effort_timestamp, pFrame->width, pFrame->height, szJson, nLenJson);
		}*/
	} while (0);
	return nRet;
};

int fnProcessDecodedAudioFrame_Mng(ST_DecoderMng* decMng)
{
	int nRet = kErrorCode_Success;
	AVFrame* pFrame = decMng->pAvFrame;
	do {
		if (pFrame == NULL)
		{
			nRet = kErrorCode_Invalid_Param;
			break;
		}

		int nSampleSize = av_get_bytes_per_sample(decMng->pAudioCodecCtx->sample_fmt);
		if (nSampleSize < 0)
		{
			fnSimpleLog_Comm("%s:: Failed to calculate data size.", __FUNCTION__);
			nRet = kErrorCode_Invalid_Data;
			break;
		}

		int nAudioDataSize = pFrame->nb_samples * decMng->pAudioCodecCtx->channels * nSampleSize;
		if (decMng->szBuffer_Pcm == NULL)
		{
			decMng->n32BufferLen_Pcm = fnRoundUp_Comm(nAudioDataSize, 4);
			fnInitBuffer_Comm(&(decMng->szBuffer_Pcm), &(decMng->n32BufferLen_Pcm));
			// fnSimpleLog_Comm("%s:: Initial PCM buffer size %d.", __FUNCTION__, decMng->n32BufferLen_Pcm);
		}

		if (decMng->n32BufferLen_Pcm < (nAudioDataSize + decMng->n32BufferSize_Pcm))
		{
			int nTargetSize = fnRoundUp_Comm(nAudioDataSize, 4);
			fnSimpleLog_Comm("%s:: Current PCM buffer size %d not sufficient for data size %d, round up to target %d.",
				__FUNCTION__,
				decMng->n32BufferLen_Pcm,
				nAudioDataSize,
				nTargetSize);
			decMng->n32BufferLen_Pcm = nTargetSize;
			fnInitBuffer_Comm(&(decMng->szBuffer_Pcm), &(decMng->n32BufferLen_Pcm));
		}
		
		
		if(decMng->n32SampleFmt != decMng->pAudioCodecCtx->sample_fmt 
			|| decMng->n32Channels != decMng->pAudioCodecCtx->channels 
			|| decMng->n32SampleRate != decMng->pAudioCodecCtx->sample_rate)
		{
			int params[4] = { 0 };
			params[0] = 1;
			params[1] = decMng->pAudioCodecCtx->sample_fmt;
			params[2] = decMng->pAudioCodecCtx->channels;
			params[3] = decMng->pAudioCodecCtx->sample_rate;
			fnSimpleLog_Comm("%s:: decodeInfoCallback[%x] sample_fmt=%d channels=%d sample_ratet=%d params[%d].", __FUNCTION__, decMng->fnCallbackDecodeInfo, params[1], params[2], params[3], params);
			
			if (decMng->fnCallbackDecodeInfo != NULL)
			{
				decMng->fnCallbackDecodeInfo(Decoder_Recall_Type_Audio, params, 16);
			}
			
			decMng->n32SampleFmt = decMng->pAudioCodecCtx->sample_fmt;
			decMng->n32Channels = decMng->pAudioCodecCtx->channels;
			decMng->n32SampleRate = decMng->pAudioCodecCtx->sample_rate;
			decMng->n64PtsAudio = decMng->n64LastPtsI;
		}

		int i = 0;
		int ch = 0;
		int nOffset = decMng->n32BufferSize_Pcm;
		for (i = 0; i < pFrame->nb_samples; i++) {
			for (ch = 0; ch < decMng->pAudioCodecCtx->channels; ch++) {
				memcpy(decMng->szBuffer_Pcm + nOffset, pFrame->data[ch] + nSampleSize * i, nSampleSize);
				nOffset += nSampleSize;
			}
		}
		decMng->n32BufferSize_Pcm += nAudioDataSize;
		
		
		if (decMng->fnCallbackAudio != NULL && NULL != decMng->szBuffer_Pcm && decMng->n32BufferSize_Pcm > 0)
		{
			decMng->fnCallbackAudio(decMng->szBuffer_Pcm, decMng->n32BufferSize_Pcm, decMng->n64PtsAudio);//pFrame->best_effort_timestamp);
			decMng->n32BufferSize_Pcm = 0;
		}
		decMng->n64PtsAudio += pFrame->nb_samples * 1000 / decMng->pAudioCodecCtx->sample_rate;

		//dTimestamp = (double)frame->pts * av_q2d(decMng->pAudioCodecCtx->time_base);
		// double dTimestamp = pFrame->best_effort_timestamp;

		// if (decoder->accurateSeek && dTimestamp < decoder->beginTimeOffset) {
			// //fnSimpleLog_Comm("audio dTimestamp %lf < %lf", dTimestamp, decoder->beginTimeOffset);
			// nRet = kErrorCode_Old_Frame;
			// break;
		// }
		// if (decMng->fnCallbackAudio != NULL) {
			// decMng->fnCallbackAudio(decMng->szBuffer_Pcm, nAudioDataSize, pFrame->best_effort_timestamp);//dTimestamp);
		// }
	} while (0);
	return nRet;
}

int fnDecodePacket_Mng(ST_DecoderMng* decMng, const AVPacket* pkt, uint8_t isVideo)
{
	AVCodecContext* pDec = NULL;
	if(isVideo > 0)
	{
		pDec = decMng->pVideoCodecCtx;
	}
	else
	{
		// printf("%s::Audio.", __FUNCTION__);
		pDec = decMng->pAudioCodecCtx;
	}
	
	//fnSimpleLog_Comm("decodePacket begin. pDec[%x] pktdata[%02x], len=%d", pDec, pkt->data[0], pkt->size);
	int nRet = 0;
	// fnDecoder_Printf(__FUNCTION__, __LINE__, "pktData", pkt->data, 20);
	nRet = avcodec_send_packet(pDec, pkt);
	if (nRet < 0) {
		fnSimpleLog_Comm("%s:: Error sending a packet for decoding.nRet=%d pktData[%02x] pktSize=%d n32PktList_Count=%d.", __FUNCTION__, nRet, pkt->data[0], pkt->size, decMng->n32PktList_Count);
		int nNum = pkt->size > 50 ? 50 : pkt->size;
		fnDecoder_Printf(__FUNCTION__, __LINE__, "pkt", pkt->data, nNum);
		return kErrorCode_FFmpeg_Error;
	}

	int nCount = 1;
	int nRet_Tmp = 0;
	while (nRet_Tmp >= 0) {
		nRet_Tmp = avcodec_receive_frame(pDec, decMng->pAvFrame);
		// fnSimpleLog_Comm("avcodec_receive_frame after nRet_Tmp=%d.", nRet_Tmp);
		if (nRet_Tmp == AVERROR(EAGAIN))
		{
			// fnSimpleLog_Comm("%s:: AVERROR(EAGAIN).", __FUNCTION__);
			return kErrorCode_Success;
		}
		else if (nRet_Tmp == AVERROR_EOF)
		{
			fnSimpleLog_Comm("%s:: AVERROR_EOF.", __FUNCTION__);
			return kErrorCode_Eof;
		}
		else if (nRet_Tmp == AVERROR_INPUT_CHANGED)
		{
			fnSimpleLog_Comm("%s:: AVERROR_INPUT_CHANGED.", __FUNCTION__);
		}
		else if (nRet_Tmp < 0)
		{
			fnSimpleLog_Comm("%s:: Error during decoding %d.", __FUNCTION__, nRet_Tmp);
			return kErrorCode_FFmpeg_Error;
		}
		else {
			//fnSimpleLog_Comm("pDec->codec->type =%d.", pDec->codec->type);
			int nRetProc = pDec->codec->type == AVMEDIA_TYPE_VIDEO ? fnProcessDecodedVideoFrame_Mng(decMng) : fnProcessDecodedAudioFrame_Mng(decMng);
			if (nRetProc == kErrorCode_Old_Frame)
			{
				return nRetProc;
			}
			
			if (++nCount > 3)
			{
				fnSimpleLog_Comm("%s:: nCount[%d] > 3, nRet_Tmp=%d nRetProc=%d", __FUNCTION__, nCount, nRet_Tmp, nRetProc);
				break;
			}
		}
	}

	return kErrorCode_Success;
};



// ====================Functions Export================
int fnSetCbAi_Mng(ST_DecoderMng** ppDecMng, long cbAi)
{
	if(ppDecMng == NULL || (*ppDecMng) == NULL)
	{
		return kErrorCode_Success;
	}
	ST_DecoderMng* pDecMng = *ppDecMng;
	pDecMng->fnCallbackAiInfo = cbAi;
	return kErrorCode_Success;
}

int fnUninit_Mng(ST_DecoderMng** ppDecMng)
{
	if(ppDecMng == NULL || (*ppDecMng) == NULL)
	{
		return kErrorCode_Success;
	}
	
	ST_DecoderMng* pDecMng = *ppDecMng;
	if(pDecMng->pDecoder != NULL)
	{
		if(pDecMng->pDecoderFuncs != NULL)
		{
			pDecMng->pDecoderFuncs->fnUninit(&(pDecMng->pDecoder));
		}
		else
		{
			av_freep(&(pDecMng->pDecoder));
		}
	}
	pDecMng->pDecoderFuncs = NULL;
	
	if (pDecMng->pVideoCodecCtx != NULL)
	{
		avcodec_free_context(&(pDecMng->pVideoCodecCtx));
	}

	if (pDecMng->pAudioCodecCtx != NULL)
	{
		avcodec_free_context(&(pDecMng->pAudioCodecCtx));
	}
	
	pDecMng->fnCallbackVideo = NULL;
	pDecMng->fnCallbackAudio = NULL;
	pDecMng->fnCallbackRequest = NULL;
	pDecMng->fnCallbackDecodeInfo = NULL;
	pDecMng->fnCallbackAiInfo = NULL;
	
	if (pDecMng->szBuffer_Recv != NULL)
	{
		av_freep(&(pDecMng->szBuffer_Recv));
	}
	pDecMng->n32BufferLen_Recv = 0;
	pDecMng->n32BufferSize_Recv = 0;
	
	pDecMng->n8DataEnd = 0;

	if (pDecMng->pAvFrame != NULL) {
		av_frame_free(&(pDecMng->pAvFrame));
	}
	
	pDecMng->n8CheckPrint = 1;
	pDecMng->tInit = 0;
	
	pDecMng->n32Height = 0;
	pDecMng->n32Width = 0;
	pDecMng->n32Len_Y = 0;
	pDecMng->n32Len_UV = 0;
	pDecMng->n32Pix_Fmt = 0;
	pDecMng->n32VideoSize = 0;
	pDecMng->n8YuvHasKeyFrame = 0;
	pDecMng->n32TicksPerFrame = 0;
	
	pDecMng->n32SampleFmt = 0;
	pDecMng->n32Channels = 0;
	pDecMng->n32SampleRate = 0;

	if (pDecMng->szBuffer_Yuv != NULL) {
		av_freep(&pDecMng->szBuffer_Yuv);
	}
	pDecMng->n32BufferSize_Yuv = 0;

	if (pDecMng->szBuffer_Pcm != NULL) {
		av_freep(&pDecMng->szBuffer_Pcm);
	}
	pDecMng->n32BufferLen_Pcm = 0;
	pDecMng->n32BufferSize_Pcm = 0;
	
	AVPacketList* pPktList = NULL;
	while (1)
	{
		pPktList = fnGetFirstAVPacketList_Comm(&(pDecMng->pPktList_First), &(pDecMng->pPktList_Last), &(pDecMng->n32PktList_Count));
		if (pPktList == NULL)
		{
			break;
		}
		av_packet_unref(&(pPktList->pkt));
		av_freep(&pPktList);
	}
	pDecMng->n32PktList_Count = 0;
	
	av_freep(ppDecMng);
	av_log_set_callback(NULL);
	return kErrorCode_Success;
};

int fnInit_Mng(ST_DecoderMng** ppDecMng, ST_DecoderFuncs* funcs, long cbVideo, long cbAudio, long cbRequest, long cbDecodeInfo)
{
	if(0 == g_bVerPrint)
	{
		const char* szVersion = fnGetCurVersion();
		PRINTF_FONT_BLU
		printf("PLAYER-VERSION: %s\n", szVersion);
		PRINTF_FONT_BLA
		g_bVerPrint = 1;
	}
	
	if(ppDecMng == NULL || funcs == NULL)
	{
		return kErrorCode_NULL_Pointer;
	}
	
	int nRet = kErrorCode_Success;
	ST_DecoderMng* pDecMng = *ppDecMng;
	do{
		if(pDecMng != NULL)
		{
			fnUninit_Mng(ppDecMng);
		}
		
		*ppDecMng = av_mallocz(sizeof(ST_DecoderMng));
		if(*ppDecMng == NULL)
		{
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		pDecMng = *ppDecMng;
		
		pDecMng->pDecoderFuncs = funcs;
		pDecMng->pDecoder = av_mallocz(funcs->n32PrivData);
		if(funcs->fnInit != NULL)
		{
			nRet = funcs->fnInit(&(pDecMng->pDecoder));
		}
		pDecMng->enumState = Decoder_State_Init;
		
	}while(0);
	
	if(nRet != kErrorCode_Success)
	{
		fnUninit_Mng(ppDecMng);
	}
	else
	{
		pDecMng->fnCallbackVideo = cbVideo;
		pDecMng->fnCallbackAudio = cbAudio;
		pDecMng->fnCallbackRequest = cbRequest;
		pDecMng->fnCallbackDecodeInfo = cbDecodeInfo;
		pDecMng->fnCallbackAiInfo = NULL;
		
		pDecMng->n32Height = g_n32Height_Default;
		pDecMng->n32Width = g_n32Width_Default;
	
		memset(pDecMng->sUrl, 0, sizeof(pDecMng->sUrl));
		memset(pDecMng->sVersion, 0, sizeof(pDecMng->sVersion));
		memset(pDecMng->sUUID, 0, sizeof(pDecMng->sUUID));
		memset(pDecMng->sDomains, 0, sizeof(pDecMng->sDomains));
		pDecMng->nDomainNum = 0;
		pDecMng->tInit = time(NULL);
		pDecMng->tExpiration = pDecMng->tInit + Auth_Play_Time_Min_Def * 60;//默认授权5分钟
		pDecMng->tExpirationSet = pDecMng->tExpiration + 1;
		pDecMng->n8AuthType = 0;
		pDecMng->n8CheckPrint = 1;
		pDecMng->n64LastPtsVideo = 0;
		pDecMng->n64LastPtsI = 0;
	}
	
	return nRet;
};

int fnSendData_Mng(ST_DecoderMng* decMng, uint8_t* buff, int size)
{
	if(decMng->pDecoderFuncs == NULL || decMng->pDecoderFuncs->fnDealStreamData == NULL)
	{
		return kErrorCode_NULL_Pointer;
	}
	
	int nRet = fnCheckAuthTime(decMng);
	if(0 == nRet)
	{
		return decMng->pDecoderFuncs->fnDealStreamData(decMng, buff, size);
	}
	if(0 > nRet)
	{
		return kErrorCode_Auth;
	}
	
	decMng->pDecoderFuncs->fnDealStreamData(decMng, buff, size);
	return kErrorCode_AuthRefresh;
};

int fnDecoderOnePacket_Mng(ST_DecoderMng* decMng)
{
	if(decMng->pDecoderFuncs == NULL || decMng->pDecoderFuncs->fnDecodeOnePacket == NULL)
	{
		return kErrorCode_NULL_Pointer;
	}
	return decMng->pDecoderFuncs->fnDecodeOnePacket(decMng);
};

int fnGetNumOfPktList_Mng(ST_DecoderMng* decMng)
{
	if(decMng == NULL)
	{
		return 0;
	}
	return decMng->n32PktList_Count;
};

int fnGetDurationOfPktList_Mng(ST_DecoderMng* decMng)
{
	if(decMng == NULL || decMng->n32PktList_Count <= 0)
	{
		return 0;
	}
	
	int64_t nDuration = decMng->pPktList_Last->pkt.dts - decMng->pPktList_First->pkt.dts;
	return FFMAX(nDuration, 0);
};

int fnParseLenChar(const char val)
{
	int nLen = 0;
	if('0' <= val && '9' >= val)
	{
		nLen = val - '0';
	}
	else if('a' <= val && 'z' >= val)
	{
		nLen = val - 'a' + 10;
	}
	else if('A' <= val && 'Z' >= val)
	{
		nLen = val - 'A' + 36;
	}
	return nLen;
}

int fnDecAesBase64(uint8_t** dst, const char* key, const char* iv, char* in, const int len)
{
	char szCheck[64] = { 0 };
	memcpy(szCheck, in, LICCODE_CHECK_LEN);
	char* pVal = in + LICCODE_CHECK_LEN;
	int nLenVal = len - LICCODE_CHECK_LEN;
	for(int i = 0; i < nLenVal; ++i)
	{
		if('b' <= pVal[i] && pVal[i] <= 'z')
		{
			pVal[i] = pVal[i] - 33;
		}
		else if(':' == pVal[i])
		{
			pVal[i] = 'Z';
		}
		else if('B' <= pVal[i] && pVal[i] <= 'Z')
		{
			pVal[i] = pVal[i] + 32;
		}
		else if('.' == pVal[i])
		{
			pVal[i] = 'a';
		}
		else if(',' == pVal[i])
		{
			pVal[i] = '+';
		}
		else if(';' == pVal[i])
		{
			pVal[i] = '/';
		}
		else if('0' <= pVal[i] && pVal[i] <= '9')
		{
			pVal[i] = pVal[i] + 5;
			if('9' < pVal[i])
			{
				pVal[i] -= 10;
			}
		}
		else
		{
			pVal[i] = pVal[i];
		}
	}
	
	int nLenSrc = (nLenVal * 3 + 3) / 4 + 16;
	uint8_t *pSrc = av_mallocz(nLenSrc);
	nLenSrc = av_base64_decode(pSrc, pVal, nLenSrc);
	if(0 > nLenSrc)
	{
		av_freep(&pSrc);
		return -1;
	}
	
	char szKey[256] = { 0 };
	sprintf(szKey, "%s%s", key, szCheck);
	
	uint8_t pIv[256] = { 0 };
	sprintf(pIv, "%s%s", iv, szCheck);
	
	struct AVAES* pAes = av_aes_alloc();
	av_aes_init(pAes, szKey, 256, 1);
	int nCount = (nLenSrc + 15) / 16;
	char* pDst = pSrc;
	av_aes_crypt(pAes, pDst, pSrc, nCount, pIv, 1);
	
	uint8_t nPadding = pDst[nLenSrc - 1];
	if(0 < nPadding && 16 > nPadding)
	{
		char* pIndex = pDst + nLenSrc - 1;
		int i = 0;
		for (i = 0; i < nPadding; ++i)
		{
			if (pIndex[0] != nPadding)
			{
				break;
			}
			--pIndex;
		}
		
		if(i == nPadding)
		{
			pIndex[1] = 0;
			nLenSrc -= nPadding;
		}
	}
	
	av_free(pAes);
	*dst = pDst;
	return 0;
}

int fnVersionToTime(const char* version, char dateTime[64])
{
	if(NULL == version || NULL == dateTime)
	{
		return -1;
	}
	
	int nLen = strlen(version);
	
	char szDate[64] = { 0 };
	char szTime[64] = { 0 };
	int nTime = 0;
	
	int nFind = 0;
	int nCount = 0;
	int nLenVal = 0;
	int nIdx_From = 0;
	for(int nIdx_now = 0; nIdx_now < nLen; ++nIdx_now)
	{
		if(version[nIdx_now] == '.' || nIdx_now == (nLen - 1))
		{
			++nCount;
			nLenVal = nIdx_now - nIdx_From;
			if(nIdx_now == (nLen - 1))
			{
				++nLenVal;
			}
			
			if(0 < nLenVal)
			{
				switch(nCount)
				{
					case 3:
					{
						if(8 == nLenVal)
						{
							memcpy(szDate, version + nIdx_From, nLenVal);
							nFind |= 0x01;
						}
					}
					break;
					case 4:
					{
						memcpy(szTime, version + nIdx_From, nLenVal);
						nTime = atoi(szTime);
						nFind |= 0x02;
					}
					break;
				}
			}
			nIdx_From = nIdx_now + 1;
		}
	}
	
	if((nFind & 0x03) != 0x03)
	{
		return -2;
	}
	
	memset(dateTime, 0, 64);
	int nYear, nMon, nDay, nHour, nMin, nSec;
	sscanf(szDate, "%4d%2d%2d", &nYear, &nMon, &nDay);
	nHour = nTime / 3600;
	nMin = nTime % 3600 / 60;
	nSec = nTime % 60;
	sprintf(dateTime, "%4d-%02d-%02d %02d:%02d:%02d", nYear, nMon, nDay, nHour, nMin, nSec);
	return 0;
}

// uuid方式去掉A0后的解密
int fnDecLicence_A0(char** licenceDst, char* licence, const int len)
{
	uint8_t* pDst = NULL;
	if(0 > fnDecAesBase64(&pDst, AUTH_LIC_AES_KEY_PRE, AUTH_LIC_AES_IV_PRE, licence, len))
	{
		return -1;
	}
	
	*licenceDst = pDst;
	return 0;
}

// Licence解码 uuid方式
int fnDecLicence(char** licenceDst, char* licence, const int len)
{
	if(7 > len)
	{
		return -100;
	}
	
	char szDecVer[3] = {0};
	memcpy(szDecVer, licence, 2);
	switch(szDecVer[0])
	{
		case 'A':
		{
			switch(szDecVer[1])
			{
				case '0':
				{
					return 0 > fnDecLicence_A0(licenceDst, licence + 2, len - 2) ? -102 : 1;
				}
				break;
				default:
					return -101;
				break;
			}
		}
		break;
		default:
			return -101;
		break;
	}
};

time_t fnExchangeDate(const char* date)
{
	time_t tDate = time(NULL) + 10 * 60;
	if(NULL == date || 8 != strlen(date))
	{
		return tDate;
	}
	
	int nTmp = 0;
	for(int i = 0; i < 8; ++i)
	{
		if('0' > date[i] || '9' < date[i])
		{
			return tDate;
		}
		
		nTmp = nTmp * 10 + (date[i] - '0');
	}
	
	struct tm tmDate = {0};
	tmDate.tm_year = nTmp / 10000 - 1900;
	if(0 > tmDate.tm_year)
	{
		return tDate;
	}
	nTmp %= 10000;
	tmDate.tm_mon = nTmp / 100 - 1;
	if(0 > tmDate.tm_mon || 11 < tmDate.tm_mon)
	{
		return tDate;
	}
	tmDate.tm_mon = nTmp % 100;
	tDate = mktime(&tmDate);
	return tDate;
}

int fnCheckAuthTime(ST_DecoderMng* decMng)
{
	time_t tNow = time(NULL);
	if(tNow > decMng->tExpirationSet && tNow > decMng->tNxtAuthCode)
	{
		decMng->tNxtAuthCode = tNow + 30;
		if(0 < decMng->n8AuthType)
		{
			return tNow < decMng->tExpiration ? 1 : -1;
		}
		
		PRINTF_FONT_RED
		printf("Error of your authorization, please contact us and get a new one.\n");
		PRINTF_FONT_BLA
		return -1;
	}
	return 0;
}

int fnGetParamsFromLic(ST_DecoderMng* decMng, char* licence, int len, const char separator)
{
	const char* sKey_Uuid = LICCODE_KEY_UUID;
	const char* sKey_Authcode = LICCODE_KEY_AUTHCODE;
	const char* sKey_Expiration = LICCODE_KEY_EXPIRETIME;
	const char* sKey_Domain = LICCODE_KEY_DOMAIN;
	char* pKey = NULL;
	int nKey_from = 0;
	int nKey_len = 0;
	char* pVal = NULL;
	int nVal_from = 0;
	int nVal_len = 0;
	
	const char* sKey[4] = { sKey_Uuid, sKey_Authcode, sKey_Expiration, sKey_Domain };
	char sValue[4][128] = { 0 };
	int nKeyNum = 4;
	int nFindKeySign = 0;
	
	for(int nIndex_now = 0; nIndex_now < len; ++nIndex_now)
	{
		if(licence[nIndex_now] == LICCODE_TO)
		{
			nKey_len = nIndex_now - nKey_from;
			licence[nIndex_now] = '\0';
			nVal_from = nIndex_now + 1;
		}
		
		if(licence[nIndex_now] == separator || nIndex_now == (len - 1))
		{
			nVal_len = nIndex_now - nVal_from;
			if(0 < nKey_len && 0 < nVal_len && 128 > nVal_len)
			{
				pKey = licence + nKey_from;
				pVal = licence + nVal_from;
				
				for(int nIdxKey = 0; nIdxKey < nKeyNum; ++nIdxKey)
				{
					if(0 == strcmp(pKey, sKey[nIdxKey]))
					{
						memcpy(sValue[nIdxKey], pVal, nVal_len);
						nFindKeySign |= 0x01 << nIdxKey;
						break;
					}
				}
			}
			nKey_from = nIndex_now + 1;
			nKey_len = 0;
			nVal_from = 0;
			nVal_len = 0;
		}
	}

	// 表明sKey_Uuid、sKey_Authcode、sKey_Expiration其中有1个或多个未找到
	if(0x07 > nFindKeySign)
	{
		fnSimpleLog_Comm("one of UUID/AUTHCODE/EXPIRATEION is not find, sign: %d.", nFindKeySign);
		return -1;
	}

	// sKey_Authcode不为0，表示鉴权失败
	if(0 != strcmp(sValue[1], "0"))
	{
		fnSimpleLog_Comm("authcode check failed, AUTHCODE: %s.", sValue[1]);
		return -2;
	}

	// licence里的uuid与传入的uuid不匹配，说明有人在乱用，不允许播放
	if(0 != strcmp(sValue[0], decMng->sUUID))
	{
		fnSimpleLog_Comm("uuid match failed, UUIDOfAuth: %s, uuid: %s.", sValue[0], decMng->sUUID);
		return -3;
	}

	fnSimpleLog_Comm("info of lic: val0=%s, val1=%s, val2=%s, val3=%s.", sValue[0],sValue[1],sValue[2],sValue[3]);

	int nLenDomain = strlen(sValue[3]);
	if(nLenDomain > 0)
	{
		nLenDomain = nLenDomain > 127 ? 127 : nLenDomain;
		memcpy(decMng->sDomains[0], sValue[3], nLenDomain);
		decMng->nDomainNum = 1;
		#if 1
		char* pFind = strstr(decMng->sDomains[0], decMng->sUrl);
		if(NULL == pFind){
			fnSimpleLog_Comm("domain of current web page is illegal, domain: %s.", decMng->sUrl);
			return -4;
		}
		#endif
	}
	
	time_t tNow = time(NULL);
	decMng->tNxtAuthCode = 0;
	time_t tSet = atoll(sValue[2]);
	decMng->tExpirationSet = tSet;
	time_t tSub = decMng->tExpirationSet - tNow;
	int nDay = tSub / 86400;
	int nHour = tSub % 86400 / 3600;
	int nMin = tSub % 3600 / 60;
	if(decMng->tExpirationSet < tNow)
	{
		int nMinLeft = tSet > tNow ? ((tSet - tNow)/60) : 0;
		PRINTF_FONT_PUR
		printf("WARNING: Player Will Be Stopped In %d Minutes.\n", nMinLeft);
		PRINTF_FONT_RED
		printf("ERROR: Your Authentication Has Expired. Please Contact Us And Get A New One.\n");
		PRINTF_FONT_BLA
		
		return -5;
	}
	else if(nDay < 30)
	{
		PRINTF_FONT_PUR
		printf("WARNING: There Are Only %d Days %02d Hours %02d Minutes Left To Expired. Please Contact Us And Get A New One As Soon As Possible In Case Of Affecting Your Business.\n", nDay, nHour, nMin);
		PRINTF_FONT_BLA
	}
	else
	{
		fnSimpleLog_Comm("%d Days %02d Hours %02d Minutes Left To Expired.", nDay, nHour, nMin);
	}
	
	decMng->tExpiration = decMng->tExpirationSet;
	return 0;
};

const char* fnGetCurVersion_Mng(ST_DecoderMng* decMng)
{
	if(NULL == decMng)
	{
		return fnGetCurVersion();
	}
	
	if(0 != strlen(decMng->sVersion))
	{
		return decMng->sVersion;
	}
	
	const char* szVersion = fnGetCurVersion();
	if(NULL == szVersion)
	{
		return NULL;
	}
	memcpy(decMng->sVersion, szVersion, strlen(szVersion));
	return decMng->sVersion;
};

int fnSetUuid_Mng(ST_DecoderMng* decMng, char* uuid, const int size)
{
	if(decMng == NULL || uuid == NULL || 3 > size)
	{
		fnSimpleLog_Comm("%s:: error", __FUNCTION__);
		return -1;
	}
	memcpy(decMng->sUUID, uuid, size);
	decMng->sUUID[size] = 0;
	return 0;
}

int fnAuth_Mng(ST_DecoderMng* decMng, char* auth, const int size)
{
	if(decMng == NULL || auth == NULL || 3 > size || 511 < size)
	{
		fnSimpleLog_Comm("%s:: error", __FUNCTION__);
		return -1;
	}
	
	char szTmp[512] = {0};
	memcpy(szTmp, auth, size);
	
	int nRet = 0;
	char* szKeys = NULL;
	nRet = fnDecLicence(&szKeys, szTmp, size); // 
	if(0 > nRet)
	{
		PRINTF_FONT_RED
		printf("ERROR[%d]: Error Of Your Authentication. Please Contact Us And Get A New One.\n", nRet);
		PRINTF_FONT_BLA
		return nRet;
	}
	
	
	decMng->n8AuthType = nRet;
	char cSeparator = LICCODE_SEPARATOR;
	int nLenKeys = strlen(szKeys);
	nRet = fnGetParamsFromLic(decMng, szKeys, nLenKeys, cSeparator);
	if(0 > nRet)
	{
		PRINTF_FONT_RED
		printf("ERROR[%d]: The Authentication Information You Used Is Invalid. Please Contact Us And Get A New One.\n", nRet);
		PRINTF_FONT_BLA
	}
	else
	{
		struct tm tmExpire = *localtime(&decMng->tExpirationSet);
		fnSimpleLog_Comm("Expiration= %04d-%02d-%02d %02d:%02d:%02d", (tmExpire.tm_year + 1900), (tmExpire.tm_mon + 1), tmExpire.tm_mday, tmExpire.tm_hour, tmExpire.tm_min, tmExpire.tm_sec);
	}
	
	av_freep(&szKeys);
	return nRet;
};