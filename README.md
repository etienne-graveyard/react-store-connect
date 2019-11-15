# React Store Sonnect

> A library to connect your React components to a Redux like store

## Gist

```js
const selectManager = SelectManager.create();
```

```js
const selectVisibleTodos = state => {
  return selectManager.select(() => {
    if (state.hideDone) {
      return state.todos.filter(t => t.done === false);
    }
    return state.todos;
  }, [state.todos, state.hideDone]);
};

const selectVisibleTodosCount = state => {
  return selectManager.select(() => {
    return selectVisibleTodos(state).length;
  }, [state]);
};
```

```js
const { Provider, useSelector } = Connect.create();

const App = () => {
  const todosCount = useSelector(selectVisibleTodosCount);

  return <span>{todosCount}</span>;
};

ReactDOM.render(
  <ConnectProvider selectManager={selectManager} store={store}>
    <App />
  </ConnectProvider>,
  document.getElementById('root')
);
```

## How does it work ?

```js
const doubleSelector = state => {
  return selectManager.select(
    // the select function
    () => state.something.map(num => num * 2),
    // dependencies
    [state.something]
  );
};

// to execute a selector you need a SelectContext
// createContext take a name argument, this is only for debug
const ctx = selectManager.createContext('my-context');

const state1 = { something: [1, 2, 3] };

// now we can execute our selector
// the execute function take a selector and pass all other arguments to the selector function
// this will execute simpleSelector which will call selectManager.select
// because this is the first time we call it, there are no cache
// so () => state.something.map(num => num * 2) is executed and we get our result
// SelectManager will then save the dependencies and resul
// { deps: [state1.something], result: [2, 4, 6] };
ctx.execute(doubleSelector, state1);

// If we execute the same selector again
// the simpleSelector is executed
// but when selectManager.select is called
// selectManager will compare previous deps with new deps
// prev: [state1.something] => new [state1.something]
// and because it's the same it will return the cached result
// => return [2, 4, 6] (same reference as before, no new table created !)
ctx.execute(doubleSelector, state1);

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

## Notes

`useSelector` does not expect you to pass a different selector between render, instead you should pass a argument to your selector.

```js
// DO NOT DO THIS
useSelector(isAdmin ? selectAdminList : selectUserList);
```

```js
// DO THIS INSTEAD
const selectList = (state, isAdmin) => {
  return selectManager.select(() => {
    return isAdmin ? selectAdminList(state) : selectUserList(state);
  }, [state, isAdmin]);
};

useSelector(selectList);
```
