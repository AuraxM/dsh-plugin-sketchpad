/**
 * dsh-sketchpad - Host half.
 *
 * Deliberately empty: Sketchpad is a pure browser plugin. All behavior lives
 * in lib/client.js (see the `dsh.client` entry in package.json); this module
 * exists so the package resolves as a normal Cordis row on the host plane.
 */
const name = "dsh-sketchpad";

function apply() {}

export { apply, name };
