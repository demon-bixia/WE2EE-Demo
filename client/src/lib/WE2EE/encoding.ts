/**
 * Custom encoding and decoding functions.
 */


/**
 * Converts a base64 string into an array buffer.
 * @param {String} data 
 * @returns {ArrayBuffer}
 */
export function base64ToBuffer(data: string) {
  let str = window.atob(data);
  return stringToBuffer(str);

}

/**
 * converts a string to an array buffer
 * @param str {string}
 * @returns {ArrayBuffer}
 */
export function stringToBuffer(str: string) {
  let bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer into a base64 string.
 * @param {ArrayBuffer} data 
 * @returns {String}
 */
export function bufferToBase64(arrayBuffer: ArrayBuffer) {
  const str = bufferToString(arrayBuffer);
  return window.btoa(str);
}

/**
 * converts an array buffer into a string
 * @param arrayBuffer {ArrayBuffer}
 * @returns {String}
 */
export function bufferToString(arrayBuffer: ArrayBuffer) {
  let str = '';
  let bytes = new Uint8Array(arrayBuffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}
