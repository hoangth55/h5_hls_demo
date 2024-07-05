path=$(dirname $0)

# 开启emcc
cd $path
cd ../../
source ./emsdk/emsdk_env.sh

# 进入wasm源文件进行编译
cd $path
cd ../

path_inc=./ffmpeg/include
path_lib=./ffmpeg/lib

#FLV-HLS + licence + version使用了此命令
emcc decoderComm.c decoderMng.c decoderHls.c decoderFlv.c decoder_main.c ${path_lib}/libavformat.a ${path_lib}/libavcodec.a ${path_lib}/libavutil.a ${path_lib}/libswscale.a -O3 -I ${path_inc} -I ./ -s WASM=1 -s TOTAL_MEMORY=268435456 -s EXPORTED_FUNCTIONS="['_fnInitDecoder', '_fnUninitDecoder', '_fnSendData', '_fnDecoderOnePacket', '_fnGetDurationOfPktList', '_fnSetCbAi', '_fnGetVersion', '_main', '_malloc', '_free']" -s EXTRA_EXPORTED_RUNTIME_METHODS="['addFunction']" -s RESERVED_FUNCTION_POINTERS=15 -s FORCE_FILESYSTEM=1 -o libwasm.js
