"use client";

import dynamic from "next/dynamic";
import type { Breakdown } from "@/lib/data/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Client wrapper that lazy-loads the world map. The map statically imports the
 * ~100KB world-atlas topojson plus d3-geo, so deferring it keeps that weight out
 * of the initial Geography payload and off the critical path. `ssr: false` also
 * skips rendering the SVG on the server (it's purely presentational).
 */
const WorldMap = dynamic(
  () => import("./world-map").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Visitors by country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] animate-pulse rounded-md bg-muted/40" />
        </CardContent>
      </Card>
    ),
  },
);

export function WorldMapLazy({ data }: { data: Breakdown[] }) {
  return <WorldMap data={data} />;
}
