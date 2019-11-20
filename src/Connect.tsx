import React from 'react';
import { StoreMemoManager, StoreMemoSelector } from './StoreMemoManager';
import { useForceUpdate } from './utils';

export const Connect = {
  create: createConnect,
};

export interface Connect<State> {
  useSelector: <Inputs extends any[], Output>(
    selector: StoreMemoSelector<State, Inputs, Output>,
    ...inputs: Inputs
  ) => Output;
  Provider: React.FunctionComponent<ProviderProps<State>>;
}

interface ProviderProps<State> {
  manager: StoreMemoManager<State>;
}

function createConnect<State>(): Connect<State> {
  const ConnectContext = React.createContext<StoreMemoManager<State> | null>(
    null
  );

  const Provider: React.FC<ProviderProps<State>> = React.memo<
    ProviderProps<State>
  >(({ children, manager }) => {
    return (
      <ConnectContext.Provider value={manager}>
        {children}
      </ConnectContext.Provider>
    );
  });
  Provider.displayName = 'ConnectProvider';

  function useSelector<Inputs extends Array<any>, Output>(
    selector: StoreMemoSelector<State, Inputs, Output>,
    ...inputs: Inputs
  ): Output {
    const ctx = React.useContext(ConnectContext);
    if (ctx === null) {
      throw new Error(`ConnectContext is missing !`);
    }

    const name = useComponentName();

    const [selectCtx] = React.useState(() => ctx.createContext(name));
    const forceUpdate = useForceUpdate();

    const selectorRef = React.useRef(selector);
    selectorRef.current = selector;

    const inputsRef = React.useRef(inputs);
    inputsRef.current = inputs;

    const stateRef = React.useRef<Output>();
    stateRef.current = selectCtx.execute(
      selectorRef.current as any,
      ...inputsRef.current
    );

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        selectCtx.destroy();
      };
    }, [selectCtx]);

    React.useEffect(() => {
      const unsubscribe = ctx.subscribe(() => {
        const nextState = selectCtx.execute(
          selectorRef.current as any,
          ...inputsRef.current
        );

        if (stateRef.current !== nextState) {
          forceUpdate();
        }
      });
      const state = selectCtx.execute(
        selectorRef.current as any,
        ...inputsRef.current
      );
      if (state !== stateRef.current) {
        forceUpdate();
      }
      return unsubscribe;
    }, [ctx, forceUpdate, selectCtx]);

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
