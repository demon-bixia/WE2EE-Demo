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
export function bufferToBase64(buffers: ArrayBuffer) {
  const str = bufferToString(buffers);
  return window.btoa(str);
}

/**
 * converts an array buffer into a string
 * @param buffers {ArrayBuffer}
 * @returns {String}
 */
export function bufferToString(buffers: ArrayBuffer) {
  let str = '';
  let bytes = new Uint8Array(buffers);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

/**
 * Converts an array buffer into an integer
 * @param arrayBuffer 
 * @returns {int}
 */
export function bufferToInt(arrayBuffer: ArrayBuffer) {
  const dv = new DataView(arrayBuffer, 0);
  return dv.getInt16(0, true);
}
