import React from 'react';
import { SelectManager } from './SelectManager';
import { useForceUpdate } from './utils';

type Unsubscribe = () => void;

interface Store<S> {
  getState(): S;
  subscribe(listener: () => void): Unsubscribe;
}

interface ConnectContext<State> {
  select: SelectManager;
  store: Store<State>;
}

type StoreSelect<State, Inputs extends Array<any>, Output> = (
  state: State,
  ...inputs: Inputs
) => Output;

export const Connect = {
  create: createConnect,
};

export interface Connect<State> {
  useSelector: <Inputs extends any[], Output>(
    selector: StoreSelect<State, Inputs, Output>,
    ...inputs: Inputs
  ) => Output;
  Provider: React.FunctionComponent<ProviderProps<State>>;
}

interface ProviderProps<State> {
  selectManager: SelectManager;
  store: Store<State>;
}

function createConnect<State>(): Connect<State> {
  const ConnectContext = React.createContext<ConnectContext<State> | null>(
    null
  );

  const Provider: React.FC<ProviderProps<State>> = React.memo<
    ProviderProps<State>
  >(({ selectManager, store, children }) => {
    const ctx = React.useMemo(() => {
      return { select: selectManager, store };
    }, [selectManager, store]);

    return (
      <ConnectContext.Provider value={ctx}>{children}</ConnectContext.Provider>
    );
  });
  Provider.displayName = 'ConnectProvider';

  function useSelector<Inputs extends Array<any>, Output>(
    selector: StoreSelect<State, Inputs, Output>,
    ...inputs: Inputs
  ): Output {
    const ctx = React.useContext(ConnectContext);
    if (ctx === null) {
      throw new Error(`ConnectContext is missing !`);
    }

    const name = useComponentName();

    const [selectCtx] = React.useState(() => ctx.select.createContext(name));
    const forceUpdate = useForceUpdate();

    const selectorRef = React.useRef(selector);
    selectorRef.current = selector;

    const inputsRef = React.useRef(inputs);
    inputsRef.current = inputs;

    const stateRef = React.useRef<Output>();
    stateRef.current = selectCtx.execute(
      selectorRef.current as any,
      ctx.store.getState(),
      ...inputsRef.current
    );

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        selectCtx.destroy();
      };
    }, [selectCtx]);

    React.useEffect(() => {
      const unsubscribe = ctx.store.subscribe(() => {
        const nextState = selectCtx.execute(
          selectorRef.current as any,
          ctx.store.getState(),
          ...inputsRef.current
        );

        if (stateRef.current !== nextState) {
          forceUpdate();
        }
      });
      const state = selectCtx.execute(
        selectorRef.current as any,
        ctx.store.getState(),
        ...inputsRef.current
      );
      if (state !== stateRef.current) {
        forceUpdate();
      }
      return unsubscribe;
    }, [ctx.store, forceUpdate, selectCtx]);

    return stateRef.current as any;
  }

  return {
    useSelector,
    Provider,
  };
}

function useCurrentComponent() {
  const {
    ReactCurrentOwner,
  } = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

  return ReactCurrentOwner &&
    ReactCurrentOwner.current &&
    ReactCurrentOwner.current.elementType
    ? ReactCurrentOwner.current.elementType
    : {};
}

function useComponentName() {
  const component = useCurrentComponent();
  if (typeof component.name === 'string') {
    return component.name;
  }
  if (typeof component.type === 'function') {
    return component.type.name;
  }
  return '';
}
