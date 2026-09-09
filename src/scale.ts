export const WARN_PACKAGES = 40;
export const FAIL_PACKAGES = 150;

export function scaleGuard(
  n: number,
  force: boolean,
): { ok: boolean; warn: string | null; error: string | null } {
  if (n >= FAIL_PACKAGES && !force) {
    return {
      ok: false,
      warn: null,
      error: `Refusing ${n} packages (cap ${FAIL_PACKAGES}). Pass --force to override. turbometro v0.1 is aimed at showcase-sized monorepos.`,
    };
  }
  if (n >= WARN_PACKAGES) {
    return {
      ok: true,
      warn: `Large workspace (${n} packages). Layout may be dense.`,
      error: null,
    };
  }
  return { ok: true, warn: null, error: null };
}
