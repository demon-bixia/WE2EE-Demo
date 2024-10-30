import { IKeyBundle, ISession } from "./types/types";

/**
 * Check if the argument exists.
 */
function exists(arg: any) {
  return typeof arg === 'boolean' ? true : !!arg;
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
 * Check if the argument is a number.
 */
function isNumber(arg: any) {
  return typeof arg === 'number' && !isNaN(arg);
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
    'id' in arg && 'publicKey' in arg && 'signature' in arg &&
    isString(arg.id) && isString(arg.publicKey) && isString(arg.signature)
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
        'publicKey' in value &&
        isString(value.id) &&
        isString(value.publicKey)
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
  return arg && !Object.keys(arg).every((key) => keyNames.includes(key));
}

/**
 * Validates if the argument passed is a valid
 * object that contains the user's keys.
 */
export function validKeys(arg: any, optional = false): boolean {
  return (
    exists(arg) &&
    isObject(arg) &&
    !hasOtherThan(arg, ['IK', 'SIK', 'SPK', 'OPKs']) &&
    (
      has(arg, 'IK', isString, optional) &&
      has(arg, 'SIK', isString, optional) && 
      has(arg, 'SPK', validSPK, optional) &&
      has(arg, 'OPKs', validOPKs, optional, optional)
    )
  );
}

/**
 * Checks if the argument is of type ISession.
*/
export function validSession(arg: any) {
  return (
    exists(arg) &&
    isObject(arg) &&
    (has(arg, 'IK', isString) && has(arg, 'SIK', isString) && has(arg, 'SPK', validSPK) && has(arg, 'OPKs', validOPKs) && has(arg, 'main', isBoolean))
  );
}

/**
 * Validates an array of sessions
 */
export function validSessions(arg: any) {
  return arg.every((value: any) => validSession(value))
}

/**
 * Checks if the argument is valid user.
 */
export function validUser(arg: any) {
  return (
    exists(arg) &&
    isObject(arg) &&
    has(arg, 'sessions', validSessions)
  );
}

/**
 * Checks if the session to be added is a duplicate.
 */
export function hasDuplicateKeys(keys: IKeyBundle, sessions: ISession[]) {
  let duplicate = false;
  sessions.forEach((s) => {
    if (s.IK === keys.IK || s.SIK === keys.SIK || s.SPK?.id === keys.SPK?.id || s.SPK?.publicKey === keys.SPK?.publicKey) { }
    s.OPKs.forEach((opk_a) => {
      keys.OPKs.forEach((opk_b) => {
        opk_a.id === opk_b.id || opk_a.publicKey === opk_b.publicKey
      })
    })
  })
  return duplicate;
}


/**
 * @param arg message to be validated
 * @returns {Boolean}
 */
export function validMessage(arg: any) {
  return (
    exists(arg) &&
    isObject(arg) &&
    has(arg, 'subject', isString) &&
    has(arg, 'to', isString) &&
    has(arg, 'from', isString) &&
    has(arg, 'timestamp', isNumber) &&
    has(arg, 'IK', isString)
  );
}
