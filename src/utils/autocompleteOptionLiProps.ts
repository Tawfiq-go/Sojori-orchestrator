import type { HTMLAttributes, Key } from 'react';

/** Layout keys MUI Autocomplete injects on option props — invalid on native <li>. */
const OMIT_LI_PROPS = new Set([
  'alignItems',
  'flexWrap',
  'flexDirection',
  'justifyContent',
  'display',
  'gap',
  'ownerState',
]);

/**
 * Split Autocomplete renderOption props before spreading on Box component="li".
 * MUI v9 + React 19 warn when flexbox system keys reach the DOM.
 */
export function autocompleteOptionLiProps(
  props: { key?: Key } & Record<string, unknown>,
): { key: Key | undefined; liProps: HTMLAttributes<HTMLLIElement> } {
  const { key, ...rest } = props;
  const liProps: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(rest)) {
    if (!OMIT_LI_PROPS.has(name)) liProps[name] = value;
  }
  return { key, liProps: liProps as HTMLAttributes<HTMLLIElement> };
}
