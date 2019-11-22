# React Store Connect

> A library to connect your React components to a Redux like store

## Gist

```js
// store must be { getState, subscribe }
const selectManager = StoreMemoManager.create(store);
```

```js
const selectVisibleTodos = ({ state, memo }) => {
  return memo(() => {
    if (state.hideDone) {
      return state.todos.filter(t => t.done === false);
    }
    return state.todos;
  }, [state.todos, state.hideDone]);
};

const selectDoneCount: Selector<number> = ({ state, memo }) => {
  const done = memo(() => state.todos.filter(t => t.done), [state.todos]);
  return done.length;
};
```

```js
const { Provider, useSelector } = Connect.create();

const App = () => {
  const visibleTodos = useSelector(selectVisibleTodos);

  return <span>{visibleTodos.length}</span>;
};

ReactDOM.render(
  <Provider manager={selectManager}>
    <App />
  </Provider>,
  document.getElementById('root')
);
```

## How does it work ?

```js
const doubleSelector = ({ state, memo }) => {
  return memo(
    // the select function
    () => state.something.map(num => num * 2),
    // dependencies
    [state.something]
  );
};

// to execute a selector you need a Context
// createContext take a name argument, this is only for debug
const ctx = selectManager.createContext('my-context');

// imagine the state is
const state1 = { something: [1, 2, 3] };

// now we can execute our selector
// the execute function take a selector and pass all other arguments to the selector function
// this will execute simpleSelector which will call memo()
// because this is the first time we call it, there are no cache
// so () => state.something.map(num => num * 2) is executed and we get our result
// SelectManager will then save the dependencies and result
// { deps: [state1.something], result: [2, 4, 6] };
ctx.execute(doubleSelector);

// If we execute the same selector again
// the simpleSelector is executed but when memo() is called
// selectManager will compare previous deps with new deps
// prev: [state1.something] => new [state1.something]
// and because it's the same it will return the cached result
// => return [2, 4, 6] (same reference as before, no new table created !)
ctx.execute(doubleSelector);

// Now imagine the state change
const state2 = { something: [1, 2] };

// Is we execute the same selector with a different state
// simpleSelector is executed
// selectManager will compare previous deps with new deps
// prev: [state1.something] => new [state2.something]
// deps have changed, () => state.something.map(num => num * 2) is executed
// the new result is saved in cache
// => return [2, 4]
ctx.execute(doubleSelector, state2);
```

## Example

Take a look at the example folder !

