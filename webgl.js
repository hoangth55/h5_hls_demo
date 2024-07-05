// 纹理（出图）对象（GL： 布纹：GRAIN LINE）
function Texture(gl) {
    this.gl = gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// 绑定
Texture.prototype.bind = function(n, program, name) {
    var gl = this.gl;
    gl.activeTexture([gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2][n]);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(program, name), n);
};

// 填满
Texture.prototype.fill = function(width, height, data) {
    var gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
};

// 销毁纹理
Texture.prototype.destroy = function() {
    var gl = this.gl;
    gl.deleteTexture(this.texture);
    this.texture = null;
};

// web 布纹播放器对象初始化
function WebGLPlayer(canvas, options) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", {
        preserveDrawingBuffer: true
    }) || canvas.getContext("experimental-webgl", {
        preserveDrawingBuffer: true
    });
    this.initGL(options);
    this.maskAreas = []; // 初始化存储打码区域的数组
}

// 生成随机遮罩区域
WebGLPlayer.prototype.generateRandomMaskAreas = function(count) {
    for (var i = 0; i < count; i++) {
        var x = Math.random() * this.canvas.width;
        var y = Math.random() * this.canvas.height;
        var width = Math.random() * 100;
        var height = Math.random() * 100;
        this.addMaskArea(x, y, width, height);
    }
};

// 初始化布纹
WebGLPlayer.prototype.initGL = function(options) {
    if (!this.gl) {
        console.log("[ER] WebGL not supported.");
        return;
    }

    var gl = this.gl;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    var program = gl.createProgram();
    var vertexShaderSource = [
        "attribute highp vec4 aVertexPosition;",
        "attribute vec2 aTextureCoord;",
        "varying highp vec2 vTextureCoord;",
        "void main(void) {",
        " gl_Position = aVertexPosition;",
        " vTextureCoord = aTextureCoord;",
        "}"
    ].join("\n");
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    var fragmentShaderSource = [
        "precision highp float;",
        "varying lowp vec2 vTextureCoord;",
        "uniform sampler2D YTexture;",
        "uniform sampler2D UTexture;",
        "uniform sampler2D VTexture;",
        "const mat4 YUV2RGB = mat4",
        "(",
        " 1.1643828125, 0, 1.59602734375, -.87078515625,",
        " 1.1643828125, -.39176171875, -.81296875, .52959375,",
        " 1.1643828125, 2.017234375, 0, -1.081390625,",
        " 0, 0, 0, 1",
        ");",
        "void main(void) {",
        " gl_FragColor = vec4( texture2D(YTexture, vTextureCoord).x, texture2D(UTexture, vTextureCoord).x, texture2D(VTexture, vTextureCoord).x, 1) * YUV2RGB;",
        "}"
    ].join("\n");

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log("[ER] Shader link failed.");
    }
    var vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);
    var textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);

    var verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0,
        0.0]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.y = new Texture(gl);
    gl.u = new Texture(gl);
    gl.v = new Texture(gl);
    gl.y.bind(0, program, "YTexture");
    gl.u.bind(1, program, "UTexture");
    gl.v.bind(2, program, "VTexture");

    this.program = program;
    this.verticesBuffer = verticesBuffer;
    this.texCoordBuffer = texCoordBuffer;
}

// 渲染帧数据
WebGLPlayer.prototype.renderFrame = function(videoFrame, width, height, uOffset, vOffset) {
    if (!this.gl) {
        console.log("[ER] Render frame failed due to WebGL not supported.");
        return;
    }

    var gl = this.gl;
    // console.log("videoFrame param", gl.canvas.width, gl.canvas.height,this.canvas.width,this.canvas.height);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); //缩放videoFrame，参数：offsetX, offsetY, scaledWidth, scaledHeight
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.y.fill(width, height, videoFrame.subarray(0, uOffset));
    gl.u.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset, uOffset + vOffset));
    gl.v.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset + vOffset, videoFrame.length));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 调用遮罩函数
    this.applyMask();
    
};

// 添加遮罩区域
WebGLPlayer.prototype.addMaskArea = function(x, y, width, height) {
    this.maskAreas.push({
        x: x,
        y: y,
        width: width,
        height: height
    });
};

// 清除遮罩区域
WebGLPlayer.prototype.clearMaskAreas = function() {
    this.maskAreas = [];
};

// 应用遮罩
WebGLPlayer.prototype.applyMask = function() {
    var gl = this.gl;
    gl.enable(gl.SCISSOR_TEST);
    for (var i = 0; i < this.maskAreas.length; i++) {
        var area = this.maskAreas[i];
        gl.scissor(area.x, area.y, area.width, area.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // 黑色遮罩
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.disable(gl.SCISSOR_TEST);
};

// 进入全屏
WebGLPlayer.prototype.fullscreen = function() {
    if (this.canvas.requestFullscreen) {
        this.canvas.requestFullscreen();
    } else if (this.canvas.webkitRequestFullscreen) {
        this.canvas.webkitRequestFullscreen();
    } else if (this.canvas.mozRequestFullScreen) {
        this.canvas.mozRequestFullScreen();
    } else if (this.canvas.msRequestFullscreen) {
        this.canvas.msRequestFullscreen();
    } else {
        alert("Fullscreen doesn't work");
    }
}

// 退出全屏
WebGLPlayer.prototype.exitFullscreen = function() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    } else {
        alert("Exit fullscreen doesn't work");
    }
};

// 清除
WebGLPlayer.prototype.clear = function() {
    var gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// 销毁 WebGLPlayer 对象
WebGLPlayer.prototype.destroy = function() {
    var gl = this.gl;

    // 删除纹理
    if (gl.y) {
        gl.y.destroy();
        gl.y = null;
    }
    if (gl.u) {
        gl.u.destroy();
        gl.u = null;
    }
    if (gl.v) {
        gl.v.destroy();
        gl.v = null;
    }

    // 删除缓冲区
    gl.deleteBuffer(this.verticesBuffer);
    gl.deleteBuffer(this.texCoordBuffer);

    // 删除着色器程序
    gl.deleteProgram(this.program);

    // 清除 WebGL 上下文
    this.gl = null;
    this.canvas = null;
}

// 解析 ai 数据--打码、画框
WebGLPlayer.prototype.parseAIdata = function(e) {
    let _this = this;

    this.clearMaskAreas();

    let canvasWidth = this.canvas.width;
    let canvasHeight = this.canvas.height;
    let canvasScale = this.reduceFraction(canvasWidth, canvasHeight).substring(1);
    let videoScale = null;
    console.log("canvas scale:", canvasScale);

    let videoWidth = e.w;
    let videoHeight = e.h;
    if (videoWidth && videoHeight) {
        videoScale = this.reduceFraction(videoWidth, videoHeight).substring(1);
        console.log("ai video scale:", videoScale);
    }

    const dataSource = e.d;

    dataSource.forEach(item => {
        let {
            xmin,
            ymin,
            xmax,
            ymax
        } = item.bbox;

        let x = xmin * (canvasWidth / videoWidth);
        let y = ymin * (canvasHeight / videoHeight);
        let width = (xmax - xmin) * (canvasWidth / videoWidth);
        let height = (ymax - ymin) * (canvasHeight / videoHeight);
        _this.addMaskArea(x, y, width, height);

    });
}

// 获取最小比例分数
WebGLPlayer.prototype.reduceFraction = function(numerator, denominator) {
    // 确保分母不为0
    if (denominator === 0) {
        throw new Error('Denominator cannot be zero.');
    }

    // 获取分子和分母的绝对值
    const absNumerator = Math.abs(numerator);
    const absDenominator = Math.abs(denominator);

    // 使用欧几里得算法（辗转相除法）找到最大公约数
    function gcd(a, b) {
        return b === 0 ? a : gcd(b, a % b);
    }

    // 约分
    const commonDivisor = gcd(absNumerator, absDenominator);
    const reducedNumerator = absNumerator / commonDivisor;
    const reducedDenominator = absDenominator / commonDivisor;

    return reducedNumerator + ':' + reducedDenominator;
}

// 解析坐标
WebGLPlayer.prototype.drawLine = function(targetItem, videoWidth, videoHeigth, canvasScale_W, canvasScale_H,
    videoScale_W, videoScale_H, width, height, videoScale, canvasScale) {
    if (!(videoWidth * videoHeigth)) {
        return null;
    }

    if (videoScale_W == videoScale_H) {
        let p = this.reduceFraction(width, height).substring(1);
        const [pWidth, pHeight] = p.split(':').map(Number);
        videoScale_W = pWidth;
        videoScale_H = pHeight;
    }

    let computeWidth = ((canvasScale_H * videoWidth) / canvasScale_W) * (videoScale_W / videoScale_H);
    let computeHeigth = videoHeigth;

    let {
        xmin,
        ymin,
        xmax,
        ymax
    } = targetItem.bbox;

    let canvasWidth = width / computeWidth;
    let canvasHeight = height / computeHeigth;

    xmin = xmin * canvasWidth;
    xmax = xmax * canvasWidth;
    if (videoScale != canvasScale) {
        let hScaleDiff = canvasScale_H / videoScale_H;
        let wNewScale = videoScale_W * hScaleDiff;
        let wScaleDiff = canvasScale_W - wNewScale;
        let deviationWmin = (wScaleDiff / canvasScale_W) * xmin;
        let deviationWmax = (wScaleDiff / canvasScale_W) * xmax;
        xmin = xmin - deviationWmin;
        xmax = xmax - deviationWmax;
    }

    let ractangleLeft = Math.floor(xmin);
    let ractangleTop = Math.floor(ymin * canvasHeight);
    let ractangleWidth = Math.floor(xmax - xmin);
    let ractangleHeight = Math.floor((ymax - ymin) * canvasHeight);

    return [ractangleLeft, ractangleTop, ractangleWidth, ractangleHeight];
}

