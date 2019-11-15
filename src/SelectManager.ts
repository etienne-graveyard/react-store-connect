import { arrayShallowEqual } from './utils';
import { Subscription, SubscribeMethod } from 'suub';

export type Selector<Inputs extends Array<any>, Output> = (
  ...inputs: Inputs
) => Output;

type Ctx = symbol;

type CacheObj = {
  deps: ReadonlyArray<any>;
  result: any;
};

type CtxCache = Array<CacheObj>;

interface SelectManagerContext {
  execute<Inputs extends Array<any>, Output>(
    selector: Selector<Inputs, Output>,
    ...inputs: Inputs
  ): Output;
  destroy(): void;
}

export interface SelectManager {
  select<Output>(selector: () => Output, deps: ReadonlyArray<any>): Output;
  selectGlobal<Output>(
    key: any,
    selector: () => Output,
    deps: ReadonlyArray<any>
  ): Output;
  createContext(name: string): SelectManagerContext;
  getCache(): AllCaches;
  subscribeCache: SubscribeMethod<void>;
}

export const SelectManager = {
  create: createSelectManager,
};

type SelectorRef = any;

type AllCaches = {
  contextCache: Map<Ctx, CtxCache | null>;
  globalCache: Map<SelectorRef, CacheObj>;
};

function createSelectManager(): SelectManager {
  const contextCache: Map<Ctx, CtxCache | null> = new Map();
  const globalCache: Map<SelectorRef, CacheObj> = new Map();
  const {
    call: callCacheSubs,
    subscribe: subscribeCache,
  } = Subscription.create<void>();
  let currentCtx: Ctx | null = null;
  let nextCache: CtxCache | null = null;

  return {
    select,
    selectGlobal,
    createContext,
    getCache,
    subscribeCache,
  };

  function select<Output>(
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

  function selectGlobal<Output>(
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
    callCacheSubs();
    return nextSelectorCache.result;
  }

  function createContext(name: string): SelectManagerContext {
    const ctx: Ctx = Symbol(name);
    contextCache.set(ctx, null);
    return {
      destroy: () => destroy(ctx),
      execute,
    };

    function execute<Inputs extends Array<any>, Output>(
      selectorFactory: Selector<Inputs, Output>,
      ...inputs: Inputs
    ): Output {
      return executeInternal(ctx, selectorFactory, ...inputs);
    }
  }

  function destroy(ctx: Ctx) {
    contextCache.delete(ctx);
  }

  function executeInternal<Inputs extends Array<any>, Output>(
    ctx: Ctx,
    selector: Selector<Inputs, Output>,
    ...inputs: Inputs
  ): Output {
    currentCtx = ctx;
    nextCache = [];
    const result = selector(...inputs);
    const ctxCache = contextCache.get(ctx);
    if (ctxCache === undefined) {
      throw new Error(`Cache destroyed !`);
    }
    if (ctxCache !== null && ctxCache.length !== nextCache.length) {
      throw new Error(`ctxCache.length !== nextCache.length`);
    }
    contextCache.set(ctx, nextCache);
    callCacheSubs();
    currentCtx = null;
    nextCache = null;
    return result;
  }

  function getCache() {
    return {
      contextCache,
      globalCache,
    };
  }
}
