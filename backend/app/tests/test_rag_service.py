from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app import schemas
from app.core.rag import service as rag_service
from app.core.rag.rank_leads.state import LeadRankingDraft, RankedLeadEntry


def _db_result(rows):
    return SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: rows),
    )


@pytest.mark.asyncio
async def test_rank_leads_loads_aspirations_and_returns_structured_entries(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lead_id = uuid4()
    user_id = uuid4()
    aspiration_rows = [
        SimpleNamespace(
            kind="role",
            label="Staff Engineer",
            reason="Principal IC path",
            priority=2,
        )
    ]
    db = SimpleNamespace(execute=AsyncMock(return_value=_db_result(aspiration_rows)))
    captured_state = {}

    async def _fake_ainvoke(state, config=None):
        del config
        captured_state.update(state)
        return {
            "outcome_result": "success",
            "rendered_output": "Lead Rankings",
            "draft": LeadRankingDraft(
                ranked_leads=[
                    RankedLeadEntry(
                        lead_index=1,
                        title="Staff Platform Engineer",
                        relevance_score=9,
                        explanation="The role maps closely to the user's platform and backend experience.",
                        aspiration_alignment="Direct match to the Staff Engineer aspiration.",
                    )
                ]
            ),
        }

    monkeypatch.setattr(
        rag_service.conf.openai, "require_enabled", lambda *args, **kwargs: None
    )
    monkeypatch.setattr(rag_service, "PGVectorStore", lambda db: SimpleNamespace(db=db))
    monkeypatch.setattr(
        rag_service,
        "lead_ranking_graph",
        SimpleNamespace(ainvoke=_fake_ainvoke),
    )

    service = rag_service.RagWorkflowService(db)
    response = await service.rank_leads(
        schemas.LeadRankRequest(
            leads=[
                schemas.LeadRankInput(
                    id=lead_id,
                    title="Staff Platform Engineer",
                    description="Platform and backend systems role.",
                )
            ]
        ),
        SimpleNamespace(id=user_id),
    )

    assert captured_state["aspirations"] == [
        {
            "kind": "role",
            "label": "Staff Engineer",
            "reason": "Principal IC path",
            "priority": 2,
        }
    ]
    assert response.ranking == "Lead Rankings"
    assert response.ranked_leads[0].lead_id == lead_id
    assert response.ranked_leads[0].aspiration_alignment == (
        "Direct match to the Staff Engineer aspiration."
    )
