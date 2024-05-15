import { IKeyBundle, ISession } from "./types/types";

/**
 * Check if the argument exists.
 */
function exists(arg: any) {
  return !!arg;
}

/**
 * Check if argument provided is an object.
 */
function isObject(arg: any) {
  return typeof arg === 'object' && !Array.isArray(arg);
}

/**
 * Check if the argument is a string.
 */
function isString(arg: any) {
  return typeof arg === 'string'
}

/**
 * Check if argument is a boolean
 */
function isBoolean(arg: any) {
  return typeof arg === 'boolean';
}

/**
 * Checks that the argument is a valid SPK.
 */
function validSPK(arg: any) {
  return (
    'id' in arg && 'key' in arg && 'signature' in arg &&
    isString(arg.id) && isString(arg.key) && isString(arg.signature)
  );
}

/**
 * Checks if the argument is a valid opk
 */
function validOPKs(arg: any, notEmpty = false) {
  return (
    Array.isArray(arg) && notEmpty ? arg.length > 0 : true &&
      arg.every((value: any) => (
        'id' in value &&
        'key' in value &&
        isString(value.id) &&
        isString(value.key)
      ))
  )
}

/**
 * Checks if key exists in object with an optional 
 * type check of the value type.
*/
function has(arg: any, key: string, validator: (arg: any, ...args: any) => boolean = (arg: any, ...args: any) => true, optional = false, ...args: any) {
  return (
    optional ? true : (key in arg && exists(arg[key])) && validator(arg[key], ...args)
  )
}

/**
 * Check if the argument has values other than the ones provided.
*/
function hasOtherThan(arg: { [keys: string]: any }, keyNames: string[]) {
  return Object.keys(arg).every((key) => keyNames.includes(key));
}

/**
 * Validates if the argument passed is a valid
 * object that contains the user's keys.
 */
export function valIKeys(arg: any, optional = true): boolean {
  return (
    exists(arg) &&
    isObject(arg) &&
    !hasOtherThan(arg, ['IK', 'SPK', 'OPKs']) &&
    (has(arg, 'IK', isString, optional) && has(arg, 'SPK', validSPK, optional) && has(arg, 'OPKs', validOPKs, optional, !optional))
  );
}

/**
 * Checks if the argument is of type ISession.
*/
export function validSession(arg: any) {
  return (
    exists(arg) &&
    isObject(arg) &&
    !hasOtherThan(arg, ['IK', 'SPK', 'OPKs', 'main']) &&
    (has(arg, 'IK', isString) && has(arg, 'SPK', validSPK) && has(arg, 'OPKs', validOPKs) && has(arg, 'main', isBoolean))
  );
}

/**
 * Checks if the argument is valid user.
 */
export function validUser(arg: any) {
  return (
    exists(arg) &&
    isObject(arg) &&
    has(arg, 'IK', isString) &&
    has(arg, 'SPK', validSPK) &&
    has(arg, 'OPKs', validOPKs)
  );
}


/**
 * Checks if the session to be added is a duplicate.
 */
export function hasDuplicateKeys(keys: IKeyBundle, sessions: ISession[]) {
  let duplicate = false;
  sessions.forEach((s) => {
    if (s.IK === keys.IK || s.SPK?.id === keys.SPK?.id || s.SPK?.key === keys.SPK?.key) { }
    s.OPKs.forEach((opk_a) => {
      keys.OPKs.forEach((opk_b) => {
        opk_a.id === opk_b.id || opk_a.key === opk_b.key
      })
    })
  })
  return duplicate;
}
