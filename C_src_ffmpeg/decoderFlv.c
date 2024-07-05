
#include "decoderFlv.h"

ST_DecoderFuncs g_stDecoderFuncs_FLV = {
	.n32PrivData = sizeof(ST_DecoderFLV),
	.fnDealStreamData = fnDealStreamData_FLV,
	.fnInit = fnInit_FLV,
	.fnUninit = fnUninit_FLV,
	// .fnClose = fnClose_FLV,
	.fnDecodeOnePacket = fnDecodeOnePacket_FLV,
	.enumStreamType = STREAM_TYPE_FLV,
};


// ====================Functions Inner================

int fnGetCodecIDFromFlvCodecID_FLV(int codecID)
{
    switch (codecID)
    {
    case FLV_CODECID_H263:
        return AV_CODEC_ID_FLV1;
    case FLV_CODECID_SCREEN:
        return AV_CODEC_ID_FLASHSV;
    case FLV_CODECID_SCREEN2:
        return AV_CODEC_ID_FLASHSV2;
    case FLV_CODECID_VP6:
        return AV_CODEC_ID_VP6F;
    case FLV_CODECID_VP6A:
        return AV_CODEC_ID_VP6A;
    case FLV_CODECID_H264:
        return AV_CODEC_ID_H264;
    case FLV_CODECID_H265:
        return AV_CODEC_ID_HEVC;
    default:
        return codecID;
    }
};

int fnProbe_FLV(ST_DecoderFLV* decFlv, unsigned char* buff)
{
    // fnSimpleLog_Comm("%s:: begin.", __FUNCTION__);
    if (buff[0] != 0x46 || buff[1] != 0x4C || buff[2] != 0x56 || buff[3] != 0x01)
    {
        fnSimpleLog_Comm("%s:: error: no find \"flv\".", __FUNCTION__);
        return 0;
    }

    decFlv->n8HasVideo = (buff[4] & 4) >> 2;
    decFlv->n8HasAudio = buff[4] & 1;
    int nOffSet = fnReadBig32_Comm(buff, 5);
    if (nOffSet < 9)
    {
        fnSimpleLog_Comm("%s:: error: offset[%d] < 9.", __FUNCTION__, nOffSet);
        return 0;
    }
    return nOffSet;
};

int fnParseAudioSeqHeader_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size, int offset)
{
	uint8_t szTmp[2] = {0};
	fnReadBytes_Comm(szTmp, 2, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv,  buff, size, offset);
	// fnDecoder_Printf(__FUNCTION__, __LINE__, "szTmp", szTmp, 2);
	uint8_t nProfile_Bits = (szTmp[0] >> 3) & 0x01f;
	uint8_t nSampleRate_Bits = ((szTmp[0] & 0x07) << 1) | ((szTmp[1] >> 7) & 0x01);
	uint8_t nChannels_Bits = (szTmp[1] >> 3) & 0x0f;
	int nProfile = 0;
	int nSampleRate = 0;
	int nSampleFmt = 0;
	int nChannels = 0;
	// switch(nProfile_Bits)
	// {
		// case 0x01:
			// nProfile = main;
		// break;
		// case 0x02:
			// nProfile = lc;
		// break;
		// case 0x03:
			// nProfile = ssr;
		// break;
		// default:
		// break;
	// }
	
	switch(nSampleRate_Bits)
	{
		case 0x00:
			nSampleRate = 96000;
		break;
		case 0x01:
			nSampleRate = 88200;
		break;
		case 0x02:
			nSampleRate = 64000;
		break;
		case 0x03:
			nSampleRate = 48000;
		break;
		case 0x04:
			nSampleRate = 44100;
		break;
		case 0x05:
			nSampleRate = 32000;
		break;
		case 0x06:
			nSampleRate = 24000;
		break;
		case 0x07:
			nSampleRate = 22050;
		break;
		case 0x08:
			nSampleRate = 16000;
		break;
		case 0x09:
			nSampleRate = 12000;
		break;
		case 0x0A:
			nSampleRate = 11025;
		break;
		case 0x0B:
			nSampleRate = 8000;
		break;
	}
	
	switch(nChannels_Bits)
	{
		case 0x00:
		break;
		case 0x01:
			decMng->n32Channels = 1;
		break;
		case 0x02:
			decMng->n32Channels = 2;
		break;
		case 0x03:
			decMng->n32Channels = 3;
		break;
		case 0x04:
			decMng->n32Channels = 4;
		break;
		case 0x05:
			decMng->n32Channels = 5;
		break;
		case 0x06:
			decMng->n32Channels = 6;
		break;
		case 0x07:
			decMng->n32Channels = 7;
		break;
		default:
		break;
	}
	
	
	decMng->n32SampleRate = nSampleRate;
	decMng->n32SampleFmt = nSampleFmt;
};

int fnParseAudioAACData_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size, int offset)
{
	ST_DecoderFLV* pDecFlv = (ST_DecoderFLV*)decMng->pDecoder;
	int nLen = pDecFlv->n32TagLenNext - 2;
	AVPacketList* pPktList = av_malloc(sizeof(AVPacketList));
    if (!pPktList)
    {
        return -1;
    }
    pPktList->next = NULL;
	
	AVPacket* pPkt = &pPktList->pkt;
    av_new_packet(pPkt, nLen);
	uint8_t* pData = pPkt->data;
	fnReadBytes_Comm(pData, nLen, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv,  buff, size, offset);
	pPkt->pts = pDecFlv->n64Pts;
    pPkt->dts = pDecFlv->n64Dts;
    pPkt->stream_index = pDecFlv->n32CodecID_Audio;
	fnPacketPut_Mng(decMng, pPktList);
};

int fnParseAudioData_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size, int offset)
{
	uint8_t szTmp[2] = {0};
	fnReadBytes_Comm(szTmp, 2, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv,  buff, size, offset);
	ST_DecoderFLV* pDecFlv = (ST_DecoderFLV*)decMng->pDecoder;
	offset += 2;
	
	if(szTmp[0] != pDecFlv->n8TagHeader_Audio)
	{
		// fnDecoder_Printf(__FUNCTION__, __LINE__, "szTmp", szTmp, 2);
		uint8_t nType_Bits = (szTmp[0] >> 4) & 0x0f;
		uint8_t nSampleRate_Bits = (szTmp[0] >> 2) & 0x03;
		uint8_t nSampleFmt_Bits = (szTmp[0] >> 1) & 0x01;
		uint8_t nChannels_Bits = szTmp[0] & 0x01;
		
		int nType = AV_CODEC_ID_NONE;
		int nSampleRate = 0;
		int nSampleFmt = 0;
		int nChannels = 0;
		
		switch(nType_Bits)
		{
			case 0x00:
				nType = AV_CODEC_ID_NONE;
			break;
			case 0x02:
			case 0x0E:
				nType = AV_CODEC_ID_MP3;
			break;
			case 0x0A:
				nType = AV_CODEC_ID_AAC;
			break;
			case 0x07:
				nType = AV_CODEC_ID_PCM_ALAW;
			break;
			case 0x08:
				nType = AV_CODEC_ID_PCM_MULAW;
			break;
			default:
			break;
		}
		
		switch(nSampleRate_Bits)
		{
			case 0x00:
				nSampleRate = 5500;
			break;
			case 0x01:
				nSampleRate = 11000;
			break;
			case 0x02:
				nSampleRate = 22000;
			break;
			case 0x03:
				nSampleRate = 44000;
			break;
		}
		
		switch(nSampleFmt_Bits)
		{
			case 0x00:
				nSampleFmt = AV_SAMPLE_FMT_U8;
			break;
			case 0x01:
				nSampleFmt = AV_SAMPLE_FMT_S16;
			break;
		}
		
		switch(nChannels_Bits)
		{
			case 0x00:
				nChannels = 1;
			break;
			case 0x01:
				nChannels = 2;
			break;
		}
		
		pDecFlv->n32CodecID_Audio = nType;
		decMng->n32SampleRate = nSampleRate;
		decMng->n32SampleFmt = nSampleFmt;
		decMng->n32Channels = nChannels;
		
		pDecFlv->n32StreamIdx_Audio = pDecFlv->n32StreamId;
		pDecFlv->n8TagHeader_Audio = szTmp[0];
	}
	
	if(pDecFlv->n32CodecID_Audio == AV_CODEC_ID_AAC)
	{
		uint8_t nAACType = szTmp[1];
		switch(nAACType)
		{
			case 0x00:
				fnParseAudioSeqHeader_FLV(decMng, buff, size, offset);
				// printf("%s:: n32CodecID_Audio=%d n32SampleRate=%d n32Channels=%d\n", __FUNCTION__, pDecFlv->n32CodecID_Audio, decMng->n32SampleRate, decMng->n32Channels);
				fnOpenAudioCodecContext_Mng(decMng, pDecFlv->n32CodecID_Audio, decMng->n32SampleRate, decMng->n32Channels);
			break;
			case 0x01:
				fnParseAudioAACData_FLV(decMng, buff, size, offset);
			break;
			default:
			break;
		}
	}
    //fnSimpleLog_Comm("%s:: begin.", __FUNCTION__);
    return 0;
};

AVPacketList* fnReadPacketFromBytes_FLV(ST_DecoderFLV* decFlv, uint8_t* buffRecv, int lenRecv, uint8_t* buff, int size, int pktlen, int offset, uint8_t isKeyFrame)
{
    AVPacketList* pPktList = NULL;
    pPktList = av_malloc(sizeof(AVPacketList));
    if (!pPktList)
    {
        return NULL;
    }

	uint8_t bFillExtData = (isKeyFrame > 0 && decFlv->n8ExtDataNeedDecode > 0 && decFlv->pPkt_ExtData != NULL) ? 1 : 0;
    uint8_t szHeader[3] = { 0x00,0x00,0x01 };
    int nLen = pktlen + 3;
    if (bFillExtData > 0)
    {
        nLen += decFlv->pPkt_ExtData->size;
    }
	
    av_new_packet(&pPktList->pkt, nLen);
    uint8_t* pIndex = pPktList->pkt.data;
	
    if (bFillExtData > 0)
    {
        memcpy(pIndex, decFlv->pPkt_ExtData->data, decFlv->pPkt_ExtData->size);
        pIndex += decFlv->pPkt_ExtData->size;
    }
    
    memcpy(pIndex, szHeader, 3);
    pIndex += 3;
    if (0 >= fnReadBytes_Comm(pIndex, pktlen, buffRecv, lenRecv, buff, size, offset))
    {
        av_freep(pPktList);
        return NULL;
    }

    pPktList->pkt.pts = decFlv->n64Pts;
    pPktList->pkt.dts = decFlv->n64Dts;
    //av_packet_rescale_ts(&pktl->pkt, decoder->avRational1000, AV_TIME_BASE_Q);
    //fnSimpleLog_Comm("%s:: pts=%lld[%d] dts=%lld[%d].", __FUNCTION__, pktl->pkt.pts, pts, pktl->pkt.dts, dts);
    //pktl->pkt.flags = nFrameType == 1 ? AV_PKT_FLAG_KEY : 0;
    pPktList->pkt.stream_index = decFlv->n32StreamId;
    pPktList->next = NULL;
	
	if(bFillExtData > 0)
	{
		decFlv->n8ExtDataNeedDecode = 0;
	}
	
    return pPktList;
};

int fnParseVideoAvccData_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size, int pktlen, int offset)
{
	// printf("%s:[%d]:: begin.\n", __FUNCTION__, __LINE__);
    int nRet = kErrorCode_Success;
    int nCount = 0;
    int nSize = 0;
    uint8_t szHeader[4] = { 0x00,0x00,0x00,0x01 };

    AVPacketList* pPktList_First = NULL, * pPktList_Last = NULL;
    AVPacketList* pPktListItem = NULL;
    int nPktCount = 0;
    int nPktByteSize = 0;
	ST_DecoderFLV* pDecFlv = decMng->pDecoder;
    switch (pDecFlv->n8CodecID)
    {
    case FLV_CODECID_H264:
    {
        offset += 5;
        pktlen -= 5;

        AVPacket* pPkt = NULL;
        uint8_t sz3Char[3] = { 0 };
        for (int nSpsPps = 0; nSpsPps < 2; ++nSpsPps)
        {
            if (nRet != kErrorCode_Success)
            {
                break;
            }

            fnReadBytes_Comm(sz3Char, 3, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
			// printf("%s:: sz3Char[0x%X, 0x%X, 0x%X]\n", __FUNCTION__, sz3Char[0], sz3Char[1], sz3Char[2]);
            offset += 3;
            pktlen -= 3;
            nCount = sz3Char[0] & 0x0f;
            do
            {
                nSize = fnReadB2_Comm(sz3Char, 1);
                if (nSize <= 0 || pktlen < nSize)
                {
                    nRet = kErrorCode_Invalid_Format;
                    break;
                }
                pPktListItem = (AVPacketList*)av_mallocz(sizeof(AVPacketList));
                pPktListItem->next = NULL;
                pPkt = &(pPktListItem->pkt);
                av_new_packet(pPkt, nSize + 4);
                pPkt->pts = pDecFlv->n64Pts;
                pPkt->dts = pDecFlv->n64Dts;
                pPkt->stream_index = pDecFlv->n32StreamIdx_Video;
                memcpy(pPkt->data, szHeader, 4);
                fnReadBytes_Comm(pPkt->data + 4, nSize, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
                //fnSimpleLog_Comm("parseVideoAvccData:: nSpsPps=%d pkt[0x%02x][0x%02x][0x%02x][0x%02x][0x%02x]", nSpsPps, pPkt->data[0], pPkt->data[1], pPkt->data[2], pPkt->data[3], pPkt->data[4]);
                if (pPktList_Last == NULL)
                {
                    pPktList_First = pPktListItem;
                }
                else
                {
                    pPktList_Last->next = pPktListItem;
                }
                pPktList_Last = pPktListItem;
                ++nPktCount;
                nPktByteSize += nSize + 4;
                //packetPut(buff, size, nSize, offset, timestamp, streamid);
                offset += nSize;
                pktlen -= nSize;

                if (--nCount <= 0)
                {
                    break;
                }
                fnReadBytes_Comm(sz3Char + 1, 2, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
                offset += 2;
                pktlen -= 2;
            } while (1);
        }
    }
    break;
    case FLV_CODECID_H265:
    {
        offset += 22;
        pktlen -= 22;
        uint8_t sz6Char[6] = { 0 };
        fnReadBytes_Comm(sz6Char, 1, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
        int nVpsSpsPpsCount = sz6Char[0];
        offset += 1;
        pktlen -= 1;
        for (int nVpsSpsPps = 0; nVpsSpsPps < nVpsSpsPpsCount; ++nVpsSpsPps)
        {
            if (nRet != kErrorCode_Success)
            {
                break;
            }

            fnReadBytes_Comm(sz6Char + 1, 5, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
            offset += 5;
            pktlen -= 5;
            nCount = fnReadB2_Comm(sz6Char, 2);
            do
            {
                nSize = fnReadB2_Comm(sz6Char, 4);
                if (nSize <= 0 || pktlen < nSize)
                {
                    nRet = kErrorCode_Invalid_Format;
                    break;
                }

                pPktListItem = (AVPacketList*)av_mallocz(sizeof(AVPacketList));
                pPktListItem->next = NULL;
                AVPacket* pPkt = &(pPktListItem->pkt);
                av_new_packet(pPkt, nSize + 4);
                pPkt->pts = pDecFlv->n64Pts;
                pPkt->dts = pDecFlv->n64Dts;
                pPkt->stream_index = pDecFlv->n32StreamIdx_Video;
                memcpy(pPkt->data, szHeader, 4);
                fnReadBytes_Comm(pPkt->data + 4, nSize, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
                //fnSimpleLog_Comm("parseVideoAvccData:: nVpsSpsPps=%d pkt[0x%02x][0x%02x][0x%02x][0x%02x][0x%02x]", nVpsSpsPps, pPkt->data[0], pPkt->data[1], pPkt->data[2], pPkt->data[3], pPkt->data[4]);
                if (pPktList_Last == NULL)
                {
                    pPktList_First = pPktListItem;
                }
                else
                {
                    pPktList_Last->next = pPktListItem;
                }
                pPktList_Last = pPktListItem;
                ++nPktCount;
                nPktByteSize += nSize + 4;

                //packetPut(buff, size, nSize, offset, timestamp, streamid);
                offset += nSize;
                pktlen -= nSize;

                if (--nCount <= 0)
                {
                    break;
                }
                fnReadBytes_Comm(sz6Char + 4, 2, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
                offset += 2;
                pktlen -= 2;
            } while (1);
        }
    }
    break;
    default:
        return kErrorCode_Invalid_Format;
        break;
    }

	AVPacket* pPktExtraData = av_packet_alloc();
	AVPacket* pPktItem = NULL;
	int nIndex = 0;
	av_new_packet(pPktExtraData, nPktByteSize);
	while(1)
	{
		pPktListItem = fnGetFirstAVPacketList_Comm(&pPktList_First, &pPktList_Last, &nPktCount);
		if (pPktListItem == NULL || nPktCount < 0)
		{
			break;
		}
		pPktItem = &(pPktListItem->pkt);

		memcpy(pPktExtraData->data + nIndex, pPktItem->data, pPktItem->size);
		nIndex += pPktItem->size;
		av_packet_unref(pPktItem);
		av_freep(pPktListItem);
	}

	if (nRet == kErrorCode_Success)
	{
		if (decMng->pVideoCodecCtx == NULL || pDecFlv->n8GotAvccFirst <= 0)
		{
			int nCodecID = fnGetCodecIDFromFlvCodecID_FLV(pDecFlv->n8CodecID);
			fnOpenVideoCodecContext_Mng(decMng, nCodecID, pPktExtraData);
			fnSimpleLog_Comm("%s:[%d]:: fnOpenVideoCodecContext_Mng()", __FUNCTION__, __LINE__);
			fnExchangeAVPacket_Comm(&pDecFlv->pPkt_ExtData, &pPktExtraData);
		}
		else
		{
			if (fnDiffAVPacket_Comm(pDecFlv->pPkt_ExtData, pPktExtraData) != 0)
			{
				pDecFlv->n8ExtDataNeedDecode = 1;
				fnExchangeAVPacket_Comm(&pDecFlv->pPkt_ExtData, &pPktExtraData);
			}
		}
		
		decMng->n32MilliDuration = 0;
		decMng->n64MilliTimeLastDec = 0;
		decMng->n64CountDec = 0;
	}
	else
	{
		decMng->fnCallbackDecodeInfo(Decoder_Recall_Type_Error, NULL, 0);
	}

	if (pPktExtraData != NULL)
	{
		av_packet_free(&pPktExtraData);
		pPktExtraData = NULL;
	}
    
    //fnSimpleLog_Comm("parseVideoAvccData:: height=%d width=%d", decoder->videoCodecContext->height, decoder->videoCodecContext->width);
    return kErrorCode_Success;
};

int fnParseVideoAvcNaluData_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size, int pktlen, int offset, uint8_t isKeyFrame)
{
    //fnSimpleLog_Comm("parseVideoAvcNaluData begin.");
	ST_DecoderFLV* pDecFlv = decMng->pDecoder;
    uint8_t szNaluSize[5] = { 0 };
    while (pktlen > 5)
    {
        fnReadBytes_Comm(szNaluSize, 5, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
        offset += 4;
        pktlen -= 4;
        int nNaluSize = fnReadBig32_Comm(szNaluSize, 0);
        if (nNaluSize > pktlen)
        {
            fnSimpleLog_Comm("%s:: nNaluSize[%d] != pktlen[%d].", __FUNCTION__, nNaluSize, pktlen);
            return kErrorCode_Invalid_Format;
        }

        //if (szNaluSize[4] != 0x06 && szNaluSize[4] != 0x27)
        {
            AVPacketList* pPktList = fnReadPacketFromBytes_FLV(pDecFlv, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, nNaluSize, offset, isKeyFrame);
            fnPacketPut_Mng(decMng, pPktList);
        }
        offset += nNaluSize;
        pktlen -= nNaluSize;
    }
    return kErrorCode_Success;
};

int fnParseVideoData_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size, int offset)
{
    //fnSimpleLog_Comm("parseVideoData begin. buff[0]=%x, size=%d, packetlen=%d, offset=%d, timestamp=%d", buff[0], size, packetlen, offset, timestamp);
    uint8_t szVideoTagHeader[5] = { 0 };
    if (fnReadBytes_Comm(szVideoTagHeader, 5, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset) < 0)
    {
        return kErrorCode_Invalid_Format;
    }
	
	// fnDecoder_Printf(__FUNCTION__, __LINE__, "szVideoTagHeader", szVideoTagHeader, 5);

	ST_DecoderFLV* pDecFlv = decMng->pDecoder;
	int nPktLen = pDecFlv->n32TagLenNext;
    uint8_t bIsKeyFrame = (szVideoTagHeader[0] >> 4) == 0x01 ? 1 : 0;
    int nFlvCodecID = szVideoTagHeader[0] & 0x0f;
    int nPacketType = szVideoTagHeader[1];
    int nCompositionTime = fnReadBig32_Comm(szVideoTagHeader, 1) & 0x00ffffff;
	pDecFlv->n64Pts = pDecFlv->n64Pts + nCompositionTime;
    //fnSimpleLog_Comm("szVideoTagHeader[%x][%x][%x][%x][%x].", szVideoTagHeader[0], szVideoTagHeader[1], szVideoTagHeader[2], szVideoTagHeader[3], szVideoTagHeader[4]);

    if (nFlvCodecID != pDecFlv->n8CodecID)
    {
		fnSimpleLog_Comm("%s:[%d]:: nFlvCodecID[%d] n8CodecID[%d]", __FUNCTION__, __LINE__, nFlvCodecID, pDecFlv->n8CodecID);
        if (bIsKeyFrame <= 0)
        {
            fnSimpleLog_Comm("%s:: bIsKeyFrame[%d][0x%X] != 1.",__FUNCTION__, bIsKeyFrame, szVideoTagHeader[0]);
            return kErrorCode_Invalid_Format;
        }
        pDecFlv->n8CodecID = nFlvCodecID;
		int nCodecID = fnGetCodecIDFromFlvCodecID_FLV(nFlvCodecID);
        fnOpenVideoCodecContext_Mng(decMng, nCodecID, pDecFlv->pPkt_ExtData);
		// fnSimpleLog_Comm("%s:[%d]:: fnOpenVideoCodecContext_Mng()", __FUNCTION__, __LINE__);
    }
    offset += 5;
    nPktLen -= 5;

    if (pDecFlv->n8GotAvccFirst <= 0 && nPacketType != 0x00)
    {
		printf("%s:[%d]:: n8GotAvccFirst[%d] nPacketType[%d]\n",__FUNCTION__, __LINE__, pDecFlv->n8GotAvccFirst, nPacketType);
        return 0;
    }

    switch (nPacketType)
    {
    case 0x00://avcc
    {
		pDecFlv->n32StreamIdx_Video = pDecFlv->n32StreamId;
        uint8_t nVersion = 0x01;
        fnReadBytes_Comm(&nVersion, 1, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, offset);
        if (nVersion != 0x01)
        {
            fnSimpleLog_Comm("%s:: nPacketType[%d] nVersion[%d] != 0x01.", __FUNCTION__, nPacketType, nVersion);
            return kErrorCode_Invalid_Format;
        }
        fnParseVideoAvccData_FLV(decMng, buff, size, nPktLen, offset);
        pDecFlv->n8GotAvccFirst = 1;
    }
    break;
    case 0x01://nalu
    {
        fnParseVideoAvcNaluData_FLV(decMng, buff, size, nPktLen, offset, bIsKeyFrame);
    }
    break;
    case 0x02://data end
    {
        if (decMng->fnCallbackDecodeInfo != NULL)
        {
            decMng->n8DataEnd = 1;
            decMng->fnCallbackDecodeInfo(Decoder_Recall_Type_DataEnd, NULL, 0);
        }
    }
    break;
    default:
    {
        fnSimpleLog_Comm("%s:: nPacketType[%d].", __FUNCTION__, nPacketType);
        return kErrorCode_Invalid_Format;
    }
    }
    return kErrorCode_Success;
};

int fnParseScriptData_FLV(ST_DecoderMng* decMng, unsigned char* buff, int size, int offset)
{
    // fnSimpleLog_Comm("%s:: parseScriptData begin.", __FUNCTION__);
    //AVPacketList* pkt1;
    //pkt1 = av_malloc(sizeof(AVPacketList));
    //if (!pkt1)
    //{
    //    return -6;
    //}
    //pkt1->pkt.data = (unsigned char*)av_mallocz(nLen);
    //pkt1->pkt.size = nLen;
    //pkt1->pkt.pts = timestamp;
    //pkt1->pkt.flags = nFrameType == 1 ? 1 : 0;
    //fnReadBytes_Comm(pkt1->pkt.data, nLen, decoder->szBuffer_Recv, decoder->n32BufferLen_Recv, buff, size, offset);
    //pkt1->next = NULL;

    //if (decoder->pLast_Pkt != NULL)		//判断q->last_pkt是否为空，
    //{
    //    decoder->pFirst_Pkt = pkt1;        //为空的话，则让first_pkt指向这个pktl这个结构体
    //}
    //else
    //{
    //    decoder->pLast_Pkt->next = pkt1;	//如果q->last_pkt不为空，也就是q->last_pkt指向一个pkl类型的结构体
    //}
    //decoder->pLast_Pkt = pkt1;           //任何时候都会执行到这一句，q->last_pkt指向最新进来的pkl类型
    return 0;
};



// ====================Functions Export================

int fnUninit_FLV(void** dec)
{
	if(dec == NULL)
	{
		return kErrorCode_Success;
	}
	
	int nRet = kErrorCode_Success;
	do{
		ST_DecoderFLV* pDecFlv = *dec;
		if(pDecFlv == NULL)
		{
			break;
		}
		
		if (pDecFlv->pPkt_ExtData != NULL)
		{
			av_packet_free(&(pDecFlv->pPkt_ExtData));
		}
	}while(0);
	
	av_freep(dec);
	return nRet;
};

int fnInit_FLV(void** dec)
{
	if(dec == NULL)
	{
		return kErrorCode_NULL_Pointer;
	}
	
	ST_DecoderFLV* pDecFlv = *dec;
	if(pDecFlv == NULL)
	{
		*dec = av_mallocz(sizeof(ST_DecoderFLV));
		if(*dec == NULL)
		{
			return kErrorCode_NULL_Pointer;
		}
		pDecFlv = *dec;
	}
	else
	{
		if (pDecFlv->pPkt_ExtData != NULL)
		{
			av_packet_free(&(pDecFlv->pPkt_ExtData));
		}
	}
	
	pDecFlv->n8GotHeader = 0;// 获取FLV头标识
    pDecFlv->n8Duration = 0;
	
    // 下一个FLV包信息
    pDecFlv->n32TagLenNext = 0;
    pDecFlv->n8TagType = 0;
    pDecFlv->n64Pts = 0;
	pDecFlv->n64Dts = 0;
    pDecFlv->n32StreamId = 0;

    // 视频、音频流是否存在
    pDecFlv->n8HasVideo = 0;
    pDecFlv->n8HasAudio = 0;
    // 视频、音频流编码
    pDecFlv->n32StreamIdx_Video = 0;
    pDecFlv->n32StreamIdx_Audio = 0;

    // 视频参数
    pDecFlv->n8CodecID = 0;// 视频FLV类型
    pDecFlv->n8GotAvccFirst = 0;// 第一帧AVCC
    pDecFlv->pPkt_ExtData = NULL;
    pDecFlv->n8ExtDataNeedDecode = 0;
	
	pDecFlv->n8TagHeader_Audio = 0;
	pDecFlv->n32CodecID_Audio = 0;
	return kErrorCode_Success;
};

int fnDealStreamData_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size)
{
	int nRet = kErrorCode_Success;
	do{
		if(decMng == NULL)
		{
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		if(decMng->szBuffer_Recv == NULL)
		{
			fnInitBuffer_Comm(&(decMng->szBuffer_Recv), &(decMng->n32BufferSize_Recv));
			decMng->n32BufferLen_Recv = 0;
		}
		
		ST_DecoderFLV* pDecFlv = decMng->pDecoder;
		if(pDecFlv == NULL)
		{
			nRet = kErrorCode_NULL_Pointer;
			break;
		}
		
		int nOffSet = 0;
        int nLen = size + decMng->n32BufferLen_Recv;
        if (pDecFlv->n8GotHeader <= 0)
        {
            if (nLen < 13)
            {
                memcpy(decMng->szBuffer_Recv + decMng->n32BufferLen_Recv, buff, size);
                decMng->n32BufferLen_Recv += size;
                break;
            }

            unsigned char szFlvHeader[13] = { 0 };
            int nLenNeed = 0;
            fnReadBytes_Comm(szFlvHeader, 13, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, 0);

            nOffSet = fnProbe_FLV(pDecFlv, szFlvHeader);
            if ((nOffSet + 4) > nLen)
            {
                memcpy(decMng->szBuffer_Recv + decMng->n32BufferLen_Recv, buff, size);
                decMng->n32BufferLen_Recv += size;
                break;
            }

            int nPrevTagSize0 = fnReadBig32_Comm(szFlvHeader, nOffSet);
            if (nPrevTagSize0 != 0)
            {
                fnSimpleLog_Comm("%s:: error for nPrevTagSize0 = %d", __FUNCTION__, nPrevTagSize0);
            }
            nOffSet += 4;
            pDecFlv->n8GotHeader = 1;
			
			fnClearPktList_Mng(decMng);
			
            pDecFlv->n32TagLenNext = 0;
        }

        int nLenLeft = nLen - nOffSet;
        while (nOffSet < nLen)
        {
            nLenLeft = nLen - nOffSet;
            if (pDecFlv->n32TagLenNext > 0)
            {
                if (nLenLeft < pDecFlv->n32TagLenNext + 4)
                {
                    break;
                }
            }
            else if ((nOffSet + 11) > nLen)
            {
                break;
            }
            else
            {
                //fnSimpleLog_Comm("nLen=%d nOffSet=%d n32BufferLen_Recv=%d size=%d", nLen, nOffSet, decMng->n32BufferLen_Recv, size);
                unsigned char szTagHeader[11] = { 0 };
                fnReadBytes_Comm(szTagHeader, 11, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, nOffSet);
				// fnDecoder_Printf(__FUNCTION__, __LINE__, "szTagHeader", szTagHeader, 11);
                pDecFlv->n8TagType = szTagHeader[0];
                pDecFlv->n32TagLenNext = fnReadBig32_Comm(szTagHeader, 0) & 0x00ffffff;
                if (pDecFlv->n32TagLenNext > decMng->n32BufferSize_Recv)
                {
                    fnSimpleLog_Comm("%s:: n32TagLenNext is too big. n32TagLenNext[%d] > n32BufferSize_Recv[%d].", __FUNCTION__, pDecFlv->n32TagLenNext, decMng->n32BufferSize_Recv);
					fnDecoder_Printf(__FUNCTION__, __LINE__, "szTagHeader", szTagHeader, 11);
                    fnResizeBuffer_Comm(&(decMng->szBuffer_Recv), &(decMng->n32BufferSize_Recv), decMng->n32BufferLen_Recv, pDecFlv->n32TagLenNext, g_n32RecvBufferSize_Max);
                }
                pDecFlv->n64Dts = (fnReadBig32_Comm(szTagHeader, 3) & 0x00ffffff) | (szTagHeader[7] << 24);
                pDecFlv->n32StreamId = fnReadBig32_Comm(szTagHeader, 7) & 0x00ffffff;
                //fnSimpleLog_Comm("dealStreamData:: nTagType=%d nFlvTagLenNext=%d nTimeStamp=%d nStreamId = %d", decMng->nTagType, pDecFlv->n32TagLenNext, decMng->nTimeStamp, decMng->nStreamId);
                nOffSet += 11;
                continue;
            }

            //fnSimpleLog_Comm("dealStreamData:: pDecFlv->n32TagLenNext = %d", pDecFlv->n32TagLenNext);

            unsigned char szPrevTagSizeThis[4] = { 0 };
            fnReadBytes_Comm(szPrevTagSizeThis, 4, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, nOffSet + pDecFlv->n32TagLenNext);
            int nPrevTagSizeThis = fnReadBig32_Comm(szPrevTagSizeThis, 0);
            if (nPrevTagSizeThis != pDecFlv->n32TagLenNext + 11)
            {
                uint8_t sz4Header[5] = { 0 };
                fnReadBytes_Comm(sz4Header, 5, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, nOffSet);
                fnSimpleLog_Comm("%s:: pDecFlv->n32TagLenNext=%d, nPrevTagSizeThis=%d n32PktList_Count=%d", __FUNCTION__, pDecFlv->n32TagLenNext, nPrevTagSizeThis, decMng->n32PktList_Count);
                fnSimpleLog_Comm("sz4Header[%02x][%02x][%02x][%02x][%02x]  szPrevTagSizeThis[%02x][%02x][%02x][%02x]", sz4Header[0], sz4Header[1], sz4Header[2], sz4Header[3], sz4Header[4], szPrevTagSizeThis[0], szPrevTagSizeThis[1], szPrevTagSizeThis[2], szPrevTagSizeThis[3]);
                nOffSet += pDecFlv->n32TagLenNext + 4;
                pDecFlv->n32TagLenNext = 0;
                continue;
            }

            // unsigned char szTmp[11] = { 0 };
            // fnReadBytes_Comm(szTmp, 11, decMng->szBuffer_Recv, decMng->n32BufferLen_Recv, buff, size, nOffSet);
			//fnDecoder_Printf(__FUNCTION__, __LINE__, "szTmp", szTmp, 11);

            switch (pDecFlv->n8TagType)
            {
            case 0x08:
            {
                fnParseAudioData_FLV(decMng, buff, size, nOffSet);
            }
            break;
            case 0x09:
            {
                fnParseVideoData_FLV(decMng, buff, size, nOffSet);
            }
            break;
            case 0x12:
            {
                fnParseScriptData_FLV(decMng, buff, size, nOffSet);
            }
            break;
            default:
                break;
            }

            nOffSet += pDecFlv->n32TagLenNext + 4;
            pDecFlv->n32TagLenNext = 0;
        }

		fnWriteToRecvBuffer_Mng(decMng, buff, size, nOffSet);
		
	}while(0);
	return nRet;
};

int fnOnSeiPacket_FLV(ST_DecoderMng* decMng, uint8_t* buff, int size, int64_t pts)
{
	int nLen = 0;
	int nIdx = 0;
	uint8_t* pIdx = buff;
	while(nIdx < size)
	{
		pIdx = buff + nIdx;
		if(*pIdx == 255)
		{
			nLen += 255;
			++nIdx;
			continue;
		}
		nLen += *pIdx;
		++nIdx;
		pIdx = buff + nIdx;
		if(size >= (nLen + nIdx))
		{
			if(decMng->fnCallbackAiInfo)
			{
				fnSimpleLog_Comm("%s:: timestamp=%d, width=%d, height=%d, SEIData=%p, dataLen=%d, pts=%lld", __FUNCTION__, decMng->n64LastPtsVideo, decMng->n32Width, decMng->n32Height, pIdx, nLen, pts);
				if(nLen > 16)
				{
					pIdx += 16;
					nLen -= 16;
					decMng->fnCallbackAiInfo(0, decMng->n64LastPtsVideo, decMng->n32Width, decMng->n32Height, pIdx, nLen);
				}
			}
			return 0;
		}
		fnSimpleLog_Comm("%s:: SEI data size error, size=%d, nIdx=%d, SEIData=%s, dataLen=%d, pts=%lld", __FUNCTION__, size, nIdx, (char*)pIdx, nLen, pts);
		return -1;
	};
	
	fnSimpleLog_Comm("%s:: SEI data error, size=%d, nIdx=%d, nLen=%d, pts=%lld", __FUNCTION__, size, nIdx, nLen, pts);
	fnDecoder_Printf(__FUNCTION__, __LINE__, "SEIData", buff, ((20 > size) ? size : 20));
	return -2;
}

int fnDecodeOnePacket_FLV(ST_DecoderMng* decMng) {
    int nRet = kErrorCode_Success;

    //fnSimpleLog_Comm("decodeOnePacket begin.");
    AVPacketList* pPktList = NULL;
    do {
		nRet = fnGetOnePktList_Mng(decMng, &pPktList);
		if(nRet != kErrorCode_Success || pPktList == NULL)
		{
			break;
		}

		ST_DecoderFLV* pDecFlv = decMng->pDecoder;
        AVPacket* pPkt = &(pPktList->pkt);
        //fnSimpleLog_Comm("decodeOnePacket begin.3 pkt.stream_index[%d] videoStreamIdx[%d]", pPktList->pkt.stream_index, pDecFlv->n32StreamIdx_Video);
		// printf("%s:: stream_index=%d \n", __FUNCTION__, pPktList->pkt.stream_index); 
        if (pPktList->pkt.stream_index == pDecFlv->n32StreamIdx_Video)
        {
            // fnSimpleLog_Comm("videoStreamIdx. codecId:%d pData[0x%02x][0x%02x][0x%02x][0x%02x][0x%02x] nSize[%d]", pDecFlv->n8CodecID, pPkt->data[0], pPkt->data[1], pPkt->data[2], pPkt->data[3], pPkt->data[4], pPkt->size);
            do
            {
                //fnSimpleLog_Comm("decoder->videoCodecContext[%x].", decoder->videoCodecContext);
                if (pPkt->size > 0)
                {
					if(pDecFlv->n8CodecID == FLV_CODECID_H264 && ((pPkt->data[3]&0x1f) == 0x06) && pPkt->data[4] == 0x05)
					{
                		uint8_t* pData = pPkt->data + 5;
						int nSize = pPkt->size - 5;
						fnOnSeiPacket_FLV(decMng, pData, nSize, pPkt->pts);
					}
					else if(pDecFlv->n8CodecID == FLV_CODECID_H265 && ((pPkt->data[3]&0x7e>>1) == 0x27) && pPkt->data[5] == 0x05)
					{
                		uint8_t* pData = pPkt->data + 6;
						int nSize = pPkt->size - 6;
						fnOnSeiPacket_FLV(decMng, pData, nSize, pPkt->pts);
					}
					else
					{
                    	nRet = fnDecodePacket_Mng(decMng, pPkt, 1);
					}
                }
            } while (0);
        }
        else if (pPktList->pkt.stream_index == pDecFlv->n32CodecID_Audio)
        {
            nRet = fnDecodePacket_Mng(decMng, pPkt, 0);
        }
    } while (0);

    if (pPktList != NULL)
    {
        av_packet_unref(&(pPktList->pkt));
        av_freep(pPktList);
    }
    return nRet;
};