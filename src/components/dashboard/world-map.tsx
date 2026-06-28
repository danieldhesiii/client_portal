"use client";

import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import worldData from "world-atlas/countries-110m.json";
import type { Breakdown } from "@/lib/data/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

const WIDTH = 800;
const HEIGHT = 400;

// world-atlas country names that differ from MaxMind's en country names.
// Keyed by normalised MaxMind name -> normalised atlas name.
const NAME_ALIASES: Record<string, string> = {
  "united states": "united states of america",
  "russian federation": "russia",
  "czech republic": "czechia",
  "south korea": "south korea",
  "north korea": "north korea",
  "bosnia and herzegovina": "bosnia and herz.",
  "dominican republic": "dominican rep.",
  "north macedonia": "macedonia",
  "côte d'ivoire": "côte d'ivoire",
  "myanmar": "myanmar",
};

const norm = (s: string) => s.trim().toLowerCase();
const alias = (s: string) => NAME_ALIASES[norm(s)] ?? norm(s);

type Tooltip = { x: number; y: number; name: string; value: number } | null;

/**
 * Choropleth world map shaded by visitors per country. Built directly on
 * d3-geo (no map wrapper) so it stays compatible with React 19 and ships only
 * the projection maths + a single topojson file.
 */
export function WorldMap({ data }: { data: Breakdown[] }) {
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  // The SVG paths are generated from floating-point projection maths; rendering
  // only after mount avoids any server/client hydration mismatch and keeps the
  // ~100KB topojson out of the SSR payload.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { features, pathFor, valueByName, max } = useMemo(() => {
    // topojson -> geojson FeatureCollection
    const fc = feature(
      worldData as never,
      (worldData as never as { objects: { countries: never } }).objects.countries,
    ) as unknown as FeatureCollection<Geometry, { name: string }>;

    const projection = geoEqualEarth().fitSize([WIDTH, HEIGHT], fc);
    const path = geoPath(projection);

    const valueByName = new Map<string, number>();
    for (const d of data) valueByName.set(alias(d.label), d.value);
    const max = data.reduce((m, d) => Math.max(m, d.value), 0) || 1;

    return { features: fc.features, pathFor: path, valueByName, max };
  }, [data]);

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visitors by country</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="w-full animate-pulse rounded-md bg-muted"
            style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
            aria-hidden
          />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visitors by country</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="No geography data yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitors by country</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label="World map of visitors by country"
            onMouseLeave={() => setTooltip(null)}
          >
            <g>
              {features.map((f, i) => {
                const name = f.properties?.name ?? "";
                const value = valueByName.get(norm(name)) ?? 0;
                // Perceptual sqrt scale; floor so shaded countries stay visible.
                const intensity =
                  value > 0 ? 0.18 + 0.82 * Math.sqrt(value / max) : 0;
                const d = pathFor(f) ?? undefined;
                return (
                  <path
                    key={i}
                    d={d}
                    fill={value > 0 ? "var(--accent)" : "var(--muted)"}
                    fillOpacity={value > 0 ? intensity : 1}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    className="transition-opacity hover:opacity-80"
                    onMouseMove={(e) => {
                      const rect = (
                        e.currentTarget.ownerSVGElement as SVGSVGElement
                      ).getBoundingClientRect();
                      setTooltip({
                        x: ((e.clientX - rect.left) / rect.width) * WIDTH,
                        y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
                        name,
                        value,
                      });
                    }}
                  >
                    <title>
                      {name}: {formatNumber(value)} visitors
                    </title>
                  </path>
                );
              })}
            </g>
          </svg>

          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm"
              style={{
                left: `${(tooltip.x / WIDTH) * 100}%`,
                top: `${(tooltip.y / HEIGHT) * 100}%`,
              }}
            >
              <span className="font-medium">{tooltip.name}</span>
              <span className="ml-1.5 text-muted-foreground tabular">
                {formatNumber(tooltip.value)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
