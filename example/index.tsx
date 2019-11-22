import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'suub';
import produce from 'immer';
import { Connect, StoreMemoSelector, StoreMemoManager } from '../src';

type Selector<Output, Inputs extends Array<any> = []> = StoreMemoSelector<
  State,
  Inputs,
  Output
>;

interface Todo {
  title: string;
  done: boolean;
  id: number;
}

interface State {
  todos: Array<Todo>;
  hideDone: boolean;
}

const store = createStore<State>({
  todos: [],
  hideDone: false,
});

const selectManager = StoreMemoManager.create(store);

// Selector

const selectHideDone: Selector<boolean> = ({ state }) => state.hideDone;

const selectVisibleTodos: Selector<Todo[]> = ({ state, memo }) => {
  return memo(() => {
    if (state.hideDone) {
      return state.todos.filter(t => t.done === false);
    }
    return state.todos;
  }, [state.todos, state.hideDone]);
};

const selectVisibleTodosCount: Selector<number> = ({ execute }) => {
  return execute(selectVisibleTodos).length;
};

// selector can take parameter
const selectTodo: Selector<Todo | null, [number]> = (
  { state, memo },
  todoId
) => {
  return memo(() => {
    return state.todos.find(todo => todo.id === todoId) || null;
  }, [state.todos, todoId]);
};

const selectDoneCount: Selector<number> = ({ state, memo }) => {
  const done = memo(() => state.todos.filter(t => t.done), [state.todos]);
  return done.length;
};

// Connect

const { Provider: ConnectProvider, useSelector } = Connect.create();

// React

let nextTodoId = 0;

const App = () => {
  const [newTodo, setNewTodo] = React.useState('');

  const hideDone = useSelector(selectHideDone);
  const todos = useSelector(selectVisibleTodos);
  const todosCount = useSelector(selectVisibleTodosCount);
  const doneCount = useSelector(selectDoneCount);

  return (
    <div>
      <div>
        <button
          onClick={() => {
            store.update(draft => {
              draft.hideDone = !draft.hideDone;
            });
          }}
        >
          {hideDone ? 'Show All' : 'Hide done'}
        </button>
      </div>
      <input
        type="text"
        placeholder="add todo"
        value={newTodo}
        onChange={e => setNewTodo(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            store.update(state => {
              state.todos.push({
                title: newTodo,
                done: false,
                id: nextTodoId++,
              });
            });
            setNewTodo('');
          }
        }}
      />
      <div>
        {todos.map(todo => {
          return <Todo todoId={todo.id} key={todo.id} />;
        })}
      </div>
      <p>Count: {todosCount}</p>
      <p>Done: {doneCount}</p>
    </div>
  );
};

const Todo = React.memo<{ todoId: number }>(function Todo({ todoId }) {
  const todo = useSelector(selectTodo, todoId);

  console.log(`Render todo ${todoId}`);

  if (!todo) {
    return null;
  }

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={e => {
          store.update(draft => {
            const todo = draft.todos.find(t => t.id === todoId);
            if (todo) {
              todo.done = !todo.done;
            }
          });
        }}
      />
      <span>{todo.title}</span>
    </div>
  );
});

ReactDOM.render(
  <ConnectProvider manager={selectManager}>
    <App />
  </ConnectProvider>,
  document.getElementById('root')
);

// Select outside of React

const outsideCtx = selectManager.createContext('outside');

let prevTodosCount: any = null;

const selectOutside = () => {
  const todosCount = outsideCtx.execute(selectVisibleTodosCount);

  if (prevTodosCount !== todosCount) {
    if (prevTodosCount !== null) {
      console.log(`todosCount changed ! (${prevTodosCount} => ${todosCount})`);
    }
    prevTodosCount = todosCount;
  }
};

store.subscribe(selectOutside);
selectOutside();

// This is just a simple store using immer
function createStore<T>(initial: T) {
  const sub = Subscription.create();
  let state = initial;
  return {
    getState: () => state,
    update: (updater: (draft: T) => any) => {
      state = produce(state, updater);
      sub.call();
    },
    subscribe: sub.subscribe,
  };
}
