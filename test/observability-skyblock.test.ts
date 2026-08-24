import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), "observability", path), "utf8");

describe("Skyblock observability contracts", () => {
  it("parses the versioned compose, exporter, Prometheus and Grafana artifacts", () => {
    const compose = parse(read("docker-compose.yml"));
    const prometheus = parse(read("prometheus/prometheus.yml"));
    const rules = parse(read("prometheus/rules.yml"));
    const exporter = parse(read("sql-exporter/sql_exporter.yml"));
    const overview = parse(
      read("sql-exporter/skyblock-overview.collector.yml"),
    );
    const retention = parse(
      read("sql-exporter/skyblock-retention.collector.yml"),
    );
    const dashboard = JSON.parse(read("grafana/dashboards/skyblock.json"));

    expect(compose.services["postgres-exporter"].image).toBe(
      "prometheuscommunity/postgres-exporter:v0.19.1",
    );
    expect(
      compose.services["postgres-exporter"].environment,
    ).not.toHaveProperty("PG_EXPORTER_EXTEND_QUERY_PATH");
    expect(compose.services["sql-exporter"].image).toBe(
      "burningalchemist/sql_exporter:0.24.4",
    );
    expect(compose.services["sql-exporter"].user).toBe("65534:65534");
    expect(compose.services["sql-exporter"].volumes).toContain(
      "/home/ubuntu/Volumes/cookiebuild/observability/secrets/sql_exporter_dsn:/run/secrets/sql_exporter_dsn:ro",
    );
    expect(compose.services["sql-exporter"].command.join("\n")).toContain(
      "test -s /run/secrets/sql_exporter_dsn",
    );

    expect(exporter.global.min_interval).toBe("5m");
    expect(exporter.global.max_connections).toBe(1);
    expect(exporter.global.max_idle_connections).toBe(1);
    expect(exporter.global.scrape_timeout).toBe("8s");
    expect(exporter.target.data_source_name).toContain(
      "postgresql://cookiebuild_metrics@",
    );
    expect(exporter.target.collectors).toEqual([
      "skyblock_overview",
      "skyblock_retention",
    ]);
    expect(retention.min_interval).toBe("15m");
    expect(overview.collector_name).toBe("skyblock_overview");

    const scrape = prometheus.scrape_configs.find(
      (job: { job_name: string }) => job.job_name === "sql-exporter",
    );
    expect(scrape.scrape_interval).toBe("60s");
    expect(scrape.static_configs[0].targets).toEqual(["sql-exporter:9399"]);
    expect(
      prometheus.scrape_configs.find(
        (job: { job_name: string }) => job.job_name === "postgres",
      ).static_configs[0].targets,
    ).toEqual(["postgres-exporter:9187"]);

    const alerts = rules.groups.flatMap(
      (group: { rules: Array<{ alert?: string }> }) => group.rules,
    );
    expect(alerts.map((rule: { alert?: string }) => rule.alert)).toEqual(
      expect.arrayContaining([
        "CookieBuildSkyblockStorageInvariantViolation",
        "CookieBuildSkyblockExpiredListingsStuck",
        "CookieBuildSkyblockOrphanSessions",
        "CookieBuildSkyblockMonetaryDrift",
      ]),
    );
    const targetDown = alerts.find(
      (rule: { alert?: string }) =>
        rule.alert === "CookieBuildObservabilityTargetDown",
    ) as { expr: string };
    expect(targetDown.expr).toContain("postgres|sql-exporter");

    expect(dashboard.uid).toBe("cookiebuild-skyblock");
    expect(
      new Set(dashboard.panels.map((panel: { id: number }) => panel.id)).size,
    ).toBe(dashboard.panels.length);
    const dashboardQueries = dashboard.panels
      .flatMap(
        (panel: { targets?: Array<{ rawSql?: string }> }) =>
          panel.targets ?? [],
      )
      .map((target: { rawSql?: string }) => target.rawSql ?? "")
      .join("\n");
    expect(dashboardQueries).not.toMatch(
      /player_id|player_name|display_name|uuid|email|address/i,
    );
  });

  it("keeps SQL Exporter aggregate-only and all public views security-barriered", () => {
    const bootstrap = read("postgres/bootstrap.sql");
    const overview = read("sql-exporter/skyblock-overview.collector.yml");
    const retention = read("sql-exporter/skyblock-retention.collector.yml");
    const requiredViews = [
      "skyblock_sessions_daily",
      "skyblock_session_summary",
      "skyblock_retention_cohorts",
      "skyblock_retention_summary",
      "skyblock_economy_hourly",
      "skyblock_liquidity",
      "skyblock_invariants",
    ];

    for (const view of requiredViews) {
      expect(bootstrap).toMatch(
        new RegExp(
          `CREATE OR REPLACE VIEW metrics\\.${view} WITH \\(security_barrier = true\\)`,
        ),
      );
    }
    expect(bootstrap).toContain("GRANT pg_monitor TO cookiebuild_exporter");
    expect(bootstrap).toContain(
      "ALTER ROLE cookiebuild_metrics SET default_transaction_read_only = on",
    );
    expect(bootstrap).toContain(
      "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM cookiebuild_metrics",
    );
    expect(bootstrap).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+(?:TABLE\s+)?public\./i,
    );
    expect(bootstrap).toContain("source NOT LIKE 'market:%'");
    expect(bootstrap).toContain("source NOT LIKE 'migration:%'");
    expect(bootstrap).toContain("'market_fee'");

    expect(`${overview}\n${retention}`).not.toContain("public.");
    expect(`${overview}\n${retention}`).not.toMatch(
      /player_id|player_name|display_name|uuid|email|address/i,
    );
  });
});
