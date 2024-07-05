function Signature(){
	
};

Signature.fnGetSignature = function(uuid, appkey, appsecret, timemillis, movedcard){
	var encryptStr = uuid + appkey + appsecret + timeMillis;
	var arrEncrypt = encryptStr.split("");
	var arrEncrypt_change = Signature.fnChange(encryptStr, movedcard);
	var arrMerget = arrEncrypt.concat(arrEncrypt_change);
	return MD5(arrMerget);
}

Signature.fnChange = function(encryptStr, movedcard){
	var arrEncrypt = encryptStr.split("");
	var len = arrEncrypt.length;
	for(var idx=0; idx < len; ++idx)
	{
		var tmp = ((idx % movedcard) > ((len - idx) % movedcard)) ? arrEncrypt[idx] : arrEncrypt[len - (idx + 1)];
		arrEncrypt[idx] = arrEncrypt[len - (idx + 1)];
		arrEncrypt[len - (idx + 1)] = tmp;
	}
	return arrEncrypt;
}

