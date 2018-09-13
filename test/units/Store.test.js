import { from } from 'rxjs'
import { filter } from 'rxjs/operators'

import {
  actionTypes,
  createStore,
  effectTypes,
  metaTypes
} from '../../src/index'

import {
  dispatchables,
  nonDispatchables,
  nonPlainObjects
} from '../utils'


describe('Store.dispatch()', () => {

  test('accepts a non-modifying inducer', () => {

    const store = createStore()
    const inducer = state => state

    const prevState = store.getState()
    const { state } = store.dispatch(inducer)

    expect(prevState).toBe(state)

  })


  test('accepts a modifying inducer', () => {

    const store = createStore()
    const inducer = () => 'a'

    const prevState = store.getState()
    const { state } = store.dispatch(inducer)

    expect(prevState).not.toBe(state)
    expect(state).toBe('a')

  })


  test('throws a TypeError if the thing dispatched is not a plain object or a function', () => {

    const store = createStore()
      .use(() => 'a')

    nonDispatchables.forEach(
      nonDispatchable => expect(
        store.dispatch.bind(null, nonDispatchable)
      ).toThrow(TypeError)
    )

    dispatchables.forEach(
      dispatchable => expect(
        store.dispatch.bind(null, dispatchable)
      ).not.toThrow()
    )

  })


  test('short-circuits, hydrates, and returns the new state if the action has the special HYDRATE type', () => {

    const store = createStore()

    const action = {
      type: actionTypes.HYDRATE,
      payload: { a: 1 }
    }

    const prevState = store.getState()
    const { state } = store.dispatch(action)

    expect(state).not.toBe(prevState)
    expect(state).toBe(action.payload)

  })


  test('short-circuits, hydrates, and returns the new state if the action has the special PARTIAL_HYDRATE type', () => {

    const store = createStore()

    const action = {
      type: actionTypes.PARTIAL_HYDRATE,
      payload: { a: 1 }
    }

    const prevState = store.getState()
    const { state } = store.dispatch(action)

    expect(state).not.toBe(prevState)
    expect(state).toBe(action.payload)

  })


  test('short-circuits and returns the new state if the action contains the special DELEGATE meta node', () => {

    const store1 = createStore()
      .use(() => 1)
    const store2 = createStore()
      .use({
        a: store1
      })

    const action = {
      metaType: metaTypes.DELEGATE,
      metaData: [ 'a' ],
      payload: {
        type: 'b'
      }
    }

    const prevState = store2.getState()

    expect(store2.dispatch(action).state).toBe(prevState)

  })


  test('throws an Error if the dispatched action object does not have a string "type" property', () => {

    const store = createStore()
      .use(() => 'a')

    expect(store.dispatch.bind(null, {})).toThrowError(/invalid meta chain/i)

    expect(store.dispatch.bind(null, { type: 1 })).toThrow(TypeError)

    expect(store.dispatch.bind(null, { type: '' })).toThrowError(/invalid meta chain/i)

  })


  test('notifies effects subscribers of a wrapped action', () => {

    const effectsSubscriber = jest.fn()
    const store = createStore()
      .use(() => 'a')

    const action = {
      metaType: 'b',
      payload: {
        type: 'c'
      }
    }

    store.subscribe({ effects: effectsSubscriber })
    store.dispatch(action)

    expect(effectsSubscriber).toHaveBeenLastCalledWith(expect.objectContaining({
      effects: [{
        effectType: effectTypes.DISPATCH,
        payload: action
      }]
    }))

  })


  test('skips the reducer layer if the SKIP_REDUCERS meta node is present', () => {

    const reactor = jest.fn()
    reactor.effects = jest.fn()

    const store = createStore()
      .use(reactor)

    const action = {
      metaType: metaTypes.SKIP_REDUCERS,
      payload: {
        type: 'a'
      }
    }

    store.dispatch(action)

    expect(reactor).toHaveBeenCalledTimes(1)
    expect(reactor.effects).toHaveBeenCalledTimes(2)

  })


  test('skips the effects layer if the SKIP_EFFECTS meta node is present', () => {

    const reactor = jest.fn()
    reactor.effects = jest.fn()

    const store = createStore()
      .use(reactor)

    const action = {
      metaType: metaTypes.SKIP_EFFECTS,
      payload: {
        type: 'a'
      }
    }

    store.dispatch(action)

    expect(reactor).toHaveBeenCalledTimes(2)
    expect(reactor.effects).toHaveBeenCalledTimes(1)

  })


  test('does not inform subscribers if no changes were made', () => {

    const reducer = () => 1
    const subscriber = jest.fn()

    const store = createStore()
      .use({
        a: reducer
      })

    store.subscribe(subscriber)

    const action = {
      type: 'b'
    }

    store.dispatch(action)

    expect(subscriber).not.toHaveBeenCalled()

  })


  test('informs subscribers if changes were made', () => {

    const reducer = (state = 0) => state + 1
    const subscriber = jest.fn()

    const store = createStore()
      .use({
        a: reducer
      })

    store.subscribe(subscriber)

    const action = {
      type: 'b'
    }

    store.dispatch(action)

    expect(subscriber).toHaveBeenCalledWith({ a: 2 }, { a: 1 })
    expect(subscriber).toHaveBeenCalledTimes(1)

  })


  test('returns the old state if no changes were made', () => {

    const reducer = () => 1

    const store = createStore()
      .use({
        a: reducer
      })

    const action = {
      type: 'b'
    }

    const prevState = store.getState()
    const { state } = store.dispatch(action)

    expect(prevState).toBe(state)

  })


  test('returns the new state if changes were made', () => {

    const reducer = (state = 0) => state + 1

    const store = createStore()
      .use({
        a: reducer
      })

    const action = {
      type: 'b'
    }

    const prevState = store.getState()
    const { state } = store.dispatch(action)

    expect(prevState).not.toBe(state)
    expect(state).toEqual({
      a: 2
    })

  })


  test('root reactor "effects" property is optional', () => {

    const reducer = jest.fn()
    const store = createStore()
      .use(reducer)

    const action = {
      type: 'a'
    }

    store.dispatch(action)

    expect(reducer).toHaveBeenCalledTimes(2)

  })

})


describe('Store.getState()', () => {

  test('cannot be called inside a reducer; throws an Error', () => {

    const store = createStore()

    const reducer = state => {
      if (state) store.getState()

      return state || 'a'
    }

    store.use(reducer)

    const action = {
      type: 'b'
    }

    const { error } = store.dispatch(action)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/cannot be called within a reducer/i)

  })


  test('returns the current state', () => {

    const store = createStore()

    expect(store.getState()).toBeUndefined()

    store.use(state => state || 'a')

    expect(store.getState()).toBe('a')

    store.dispatch(() => 'b')

    expect(store.getState()).toBe('b')

  })

})


describe('Store.hydrate()', () => {

  test('cannot be called inside a reducer; throws an Error', () => {

    const store = createStore()

    const reducer = state => {
      if (state) store.hydrate()

      return 'a'
    }

    store.use(reducer)

    const action = {
      type: 'b'
    }

    const { error } = store.dispatch(action)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/cannot be called within a reducer/i)

  })


  test('short-circuits if the new state === the current state', () => {

    const obj = {}
    const store = createStore()
      .use(() => obj)

    store.hydrate(obj)

    expect(store.getState()).toBe(obj)

  })


  test('informs effect subscribers of the special HYDRATE action', () => {

    const effectsSubscriber = jest.fn()
    const store = createStore()
    const hydratedState = { a: 1 }

    store.subscribe({ effects: effectsSubscriber })
    store.hydrate(hydratedState)

    expect(effectsSubscriber).toHaveBeenCalledWith(expect.objectContaining({
      effects: [{
        effectType: effectTypes.DISPATCH,
        payload: {
          type: actionTypes.HYDRATE,
          payload: hydratedState
        }
      }]
    }))

  })


  test('informs subscribers of the new state', () => {

    const subscriber = jest.fn()
    const store = createStore()
    const hydratedState = { a: 1 }

    store.subscribe(subscriber)
    store.hydrate(hydratedState)

    expect(subscriber).toHaveBeenCalledWith(hydratedState, undefined)

  })


  test('returns the store for chaining', () => {

    const store = createStore()
      .hydrate('a')
      .hydrate('b')

    expect(store.getState()).toBe('b')

  })

})


describe('store.setNodeOptions()', () => {

  test('throws a TypeError if the options hash is not a plain object', () => {

    const store = createStore()

    nonPlainObjects.forEach(
      nonPlainObject => expect(
        store.setNodeOptions.bind(null, nonPlainObject)
      ).toThrow(TypeError)
    )

  })


  test('throws an Error if the options hash contains an invalid option key', () => {

    const store = createStore()

    expect(store.setNodeOptions.bind(null, { a: 1 })).toThrow(Error)
    expect(store.setNodeOptions.bind(null, {
      clone: () => {},
      create: () => {},
      a: () => {}
    })).toThrow(Error)

  })


  test('throws a TypeError if the options hash contains a non-function option value', () => {

    const store = createStore()

    nonDispatchables.forEach(
      nonDispatchable => expect(
        store.setNodeOptions.bind(null, { clone: nonDispatchable })
      ).toThrow(TypeError)
    )

  })


  test('returns the store for chaining', () => {

    const store = createStore()
      .setNodeOptions({ clone: () => {} })

    expect(store.$$typeof).toBe(Symbol.for('zedux.store'))

  })

})


describe('Store.setState()', () => {

  test('cannot be called inside a reducer; throws an Error', () => {

    const store = createStore()

    const reducer = state => {
      if (state) store.setState('a')

      return 'b'
    }

    store.use(reducer)

    const action = {
      type: 'c'
    }

    const { error } = store.dispatch(action)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/cannot be called within a reducer/i)

  })


  test('short-circuits if the new state === the current state', () => {

    const obj = {}
    const store = createStore()
      .use(() => obj)

    store.setState(obj)

    expect(store.getState()).toBe(obj)

  })


  test('creates a PARTIAL_HYDRATE dispatch effect', () => {

    const effectsSubscriber = jest.fn()
    const store = createStore()
    const hydratedState = { a: 1 }

    store.subscribe({ effects: effectsSubscriber })
    store.setState(hydratedState)

    expect(effectsSubscriber).toHaveBeenCalledWith(expect.objectContaining({
      effects: [{
        effectType: effectTypes.DISPATCH,
        payload: {
          type: actionTypes.PARTIAL_HYDRATE,
          payload: hydratedState
        }
      }]
    }))

  })


  test('informs subscribers of the new state', () => {

    const subscriber = jest.fn()
    const store = createStore()
    const hydratedState = { a: 1 }

    store.subscribe(subscriber)
    store.setState(hydratedState)

    expect(subscriber).toHaveBeenCalledWith(hydratedState, undefined)

  })


  test('does nothing if the state did not change', () => {

    const store = createStore()
      .hydrate(1)

    const initialState = store.getState()

    const subscriber = jest.fn()
    store.subscribe(subscriber)

    const { state } = store.setState(1)

    expect(subscriber).not.toHaveBeenCalled()
    expect(state).toBe(initialState)

  })


  test('deeply merges the new state into the old state', () => {

    const initialState = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3
        }
      }
    }

    const store = createStore()
      .hydrate(initialState)

    const { state } = store.setState({
      b: {
        c: 4,
        f: 5
      }
    })

    expect(state).toEqual({
      a: 1,
      b: {
        c: 4,
        d: {
          e: 3
        },
        f: 5
      }
    })

    expect(state.b.d).toBe(initialState.b.d)

  })

})


describe('store.subscribe()', () => {

  test('throws an Error if the subscriber.next', () => {

    const store = createStore()

    nonDispatchables.filter(Boolean).forEach(
      nonDispatchable => expect(
        store.subscribe.bind(null, { next: nonDispatchable })
      ).toThrow(Error)
    )

  })

  test('throws an Error if subscriber.error is not a function', () => {

    const store = createStore()

    nonDispatchables.filter(Boolean).forEach(
      nonDispatchable => expect(
        store.subscribe.bind(null, { error: nonDispatchable })
      ).toThrow(Error)
    )

  })

  test('throws an Error if subscriber.effects is not a function', () => {

    const store = createStore()

    nonDispatchables.filter(Boolean).forEach(
      nonDispatchable => expect(
        store.subscribe.bind(null, { effects: nonDispatchable })
      ).toThrow(Error)
    )

  })


  test('returns a subscription object', () => {

    const store = createStore()

    const subscription = store.subscribe(() => {})

    expect(subscription).toEqual({
      unsubscribe: expect.any(Function)
    })

  })

})


describe('store.use()', () => {

  test('returns the store for chaining', () => {

    const store = createStore()
      .use()
      .use(() => {})
      .use(null)

    expect(store.$$typeof).toBe(Symbol.for('zedux.store'))

  })

})


describe('store[@@observable]', () => {

  test('returns the store (which is an observable)', () => {

    const store = createStore()

    expect(store['@@observable']()).toBe(store)

  })


  test('can be converted to an RxJS observable', () => {

    const store = createStore()
    const state$ = from(store)
    const subscriber = jest.fn()

    state$.subscribe(subscriber)

    store.setState('a')

    expect(subscriber).toHaveBeenCalledWith('a')
    expect(subscriber).toHaveBeenCalledTimes(1)

  })


  test('we can go RxJS crazy with the observable store', () => {

    const store = createStore()
    const subscriber = jest.fn()

    from(store)
      .pipe(
        filter(state => state !== 'a')
      )
      .subscribe(subscriber)

    store.setState('a')
    store.setState('b')
    store.setState('a')

    expect(subscriber).toHaveBeenCalledWith('b')
    expect(subscriber).toHaveBeenCalledTimes(1)

  })

})
