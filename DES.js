function getKey(tms, secret) {
    let key = '';
    let length = tms.length;
    if (length / 2 > 0) key += tms.substring(length / 2);
    key += secret;
    length = key.length;
    if (length > 16) key = key.substring(0, 16);
    else {
        for (let i = 0; i < 16 - length; ++i) {
            key = key + i;
        }
    }
    return key.toString();
}

function genKey(timeMillis, appSecret) {
    let key = '';
    const timeLength = timeMillis.length;

    if (timeLength / 2 > 0) {
        key += timeMillis.substring(timeLength / 2);
    }

    key += appSecret;
    return filterKey(key.toString());
}

function filterKey(key) {
    const length = key.length;

    if (length > 16) {
        key = key.substring(0, 16);
    } else {
        for (let i = 0; i < 16 - length; ++i) {
            key = key + i;
        }
    }

    return key;
}

const ECB = {
    encrypt(code, tms, sec) {
        let key = genKey(tms, sec);
        code = CryptoJS.enc.Utf8.parse(code);
        key = CryptoJS.enc.Utf8.parse(key);
        let encrypted = CryptoJS.AES.encrypt(code, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypted.ciphertext.toString().toUpperCase();
    },

    decrypt(data, tms, secret) {
        const key = CryptoJS.enc.Utf8.parse(getKey(tms, secret))
        const decrypted = CryptoJS.AES.decrypt(
          {
            ciphertext: CryptoJS.enc.Hex.parse(data)
          }, 
          key, 
          {
              mode: CryptoJS.mode.ECB,
              padding: CryptoJS.pad.Pkcs7
          }
        );
        return CryptoJS.enc.Utf8.stringify(decrypted).toString();
    }
};