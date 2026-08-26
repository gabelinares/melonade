/* Mantine ships its styles expecting these two plugins: the preset provides the
 * rem()/em() functions and the light-dark() mixin its CSS uses, and
 * simple-vars supplies the breakpoint variables the preset references. Without
 * them Mantine's own stylesheet still works, but any Mantine postcss syntax in
 * OUR css silently ships as invalid CSS. */
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
