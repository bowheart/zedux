export const ARRAY = 'array'
export const COMPLEX_OBJECT = 'complex object'
export const NO_PROTOTYPE = 'prototype-less object'
export const NULL = 'null'
export const PLAIN_OBJECT = 'object'

export enum HierarchyType {
  Branch,
  Null,
  Reducer,
  Store,
}

export const observableSymbol =
  (typeof Symbol === 'function' && (Symbol as any).observable) || '@@observable'

// Create a unique symbol in the global symbol registry
// to identify zedux stores
export const STORE_IDENTIFIER = Symbol.for('zedux.store')

/**
  Returns a more informative description of thing's type.

  Used to give users helpful error messages that detail exactly why
  their input was rejected, rather than ux nightmares like:

  "expected a plain object, received object"
*/
export function detailedTypeof(thing: any) {
  const thingType = typeof thing

  if (thingType !== 'object') return thingType
  if (!thing) return NULL
  if (Array.isArray(thing)) return ARRAY

  return getDetailedObjectType(thing)
}

/**
  Checks whether thing is a plain old object.

  The object may originate from another realm or have its prototype
  explicitly set to Object.prototype, but it may not have a null
  prototype or prototype chain more than 1 layer deep.
*/
export function isPlainObject(thing: any) {
  if (typeof thing !== 'object' || !thing) return false

  const prototype = Object.getPrototypeOf(thing)
  if (!prototype) return false // it was created with Object.create(null)

  // If the prototype chain is exactly 1 layer deep, it's a normal object
  return Object.getPrototypeOf(prototype) === null
}

/**
  Checks whether thing is a Zedux store.

  All Zedux stores have a special symbol as their `$$typeof` property.
*/
export function isZeduxStore(thing: any) {
  return thing && thing.$$typeof === STORE_IDENTIFIER
}

/**
  Determines which kind of object an "object" is.

  Objects can be prototype-less, complex, or plain.
*/
function getDetailedObjectType(thing: any) {
  const prototype = Object.getPrototypeOf(thing)

  if (!prototype) return NO_PROTOTYPE

  return Object.getPrototypeOf(prototype) ? COMPLEX_OBJECT : PLAIN_OBJECT
}
