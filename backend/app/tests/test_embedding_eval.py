from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np

from app.evals import embedding_eval


def test_load_benchmark_fixture_shape():
    benchmark = embedding_eval.load_benchmark(embedding_eval.default_fixture_path())

    assert len(benchmark.corpus) == 18
    assert len(benchmark.queries) == 12
    assert benchmark.corpus[0].id
    assert benchmark.corpus[0].kind
    assert benchmark.corpus[0].text
    assert benchmark.queries[0].relevant_ids


def test_get_model_specs_supports_expected_registry():
    specs = embedding_eval.get_model_specs()

    assert [spec.key for spec in specs] == ["qwen3", "bge-m3", "jobbert-v3"]


def test_get_model_specs_rejects_unknown_model():
    try:
        embedding_eval.get_model_specs(["unknown"])
    except ValueError as exc:
        assert "Unsupported model key" in str(exc)
    else:  # pragma: no cover
        raise AssertionError("Expected ValueError for unknown model")


def test_load_sentence_transformer_maps_auto_to_none(monkeypatch):
    captured: dict[str, object] = {}

    class FakeSentenceTransformer:
        def __init__(self, model_id: str, **kwargs):
            captured["model_id"] = model_id
            captured["kwargs"] = kwargs

    monkeypatch.setitem(
        sys.modules,
        "sentence_transformers",
        SimpleNamespace(SentenceTransformer=FakeSentenceTransformer),
    )

    model = embedding_eval.load_sentence_transformer(
        embedding_eval.MODEL_REGISTRY["qwen3"], "auto"
    )

    assert isinstance(model, FakeSentenceTransformer)
    assert captured["model_id"] == "Qwen/Qwen3-Embedding-0.6B"
    assert captured["kwargs"] == {"device": None, "trust_remote_code": True}


def test_evaluate_rankings_computes_expected_metrics():
    queries = [
        embedding_eval.QueryEntry(
            id="q1",
            kind="retrieval_query",
            text="first",
            relevant_ids=["doc_a"],
        ),
        embedding_eval.QueryEntry(
            id="q2",
            kind="retrieval_query",
            text="second",
            relevant_ids=["doc_b"],
        ),
        embedding_eval.QueryEntry(
            id="q3",
            kind="retrieval_query",
            text="third",
            relevant_ids=["doc_z"],
        ),
    ]
    rankings = [
        ["doc_a", "doc_b", "doc_c"],
        ["doc_c", "doc_b", "doc_a"],
        ["doc_a", "doc_b", "doc_c"],
    ]

    metrics, diagnostics = embedding_eval.evaluate_rankings(queries, rankings)

    assert metrics["recall_at_1"] == 1 / 3
    assert metrics["recall_at_3"] == 2 / 3
    assert round(float(metrics["mrr"]), 4) == round((1.0 + 0.5 + 0.0) / 3, 4)
    assert metrics["median_first_relevant_rank"] == 1.5
    assert diagnostics[0].top_3_ids == ["doc_a", "doc_b", "doc_c"]
    assert diagnostics[2].miss_at_3 is True


def test_format_summary_table_orders_by_mrr_then_recall():
    results = [
        embedding_eval.ModelEvaluation(
            model_key="b",
            model_id="model-b",
            recall_at_1=0.4,
            recall_at_3=0.7,
            mrr=0.5,
            median_first_relevant_rank=2.0,
            corpus_encode_seconds=1.0,
            query_encode_seconds=2.0,
            average_ms_per_query=100.0,
            diagnostics=[],
        ),
        embedding_eval.ModelEvaluation(
            model_key="a",
            model_id="model-a",
            recall_at_1=0.6,
            recall_at_3=0.7,
            mrr=0.5,
            median_first_relevant_rank=1.0,
            corpus_encode_seconds=1.0,
            query_encode_seconds=2.0,
            average_ms_per_query=100.0,
            diagnostics=[],
        ),
    ]

    table = embedding_eval.format_summary_table(results)
    lines = table.splitlines()
    assert lines[2].split()[0] == "a"
    assert lines[3].split()[0] == "b"


def test_run_evaluation_and_json_report_use_mock_model(monkeypatch, tmp_path: Path):
    benchmark = embedding_eval.BenchmarkFixture(
        corpus=[
            embedding_eval.CorpusEntry(
                id="doc_python", kind="skills", text="python fastapi"
            ),
            embedding_eval.CorpusEntry(
                id="doc_react", kind="skills", text="react typescript"
            ),
            embedding_eval.CorpusEntry(
                id="doc_rank", kind="skills", text="ranking embeddings"
            ),
        ],
        queries=[
            embedding_eval.QueryEntry(
                id="query_python",
                kind="retrieval_query",
                text="python backend",
                relevant_ids=["doc_python"],
            ),
            embedding_eval.QueryEntry(
                id="query_rank",
                kind="retrieval_query",
                text="embedding ranking",
                relevant_ids=["doc_rank"],
            ),
        ],
    )

    vectors = {
        "python fastapi": np.array([1.0, 0.0, 0.0], dtype=np.float32),
        "react typescript": np.array([0.0, 1.0, 0.0], dtype=np.float32),
        "ranking embeddings": np.array([0.0, 0.0, 1.0], dtype=np.float32),
        "python backend": np.array([5.0, 0.0, 0.0], dtype=np.float32),
        "embedding ranking": np.array([0.0, 0.0, 5.0], dtype=np.float32),
    }

    class FakeModel:
        def encode(self, texts, convert_to_numpy, show_progress_bar):
            assert convert_to_numpy is True
            assert show_progress_bar is False
            return np.vstack([vectors[text] for text in texts])

    monkeypatch.setattr(
        embedding_eval,
        "load_sentence_transformer",
        lambda model_spec, device: FakeModel(),
    )

    results = embedding_eval.run_evaluation(benchmark, ["qwen3"], device="cpu")

    assert len(results) == 1
    assert results[0].model_key == "qwen3"
    assert results[0].recall_at_1 == 1.0
    assert results[0].recall_at_3 == 1.0
    assert results[0].mrr == 1.0
    assert results[0].diagnostics[0].top_3_ids[0] == "doc_python"

    report = embedding_eval.build_json_report(benchmark, results, device="cpu")
    output_path = tmp_path / "report.json"
    output_path.write_text(json.dumps(report, indent=2))
    loaded = json.loads(output_path.read_text())

    assert loaded["device"] == "cpu"
    assert loaded["results"][0]["model_key"] == "qwen3"
    assert loaded["results"][0]["diagnostics"][1]["top_3_ids"][0] == "doc_rank"


def test_main_writes_json_and_prints_table(monkeypatch, tmp_path: Path, capsys):
    benchmark = embedding_eval.BenchmarkFixture(corpus=[], queries=[])
    fake_result = embedding_eval.ModelEvaluation(
        model_key="qwen3",
        model_id="Qwen/Qwen3-Embedding-0.6B",
        recall_at_1=0.5,
        recall_at_3=0.75,
        mrr=0.6,
        median_first_relevant_rank=1.5,
        corpus_encode_seconds=0.1,
        query_encode_seconds=0.2,
        average_ms_per_query=20.0,
        diagnostics=[
            embedding_eval.QueryDiagnostic(
                query_id="query_python",
                top_3_ids=["doc_python", "doc_rank", "doc_react"],
                first_relevant_rank=1,
                miss_at_3=False,
            )
        ],
    )

    monkeypatch.setattr(embedding_eval, "load_benchmark", lambda path: benchmark)
    monkeypatch.setattr(
        embedding_eval,
        "run_evaluation",
        lambda benchmark, model_keys, device: [fake_result],
    )

    output_path = tmp_path / "embedding-eval.json"
    exit_code = embedding_eval.main(["--json-out", str(output_path)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "qwen3" in captured.out
    report = json.loads(output_path.read_text())
    assert report["results"][0]["diagnostics"][0]["query_id"] == "query_python"
