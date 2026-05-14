import os
import json
import logging

logger = logging.getLogger(__name__)

_conn = None


def _get_conn():
    global _conn
    if _conn is None or _conn.closed:
        import psycopg2
        url = os.getenv("NEON_DATABASE_URL")
        if not url:
            return None
        _conn = psycopg2.connect(url, sslmode="require")
        _conn.autocommit = True
        _ensure_tables(_conn)
    return _conn


def _ensure_tables(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS search_log (
                id               BIGSERIAL PRIMARY KEY,
                session_id       TEXT NOT NULL,
                timestamp        TIMESTAMPTZ NOT NULL,
                query            TEXT,
                max_price        NUMERIC,
                query_rewrite    JSONB,
                analysis_summary TEXT,
                durations_ms     JSONB,
                products         JSONB
            );
        """)


def insert_search_log(record: dict) -> bool:
    try:
        conn = _get_conn()
        if conn is None:
            return False
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO search_log
                    (session_id, timestamp, query, max_price,
                     query_rewrite, analysis_summary, durations_ms, products)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                record["session_id"],
                record["timestamp"],
                record["input"]["query"],
                record["input"]["max_price"],
                json.dumps(record["query_rewrite"]),
                record["analysis_summary"],
                json.dumps(record["durations_ms"]),
                json.dumps(record["products"]),
            ))
        return True
    except Exception as e:
        logger.error(f"Neon insert_search_log failed: {e}")
        return False
