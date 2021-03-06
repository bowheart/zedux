# Dispatchable Reducers

Zedux allows reducers to be dispatched directly to the store in place of actions. These reducers have the form:

```typescript
<S = any, P = any>(state: S) => P
```

Ah! But wait! Real reducers also take an `action` param and return the entire state tree:

```typescript
<S = any>(state: S, action: Action) => S
```

So let's get some terminology straight first. Dispatchable "reducers" are not reducers at all. They map the current state to a partial state update and don't involve an action. Since they *are* inspired by reducers and functionally similar, we will refer to them as "Inducers". That is what they do after all &ndash; induce state updates.

## Inducers

Read up on the pros and cons of inducers in the [zero configuration guide](/docs/guides/zeroConfiguration.md).

The cool thing about inducers in comparison to reducers is that they can return a partial state update. This means that headaches like:

```javascript
store.hydrate({
  ...state,
  todos: {
    ...state.todos,
    urgent
  }
})
```

become simple:

```javascript
store.dispatch(() => ({
  todos: { urgent }
}))
```

Inducers require a few techniques to meet their full potential. Let's go over the most important ones:

## Techniques

Let's look at a normal inducer first:

```javascript
const increment = state => state + 1

store.dispatch(increment)
```

So this is nice and easy, but it isn't configurable, extensible, or scalable. Let's look at a few techniques we can use to make inducers awesome:

### Inducer factories

These are analogous to action creators. Note the currying:

```javascript
const addTodo = text => state =>
  [ ...state, { text, isComplete: false } ]

store.dispatch(addTodo('take the road more traveled'))
```

In other words, it's a function that returns a configured inducer.

### Shape abstraction

The real purpose of zero configuration is to allow small applications to take advantage of Zedux. But as your app scales, you should probably move to a [reducer hierarchy setup](/docs/guides/theReducerHierarchy).

Since reducers are [shape agnostic](/docs/glossary.md#shape-agnostic), it is important to abstract out the state boundedness of inducers as much as possible. This will make it easier to port the existing inducer "hierarchy" to a reducer hierarchy.

To do this, we'll make use of a shape abstraction called an [adapter](/docs/glossary.md#adapter).

```javascript
/*
  Here's our adapter.

  This guy just abstracts out the fact that the "todos" array
  lives inside a "todos" property on the root store object.
*/
const todosAdapter = inducer => state => ({
  todos: inducer(state.todos)
})

/*
  Here's our normal inducer factory.

  This is the entity we may one day split into an action
  creator and real reducer.
*/
const addTodo = newTodo => todosAdapter(
  state => [ ...state, newTodo ]
)
```

### Composite inducers

Inducers don't have to return a partial state update. We can make them return the whole tree. This gives them the form: `State => State`. Oh, snap...Must...Compose. Use this technique to update multiple separate but dependent pieces of the state tree at once:

```javascript
import { compose, createStore } from 'zedux'
import { selectWeaponPrice } from './selectors'

// Some setup for this example
const buyWeapon = weaponName => state => ({
  ...state,
  weapons: [ ...state.weapons, weaponName ]
})

const spendGold = amount => state => ({
  ...state,
  gold: state.gold - amount
})

const store = createStore()
  .hydrate({
    gold: 200,
    weapons: [ 'dagger' ]
  })

// Our composite inducer. 'broadsword' hard-coded for this example
const buyAndSpend = compose(
  buyWeapon('broadsword'),
  spendGold(selectWeaponPrice('broadsword'))
)

store.dispatch(buyAndSpend)
```

This technique can also be used to set the initial state of the store with probed inducer adapters:

```javascript
import { compose, createStore } from 'zedux'

// Some setup for this example
const todosAdapter = inducer => (state = {}) => ({
  ...state,
  todos: inducer(state.todos || [])
})

const visibilityFilterAdapter = inducer => (state = {}) => ({
  ...state,
  visibilityFilter: inducer(state.visibilityFilter || 'showAll')
})

const store = createStore()

// We'll use the identity function to "probe" our inducer adapters
const prober = state => state

// Create the inducer that'll set the store's initial state
const hydrater = compose(
  todosAdapter,
  visibilityFilterAdapter
)(prober)

store.dispatch(hydrater)
```

## But inducers aren't serializable! What about time travel?

Actually, it's still possible. After calculating the new state, Zedux will dispatch the special [partial hydrate action](/docs/api/actionTypes.md#partialhydrate) to the store, which inspectors can plug in to. Zedux always has this covered! All non-serializable or otherwise non-standard actions are transformed into a serializable action that has all the information a time travel implementation needs.

This gives Zedux a big boost up from other zero-configuration Redux libraries like [Repatch](https://github.com/jaystack/repatch) and [Redux-Zero](https://github.com/concretesolutions/redux-zero).

## Refactoring

Eventually our app may grow to the point where we need the scalability of a [reducer hierarchy](/docs/guides/theReducerLayer.md). Well-made inducer hierarchies are very easy to incrementally migrate to a reducer hierarchy setup.

Let's take the `addTodo` inducer factory from our shape abstraction example above and port it over to a reducer hierarchy. Here it is again:

```javascript
const addTodo = newTodo => todosAdapter(
  state => [ ...state, newTodo ]
)
```

Let's create the action creator first:

```javascript
const addTodo = newTodo => ({
  type: 'addTodo',
  payload: newTodo
})
```

And the reducer:

```javascript
// Just add the initial state and the action parameter
const addTodoReducer = (state = [], { payload: newTodo }) =>
  [ ...state, newTodo ]
```

And that's really all there is to it! You can see how much of that was copy-paste. But the Zedux api makes this even easier. Here's a complete example using Zedux [actors](/docs/api/ZeduxActor.md) and [reactors](/docs/api/ZeduxReactor.md):

```javascript
import { act, createStore, react } from 'zedux'

const addTodo = act('addTodo')

const addTodoReactor = react([])
  .to(addTodo)
  .withReducers(
    (state, { payload: newTodo }) => [ ...state, newTodo ]
  )

const store = createStore()
  .use({
    todos: addTodoReactor
  })
```

And that's everything. In 8 lines of code, we made an action creator, reactor, reducer, store, and reactor hierarchy and wired them all together.
