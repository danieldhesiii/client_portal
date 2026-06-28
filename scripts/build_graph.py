#!/usr/bin/env python3
"""
Deterministic knowledge-graph build for CI (no LLM required).

Runs graphify's structural (AST) extraction over the codebase, builds the
graph, clusters it, and writes graphify-out/{graph.json,graph.html,GRAPH_REPORT.md}.

This is the same pipeline the /graphify skill runs locally, minus the LLM-based
semantic layer (which needs an interactive model). It is fully reproducible and
free, so it can run on every push to main via GitHub Actions.

Usage: python scripts/build_graph.py [path]   (defaults to ".")
"""
import json
import sys
from pathlib import Path

from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out = Path("graphify-out")
    out.mkdir(exist_ok=True)

    detection = detect(root)
    print(f"Detected {detection.get('total_files')} files")

    code_files: list[Path] = []
    for f in detection.get("files", {}).get("code", []):
        p = Path(f)
        code_files.extend(collect_files(p) if p.is_dir() else [p])

    ast = (
        extract(code_files, cache_root=Path("."))
        if code_files
        else {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}
    )
    print(f"AST: {len(ast['nodes'])} nodes, {len(ast['edges'])} edges")

    G = build_from_json(ast, root=str(root), directed=False)
    if G.number_of_nodes() == 0:
        print("ERROR: graph is empty")
        return 1

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    labels = {cid: f"Community {cid}" for cid in communities}
    questions = suggest_questions(G, communities, labels)

    if not to_json(G, communities, str(out / "graph.json")):
        print("ERROR: refused to shrink graph.json")
        return 1

    report = generate(
        G, communities, cohesion, labels, gods, surprises, detection,
        {"input": 0, "output": 0}, ".", suggested_questions=questions,
    )
    (out / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")

    print(
        f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, "
        f"{len(communities)} communities"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
