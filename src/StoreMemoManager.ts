import { MemoManager } from './MemoManager';

type Unsubscribe = () => void;

export interface Store<S> {
  getState(): S;
  subscribe(listener: () => void): Unsubscribe;
}

export interface StoreMemoTools<State> {
  state: State;
  memo<Output>(selector: () => Output, deps: ReadonlyArray<any>): Output;
  globalMemo<Output>(
    key: any,
    selector: () => Output,
    deps: ReadonlyArray<any>
  ): Output;
  execute<Inputs extends Array<any>, Output>(
    selector: StoreMemoSelector<State, Inputs, Output>,
    ...inputs: Inputs
  ): Output;
}

export type StoreMemoSelector<State, Inputs extends Array<any>, Output> = (
  tools: StoreMemoTools<State>,
  ...inputs: Inputs
) => Output;

export interface StoreMemoContext<State> {
  execute<Inputs extends Array<any>, Output>(
    selector: StoreMemoSelector<State, Inputs, Output>,
    ...inputs: Inputs
  ): Output;
  destroy(): void;
}

export interface StoreMemoManager<State> {
  createContext(name: string): StoreMemoContext<State>;
  getState(): State;
  subscribe(listener: () => void): Unsubscribe;
}

export const StoreMemoManager = {
  create: createStoreMemoManager,
};

function createStoreMemoManager<State>(
  store: Store<State>
): StoreMemoManager<State> {
  const memoManager = MemoManager.create();

  return {
    createContext,
    getState: store.getState,
    subscribe: store.subscribe,
  };

  function createContext(name: string): StoreMemoContext<State> {
    const memoCtx = memoManager.createContext(name);

    return {
      destroy: memoCtx.destroy,
      execute,
    };

    function execute<Inputs extends Array<any>, Output>(
      selector: StoreMemoSelector<State, Inputs, Output>,
      ...inputs: Inputs
    ): Output {
      return memoCtx.execute((tools, ...inputs) => {
        const memoTools: StoreMemoTools<State> = {
          execute: (selector, ...inputs) => selector(memoTools, ...inputs),
          globalMemo: tools.globalMemo,
          memo: tools.memo,
          state: store.getState(),
        };
        return selector(memoTools, ...inputs);
      }, ...inputs);
    }
  }
}
