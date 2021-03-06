import { assert } from '../utils/errors'
import {
  Action,
  ActionChain,
  ActionMeta,
  Effect,
  EffectChain,
  EffectMeta,
} from '../types'

const assertActionExists = (actionOrEffect: ActionChain | EffectChain) => {
  assert(
    !!actionOrEffect,
    'Invalid meta chain. The last node in the chain must be either ' +
      'a valid action object with a non-empty "type" property ' +
      'or an effect with a non-empty "effectType" property'
  )
}

const getNewRoot = <T extends ActionChain | EffectChain>(
  currentNode: T,
  prevNode: T,
  rootNode: T
): T => {
  // If the match is at the top layer, just return the next layer
  if (!prevNode) return currentNode.payload

  // If the match is at least one layer deep, swap out the target layer
  // and return the new root of the meta chain
  prevNode.payload = currentNode.payload

  return rootNode
}

/**
 * Adds a meta node of the given metaType and with the given
 * metaData at the beginning of an ActionChain/EffectChain
 */
export const addMeta: {
  (action: ActionChain, metaType: string, metaData?: any): ActionMeta
  (effect: EffectChain, metaType: string, metaData?: any): EffectMeta
} = (actionOrEffect: any, metaType: string, metaData?: any) => {
  const wrappedAction: any = {
    metaType,
    payload: actionOrEffect,
  }

  if (metaData) wrappedAction.metaData = metaData

  return wrappedAction
}

/**
 * Returns the value of the metaData field of the first ActionMeta
 * or EffectMeta object in the chain with the given metaType.
 */
export const getMetaData = (
  actionOrEffect: ActionChain | EffectChain,
  metaType: string
) => {
  while (actionOrEffect.hasOwnProperty('metaType')) {
    if ((actionOrEffect as ActionMeta).metaType === metaType) {
      return (actionOrEffect as ActionMeta).metaData
    }

    actionOrEffect = actionOrEffect.payload

    assertActionExists(actionOrEffect)
  }
}

/**
 * Returns true if the given ActionChain or EffectChain contains
 * an ActionMeta or EffectMeta node with the given metaType.
 */
export const hasMeta = (
  actionOrEffect: ActionChain | EffectChain,
  metaType: string
) => {
  while (actionOrEffect.hasOwnProperty('metaType')) {
    if ((actionOrEffect as ActionMeta).metaType === metaType) return true

    actionOrEffect = actionOrEffect.payload

    assertActionExists(actionOrEffect)
  }

  return false
}

/**
 * Strips off an ActionChain or EffectChain and returns the wrapped
 * Action or Effect
 */
export const removeAllMeta: {
  (action: ActionChain): Action
  (effect: EffectChain): Effect
} = (actionOrEffect: any) => {
  while (actionOrEffect.hasOwnProperty('metaType')) {
    actionOrEffect = actionOrEffect.payload

    assertActionExists(actionOrEffect)
  }

  return actionOrEffect
}

/**
  Removes the first found meta node with the given metaType in
  the given meta chain

  The metaType does not have to exist in the meta chain
  (though this'll be pretty inefficient and wasteful if it doesn't).
*/
export const removeMeta: {
  (action: ActionChain, metaType: string): ActionChain
  (effect: EffectChain, metaType: string): EffectChain
} = (actionOrEffect: any, metaType: string) => {
  let currentNode = actionOrEffect as ActionChain | EffectChain
  let prevNode = null
  let rootNode = null

  while (currentNode.hasOwnProperty('metaType')) {
    if ((currentNode as ActionMeta).metaType === metaType) {
      return getNewRoot(currentNode, prevNode, rootNode)
    }

    // Move down the chain
    const clonedNode = { ...currentNode }

    prevNode && (prevNode.payload = clonedNode)

    prevNode = clonedNode
    currentNode = currentNode.payload

    // If this will be the new root, remember it
    rootNode || (rootNode = prevNode)
  }

  // No match found; return the original meta chain
  return actionOrEffect
}
