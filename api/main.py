import json
import time
import uuid
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from backend import ShoppingGraph, _log_search, save_to_csv

app = FastAPI(title="Shopping Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    query: str
    max_price: Optional[float] = None


def _initial_state(query: str, max_price: Optional[float]) -> dict:
    return {
        "query": query,
        "max_price": max_price,
        "additional_requirements": "",
        "products": [],
        "processed_query": {},
        "detailed_products": [],
        "ranked_products": [],
        "recommendations": [],
        "analysis_summary": "",
        "status": {},
        "durations_ms": {},
    }


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def _run_search(req: SearchRequest):
    session_id = str(uuid.uuid4())
    t_start = time.time()

    yield _sse({"step": 1, "label": "Processing your query..."})

    graph = ShoppingGraph()
    state = _initial_state(req.query, req.max_price)

    state = await graph._process_query_node(state)
    yield _sse({"step": 2, "label": "Searching Google Shopping..."})

    state = await graph._search_products_node(state)
    n = len(state.get("products", []))
    yield _sse({"step": 3, "label": f"Fetching specs for {n} products..."})

    state = await graph._extract_specifications_node(state)
    yield _sse({"step": 4, "label": "Ranking and scoring..."})

    state = await graph._rank_products_node(state)

    _log_search(session_id, t_start, state)
    save_to_csv(state)

    yield _sse({
        "step": "done",
        "results": {
            "query": state.get("query"),
            "processed_query": state.get("processed_query", {}),
            "recommendations": state.get("recommendations", []),
            "ranked_products": state.get("ranked_products", []),
            "analysis_summary": state.get("analysis_summary", ""),
            "durations_ms": state.get("durations_ms", {}),
        }
    })


@app.post("/api/search/stream")
async def search_stream(req: SearchRequest):
    return StreamingResponse(
        _run_search(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
