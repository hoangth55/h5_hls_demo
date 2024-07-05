function TimeMillisUtil (){

}

// 获取计数器
TimeMillisUtil.getCounter = function() {
    let counter = 1;
    ++counter;
    if (counter < 10) return '00000' + counter;
    else if (counter < 100) return '0000' + counter;
    else if (counter < 1000) return '000' + counter;
    else if (counter < 10000) return '00' + counter;
    else if (counter < 100000) return '0' + counter;
    else if (counter < 1000000) return counter;
    else {
        counter = 1;
        return '00000' + counter;
    }
};

// 获取组合时间戳
TimeMillisUtil.getTimMillis = function() {
    return TimeMillisUtil.getCounter() + new Date().getTime().toString();
};