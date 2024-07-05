
#include "decoderHls.h"


ST_DecoderFuncs g_stDecoderFuncs_HLS = {
	.n32PrivData = sizeof(ST_DecoderHLS),
	.fnDealStreamData = fnDealStreamData_HLS,
	.fnInit = fnInit_HLS,
	.fnUninit = fnUninit_HLS,
	// .fnClose = fnClose_HLS,
	.fnDecodeOnePacket = fnDecodeOnePacket_HLS,
	.enumStreamType = STREAM_TYPE_HLS,
};



// ==================== Functions ================

int fnGetCodecIDFromEsType_HLS(uint8_t esType, ST_PID_INFO* pPidInfo)
{
	int nCodec_id = AV_CODEC_ID_NONE;
	uint8_t nType = AVMEDIA_TYPE_AUDIO;
	switch (esType)
	{
	case STREAM_TYPE_VIDEO_MPEG4:
		nCodec_id = AV_CODEC_ID_MPEG4;
		nType = AVMEDIA_TYPE_VIDEO;
		break;
	case STREAM_TYPE_VIDEO_H264:
		nCodec_id = AV_CODEC_ID_H264;
		nType = AVMEDIA_TYPE_VIDEO;
		break;
	case STREAM_TYPE_VIDEO_HEVC:
		nCodec_id = AV_CODEC_ID_HEVC;
		nType = AVMEDIA_TYPE_VIDEO;
		break;
	case STREAM_TYPE_AUDIO_AAC:
		nCodec_id = AV_CODEC_ID_AAC;
		nType = AVMEDIA_TYPE_AUDIO;
		break;
	case STREAM_TYPE_AUDIO_MPEG1:
	case STREAM_TYPE_AUDIO_MPEG2:
		nCodec_id = AV_CODEC_ID_MP3;
		nType = AVMEDIA_TYPE_AUDIO;
		break;
	case STREAM_TYPE_AUDIO_AC3:
		nCodec_id = AV_CODEC_ID_AC3;
		nType = AVMEDIA_TYPE_AUDIO;
		break;
	case 0x88:
		nCodec_id = AV_CODEC_ID_PCM_ALAW;
		nType = AVMEDIA_TYPE_AUDIO;
		break;
	default:
		break;
	}

	if (pPidInfo != NULL)
	{
		pPidInfo->nEsType = esType;
		pPidInfo->nCodecId = nCodec_id;
		pPidInfo->nType = nType;
	}
	// fnSimpleLog_Comm("%s:[%d]:: nEsType=%d nCodecId=%d nType=%d.", __FUNCTION__, __LINE__, esType, nCodec_id, nType);
	return nCodec_id;
};

void fnClearToDefault_HLS(ST_DecoderHLS* decHls)
{
	if(decHls == NULL)
	{
		fnSimpleLog_Comm("%s:[%d]:: decHls == NULL.", __FUNCTION__, __LINE__);
		return;
	}
	
	if (decHls->pFifoVideo != NULL)
	{
		av_fifo_freep(&(decHls->pFifoVideo));
	}
	
	if (decHls->pFifoAudio != NULL)
	{
		av_fifo_freep(&(decHls->pFifoAudio));
	}
	
	for (int i = 0; i < NB_PID_MAX; ++i)
	{
		if (decHls->pSTPidInfos[i] != NULL)
		{
			av_freep(&(decHls->pSTPidInfos[i]));
		}
	}
	
	decHls->n64Pts = 0;
	decHls->n64Dts = 0;

	decHls->n32PidPmt = 0;
	decHls->nTsState = TS_STATE_PAT;

	decHls->n32PidFifoVideo = 0;
	decHls->n32PidFifoAudio = 0;
	fnSimpleLog_Comm("%s:[%d]:: Clear To Default.", __FUNCTION__, __LINE__);
};


int fnGetAdtsHeaderInfo_HLS(ST_AACADTSHeader* adts, uint8_t* buff, int len)
{
	if (len < 7)
	{
		return -1;
	}

	int crc_abs = buff[1] & 0x01;
	int aot = (buff[2] >> 6) & 0x03;//2 aac
	int sr = (buff[2] >> 2) & 0x0F;//4 采样率
	int ch = ((buff[2] & 0x01) << 2) | ((buff[3] >> 6) & 0x03);//channels
	uint32_t size = ((buff[3] & 0x03) << 11) | (buff[4] << 3) | ((buff[5] >> 5) & 0x07);
	int rdb = buff[6] & 0x03;

	const int avpriv_mpeg4audio_sample_rates[16] = {
	96000, 88200, 64000, 48000, 44100, 32000,
	24000, 22050, 16000, 12000, 11025, 8000, 7350
	};
	adts->sample_rate = avpriv_mpeg4audio_sample_rates[sr];
	adts->samples = (rdb + 1) * 1024;
	adts->size = size;
	adts->crc_absent = crc_abs;
	adts->object_type = aot + 1;
	adts->chan_config = ch;
	return 0;
}



//////////////////////////////////Export methods////////////////////////////////////////
int fnUninit_HLS(void** dec)
{
	fnSimpleLog_Comm("%s:: uninitializing.", __FUNCTION__);
	if(dec == NULL)
	{
		return kErrorCode_Success;
	}
	
	int nRet = kErrorCode_Success;
	do{
		ST_DecoderHLS* pDecHls = *dec;
		fnClearToDefault_HLS(pDecHls);
	}while(0);
	
	av_freep(dec);
	return nRet;
};

int fnInit_HLS(void** dec)
{
	int nRet = kErrorCode_Success;
	do {

		if(dec == NULL)
		{
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		ST_DecoderHLS* pDecHls = *dec;
		if(pDecHls == NULL)
		{
			*dec = av_mallocz(sizeof(ST_DecoderHLS));
			if(*dec == NULL)
			{
				nRet = kErrorCode_NULL_Pointer;
				break;
			}
			pDecHls = *dec;
		}
		
		fnClearToDefault_HLS(pDecHls);
	} while (0);
	fnSimpleLog_Comm("%s:: nRet=%d.", __FUNCTION__, nRet);
	return nRet;
};

int fnDealStreamData_HLS(ST_DecoderMng* decMng, unsigned char* buff, int size)
{
	int nRet = kErrorCode_Success;
	do {
		if(decMng == NULL)
		{
			fnSimpleLog_Comm("%s:[%d]::error decMng == NULL", __FUNCTION__, __LINE__);
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		if(decMng->szBuffer_Recv == NULL)
		{
			fnInitBuffer_Comm(&(decMng->szBuffer_Recv), &(decMng->n32BufferSize_Recv));
			decMng->n32BufferLen_Recv = 0;
		}
		
		ST_DecoderHLS* pDecHls = decMng->pDecoder;
		if(pDecHls == NULL)
		{
			fnSimpleLog_Comm("%s:[%d]::error pDecHls == NULL", __FUNCTION__, __LINE__);
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		int nOffSet = 0;
        int nLen = size + decMng->n32BufferLen_Recv;
		int nLenLeft = nLen - nOffSet;
		while (nLenLeft >= 188)
		{
			unsigned char szTs[188] = { 0 };
			fnReadBytes_Comm(szTs, 188, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, nOffSet);
			// fnDecoder_Printf(__FUNCTION__, __LINE__, "szTs", szTs, 188);
			int nOffSetOnce = 188;
			if (szTs[0] != 0x47)
			{
				fnSimpleLog_Comm("%s:[%d]::error szTs_0[0x%X] != 0x47", __FUNCTION__, __LINE__, szTs[0]);
				int nSearch = 1;
				for (; nSearch < 188; ++nSearch)
				{
					if (szTs[nSearch] == 0x47)
					{
						break;
					}
				}
				nOffSet += nSearch;
				nLenLeft -= nSearch;
				continue;
			}

			uint8_t bStart = szTs[1] & 0x40;
			int nPid = fnReadB2_Comm(szTs, 1) & 0x1FFF;
			char cAdaptation = (szTs[3] >> 4) & 0x03;
			if (nPid == 0x000)
			{
				pDecHls->nTsState = TS_STATE_PAT;
				AVPacketList* pPktList = fnCreatePacketFromFifoBuffer_Comm(pDecHls->pFifoVideo, pDecHls->n32PidFifoVideo, pDecHls->n64Pts, pDecHls->n64Dts);
				fnPacketPut_Mng(decMng, pPktList);
				pPktList = fnCreatePacketFromFifoBuffer_Comm(pDecHls->pFifoAudio, pDecHls->n32PidFifoAudio, pDecHls->n64Pts, pDecHls->n64Dts);
				fnPacketPut_Mng(decMng, pPktList);
			}

			int nIndex = 4;
			switch (pDecHls->nTsState)
			{
			case TS_STATE_PAT:
			{
				if (nPid != 0x000)
				{
					fnSimpleLog_Comm("%s:[%d]::error nPid[0x%X] != 0x000", __FUNCTION__, __LINE__, nPid);
					break;
				}

				if (szTs[nIndex++] != 0x00)
				{
					fnSimpleLog_Comm("%s:[%d]::error szTs_%d[0x%X] != 0x00", __FUNCTION__, __LINE__, (nIndex - 1), szTs[nIndex - 1]);
					break;
				}

				if (szTs[nIndex] == 0x00)
				{
					++nIndex;
				}

				char c1011 = szTs[nIndex] >> 4 & 0x0f;
				if (c1011 != 0x0B)
				{
					fnSimpleLog_Comm("%s:[%d]::error c1011[0x%X] != 0x0B", __FUNCTION__, __LINE__, c1011);
					break;
				}

				int nLenSection = fnReadB2_Comm(szTs, nIndex) & 0x0FFF;
				++nIndex;

				if (nLenSection + (++nIndex) > 188)
				{
					fnSimpleLog_Comm("%s:[%d]::error nLenSection[%d] + (++nIndex)[%d] > 188", __FUNCTION__, __LINE__, nLenSection, nIndex);
					break;
				}

				if (szTs[nIndex] != 0x00
					|| szTs[++nIndex] != 0x01
					|| szTs[++nIndex] != 0xc1
					|| szTs[++nIndex] != 0x00
					|| szTs[++nIndex] != 0x00)
				{
					fnSimpleLog_Comm("%s:[%d]::error szTs+%d[0x%X,0x%X,0x%X,0x%X] != 0x00,0x01,0xC1,0x00,0x00", __FUNCTION__, __LINE__, (nIndex - 4), szTs[nIndex - 4], szTs[nIndex - 3], szTs[nIndex - 2], szTs[nIndex - 1], szTs[nIndex]);
					break;
				}

				nLenSection -= 5 + 4;
				if (nLenSection >= 4)
				{
					while (nLenSection >= 4)
					{
						int nProgNum = fnReadB2_Comm(szTs, ++nIndex);
						++nIndex;
						int nPidPmt = fnReadB2_Comm(szTs, ++nIndex);
						nPidPmt &= 0x1fff;
						++nIndex;
						pDecHls->n32PidPmt = nPidPmt;
						nLenSection -= 4;
					}
					pDecHls->nTsState = TS_STATE_PMT;
				}
			}
			break;
			case TS_STATE_PMT:
			{
				if (nPid != pDecHls->n32PidPmt)
				{
					fnSimpleLog_Comm("%s:[%d]::error nPid[0x%X] != pDecHls->n32PidPmt[0x%X]", __FUNCTION__, __LINE__, nPid, pDecHls->n32PidPmt);
					break;
				}

				if (szTs[nIndex] == 0x00)
				{
					++nIndex;
				}

				if (szTs[nIndex++] != 0x02)
				{
					fnSimpleLog_Comm("%s:[%d]::error szTs_%d[0x%X] != 0x02", __FUNCTION__, __LINE__, (nIndex - 1), szTs[nIndex - 1]);
					break;
				}

				char c1011 = (szTs[nIndex] >> 4) & 0x0f;
				if (c1011 != 0x0B)
				{
					fnSimpleLog_Comm("%s:[%d]::error c1011[0x%X] != 0x0B", __FUNCTION__, __LINE__, c1011);
					break;
				}

				int nLenSection = fnReadB2_Comm(szTs, nIndex) & 0x0FFF;
				++nIndex;
				if (nLenSection + (++nIndex) > 188)
				{
					fnSimpleLog_Comm("%s:[%d]::error nLenSection[%d] + (++nIndex)[%d] > 188", __FUNCTION__, __LINE__, nLenSection, nIndex);
					break;
				}

				unsigned char *pTs_old = szTs;
				if (szTs[nIndex] != 0x00
					|| szTs[++nIndex] != 0x01
					|| (szTs[++nIndex] & 0xc1) != 0xc1
					|| szTs[++nIndex] != 0x00
					|| szTs[++nIndex] != 0x00)
				{
					fnSimpleLog_Comm("%s:[%d]::error pTs_old[0x%X,0x%X,0x%X,0x%X,0x%X] != 0x00,0x01,0xC1,0x00,0x00", __FUNCTION__, __LINE__, pTs_old[0], pTs_old[1], pTs_old[2], pTs_old[3], pTs_old[4]);
					break;
				}

				int nPidVideo = fnReadB2_Comm(szTs, ++nIndex) & 0x1FFF;
				// printf("%s:: nPidVideo=%d\n", __FUNCTION__, nPidVideo);
				++nIndex;
				int nLenProgInfo = fnReadB2_Comm(szTs, ++nIndex) & 0x0FFF;
				++nIndex;
				nIndex += nLenProgInfo;

				nLenSection -= 5 + 2 + 2 + nLenProgInfo + 4;
				if (nLenSection >= 5)
				{
					while (nLenSection >= 5)
					{
						uint8_t nEsType = szTs[++nIndex];
						int nPidStream = fnReadB2_Comm(szTs, ++nIndex) & 0x1FFF;
						++nIndex;
						// printf("%s:: nPidStream=%d\n", __FUNCTION__, nPidStream);
						ST_PID_INFO* pPidInfo = pDecHls->pSTPidInfos[nPidStream];
						if (pPidInfo == NULL)
						{
							pPidInfo = av_mallocz(sizeof(ST_PID_INFO));
							pPidInfo->nPid = nPidStream;
							fnGetCodecIDFromEsType_HLS(nEsType, pPidInfo);
							pDecHls->pSTPidInfos[nPidStream] = pPidInfo;
						}

						int nLenEsInfo = fnReadB2_Comm(szTs, ++nIndex) & 0x0FFF;
						++nIndex;
						nLenSection -= 5;
						nLenSection -= nLenEsInfo;
						nIndex += nLenEsInfo; // Add by Lite on 2021-03-23, not update to wasm
					}
					pDecHls->nTsState = TS_STATE_PES;
				}
			}
			break;
			case TS_STATE_PES:
			{
				// fnSimpleLog_Comm("%s:[%d]:: nPid=%d.", __FUNCTION__, __LINE__, nPid);
				nIndex = 3;
				ST_PID_INFO* pPidInfo = pDecHls->pSTPidInfos[nPid];
				if (pPidInfo == NULL)
				{
					fnSimpleLog_Comm("%s:[%d]::error pPidInfo == NULL", __FUNCTION__, __LINE__);
					break;
				}

				// fnSimpleLog_Comm("%s:[%d]:: nType=%d nCodecId=%d.", __FUNCTION__, __LINE__, pPidInfo->nType, pPidInfo->nCodecId);
				AVFifoBuffer** ppFifoBuf = NULL;
				int* pPidFifo = NULL;
				if (pPidInfo->nType == AVMEDIA_TYPE_VIDEO)
				{
					ppFifoBuf = &(pDecHls->pFifoVideo);
					pPidFifo = &(pDecHls->n32PidFifoVideo);
				}
				else if (pPidInfo->nType == AVMEDIA_TYPE_AUDIO)
				{
					ppFifoBuf = &(pDecHls->pFifoAudio);
					pPidFifo = &(pDecHls->n32PidFifoAudio);
				}
				else
				{
					fnSimpleLog_Comm("%s:[%d]::error pPidInfo->nType[%d] unknow", __FUNCTION__, __LINE__, pPidInfo->nType);
					break;
				}
				AVFifoBuffer* pFifoBuf = *ppFifoBuf;
				int nPidFifo = *pPidFifo;

				// printf("%s:: nPid=%d nPidFifo=%d bStart=%d\n", __FUNCTION__, nPid, nPidFifo, bStart);
				if (nPid != nPidFifo || bStart > 0)
				{
					AVPacketList* pPktList = fnCreatePacketFromFifoBuffer_Comm(pFifoBuf, nPid, pDecHls->n64Pts, pDecHls->n64Dts);
					fnPacketPut_Mng(decMng, pPktList);

					*pPidFifo = nPid;
				}

				int nLeftTs = 188 - 4;
				if (cAdaptation == 0x02 || cAdaptation == 0x03)
				{
					int nLenAdaptation = szTs[++nIndex];
					nIndex += nLenAdaptation;
					nLeftTs -= (1 + nLenAdaptation);
				}

				if (cAdaptation == 0x01 || cAdaptation == 0x03)
				{
					if (bStart > 0)
					{
						if (szTs[++nIndex] != 0x00 || szTs[++nIndex] != 0x00 || szTs[++nIndex] != 0x01)
						{
							fnSimpleLog_Comm("%s:[%d]::error PES begin sign: szTs+%d[0x%X,0x%X,0x%X] != 0x00,0x00,0x01", __FUNCTION__, __LINE__, (nIndex - 2), szTs[nIndex - 1], szTs[nIndex]);
							break;
						}
						char cStreamId = szTs[++nIndex];
						// if(cStreamId != pPidInfo->nCodecID)
						// {
							// break;
						// }

						int nLenPes = fnReadB2_Comm(szTs, ++nIndex);
						++nIndex;
						nLeftTs -= (3 + 1 + 2);
						if (nLenPes > nLeftTs || nLenPes == 0x00)
						{
							nLenPes = nLeftTs;
						}

						++nIndex;// Flag to 0x80
						uint8_t nFlag_DtsPts = szTs[++nIndex];// Flag to 0xc0 -> pts & dts | 0x80 -> pts
						int nLenPesData = szTs[++nIndex];
						int nIndexTime = nIndex;
						// fnDecoder_Printf(__FUNCTION__, __LINE__, "DtsPts", szTs + nIndex, 12);
						if(nFlag_DtsPts == 0x80 || nFlag_DtsPts == 0xC0)
						{
							int64_t nPts = fnReadB2_Comm(szTs, nIndexTime + 2) & 0xFFFE;
							nPts <<= 14;
							nPts |= ((fnReadB2_Comm(szTs, nIndexTime + 4) & 0xFFFE) >> 1);
							pDecHls->n64Pts = (nPts + 45) / 90;
							nIndexTime += 5;
						}
						
						if(nFlag_DtsPts == 0xC0)
						{
							int64_t nDts = fnReadB2_Comm(szTs, nIndexTime + 2) & 0xFFFE;
							nDts <<= 14;
							nDts |= ((fnReadB2_Comm(szTs, nIndexTime + 4) & 0xFFFE) >> 1);
							pDecHls->n64Dts = (nDts + 45) / 90;
						}
						else
						{
							pDecHls->n64Dts = 0;
						}
						nIndex += nLenPesData;
						nLeftTs -= (2 + 1 + nLenPesData);
						// printf("%s:: nLenPesData=%d nIndex=%d nLeftTs=%d\n", __FUNCTION__, nLenPesData, nIndex, nLeftTs);
						
						if (pPidInfo->nType == AVMEDIA_TYPE_VIDEO)
						{
							if(szTs[nIndex + 1] != 0x00
								|| szTs[nIndex + 2] != 0x00)
							{
								// fnDecoder_Printf(__FUNCTION__, __LINE__, "szTs", szTs, 188);
								fnSimpleLog_Comm("Error szTs+%d[0x%02X,0x%02X,0x%02X,0x%02X] not begin with 0x00,0x00", (nIndex + 1), szTs[nIndex + 1], szTs[nIndex + 2], szTs[nIndex + 3], szTs[nIndex + 4]);
								break;
							}

							if(szTs[nIndex + 3] == 0x00)
							{
								nIndex += 1;
								nLeftTs -= 1;
							}
							
							if(szTs[nIndex + 3] != 0x01)
							{
								// fnDecoder_Printf(__FUNCTION__, __LINE__, "szTs", szTs, 188);
								fnSimpleLog_Comm("Error szTs+%d[0x%02X,0x%02X,0x%02X] != 0x00,0x00,0x01", (nIndex + 1), szTs[nIndex + 1], szTs[nIndex + 2], szTs[nIndex + 3]);
								break;
							}
							
							if(szTs[nIndex + 4] == 0x09)
							{
								nIndex += 5;// Random
								nLeftTs -= 5;
							}
							
							// fnDecoder_Printf(__FUNCTION__, __LINE__, "pes", szTs+nIndex-6, 15);
							
							// if (szTs[++nIndex] != 0x00
								// || szTs[++nIndex] != 0x00
								// || szTs[++nIndex] != 0x00
								// || szTs[++nIndex] != 0x01
								// || szTs[++nIndex] != 0x09)
							// {
								// fnDecoder_Printf(__FUNCTION__, __LINE__, "szTs", szTs, 188);
								// fnSimpleLog_Comm("%s:[%d]::error szTs+%d[0x%02X,0x%02X,0x%02X,0x%02X,0x%02X] != 0x00,0x00,0x00,0x01,0x09", __FUNCTION__, __LINE__, (nIndex - 4), szTs[nIndex - 4], szTs[nIndex - 3], szTs[nIndex - 2], szTs[nIndex - 1], szTs[nIndex]);
								// break;
							// }
							// ++nIndex;// Random
							// nLeftTs -= 6;
						}
					}

					++nIndex;
					fnWriteToFifo_Comm(ppFifoBuf, (szTs + nIndex), nLeftTs);
				}
			}
			break;
			default:
				break;
			}
			nOffSet += nOffSetOnce;
			nLenLeft -= nOffSetOnce;
		}

		fnWriteToRecvBuffer_Mng(decMng, buff, size, nOffSet);
	} while (0);
	return nRet;
};

int fnDecodeOnePacket_HLS(ST_DecoderMng* decMng)
{
	int nRet = kErrorCode_Success;

	//fnSimpleLog_Comm("decodeOnePacket begin.");
	AVPacketList* pPktList = NULL;
	do {
		nRet = fnGetOnePktList_Mng(decMng, &pPktList);
		if(nRet != kErrorCode_Success || pPktList == NULL)
		{
			break;
		}
		// printf("pkt:: size=%d stream_index=%d\n", pPktList->pkt.size, pPktList->pkt.stream_index);
		// fnDecoder_Printf(__FUNCTION__, __LINE__, "pktData", pPktList->pkt.data, pPktList->pkt.size);

		ST_DecoderHLS* pDecHls = decMng->pDecoder;
		AVPacket* pPkt = &(pPktList->pkt);
		//fnSimpleLog_Comm("decodeOnePacket begin.3 pkt.stream_index[%d] videoStreamIdx[%d]", pPktList->pkt.stream_index, decoder->videoStreamIdx);
		ST_PID_INFO* pPidInfo = pDecHls->pSTPidInfos[pPktList->pkt.stream_index];
		if (pPidInfo == NULL)
		{
			continue;
		}

		if (pPidInfo->nType == AVMEDIA_TYPE_VIDEO)
		{
			do
			{
				//fnSimpleLog_Comm("decoder->videoCodecContext[%x].", decoder->videoCodecContext);
				if (pPkt->size > 0)
				{
					if(fnCheckAndOpenVideoCodecCtx_Mng(decMng, pPidInfo->nCodecId) == kErrorCode_Success)
					{
						nRet = fnDecodePacket_Mng(decMng, pPkt, 1);
					}
				}
			} while (0);
		}
		else
		{
			if(AV_CODEC_ID_PCM_ALAW == pPidInfo->nCodecId)
			{
				do
				{
					if(fnCheckAndOpenAudioCodecCtx_Mng(decMng, pPidInfo->nCodecId, 8000, 1) == kErrorCode_Success)
					{
						nRet = fnDecodePacket_Mng(decMng, pPkt, 0);
					}
				} while (0);
			}
			else
			{
				// fnSimpleLog_Comm("%s:[%d]:: audio decoding.", __FUNCTION__, __LINE__);
				do
				{
					ST_AACADTSHeader stAdts;
					uint8_t* szTmp = pPkt->data;
					int nLen = pPkt->size;
					while (nLen > 7)
					{
						if(0 > fnGetAdtsHeaderInfo_HLS(&stAdts, (uint8_t*)(szTmp), nLen))
						{
							break;
						}
						
						if (nLen < stAdts.size)
						{
							break;
						}
						
						// printf("%s:: samplerate=%d, chanconfig=%d.\n", __FUNCTION__, stAdts.sample_rate, stAdts.chan_config);
						
						if(fnCheckAndOpenAudioCodecCtx_Mng(decMng, pPidInfo->nCodecId, stAdts.sample_rate, stAdts.chan_config) == kErrorCode_Success)
						{
							AVPacket stPacket;
							av_init_packet(&stPacket);
							int nAdtsSize = 7 + (stAdts.crc_absent == 0? 2: 0);
							int nSize = stAdts.size - nAdtsSize;
							av_new_packet(&stPacket, nSize);
							memcpy(stPacket.data, szTmp + nAdtsSize, nSize);
							nRet = fnDecodePacket_Mng(decMng, &stPacket, 0);
						}
						
						szTmp += stAdts.size;
						nLen -= stAdts.size;
					}
				} while (0);
				//nRet = decodePacket(decoder->audioCodecContext, pPkt);
			}
		}
	} while (0);

	if (pPktList != NULL)
	{
		av_packet_unref(&(pPktList->pkt));
		av_freep(pPktList);
	}
	return nRet;
};