import os
import re
import json
import time
import asyncio
import logging
import pandas as pd
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, TypedDict
from tavily import AsyncTavilyClient
from dotenv import load_dotenv
from cachetools import TTLCache
from huggingface_hub import InferenceClient
from groq import Groq
from serpapi import GoogleSearch
from langgraph.graph import StateGraph, END


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
serpapi_key = os.getenv("SERPAPI_KEY")
_TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
_tavily_client: Optional[AsyncTavilyClient] = None

def _get_tavily_client() -> AsyncTavilyClient:
    global _tavily_client
    loop = asyncio.get_event_loop()
    if _tavily_client is None or getattr(_tavily_client, "_loop", loop) is not loop:
        _tavily_client = AsyncTavilyClient(api_key=_TAVILY_API_KEY)
    return _tavily_client

LOG_FILE = "search_log.jsonl"

# Limit concurrent Tavily calls to avoid free-tier rate limits
# Created lazily per event loop to avoid "bound to a different event loop" errors
_TAVILY_SEM: Optional[asyncio.Semaphore] = None

def _get_tavily_sem() -> asyncio.Semaphore:
    global _TAVILY_SEM
    loop = asyncio.get_event_loop()
    if _TAVILY_SEM is None or _TAVILY_SEM._loop is not loop:
        _TAVILY_SEM = asyncio.Semaphore(8)
    return _TAVILY_SEM

# Expert review domains per product category for higher-quality spec data
_DOMAIN_MAP: Dict[str, List[str]] = {
    "laptop":     ["notebookcheck.net", "rtings.com", "laptopmag.com"],
    "monitor":    ["rtings.com", "displayninja.com", "tftcentral.co.uk"],
    "smartphone": ["gsmarena.com", "rtings.com", "91mobiles.com"],
    "phone":      ["gsmarena.com", "rtings.com", "91mobiles.com"],
    "headphones": ["rtings.com", "soundguys.com", "whathifi.com"],
    "earbuds":    ["rtings.com", "soundguys.com"],
    "tv":         ["rtings.com", "flatpanelshd.com", "avforums.com"],
    "camera":     ["dpreview.com", "imaging-resource.com"],
    "gpu":        ["techpowerup.com", "tomshardware.com"],
    "cpu":        ["techpowerup.com", "tomshardware.com"],
}



def _domains_for_category(title: str) -> Optional[List[str]]:
    """Return expert review domains for known product categories, or None."""
    title_lower = title.lower()
    for kw, domains in _DOMAIN_MAP.items():
        if kw in title_lower:
            return domains
    return None



HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
GROQ_MODEL = "llama-3.1-8b-instant"

# Once HF returns a billing error, skip it for the rest of the session
_hf_credits_exhausted = False

# System messages for each LLM role — kept as constants so they're easy to tune
_SYSTEM_QUERY = (
    "You rewrite product searches into clean queries for Google Shopping. "
    "Output exactly two lines and nothing else. No quotes, no markdown.\n"
    "Line 1 — Translated: <query in English; copy verbatim if already English>\n"
    "Line 2 — Restructured: <one search-friendly query, max 10 words>\n"
    "Rules:\n"
    "- Preserve brand and model tokens exactly (e.g. 'MacBook Air M3', 'Sony WH-1000XM5').\n"
    "- Place type modifiers BEFORE the product (Gaming, Professional, Waterproof).\n"
    "- Place key specs AFTER the product (16GB RAM, 4K, OLED).\n"
    "- Append 'under X dollars' only if a positive numeric budget is provided.\n"
    "- Drop conversational filler ('for my mom', 'I need', 'please').\n"
    "- Do not repeat words; do not invent specs the user did not ask for."
)

_SYSTEM_SPECS = (
    "You extract product specifications from raw web content for an English-language shopping app.\n"
    "For each product, output ONE JSON object with exactly these keys:\n"
    "- title: string, copy verbatim from the input.\n"
    "- key_features: 3-5 short Title Case strings (specs only — RAM, weight, sensor type, etc.).\n"
    "- pros: 2-4 short strings; when possible, anchor each to the user's stated requirements.\n"
    "- cons: 2-4 short strings; each must be a real drawback (not 'may be expensive').\n"
    "- summary: one sentence, max 25 words.\n"
    "Rules:\n"
    "- Only state facts present in the provided Info. If a spec is missing, omit it — do not invent.\n"
    "- Always respond in English regardless of source-content language.\n"
    "- Output a JSON array (one element per product). No markdown, no commentary."
)

_SYSTEM_RANK = (
    "You are a product analyst. Compare products against a user's needs and rate them. "
    "Be calibrated and evidence-based — every claim must reference a specific feature, pro, or con. "
    "Respond with one JSON object and nothing else. No markdown, no commentary."
)


class ProductState(TypedDict):
    """State for the shopping assistant workflow"""
    query: str
    max_price: Optional[float]
    additional_requirements: str
    products: List[Dict[str, Any]]
    processed_query: Dict[str, str]
    detailed_products: List[Dict[str, Any]]
    ranked_products: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    status: Dict[str, str]
    durations_ms: Dict[str, float]


class ShoppingGraph:
    def __init__(self):
        self.hf_client = InferenceClient(token=os.getenv("HUGGINGFACE_API_TOKEN"))
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.product_cache: TTLCache = TTLCache(maxsize=100, ttl=3600)
        self.graph = self._build_graph()

    # ------------------------------------------------------------------
    # LLM helpers
    # ------------------------------------------------------------------

    def _llm_call(
        self,
        prompt: str,
        system_message: str,
        max_retries: int = 3,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        json_mode: bool = False,
    ) -> str:
        """Call Qwen2.5-72B via HuggingFace, falling back to Groq on billing/rate errors."""
        global _hf_credits_exhausted
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]

        # Primary: HuggingFace (Qwen2.5-72B)
        if not _hf_credits_exhausted:
            for attempt in range(max_retries):
                try:
                    response = self.hf_client.chat_completion(
                        model=HF_MODEL,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )
                    return response.choices[0].message.content
                except Exception as e:
                    err = str(e)
                    if "402" in err or "Payment Required" in err or "credits" in err.lower():
                        logger.warning("HuggingFace credits exhausted — switching to Groq for this session.")
                        _hf_credits_exhausted = True
                        break
                    if attempt < max_retries - 1:
                        wait = (2 ** attempt) * 2
                        logger.warning(f"HF LLM call failed (attempt {attempt + 1}), retrying in {wait}s: {e}")
                        time.sleep(wait)
                    else:
                        raise

        # Fallback: Groq (llama-3.1-8b-instant)
        groq_kwargs: dict = {
            "model": GROQ_MODEL,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            groq_kwargs["response_format"] = {"type": "json_object"}

        for attempt in range(max_retries):
            try:
                response = self.groq_client.chat.completions.create(**groq_kwargs)
                return response.choices[0].message.content
            except Exception as e:
                err = str(e)
                if json_mode and ("response_format" in err or "not supported" in err.lower()):
                    logger.warning("Groq JSON mode not supported — retrying without it.")
                    groq_kwargs.pop("response_format", None)
                elif attempt < max_retries - 1:
                    wait = (2 ** attempt) * 2
                    logger.warning(f"Groq fallback failed (attempt {attempt + 1}), retrying in {wait}s: {e}")
                    time.sleep(wait)
                else:
                    raise

    def _parse_json_response(self, text: str):
        """Strip markdown fences and parse JSON; raises ValueError on failure."""
        text = text.strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # Try to find a JSON object or array anywhere in the text
        match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', text)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Could not parse JSON from LLM response: {text[:300]}")

    # ------------------------------------------------------------------
    # Graph
    # ------------------------------------------------------------------

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(ProductState)
        workflow.add_node("process_query", self._process_query_node)
        workflow.add_node("search_products", self._search_products_node)
        workflow.add_node("extract_specifications", self._extract_specifications_node)
        workflow.add_node("rank_products", self._rank_products_node)

        workflow.add_edge("process_query", "search_products")
        workflow.add_edge("search_products", "extract_specifications")
        workflow.add_edge("extract_specifications", "rank_products")
        workflow.add_edge("rank_products", END)

        workflow.set_entry_point("process_query")
        return workflow.compile()

    # ------------------------------------------------------------------
    # Node 1: Query processing
    # ------------------------------------------------------------------

    async def _process_query_node(self, state: ProductState) -> ProductState:
        """Restructure the user query to include all requirements and price."""
        _t0 = time.time()
        try:
            budget_line = (
                f"Max Price: {state['max_price']} dollars\n"
                if state.get("max_price") and state["max_price"] > 0
                else ""
            )
            prompt = (
                f"Basic Query: {state['query']}\n"
                f"{budget_line}"
                f"Additional Requirements: {state['additional_requirements']}\n\n"
                "Examples:\n"
                "Basic Query: Laptop | Max Price: 1000 dollars | Additional Requirements: 16GB RAM, Gaming\n"
                "Translated: Laptop\n"
                "Restructured: Gaming Laptop with 16GB RAM under 1000 dollars\n\n"
                "Basic Query: Sony WH-1000XM5 | Max Price: 350 dollars | Additional Requirements: noise cancelling\n"
                "Translated: Sony WH-1000XM5\n"
                "Restructured: Sony WH-1000XM5 Noise Cancelling Headphones under 350 dollars\n\n"
                "Basic Query: Kaffeemaschine | Additional Requirements: Siebträger\n"
                "Translated: Coffee Machine\n"
                "Restructured: Espresso Portafilter Coffee Machine"
            )

            result = self._llm_call(prompt, _SYSTEM_QUERY, temperature=0.2)

            translated = re.search(r"^Translated:\s*(.+)$", result, re.MULTILINE)
            restructured = re.search(r"^Restructured:\s*(.+)$", result, re.MULTILINE)

            # Fallback: if labels are missing, split by lines and use positionally
            if not translated or not restructured:
                lines = [l.strip() for l in result.strip().splitlines() if l.strip()]
                translated_str = lines[0] if len(lines) >= 1 else state["query"]
                restructured_str = lines[1] if len(lines) >= 2 else state["query"]
            else:
                translated_str = translated.group(1).strip()
                restructured_str = restructured.group(1).strip()

            state["processed_query"] = {
                "translated": translated_str,
                "restructured": restructured_str,
                "original_requirements": state["additional_requirements"],
            }
            state["status"] = {
                "process_query": "Completed",
                "search_products": "Pending",
                "extract_specifications": "Pending",
                "rank_products": "Pending",
                "generate_recommendations": "Not started",
            }
            state["durations_ms"]["process_query"] = round((time.time() - _t0) * 1000)
            return state

        except Exception as e:
            logger.error(f"Error in process_query_node: {e}")
            state["durations_ms"]["process_query"] = round((time.time() - _t0) * 1000)
            state["processed_query"] = {
                "translated": state["query"],
                "restructured": state["query"],
                "original_requirements": state["additional_requirements"],
            }
            state["status"] = {
                "process_query": f"Failed: {e}",
                "search_products": "Pending",
                "extract_specifications": "Pending",
                "rank_products": "Pending",
                "generate_recommendations": "Not started",
            }
            return state

    # ------------------------------------------------------------------
    # Node 2: Product search
    # ------------------------------------------------------------------

    @staticmethod
    def _deduplicate_products(products: List[Dict]) -> List[Dict]:
        """Remove same product listed by multiple sellers; keeps the lowest price."""
        seen: List[Dict] = []
        for candidate in products:
            words = candidate["title"].lower().split()[:6]
            is_dup = False
            for existing in seen:
                ex_words = existing["title"].lower().split()[:6]
                if sum(a == b for a, b in zip(words, ex_words)) >= 5:
                    # Same product — keep lower price
                    try:
                        cp = float(candidate.get("price", "").replace("$", "").replace(",", "."))
                        ep = float(existing.get("price", "").replace("$", "").replace(",", "."))
                        if cp < ep:
                            seen.remove(existing)
                            seen.append(candidate)
                    except (ValueError, AttributeError):
                        pass
                    is_dup = True
                    break
            if not is_dup:
                seen.append(candidate)
        return seen

    async def _search_products_node(self, state: ProductState) -> ProductState:
        """Search for products using SerpAPI Google Shopping."""
        _t0 = time.time()
        try:
            params = {
                "api_key": serpapi_key,
                "engine": "google_shopping",
                "q": state["processed_query"]["restructured"],
                "num": 20,
                "gl": "us",
                "hl": "en",
                "condition": "new",   # filter to new products only
            }

            search = GoogleSearch(params)
            results = search.get_dict()
            product_results = results.get("shopping_results", [])[:20]

            products = []
            for r in product_results:
                price = r.get('extracted_price', '')
                if price and isinstance(price, (int, float)):
                    price = f"${price:.2f}"
                else:
                    price = f"${price}" if price else 'N/A'

                reviews = r.get('reviews', '')
                if reviews and isinstance(reviews, (int, float)):
                    reviews = str(int(reviews))
                elif not reviews:
                    reviews = 'N/A'

                title = r.get('title', '')
                products.append({
                    "product_id": r.get('product_id', ''),
                    "title": title,
                    "url": r.get('product_link', ''),
                    "source": r.get('source', ''),
                    "price": price,
                    "old_price": r.get('extracted_old_price', ''),
                    "rating": r.get('rating', ''),
                    "reviews": reviews,
                    "extensions": r.get('extensions', []),
                    "image": r.get('thumbnail', ''),
                    "processed_query": state["processed_query"],
                })

            products = self._deduplicate_products(products)
            state["products"] = products
            state["status"]["search_products"] = f"Completed: Found {len(products)} products"
            state["status"]["extract_specifications"] = "Pending"
            state["durations_ms"]["search_products"] = round((time.time() - _t0) * 1000)
            return state

        except Exception as e:
            logger.error(f"Error in search: {e}")
            state["products"] = []
            state["status"]["search_products"] = f"Failed: {e}"
            state["status"]["extract_specifications"] = "Pending"
            state["durations_ms"]["search_products"] = round((time.time() - _t0) * 1000)
            return state

    # ------------------------------------------------------------------
    # Node 3: Spec extraction (batched — 5 products per LLM call)
    # ------------------------------------------------------------------

    async def _fetch_google_product_details(self, product_id: str) -> Optional[Dict]:
        """Fetch manufacturer specs, highlights, and seller prices via SerpAPI google_product engine.

        Uses run_in_executor because GoogleSearch is synchronous.
        Returns a dict with keys: description, highlights, specs, lowest_price — or None on failure.
        """
        if not product_id:
            return None
        loop = asyncio.get_event_loop()
        params = {
            "api_key": serpapi_key,
            "engine": "google_product",
            "product_id": product_id,
            "hl": "en",
        }
        try:
            result = await loop.run_in_executor(
                None, lambda: GoogleSearch(params).get_dict()
            )
            pr = result.get("product_results", {})
            sellers = result.get("sellers_results", {}).get("online_sellers", [])
            specs_raw = result.get("specs_results", {})
            # Flatten spec sections into readable text
            spec_lines = []
            for section in (specs_raw if isinstance(specs_raw, list) else []):
                for item in section.get("items", []):
                    spec_lines.append(f"{item.get('key','')}: {item.get('value','')}")
            return {
                "description": pr.get("description", ""),
                "highlights": pr.get("highlights", []),
                "specs_text": "\n".join(spec_lines),
                "lowest_price": sellers[0].get("base_price") if sellers else None,
            }
        except Exception as e:
            logger.warning(f"google_product fetch failed for product_id={product_id}: {e}")
            return None

    async def _fetch_urls_via_extract(self, products: List[Dict]) -> Dict[str, str]:
        """Batch-extract direct page content from known product URLs via Tavily /extract.

        Returns a dict mapping url → extracted content string (up to 3000 chars).
        A single API call handles up to 10 URLs, far cheaper than 10 search calls.
        """
        urls = [p["url"] for p in products if p.get("url")][:10]
        if not urls:
            return {}
        try:
            response = await _get_tavily_client().extract(
                urls=urls,
                extract_depth="basic",   # 1 credit per 5 URLs
            )
            return {
                r["url"]: r.get("raw_content", "")[:3000]
                for r in response.get("results", [])
                if r.get("raw_content")
            }
        except Exception as e:
            logger.warning(f"Tavily extract failed: {e}")
            return {}

    async def _fetch_tavily_content(self, product: Dict) -> Dict:
        """Fetch Tavily search content for a single product concurrently."""
        async with _get_tavily_sem():
            cache_key = product["title"]
            if cache_key in self.product_cache:
                cached = self.product_cache[cache_key]
                return {**product, "_raw_content": cached.get("raw_details", "No details found.")}

            for attempt in range(3):
                try:
                    # On retry after thin content, broaden the query to avoid
                    # the same listing page being returned again
                    if attempt == 0:
                        query = (
                            f"{product['title']} product technical description "
                            "specifications features pros cons"
                        )
                        domains = _domains_for_category(product.get("title", ""))
                    else:
                        # Strip long title noise; search by brand + model keywords only
                        words = product["title"].split()[:5]
                        query = f"{' '.join(words)} review specifications"
                        domains = None  # open search on retry

                    response = await _get_tavily_client().search(
                        query=query,
                        search_depth="advanced",
                        max_results=3,
                        include_answer="basic",
                        include_raw_content=True,
                        include_domains=domains,
                    )
                    parts = []
                    if response.get("answer"):
                        parts.append(f"[Summary] {response['answer']}")
                    for r in response.get("results", []):
                        parts.append(r.get("content", ""))
                    content = "\n".join(parts).strip() or "No details found."

                    # Retry if content is too thin to be useful
                    if len(content) < 800 and attempt < 2:
                        logger.info(
                            f"Thin Tavily content ({len(content)} chars) for "
                            f"'{product['title'][:40]}', retrying with broader query"
                        )
                        await asyncio.sleep(1)
                        continue

                    return {**product, "_raw_content": content}
                except Exception as e:
                    if attempt < 2:
                        await asyncio.sleep(2 ** attempt)
                    else:
                        logger.warning(f"Tavily failed for '{product['title']}' after 3 attempts: {e}")
                        return {**product, "_raw_content": "No details found."}

    async def _extract_specifications_node(self, state: ProductState) -> ProductState:
        """Fetch Tavily details concurrently, then batch-extract structured specs via LLM."""
        _t0 = time.time()

        # Step 1a: Run Tavily /extract and google_product concurrently (independent data sources)
        _t_tavily = time.time()
        top8_products = state["products"][:8]
        gp_tasks = [
            self._fetch_google_product_details(p.get("product_id", ""))
            for p in top8_products
        ]
        url_content_map, *gp_results_list = await asyncio.gather(
            self._fetch_urls_via_extract(state["products"]),
            *gp_tasks,
        )
        # Build product_id → google_product details map
        gp_map: Dict[str, Dict] = {}
        for p, gp in zip(top8_products, gp_results_list):
            if gp and p.get("product_id"):
                gp_map[p["product_id"]] = gp
        logger.info(f"google_product: enriched {len(gp_map)}/{len(top8_products)} products")
        logger.info(f"Tavily extract: got content for {len(url_content_map)}/{len(state['products'])} product URLs")

        # Pre-populate _raw_content from extract results; products without URL content
        # will fall through to the per-product search in Step 1b.
        # google_product data is merged as a leading block for manufacturer-provided specs.
        def _build_gp_prefix(product: Dict) -> str:
            gp = gp_map.get(product.get("product_id", ""))
            if not gp:
                return ""
            parts = []
            if gp.get("description"):
                parts.append(f"[Manufacturer] {gp['description']}")
            if gp.get("highlights"):
                parts.append("Highlights: " + "; ".join(gp["highlights"]))
            if gp.get("specs_text"):
                parts.append(gp["specs_text"])
            if gp.get("lowest_price"):
                parts.append(f"Lowest seller price: {gp['lowest_price']}")
            return "\n".join(parts)

        products_preloaded = []
        products_needing_search = []
        for p in state["products"]:
            extracted = url_content_map.get(p.get("url", ""), "")
            gp_prefix = _build_gp_prefix(p)
            if len(extracted) >= 800:
                combined = (gp_prefix + "\n" + extracted).strip() if gp_prefix else extracted
                products_preloaded.append({**p, "_raw_content": combined[:3000]})
            else:
                # Either no URL, failed extract, or too thin — search by title
                p_with_prefix = {**p}
                combined_prefix = (gp_prefix + "\n" + extracted).strip() if (gp_prefix or extracted) else ""
                if combined_prefix:
                    p_with_prefix["_extract_prefix"] = combined_prefix
                products_needing_search.append(p_with_prefix)

        # Step 1b: Fetch remaining products via per-product Tavily search (concurrent)
        fetch_tasks = [self._fetch_tavily_content(p) for p in products_needing_search]
        searched_products: List[Dict] = list(await asyncio.gather(*fetch_tasks)) if fetch_tasks else []

        # Merge extract prefix (if any) into search content for richer context
        for p in searched_products:
            prefix = p.pop("_extract_prefix", "")
            if prefix:
                p["_raw_content"] = (prefix + "\n" + p.get("_raw_content", "")).strip()

        products_with_content: List[Dict] = products_preloaded + searched_products
        state["durations_ms"]["tavily_fetch"] = round((time.time() - _t_tavily) * 1000)
        logger.info(
            f"Tavily fetch complete: {len(products_preloaded)} from extract, "
            f"{len(searched_products)} from search"
        )

        # Step 2: Batch LLM calls — smaller batches + tighter content when on Groq
        # Groq free tier: 6K TPM. 3 products × 600 chars ≈ 1500 tokens + overhead ≈ 2200/call,
        # leaving headroom for 2 calls/min before hitting the limit.
        if _hf_credits_exhausted:
            batch_size = 3
            content_cap = 900
        else:
            batch_size = 5
            content_cap = 2500
        detailed_products: List[Dict] = []

        for i in range(0, len(products_with_content), batch_size):
            batch = products_with_content[i:i + batch_size]

            # Build a compact per-product block (truncate content to save tokens)
            product_blocks = []
            for idx, p in enumerate(batch, 1):
                raw = p.get("_raw_content", "No details found.")[:content_cap]
                product_blocks.append(
                    f"{idx}. Title: {p['title']}\n"
                    f"   Price: {p.get('price', 'N/A')} | "
                    f"Rating: {p.get('rating', 'N/A')} | "
                    f"Reviews: {p.get('reviews', 'N/A')}\n"
                    f"   Info: {raw}"
                )

            user_query = state.get("query", "")
            user_requirements = state.get("additional_requirements", "") or "(none specified)"
            
            prompt = (
                f"User is shopping for: {user_query}\n"
                f"User requirements: {user_requirements}\n\n"
                "Extract specifications for each product below. "
                "When writing pros and cons, prefer points that relate to the user's requirements.\n\n"
                + "\n\n".join(product_blocks)
                + "\n\nRespond with a JSON array, one object per product, matching the schema in the system message."
            )


            try:
                raw_response = self._llm_call(prompt, _SYSTEM_SPECS, temperature=0.1, json_mode=True)
                parsed = self._parse_json_response(raw_response)
                # Normalise: accept a bare dict (single product) wrapped in a list
                if isinstance(parsed, dict):
                    parsed = [parsed]
            except Exception as e:
                logger.error(f"Spec extraction LLM failed for batch {i // batch_size + 1}: {e}")
                parsed = []

            # Map parsed results back to products by title (fuzzy match)
            parsed_by_title = {}
            for item in parsed:
                if isinstance(item, dict) and 'title' in item:
                    parsed_by_title[item['title'].lower()] = item

            for product in batch:
                title_lower = product['title'].lower()
                spec = parsed_by_title.get(title_lower)
                if spec is None:
                    # Try substring match
                    for k, v in parsed_by_title.items():
                        if title_lower in k or k in title_lower:
                            spec = v
                            break

                if spec:
                    structured_details = {
                        'key_features': spec.get('key_features', ['No key features found']),
                        'pros': spec.get('pros', ['No pros found']),
                        'cons': spec.get('cons', ['No cons found']),
                        'summary': spec.get('summary', 'No summary available'),
                    }
                else:
                    structured_details = {
                        'key_features': ['No key features found'],
                        'pros': ['No pros found'],
                        'cons': ['No cons found'],
                        'summary': 'No summary available',
                    }

                # Ensure list fields are actually lists
                for field in ('key_features', 'pros', 'cons'):
                    if not isinstance(structured_details[field], list):
                        structured_details[field] = [str(structured_details[field])]

                formatted_details = {
                    'key_features': '\n'.join(f"- {f}" for f in structured_details['key_features'])
                                    or "No key features found",
                    'pros': '\n'.join(f"- {p}" for p in structured_details['pros'])
                            or "No pros found",
                    'cons': '\n'.join(f"- {c}" for c in structured_details['cons'])
                            or "No cons found",
                    'summary': structured_details['summary'],
                }

                detailed_product = {
                    **product,
                    "raw_details": product.get("_raw_content", ""),
                    "structured_details": structured_details,
                    "formatted_details": formatted_details,
                }
                # Remove the internal staging key
                detailed_product.pop("_raw_content", None)

                self.product_cache[product["title"]] = detailed_product
                detailed_products.append(detailed_product)

        state["detailed_products"] = detailed_products
        state["status"]["extract_specifications"] = (
            f"Completed: Extracted details for {len(detailed_products)} products"
        )
        state["status"]["rank_products"] = "Pending"
        state["durations_ms"]["extract_specifications"] = round((time.time() - _t0) * 1000)
        return state

    # ------------------------------------------------------------------
    # Node 4: Ranking
    # ------------------------------------------------------------------

    @staticmethod
    def _prefilter_products(products: List[Dict], max_price: Optional[float]) -> List[Dict]:
        """Keep at most 10 candidates before the LLM sees them.

        Pass 1 — hard disqualifiers: products over budget (with 5% tolerance).
        Pass 2 — soft sort: prefer products with more reviews, then higher rating.
        Returns at most 15 products so the ranking prompt stays compact.
        """
        if max_price:
            within_budget = []
            over_budget = []
            for p in products:
                try:
                    price_val = float(
                        str(p.get("price", "0"))
                        .replace("$", "").replace(",", ".").strip()
                    )
                    if price_val <= max_price * 1.05:
                        within_budget.append((p, price_val))
                    else:
                        over_budget.append((p, price_val))
                except (ValueError, AttributeError):
                    within_budget.append((p, 0.0))
            candidates = within_budget if within_budget else over_budget
        else:
            candidates = [(p, 0.0) for p in products]

        def sort_key(item):
            p, _ = item
            try:
                reviews = int(str(p.get("reviews", "0")).replace(",", ""))
            except (ValueError, TypeError):
                reviews = 0
            try:
                rating = float(p.get("rating", 0) or 0)
            except (ValueError, TypeError):
                rating = 0.0
            return (reviews, rating)

        candidates.sort(key=sort_key, reverse=True)
        return [p for p, _ in candidates[:15]]

    @staticmethod
    def _compute_deterministic_scores(product: Dict, max_price: Optional[float]) -> Dict[str, float]:
        """Compute price_score and rating_score from hard data — no LLM involved."""
        # --- Price score (1–10, higher = better value vs budget) ---
        price_score = 5.0
        if max_price:
            try:
                price_val = float(
                    str(product.get("price", "0"))
                    .replace("$", "").replace(",", ".").strip()
                )
                if price_val > 0:
                    ratio = price_val / max_price        # 0 = free, 1 = at budget, >1 = over
                    price_score = max(1.0, min(10.0, round((1 - ratio) * 9 + 1, 1)))
            except (ValueError, AttributeError):
                pass

        # --- Review credibility weight (0–1) ---
        try:
            review_count = int(str(product.get("reviews", "0")).replace(",", ""))
        except (ValueError, TypeError):
            review_count = 0

        if review_count >= 500:
            credibility = 1.0
        elif review_count >= 100:
            credibility = 0.5
        elif review_count >= 20:
            credibility = 0.25
        else:
            credibility = 0.0          # too few reviews to trust the rating

        # --- Rating score (1–10, discounted by credibility) ---
        try:
            raw_rating = float(product.get("rating", 0) or 0)   # typically 0–5
            normalized = (raw_rating / 5.0) * 9 + 1             # map to 1–10
            # Blend toward neutral (5.5) when credibility is low
            rating_score = credibility * normalized + (1 - credibility) * 5.5
            rating_score = round(max(1.0, min(10.0, rating_score)), 1)
        except (ValueError, TypeError):
            rating_score = 5.5

        return {"price_score": price_score, "rating_score": rating_score}

    async def _rank_products_node(self, state: ProductState) -> ProductState:
        """Pre-filter, score deterministically, then rank + recommend in one LLM call."""
        _t0 = time.time()
        try:
            # Step 1: pre-filter to ≤15 best candidates
            candidates = self._prefilter_products(
                state["detailed_products"], state.get("max_price")
            )
            if not candidates:
                candidates = state["detailed_products"][:15]

            # Step 2: compute deterministic scores for each candidate
            for p in candidates:
                p["_det_scores"] = self._compute_deterministic_scores(
                    p, state.get("max_price")
                )

            # Step 3: single LLM call — score matching_requirements + quality,
            # and write a recommendation reason for every product
            llm_input = [
                {
                    "title": p["title"],
                    "price": p.get("price", "N/A"),
                    "key_features": p.get("structured_details", {}).get("key_features", [])[:5],
                    "pros": p.get("structured_details", {}).get("pros", [])[:3],
                    "cons": p.get("structured_details", {}).get("cons", [])[:3],
                    "summary": p.get("structured_details", {}).get("summary", ""),
                }
                for p in candidates
            ]

            prompt = (
                f'User query: "{state["query"]}"\n'
                f'Budget: {state["max_price"]} dollars (context only — do not score on price)\n'
                f'Requirements: {state["additional_requirements"] or "(none specified)"}\n\n'
                f'Products:\n{json.dumps(llm_input, indent=2)}\n\n'
                "For each product return:\n"
                "- matching_requirements (1-10): how well it satisfies the user's stated requirements.\n"
                "    10 = all requirements clearly met.\n"
                "    5 = some met, some unknown.\n"
                "    1 = a stated requirement is contradicted.\n"
                "    If no requirements are given, return 7.\n"
                "- quality (1-10) for its category. Anchors:\n"
                "    1-3 entry-level, 4-6 average, 7-8 strong, 9-10 best-in-class.\n"
                "    Use the full range — the best in THIS batch should score 9 or 10, the worst 3 or 4.\n"
                "- reason (one sentence, max 25 words): explain what makes THIS product stand out from the others — "
                "its unique advantage, best trade-off, or strongest differentiator relative to the user's needs. "
                "Do not restate the user's requirement back to them. Do not write generic praise and do not end with filler phrases like 'make it a top contender'.\n\n"
                "Tie-breaker: if two products are equivalent, prefer the one whose pros better match the user's requirements.\n\n"
                'Respond with: {"products": [{"title": "exact title", '
                '"matching_requirements": N, "quality": N, "reason": "..."}]}'
            )

            try:
                raw = self._llm_call(prompt, _SYSTEM_RANK, temperature=0.3, json_mode=True)
                llm_data = self._parse_json_response(raw)
            except Exception as e:
                logger.error(f"Ranking LLM failed: {e}")
                llm_data = {"products": []}

            # Build lookup: title → LLM output
            llm_by_title: Dict[str, Dict] = {}
            for item in llm_data.get("products", []):
                if "title" in item:
                    llm_by_title[item["title"].lower()] = item

            def _find_llm(title: str) -> Dict:
                tl = title.lower()
                if tl in llm_by_title:
                    return llm_by_title[tl]
                for k, v in llm_by_title.items():
                    if tl in k or k in tl:
                        return v
                return {}

            # Step 4: assemble final scores using the weighted formula
            ranked: List[Dict] = []
            for p in candidates:
                det = p.pop("_det_scores")
                llm = _find_llm(p["title"])

                matching = float(llm.get("matching_requirements", 5))
                quality  = float(llm.get("quality", 5))
                price_s  = det["price_score"]
                rating_s = det["rating_score"]

                overall = round(
                    quality   * 0.35
                    + matching  * 0.30
                    + price_s   * 0.20
                    + rating_s  * 0.15,
                    1,
                )

                fd = p.get("formatted_details", {})
                ranked.append({
                    **p,
                    "analysis": {
                        "key_features": fd.get("key_features", "No key features found"),
                        "pros":         fd.get("pros",         "No pros found"),
                        "cons":         fd.get("cons",         "No cons found"),
                        "scores": {
                            "quality":                round(quality,  1),
                            "matching_requirements":  round(matching, 1),
                            "value_for_money":        round(price_s,  1),
                            "rating_score":           round(rating_s, 1),
                            "overall_score":          overall,
                        },
                        "reason": llm.get("reason", ""),
                        "price":  p.get("price", "N/A"),
                    },
                })

            ranked.sort(
                key=lambda x: x["analysis"]["scores"]["overall_score"],
                reverse=True,
            )

            # Step 5: top 3 become recommendations
            top3 = ranked[:3]
            recommendations_lines = ["Top Recommendations:\n"]
            for p in top3:
                reason = p["analysis"]["reason"] or p.get("structured_details", {}).get("summary", "")
                p["recommendation_reason"] = reason
                recommendations_lines.append(p["title"])
                recommendations_lines.append(f": {reason}\n")

            state["ranked_products"]        = ranked[:10]
            state["recommendations"]        = top3
            state["status"]["rank_products"] = (
                f"Completed: Ranked {len(ranked)} products, top 3 recommended"
            )
            state["status"]["generate_recommendations"] = "Completed"
            state["durations_ms"]["rank_products"] = round((time.time() - _t0) * 1000)
            return state

        except Exception as e:
            logger.error(f"Error in rank_products_node: {e}")
            state["ranked_products"]        = state["detailed_products"][:10]
            state["recommendations"]        = state["detailed_products"][:3]
            state["status"]["rank_products"] = f"Failed: {e}"
            state["status"]["generate_recommendations"] = "Failed"
            state["durations_ms"]["rank_products"] = round((time.time() - _t0) * 1000)
            return state

    def _should_end(self, state: ProductState) -> bool:
        return True




def _log_search(session_id: str, t_start: float, state: Dict[str, Any]) -> None:
    """Append one search record to search_log.jsonl for offline analysis."""
    try:
        durations = state.get("durations_ms", {})
        total_ms = round((time.time() - t_start) * 1000)

        recommendations = state.get("recommendations", [])
        recommendation_titles = {p["title"].lower() for p in recommendations}
        # Fallback: if recommendations failed, treat top-3 ranked as recommendations
        if not recommendation_titles:
            recommendation_titles = {
                p["title"].lower()
                for p in state.get("ranked_products", [])[:3]
            }

        products_log = []
        for rank, p in enumerate(state.get("ranked_products", []), 1):
            analysis = p.get("analysis", {})
            scores = analysis.get("scores", {}) if isinstance(analysis, dict) else {}
            score_analysis = analysis.get("analysis", {}) if isinstance(analysis, dict) else {}
            raw_content = p.get("raw_details", "")
            products_log.append({
                "rank": rank,
                "title": p.get("title", ""),
                "source": p.get("source", ""),
                "price": p.get("price", "N/A"),
                "rating": p.get("rating", ""),
                "reviews": p.get("reviews", ""),
                "tavily_content_chars": len(raw_content),
                "tavily_had_summary": raw_content.startswith("[Summary]"),
                "key_features": analysis.get("key_features", "") if isinstance(analysis, dict) else "",
                "pros": analysis.get("pros", "") if isinstance(analysis, dict) else "",
                "cons": analysis.get("cons", "") if isinstance(analysis, dict) else "",
                "summary": p.get("structured_details", {}).get("summary", ""),
                "scores": scores,
                "score_analysis": score_analysis,
                "is_recommendation": p.get("title", "").lower() in recommendation_titles,
                "recommendation_reason": p.get("recommendation_reason", ""),
            })

        record = {
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "durations_ms": {**durations, "total": total_ms},
            "input": {
                "query": state.get("query", ""),
                "max_price": state.get("max_price"),
                "requirements": state.get("additional_requirements", ""),
            },
            "query_rewrite": state.get("processed_query", {}),
            "serp_results_count": len(state.get("products", [])),
            "products": products_log,
            "pipeline_status": state.get("status", {}),
        }

        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

        logger.info(f"Search logged to {LOG_FILE} (session {session_id})")

    except Exception as e:
        logger.error(f"Failed to write search log: {e}")


def save_to_csv(state: Dict[str, Any]) -> None:
    """Save ranked products with full specs and scores to a per-query CSV file."""
    try:
        query = state.get("query", "unknown")
        max_price = state.get("max_price")
        additional_requirements = state.get("additional_requirements", "")
        processed_query = state.get("processed_query", {})
        restructured_query = processed_query.get("restructured", query)
        ranked_products = state.get("ranked_products", [])
        recommendation_titles = {
            p.get("title", "").lower() for p in state.get("recommendations", [])
        }

        safe_query = re.sub(r'[^a-zA-Z0-9\s-]', '', query).replace(' ', '_').lower()
        filename = f"shopping_results_{safe_query}.csv"

        rows = []
        for rank, p in enumerate(ranked_products, 1):
            analysis = p.get("analysis", {}) if isinstance(p.get("analysis"), dict) else {}
            scores = analysis.get("scores", {})
            score_analysis = analysis.get("analysis", {})
            structured = p.get("structured_details", {})

            rows.append({
                "rank": rank,
                "query": query,
                "restructured_query": restructured_query,
                "max_price": max_price,
                "requirements": additional_requirements,
                "title": p.get("title", ""),
                "source": p.get("source", ""),
                "price": p.get("price", "N/A"),
                "rating": p.get("rating", ""),
                "reviews": p.get("reviews", ""),
                "url": p.get("url", ""),
                "key_features": "; ".join(structured.get("key_features", [])),
                "pros": "; ".join(structured.get("pros", [])),
                "cons": "; ".join(structured.get("cons", [])),
                "summary": structured.get("summary", ""),
                "score_performance": scores.get("performance", ""),
                "score_value": scores.get("value_for_money", ""),
                "score_requirements": scores.get("matching_requirements", ""),
                "score_overall": scores.get("overall_score", ""),
                "analysis_performance": score_analysis.get("performance_analysis", ""),
                "analysis_value": score_analysis.get("value_analysis", ""),
                "analysis_requirements": score_analysis.get("requirements_match", ""),
                "is_recommendation": p.get("title", "").lower() in recommendation_titles,
                "recommendation_reason": p.get("recommendation_reason", ""),
            })

        if not rows:
            logger.warning("save_to_csv: no ranked products to save")
            return

        df = pd.DataFrame(rows)
        df.to_csv(filename, index=False, encoding="utf-8")
        logger.info(f"Results saved to {filename} ({len(rows)} products)")

    except Exception as e:
        logger.error(f"Error saving results to CSV: {e}")


__all__ = ['ShoppingGraph', 'save_to_csv']
