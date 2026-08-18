import {
  THEMES,
  isThemeId,
  type ThemeDefinition,
  type ThemeId,
} from "./themes";

export const CD_PROFILES_STORAGE_KEY = "cd-custom-profiles";
export const CUSTOM_OPTION = "__custom__";
export const CUSTOM_ID_PREFIX = "c-";

export interface CustomProfile {
  id: string;
  name: string;
  basedOn: ThemeId;
  native: "light" | "dark";
  colorScheme: "light" | "dark";
  vars: Record<string, string>;
}

export function isCustomId(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(CUSTOM_ID_PREFIX));
}

export function profileToTheme(profile: CustomProfile): ThemeDefinition {
  const baseLabel = THEMES[profile.basedOn]?.label ?? profile.basedOn;
  return {
    id: profile.id,
    label: profile.name,
    kind: "overlay",
    native: profile.native,
    colorScheme: profile.colorScheme,
    description: `Custom profile. Started from ${baseLabel}.`,
    vars: profile.vars,
  };
}

export function resolveTheme(
  id: string | null | undefined,
  profiles: CustomProfile[] | null | undefined,
): ThemeDefinition | null {
  if (!id) return null;
  if (isThemeId(id)) return THEMES[id];
  const profile = (profiles ?? []).find((item) => item.id === id);
  return profile ? profileToTheme(profile) : null;
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || "profile";
}

function takenIds(profiles: CustomProfile[]): Set<string> {
  return new Set(profiles.map((item) => item.id));
}

function takenNames(profiles: CustomProfile[]): Set<string> {
  const names = new Set(
    Object.values(THEMES).map((theme) => theme.label.toLowerCase()),
  );
  for (const profile of profiles) names.add(profile.name.toLowerCase());
  return names;
}

export function uniqueProfileId(
  name: string,
  profiles: CustomProfile[],
): string {
  const taken = takenIds(profiles);
  const base = `${CUSTOM_ID_PREFIX}${slugify(name)}`;
  if (!taken.has(base) && !isThemeId(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function uniqueProfileName(
  name: string,
  profiles: CustomProfile[],
): string {
  const trimmed = name.trim() || "Custom";
  const taken = takenNames(profiles);
  if (!taken.has(trimmed.toLowerCase())) return trimmed;
  let n = 2;
  while (taken.has(`${trimmed} ${n}`.toLowerCase())) n += 1;
  return `${trimmed} ${n}`;
}

/** Overlay seed when cloning a native theme that has no vars. */
function seedOverlay(native: "light" | "dark"): ThemeDefinition {
  return native === "dark" ? THEMES.midnight : THEMES.dim;
}

export function cloneProfile(
  source: ThemeDefinition,
  requestedName: string,
  profiles: CustomProfile[],
): CustomProfile {
  const seed =
    source.kind === "overlay" && source.vars ? source : seedOverlay(source.native);
  const basedOn: ThemeId = isThemeId(source.id)
    ? source.id === "central-dark" || source.id === "central-light"
      ? (seed.id as ThemeId)
      : source.id
    : isThemeId(seed.id)
      ? seed.id
      : "dim";
  const customSource = !isThemeId(source.id)
    ? profiles.find((item) => item.id === source.id)
    : undefined;
  return {
    id: uniqueProfileId(requestedName, profiles),
    name: uniqueProfileName(requestedName, profiles),
    basedOn: customSource?.basedOn ?? basedOn,
    native: seed.native,
    colorScheme: seed.colorScheme ?? (seed.native === "dark" ? "dark" : "light"),
    vars: { ...(seed.vars ?? {}) },
  };
}

export function sanitizeProfiles(raw: unknown): CustomProfile[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomProfile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const body = item as Partial<CustomProfile>;
    if (typeof body.id !== "string" || !isCustomId(body.id)) continue;
    if (typeof body.name !== "string" || !body.name.trim()) continue;
    if (!isThemeId(body.basedOn)) continue;
    if (body.native !== "light" && body.native !== "dark") continue;
    if (body.colorScheme !== "light" && body.colorScheme !== "dark") continue;
    if (!body.vars || typeof body.vars !== "object") continue;
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(body.vars)) {
      if (typeof value === "string") vars[key] = value;
    }
    out.push({
      id: body.id,
      name: body.name.trim(),
      basedOn: body.basedOn,
      native: body.native,
      colorScheme: body.colorScheme,
      vars,
    });
  }
  return out;
}
