ffmpeg版本号：8e12af2
编译参数：
emconfigure ./configure --cc="emcc" --cxx="em++" --ar="emar" --ranlib="emranlib" --prefix=$(pwd)/dist --enable-cross-compile --target-os=none --arch=x86_32 --cpu=generic --enable-gpl --enable-version3 --disable-avdevice --disable-swresample --disable-postproc --disable-avfilter --disable-programs --disable-logging --disable-everything --enable-avformat --enable-decoder=hevc --enable-decoder=h264 --enable-decoder=aac --disable-ffplay --disable-ffprobe --disable-asm --disable-doc --disable-devices --disable-network --disable-hwaccels --disable-parsers --disable-bsfs --disable-debug --enable-protocol=file --enable-demuxer=mov --enable-demuxer=flv --disable-indevs --disable-outdevs --disable-pthreads

make -j 4

make install