import React from 'react';

export function useForceUpdate(): () => void {
  const [, setState] = React.useState({});
  return React.useCallback(() => {
    setState({});
  }, []);
}

export function arrayShallowEqual(
  left: ReadonlyArray<any>,
  right: ReadonlyArray<any>
): boolean {
  return (
    left.length === right.length && left.every((v, index) => v === right[index])
  );
}
