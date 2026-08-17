import { readFileSync, writeFileSync } from "node:fs";

const groups = readFileSync(
  new URL("../src/tokens/groups-compact.json", import.meta.url),
  "utf8",
);

const src = `import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type Group = {
  id: string;
  hex: string;
  display: string;
  role: string;
  n: number;
  token: string;
  cw: number;
  cd: number;
  ex: string;
  modes: string;
};

const GROUPS: Group[] = ${groups};

function classify(g: Group): string {
  const h = g.hex.toLowerCase();
  if (g.display.length === 9) return "overlay";
  if (
    h === "#01a982" ||
    h === "#00c781" ||
    h === "#17eba0" ||
    h === "#008567" ||
    h === "#17d0a6" ||
    h === "#009a71"
  ) {
    return "brand";
  }
  const chromeHex = new Set([
    "#ffffff",
    "#000000",
    "#f8f8f8",
    "#ededed",
    "#f5f5f5",
    "#f7f7f7",
    "#eeeeee",
    "#e0e0e0",
    "#333333",
    "#444444",
    "#555555",
    "#666666",
    "#cccccc",
    "#bbbbbb",
    "#d9d9d9",
    "#616161",
    "#2c2c2c",
  ]);
  if (g.n >= 8 && chromeHex.has(h)) return "chrome";
  if (
    /#(d04f4e|fc5a5a|fc6161|cc1f1a|da1f26|ea4335|ea3939|ffbc44|ff8300|fa730c|ffc95e)/i.test(
      h,
    )
  ) {
    return "status";
  }
  if (g.n <= 2 && g.role === "fill") return "vendor";
  return "other";
}

function SwatchHex({ hex }: { hex: string }) {
  const theme = useHostTheme();
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: 3,
        background: hex,
        border: "1px solid " + theme.stroke.tertiary,
        verticalAlign: "middle",
      }}
    />
  );
}

export default function ArubaCentralColorGroups() {
  const [filter, setFilter] = useCanvasState<string>("roleFilter", "chrome");
  const filtered = GROUPS.filter((g) => filter === "all" || classify(g) === filter);
  const chromeCount = GROUPS.filter((g) => classify(g) === "chrome").length;
  const brandCount = GROUPS.filter((g) => classify(g) === "brand").length;
  const vendorCount = GROUPS.filter((g) => classify(g) === "vendor").length;

  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>Aruba Central color groups</H1>
        <Text tone="secondary">
          202 clustered colors from the logged-in Gravity monitoring UI at
          internal-ui.central.arubanetworks.com. Live CSSOM was blocked; groups
          come from Grommet 2.50 light/dark theme pairs and styled-components
          literals in the Edge HTTP cache of the Central/GLCP bundles.
        </Text>
      </Stack>

      <Callout tone="warning" title="CSSOM dump did not complete">
        Playwright MCP attached to the Aruba Central tab, then chrome.debugger
        detached within about 200ms (connect.html teardown and a DevTools
        conflict). Inventory is theme-source colors, not computed styles. Dark
        Reader has site access and would distort a computed-style scrape.
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat value="202" label="Color groups" />
        <Stat value={String(chromeCount)} label="Chrome surface and text" />
        <Stat value={String(brandCount)} label="HPE brand greens" />
        <Stat value={String(vendorCount)} label="Vendor icon fills to skip" />
      </Grid>

      <H2>Recommended token strategy</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Share a theme token</CardHeader>
          <CardBody>
            <Text>
              White page/card/input fills (G001) become cd-surface-0. Near-white
              #f8f8f8 / #ededed / #f5f5f5 become nested surfaces. Blacks and
              #333/#444 become text-primary/secondary; #555/#666 muted text.
              Gray borders #ccc/#d9d9d9 and rgba(0,0,0,0.15) overlays stay as
              border/overlay tokens with alpha kept separate.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Keep independent</CardHeader>
          <CardBody>
            <Text>
              HPE brand #01A982 / #00C781 / #17EBA0. Status reds and ambers.
              Map/chart categorical palettes and vendor logo fills. Native
              Grommet dark-mode pair values are for Dim/Dark/Black mapping, not
              mixed into Normal.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <H2>Dim / Dark / Black starting map</H2>
      <Table
        headers={["Token cluster", "Normal (light UI)", "Dim", "Dark", "Black"]}
        rows={[
          ["cd-surface-0", "#ffffff", "#d8dbe0", "#1e1f22", "#0a0a0a"],
          ["cd-surface-1", "#f8f8f8 / #f5f5f5", "#c5c9d1", "#2b2d31", "#111111"],
          ["cd-text-primary", "#000000 / #333333", "#1a1c1e", "#e8eaed", "#f5f5f5"],
          ["cd-text-muted", "#555555 / #666666", "#3a3d42", "#9aa0a6", "#b0b0b0"],
          ["cd-border", "#cccccc + 15% black", "stronger gray", "#3f4147", "#333333"],
          ["cd-accent-brand", "#01A982", "same hue, slightly darker", "lift ~12% L", "more saturated"],
        ]}
        striped
      />
      <Text size="small" tone="tertiary">
        Source: Edge cache of Central GLCP bundles plus live tab
        https://internal-ui.central.arubanetworks.com/gravity/monitoring · 17 Aug 2026
      </Text>

      <Divider />

      <H2>All groups</H2>
      <Text tone="secondary">
        Filter to chrome first. Vendor icon fills should not drive theme tokens.
        Contrast vs white is WCAG ratio against #ffffff; vs dark is against #1e1f22.
      </Text>
      <Row gap={8} wrap>
        {["chrome", "brand", "status", "overlay", "vendor", "other", "all"].map((id) => (
          <Pill key={id} active={filter === id} onClick={() => setFilter(id)}>
            {id}
          </Pill>
        ))}
      </Row>
      <Text size="small" tone="tertiary">
        Showing {filtered.length} of 202 groups
      </Text>
      <Table
        stickyHeader
        striped
        headers={["ID", "Swatch", "Color", "Role", "Count", "Token", "vs white", "vs dark", "Example"]}
        columnAlign={["left", "left", "left", "left", "right", "left", "right", "right", "left"]}
        rows={filtered.map((g) => [
          g.id,
          <SwatchHex key={g.id} hex={g.hex} />,
          g.display,
          classify(g),
          String(g.n),
          g.token,
          String(g.cw),
          String(g.cd),
          g.ex.slice(0, 48),
        ])}
      />

      <H3>Architecture notes for the next agent</H3>
      <Text>
        React 18 SPA (Vite) with Grommet 2.50, styled-components 6, and
        hpe-design-tokens. CSS-in-JS, not a static stylesheet. Shadow DOM on
        greenlake-header and the guided-tour plugin. Native themeMode light/dark
        already exists. Host matches:
        https://internal-ui.central.arubanetworks.com/* and
        https://*.central.arubanetworks.com/*. SSO chrome on
        https://common.cloud.hpe.com/* is optional. Skip pmtiles/leaflet map
        rasters. Rewrite engine must observe constructed stylesheets and shadow
        roots, not only document.styleSheets.
      </Text>
    </Stack>
  );
}
`;

writeFileSync(
  "C:/Users/Ken/.cursor/projects/c-Users-Ken-Documents-src-Central-Dark/canvases/aruba-central-color-groups.canvas.tsx",
  src,
);
console.log("wrote canvas", src.length);
