'use strict';function getKey(a,c){let b="",d=a.length;0<d/2&&(b+=a.substring(d/2));b+=c;d=b.length;if(16<d)b=b.substring(0,16);else for(a=0;a<16-d;++a)b+=a;return b.toString()}function genKey(a,c){let b="";const d=a.length;0<d/2&&(b+=a.substring(d/2));return filterKey((b+c).toString())}function filterKey(a){const c=a.length;if(16<c)a=a.substring(0,16);else for(let b=0;b<16-c;++b)a+=b;return a}
const ECB={encrypt(a,c,b){c=genKey(c,b);a=CryptoJS.enc.Utf8.parse(a);c=CryptoJS.enc.Utf8.parse(c);return CryptoJS.AES.encrypt(a,c,{mode:CryptoJS.mode.ECB,padding:CryptoJS.pad.Pkcs7}).ciphertext.toString().toUpperCase()},decrypt(a,c,b){c=CryptoJS.enc.Utf8.parse(getKey(c,b));a=CryptoJS.AES.decrypt({ciphertext:CryptoJS.enc.Hex.parse(a)},c,{mode:CryptoJS.mode.ECB,padding:CryptoJS.pad.Pkcs7});return CryptoJS.enc.Utf8.stringify(a).toString()}};