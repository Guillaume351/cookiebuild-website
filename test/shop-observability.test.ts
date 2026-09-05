import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const dashboard = JSON.parse(read("observability/grafana/dashboards/shop.json"));

describe("shop dashboard contracts", () => {
  it("uses only aggregate SQL and distinguishes stock, baseline and acquisition", () => {
    expect(dashboard.uid).toBe("cookiebuild-shop");
    expect(dashboard.timezone).toBe("Europe/Paris");
    expect(dashboard.refresh).toBe("5m");
    expect(dashboard.editable).toBe(false);
    const ids = new Set<number>();
    for (const panel of dashboard.panels) {
      expect(ids.has(panel.id)).toBe(false); ids.add(panel.id);
      expect(panel.datasource.uid).toBe("cookiebuild-postgres");
      for (const target of panel.targets) {
        expect(target.rawSql).toMatch(/FROM metrics\.shop_/);
        expect(target.rawSql).not.toMatch(/public\.|player_id|uuid|email|token|firebase|user_id/i);
        if (panel.type === "timeseries") {
          expect(target.rawSql).toContain("$__timeFrom()");
          expect(target.rawSql).toContain("$__timeTo()");
          expect(target.rawSql).toContain("Europe/Paris");
        }
      }
    }
    const content = JSON.stringify(dashboard);
    expect(content).toContain("observed_source = 'baseline'");
    expect(content).toContain("observed_source = 'selection'");
    expect(content).toContain("not accounting revenue");
    expect(content).toContain("separate consent-dependent population");
  });

  it("keeps the ledger private and all public views security-barriered", () => {
    const migration = read("drizzle/0019_shop_activation_metrics.sql");
    expect(migration.match(/CREATE OR REPLACE VIEW metrics\.shop_/g)).toHaveLength(8);
    expect(migration.match(/WITH \(security_barrier = true\)/g)).toHaveLength(8);
    expect(migration).toContain("REVOKE ALL ON public.cosmetic_first_activations FROM PUBLIC");
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("ON CONFLICT (player_id, cosmetic_id) DO NOTHING");
    expect(migration).not.toMatch(/GRANT\s+SELECT\s+ON\s+public\./i);
  });
});
