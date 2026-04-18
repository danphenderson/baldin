"""Offline embedding evaluation harness for Baldin-shaped retrieval tasks.

This module compares a fixed set of Hugging Face embedding models on a small
synthetic benchmark fixture. It is intended for local research and does not
integrate with the API, vector store, or runtime embedding pipeline.
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import median
from typing import Any, Sequence

import numpy as np


@dataclass(frozen=True)
class ModelSpec:
    key: str
    model_id: str
    description: str
    load_kwargs: dict[str, Any]


@dataclass(frozen=True)
class CorpusEntry:
    id: str
    kind: str
    text: str


@dataclass(frozen=True)
class QueryEntry:
    id: str
    kind: str
    text: str
    relevant_ids: list[str]


@dataclass(frozen=True)
class BenchmarkFixture:
    corpus: list[CorpusEntry]
    queries: list[QueryEntry]


@dataclass(frozen=True)
class QueryDiagnostic:
    query_id: str
    top_3_ids: list[str]
    first_relevant_rank: int | None
    miss_at_3: bool


@dataclass(frozen=True)
class ModelEvaluation:
    model_key: str
    model_id: str
    recall_at_1: float
    recall_at_3: float
    mrr: float
    median_first_relevant_rank: float | None
    corpus_encode_seconds: float
    query_encode_seconds: float
    average_ms_per_query: float
    diagnostics: list[QueryDiagnostic]


MODEL_REGISTRY: dict[str, ModelSpec] = {
    "qwen3": ModelSpec(
        key="qwen3",
        model_id="Qwen/Qwen3-Embedding-0.6B",
        description="Qwen3 embedding baseline",
        load_kwargs={"trust_remote_code": True},
    ),
    "bge-m3": ModelSpec(
        key="bge-m3",
        model_id="BAAI/bge-m3",
        description="BGE multilingual baseline",
        load_kwargs={},
    ),
    "jobbert-v3": ModelSpec(
        key="jobbert-v3",
        model_id="TechWolf/JobBERT-v3",
        description="Job-domain embedding baseline",
        load_kwargs={},
    ),
}


def default_fixture_path() -> Path:
    return (
        Path(__file__).resolve().parents[1]
        / "tests"
        / "fixtures"
        / "embedding_eval_benchmark.json"
    )


def load_benchmark(path: Path) -> BenchmarkFixture:
    raw = json.loads(path.read_text())
    corpus = [
        CorpusEntry(id=entry["id"], kind=entry["kind"], text=entry["text"])
        for entry in raw["corpus"]
    ]
    queries = [
        QueryEntry(
            id=entry["id"],
            kind=entry["kind"],
            text=entry["text"],
            relevant_ids=list(entry["relevant_ids"]),
        )
        for entry in raw["queries"]
    ]
    return BenchmarkFixture(corpus=corpus, queries=queries)


def list_model_keys() -> list[str]:
    return list(MODEL_REGISTRY.keys())


def get_model_specs(model_keys: Sequence[str] | None = None) -> list[ModelSpec]:
    if not model_keys:
        return [MODEL_REGISTRY[key] for key in list_model_keys()]

    missing = [key for key in model_keys if key not in MODEL_REGISTRY]
    if missing:
        supported = ", ".join(list_model_keys())
        raise ValueError(
            f"Unsupported model key(s): {', '.join(missing)}. Supported: {supported}"
        )

    deduped_keys: list[str] = []
    seen: set[str] = set()
    for key in model_keys:
        if key not in seen:
            deduped_keys.append(key)
            seen.add(key)
    return [MODEL_REGISTRY[key] for key in deduped_keys]


def resolve_device(device: str) -> str | None:
    return None if device == "auto" else device


def load_sentence_transformer(model_spec: ModelSpec, device: str):
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(
        model_spec.model_id,
        device=resolve_device(device),
        **model_spec.load_kwargs,
    )


def normalize_embeddings(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    safe_norms = np.where(norms == 0, 1.0, norms)
    return matrix / safe_norms


def encode_texts(model: Any, texts: Sequence[str]) -> np.ndarray:
    embeddings = model.encode(
        list(texts),
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return np.asarray(embeddings, dtype=np.float32)


def cosine_similarity_scores(
    query_embeddings: np.ndarray, corpus_embeddings: np.ndarray
) -> np.ndarray:
    normalized_queries = normalize_embeddings(query_embeddings)
    normalized_corpus = normalize_embeddings(corpus_embeddings)
    return normalized_queries @ normalized_corpus.T


def rank_corpus_ids(
    scores: np.ndarray,
    corpus_ids: Sequence[str],
) -> list[list[str]]:
    rankings: list[list[str]] = []
    for row in scores:
        order = np.argsort(-row, kind="stable")
        rankings.append([corpus_ids[index] for index in order])
    return rankings


def first_relevant_rank(
    ranked_ids: Sequence[str], relevant_ids: Sequence[str]
) -> int | None:
    relevant = set(relevant_ids)
    for index, corpus_id in enumerate(ranked_ids, start=1):
        if corpus_id in relevant:
            return index
    return None


def evaluate_rankings(
    queries: Sequence[QueryEntry],
    ranked_ids: Sequence[Sequence[str]],
) -> tuple[dict[str, float | None], list[QueryDiagnostic]]:
    recall_at_1_hits = 0
    recall_at_3_hits = 0
    reciprocal_ranks: list[float] = []
    first_ranks: list[int] = []
    diagnostics: list[QueryDiagnostic] = []

    for query, ranking in zip(queries, ranked_ids):
        rank = first_relevant_rank(ranking, query.relevant_ids)
        top_3_ids = list(ranking[:3])

        if rank == 1:
            recall_at_1_hits += 1
        if rank is not None and rank <= 3:
            recall_at_3_hits += 1
        if rank is not None:
            reciprocal_ranks.append(1.0 / rank)
            first_ranks.append(rank)
        else:
            reciprocal_ranks.append(0.0)

        diagnostics.append(
            QueryDiagnostic(
                query_id=query.id,
                top_3_ids=top_3_ids,
                first_relevant_rank=rank,
                miss_at_3=rank is None or rank > 3,
            )
        )

    query_count = len(queries) or 1
    metrics: dict[str, float | None] = {
        "recall_at_1": recall_at_1_hits / query_count,
        "recall_at_3": recall_at_3_hits / query_count,
        "mrr": sum(reciprocal_ranks) / query_count,
        "median_first_relevant_rank": float(median(first_ranks))
        if first_ranks
        else None,
    }
    return metrics, diagnostics


def evaluate_model(
    model_spec: ModelSpec,
    benchmark: BenchmarkFixture,
    device: str,
) -> ModelEvaluation:
    model = load_sentence_transformer(model_spec, device)
    corpus_texts = [entry.text for entry in benchmark.corpus]
    query_texts = [entry.text for entry in benchmark.queries]

    corpus_start = time.perf_counter()
    corpus_embeddings = encode_texts(model, corpus_texts)
    corpus_encode_seconds = time.perf_counter() - corpus_start

    query_start = time.perf_counter()
    query_embeddings = encode_texts(model, query_texts)
    query_encode_seconds = time.perf_counter() - query_start

    scores = cosine_similarity_scores(query_embeddings, corpus_embeddings)
    ranked_ids = rank_corpus_ids(scores, [entry.id for entry in benchmark.corpus])
    metrics, diagnostics = evaluate_rankings(benchmark.queries, ranked_ids)
    average_ms_per_query = (query_encode_seconds / max(len(query_texts), 1)) * 1000

    return ModelEvaluation(
        model_key=model_spec.key,
        model_id=model_spec.model_id,
        recall_at_1=float(metrics["recall_at_1"] or 0.0),
        recall_at_3=float(metrics["recall_at_3"] or 0.0),
        mrr=float(metrics["mrr"] or 0.0),
        median_first_relevant_rank=metrics["median_first_relevant_rank"],
        corpus_encode_seconds=corpus_encode_seconds,
        query_encode_seconds=query_encode_seconds,
        average_ms_per_query=average_ms_per_query,
        diagnostics=diagnostics,
    )


def sort_results(results: Sequence[ModelEvaluation]) -> list[ModelEvaluation]:
    return sorted(
        results,
        key=lambda result: (result.mrr, result.recall_at_1),
        reverse=True,
    )


def format_summary_table(results: Sequence[ModelEvaluation]) -> str:
    headers = [
        "model",
        "R@1",
        "R@3",
        "MRR",
        "median_rank",
        "corpus_s",
        "query_s",
        "ms/query",
    ]
    rows = []
    for result in sort_results(results):
        median_rank = (
            f"{result.median_first_relevant_rank:.1f}"
            if result.median_first_relevant_rank is not None
            else "n/a"
        )
        rows.append(
            [
                result.model_key,
                f"{result.recall_at_1:.3f}",
                f"{result.recall_at_3:.3f}",
                f"{result.mrr:.3f}",
                median_rank,
                f"{result.corpus_encode_seconds:.3f}",
                f"{result.query_encode_seconds:.3f}",
                f"{result.average_ms_per_query:.1f}",
            ]
        )

    widths = [
        max(len(headers[index]), *(len(row[index]) for row in rows))
        for index in range(len(headers))
    ]
    header_line = "  ".join(
        header.ljust(widths[index]) for index, header in enumerate(headers)
    )
    separator = "  ".join("-" * width for width in widths)
    body = [
        "  ".join(cell.ljust(widths[index]) for index, cell in enumerate(row))
        for row in rows
    ]
    return "\n".join([header_line, separator, *body])


def build_json_report(
    benchmark: BenchmarkFixture,
    results: Sequence[ModelEvaluation],
    device: str,
    fixture_path: Path | None = None,
) -> dict[str, Any]:
    sorted_results = sort_results(results)
    return {
        "benchmark": {
            "fixture_path": str(fixture_path or default_fixture_path()),
            "corpus_count": len(benchmark.corpus),
            "query_count": len(benchmark.queries),
        },
        "device": device,
        "results": [
            {
                **{
                    key: value
                    for key, value in asdict(result).items()
                    if key != "diagnostics"
                },
                "diagnostics": [asdict(item) for item in result.diagnostics],
            }
            for result in sorted_results
        ],
    }


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model",
        action="append",
        dest="models",
        help="Model key to evaluate. Repeat to select multiple models.",
    )
    parser.add_argument(
        "--device",
        default="cpu",
        choices=["cpu", "cuda", "mps", "auto"],
        help="Execution device for sentence-transformers. Use auto to let the library choose.",
    )
    parser.add_argument(
        "--json-out",
        type=Path,
        help="Optional path for a JSON report with summary metrics and diagnostics.",
    )
    parser.add_argument(
        "--fixture",
        type=Path,
        default=default_fixture_path(),
        help="Benchmark fixture path.",
    )
    return parser.parse_args(argv)


def run_evaluation(
    benchmark: BenchmarkFixture,
    model_keys: Sequence[str] | None,
    device: str,
) -> list[ModelEvaluation]:
    results: list[ModelEvaluation] = []
    for model_spec in get_model_specs(model_keys):
        results.append(evaluate_model(model_spec, benchmark, device=device))
    return results


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    benchmark = load_benchmark(args.fixture)
    results = run_evaluation(benchmark, args.models, device=args.device)
    print(format_summary_table(results))

    if args.json_out is not None:
        report = build_json_report(
            benchmark,
            results,
            device=args.device,
            fixture_path=args.fixture,
        )
        args.json_out.write_text(json.dumps(report, indent=2) + "\n")

    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
