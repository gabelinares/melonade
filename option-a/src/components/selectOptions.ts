/**
 * antd puts a native `title` on every option whose label is a string, so a row
 * that is fully visible gets an OS tooltip on top of it: a dark slab that lags
 * the cursor, covers the rows underneath and repeats what they already say. On
 * a dropdown whose rows ARE the content - the type specimens in the prototype
 * panel - it covers the thing you are trying to look at.
 *
 * Pass options through this to keep the label and drop the tooltip. It is a
 * helper rather than a wrapper component because the fix is one property: a
 * `<Select>` of our own would have to re-export antd's entire surface to
 * change it.
 */
export function noNativeTooltip<T extends object>(options: readonly T[]): (T & { title: string })[] {
  return options.map((o) => ({ ...o, title: '' }));
}
