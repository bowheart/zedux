# Actor

An actor is just a glorified [action creator](/docs/types/ActionCreator.md) &ndash; "glorified" meaning it has one tiny property: `type`. This is the `type` property that should be set on all actions created by the actor.

## Definition

```typescript
interface Actor extends ActionCreator {
  type: string
}
```

**type** - Some string that identifies the actions created by this actor. Avoid using names starting with `'@@zedux/'` as these are reserved for internal Zedux action types.

## Examples

That tiny `type` property is a surprising asset. This one little detail is what eliminates string constants in Zedux. Instead of:

```javascript
const INCREMENT = 'INCREMENT'

const increment = () => ({ type: INCREMENT })

const reducer = (state = 0, action) {
  const amount = action.type === INCREMENT

  return state + amount
}
```

we get:

```javascript
const increment = () => ({ type: increment.type })

increment.type = 'increment'

const reducer = (state = 0, action) {
  const amount = action.type === increment.type

  return state + amount
}
```

This doesn't seem like much in this example, but it allows us to create awesome apis like [`act()`](/docs/api/act.md) and [`react()`](/docs/api/react.md):

```javascript
import { act, react } from 'zedux'

const increment = act('increment')

const reducer = react(0)
  .to(increment)
  .withReducers(state => state + 1)
```

## Notes

While there's nothing wrong with putting actors together yourself, Zedux ships with a high-level api for creating them. See the [ZeduxActor api](/docs/api/ZeduxActor.md) for more info.