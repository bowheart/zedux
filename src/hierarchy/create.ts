import { actionTypes, metaTypes } from '../api/constants'
import { addMeta } from '../api/meta'
import { Action, Branch, HierarchyDescriptor, Reducer, Store } from '../types'
import { assertIsNullHierarchyDescriptorNode } from '../utils/errors'
import { HierarchyType, isPlainObject, isZeduxStore } from '../utils/general'
import { DiffNode, DiffTree } from '../utils/types'

type RegisterSubStore = (path: string[], store: Store) => () => void

/**
  Converts a Branch hierarchy descriptor to a diff node's children

  Really should only be used from `hierarchyDescriptorToDiffTree()`
*/
export function branchToDiffNodeChildren(
  branch: Branch,
  registerSubStore: RegisterSubStore,
  currentPath: string[]
) {
  const children: DiffTree = {}

  Object.entries(branch).forEach(([key, val]) => {
    const newPath = [...currentPath, key]

    children[key] = hierarchyDescriptorToDiffTree(
      val,
      registerSubStore,
      newPath
    )
  })

  return children
}

/**
  Determines the type of the given hierarchy descriptor.

  Throws a TypeError if the descriptor is invalid.
*/
export function getHierarchyType(descriptor: HierarchyDescriptor) {
  if (typeof descriptor === 'function') return HierarchyType.Reducer

  if (descriptor && isZeduxStore(descriptor)) return HierarchyType.Store

  if (isPlainObject(descriptor)) return HierarchyType.Branch

  assertIsNullHierarchyDescriptorNode(descriptor)

  return HierarchyType.Null
}

/**
  Turns a normal, user-supplied hierarchy descriptor into a
  diff tree for easy reducer hierarchy creating, diffing,
  merging, and destroying.

  Also figures out the reducer for non-branch nodes.
*/
export function hierarchyDescriptorToDiffTree(
  hierarchy: HierarchyDescriptor,
  registerSubStore: RegisterSubStore,
  currentPath: string[] = []
): DiffNode {
  const type = getHierarchyType(hierarchy)

  if (type !== HierarchyType.Branch) {
    return nonBranchToDiffNode(
      type,
      hierarchy as Reducer | Store,
      registerSubStore,
      currentPath
    )
  }

  // It's a Branch; recursively convert the whole tree
  return {
    type,
    children: branchToDiffNodeChildren(
      hierarchy as Branch,
      registerSubStore,
      currentPath
    ),
  }
}

export function nonBranchToDiffNode(
  type: HierarchyType,
  hierarchy: Reducer | Store,
  registerSubStore: RegisterSubStore,
  currentPath: string[]
): DiffNode {
  if (type === HierarchyType.Null) {
    return { type }
  }

  if (type === HierarchyType.Reducer) {
    return { type, reducer: hierarchy as Reducer }
  }

  // It's a Store hierarchy descriptor
  return {
    type,
    destroy: registerSubStore(currentPath, hierarchy as Store),
    reducer: wrapStoreInReducer(hierarchy as Store),
    store: hierarchy as Store,
  }
}

/**
  Creates a reducer that wraps the entry points of the given store.

  This reducer will propagate actions down the child store's reducer
  and effects layers.

  Wraps all actions in the special INHERIT meta node to inform the
  child store's effects subscribers that this action was received
  from its parent store.

  Since the parent store also registers an effects subscriber on this
  child store, it will know not to propagate the DISPATCH effect
  emitted by the child store for this action.
*/
export function wrapStoreInReducer<State>(store: Store<State>) {
  const reducer: Reducer = (state: State, action: Action) => {
    // If this is the special hydrate or partial hydrate action,
    // re-create the action's payload using the current state slice
    if (
      action.type === actionTypes.HYDRATE ||
      action.type === actionTypes.PARTIAL_HYDRATE
    ) {
      action = {
        type: actionTypes.HYDRATE,
        payload: state,
      }
    }

    // Tell the child store's subscribers that this action is inherited
    const inheritedAction = addMeta(action, metaTypes.INHERIT)

    const { error, state: newState } = store.dispatch(inheritedAction)

    // Propagate any errors up to the original dispatcher
    if (error) throw error

    return newState
  }

  return reducer
}
