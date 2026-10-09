"use client";
/**
 * Loads FlowGraph (and @xyflow/react) on the client only, so the graph library is fetched just by the
 * routes that draw a graph and never runs on the server (ip-routes-and-views §4 performance). The
 * text alternative next to every graph is server-rendered and works without it.
 */
import dynamic from "next/dynamic";
import type { FlowGraphProps } from "./types";

const FlowGraph = dynamic(() => import("./FlowGraph"), {
  ssr: false,
  loading: () => (
    <div className="fg-loading" aria-busy="true">
      Loading graph…
    </div>
  ),
});

export default function LazyFlowGraph(props: FlowGraphProps) {
  return <FlowGraph {...props} />;
}
