import { arrayShallowEqual } from './utils';

export type Selector<Inputs extends Array<any>, Output> = (
  tools: MemoTools,
  ...inputs: Inputs
) => Output;

type Ctx = symbol;

type CacheObj = {
  deps: ReadonlyArray<any>;
  result: any;
};

type CtxCache = Array<CacheObj>;

export interface MemoTools {
  memo<Output>(selector: () => Output, deps: ReadonlyArray<any>): Output;
  globalMemo<Output>(
    key: any,
    selector: () => Output,
    deps: ReadonlyArray<any>
  ): Output;
  execute<Inputs extends Array<any>, Output>(
    selector: Selector<Inputs, Output>,
    ...inputs: Inputs
  ): Output;
}

interface MemoContext {
  execute<Inputs extends Array<any>, Output>(
    selector: Selector<Inputs, Output>,
    ...inputs: Inputs
  ): Output;
  destroy(): void;
}

export interface MemoManager {
  createContext(name: string): MemoContext;
}

export const MemoManager = {
  create: createMemoManager,
};

type SelectorRef = any;

function createMemoManager(): MemoManager {
  const contextCache: Map<Ctx, CtxCache | null> = new Map();
  const globalCache: Map<SelectorRef, CacheObj> = new Map();
  let currentCtx: Ctx | null = null;
  let nextCache: CtxCache | null = null;

  return {
    createContext,
  };

  function memo<Output>(
    selector: () => Output,
    deps: ReadonlyArray<any>
  ): Output {
    if (currentCtx === null) {
      throw new Error(`currentCtx is null`);
    }
    if (nextCache === null) {
      throw new Error(`nextCache is null`);
    }
    const ctxCache = contextCache.get(currentCtx);
    const currentIndex = nextCache.length;
    const selectCache = ctxCache && ctxCache[currentIndex];
    if (selectCache) {
      if (arrayShallowEqual(deps, selectCache.deps)) {
        nextCache.push(selectCache);
        return selectCache.result;
      }
    }
    const nextSelectCache: CacheObj = {
      deps,
      result: selector(),
    };
    nextCache.push(nextSelectCache);
    return nextSelectCache.result;
  }

  function globalMemo<Output>(
    key: any,
    selector: () => Output,
    deps: ReadonlyArray<any>
  ): Output {
    const selectorCache = globalCache.get(key);
    if (selectorCache) {
      if (arrayShallowEqual(deps, selectorCache.deps)) {
        return selectorCache.result;
      }
    }
    const nextSelectorCache: CacheObj = {
      deps,
      result: selector(),
    };
    globalCache.set(key, nextSelectorCache);
    return nextSelectorCache.result;
  }

  function createContext(name: string): MemoContext {
    const ctx: Ctx = Symbol(name);
    contextCache.set(ctx, null);

    const tools: MemoTools = {
      memo,
      globalMemo,
      execute,
    };

    return {
      destroy: () => destroy(ctx),
      execute,
    };

    function execute<Inputs extends Array<any>, Output>(
      selectorFactory: Selector<Inputs, Output>,
      ...inputs: Inputs
    ): Output {
      return executeInternal(ctx, selectorFactory, tools, ...inputs);
    }
  }

  function destroy(ctx: Ctx) {
    contextCache.delete(ctx);
  }

  function executeInternal<Inputs extends Array<any>, Output>(
    ctx: Ctx,
    selector: Selector<Inputs, Output>,
    tools: MemoTools,
    ...inputs: Inputs
  ): Output {
    currentCtx = ctx;
    nextCache = [];
    const result = selector(tools, ...inputs);
    const ctxCache = contextCache.get(ctx);
    if (ctxCache === undefined) {
      throw new Error(`Cache destroyed !`);
    }
    if (ctxCache !== null && ctxCache.length !== nextCache.length) {
      throw new Error(`ctxCache.length !== nextCache.length`);
    }
    contextCache.set(ctx, nextCache);
    currentCtx = null;
    nextCache = null;
    return result;
  }
}
