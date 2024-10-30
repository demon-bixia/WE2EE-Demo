await(async () => {})();

(() => {
  const connectionRequest = window.indexedDB.open("Alice");

  connectionRequest.onsuccess = (event) => {
    const DB = event.target.result;

    const searchRequest = DB.transaction(["keys"], "readonly")
      .objectStore("keys")
      .get("Alice");

    searchRequest.onsuccess = () => {
      const identityPrivateKey = searchRequest.result.keys.IK.privateKey;
      window.crypto.subtle
        .exportKey("pkcs8", identityPrivateKey)
        .then((exportedKey) => {
          let str = "";
          let bytes = new Uint8Array(exportedKey);
          let len = bytes.byteLength;

          for (let i = 0; i < len; i++) {
            str += String.fromCharCode(bytes[i]);
          }

          alert(window.btoa(str));
        });
    };
  };
})();
