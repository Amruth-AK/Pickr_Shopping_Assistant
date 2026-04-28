import time
import uuid
import streamlit as st
import asyncio
from backend import ShoppingGraph, _log_search, save_to_csv
from typing import Dict, Any, List

st.set_page_config(
    page_title="AI Shopping Assistant",
    page_icon="🛍️",
    layout="wide"
)

# ── Single CSS block ──────────────────────────────────────────────────────────
CUSTOM_CSS = """
/* Layout */
.block-container, .main .block-container {
    max-width: none !important;
    padding: 2rem 5rem !important;
}
[data-testid="stVerticalBlock"] {
    width: 100% !important;
    max-width: none !important;
}

/* Background */
html, body, [data-testid="stAppViewContainer"], .main, body {
    background: linear-gradient(135deg, grey, black) !important;
    color: #ffffff !important;
}

/* Title */
.custom-title {
    font-size: 3rem;
    font-weight: 700;
    color: white;
    text-align: center;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, black, grey);
    border-radius: 10px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: fit-content;
    margin: 0 auto 2rem auto;
    display: block;
}

/* Input labels */
div[data-testid="stTextInput"] label,
div[data-testid="stTextArea"] label,
div[data-testid="stNumberInput"] label,
.stTextInput label p, .stTextArea label p, .stNumberInput label p {
    font-size: 1rem !important;
    font-weight: 500 !important;
    color: white !important;
}

/* Input fields */
.stTextInput>div>div>input,
.stNumberInput>div>div>input,
div[data-baseweb="input"] input {
    background-color: white !important;
    color: black !important;
    border: 1px solid #ccc !important;
    caret-color: black !important;
}
.stTextArea>div>div>textarea,
div[data-baseweb="textarea"] textarea {
    background-color: white !important;
    color: black !important;
    border: 1px solid #ccc !important;
    caret-color: black !important;
}
.stTextInput>div>div>input:focus,
.stTextArea>div>div>textarea:focus,
.stNumberInput>div>div>input:focus {
    color: black !important;
    border-color: #ccc !important;
    box-shadow: none !important;
}
.stTextInput>div>div>input::placeholder,
.stTextArea>div>div>textarea::placeholder,
div[data-baseweb="textarea"] textarea::placeholder {
    color: #666666 !important;
    opacity: 1 !important;
}

/* Button */
.stButton>button {
    width: 100%;
    font-size: 1rem;
    background-color: white;
    color: black;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
.stButton>button:hover { background: linear-gradient(135deg, black, grey); color: white !important; }
.stButton>button:focus { background-color: white !important; color: black !important; border: none !important; box-shadow: none !important; }

/* Headings & markdown */
h1, h2, h3, h4, h5, h6, .stMarkdown, .stAlert, .stSpinner { text-align: center !important; }
[data-testid="stMarkdown"] { text-align: center !important; }

/* Spinner */
.stSpinner > div {
    text-align: center !important;
    font-size: 1.5rem !important;
    color: white !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
}

/* Cards */
.product-card, .top-recommendation {
    background-color: #ffffff;
    border-radius: 10px;
    padding: 20px;
    margin: 10px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    width: 100%;
}
.product-title   { color: white !important; font-size: 1.5em; margin-bottom: 10px; text-align: center; }
.product-price   { color: white; font-size: 1.2em; font-weight: bold; text-align: center; }
.product-rating  { color: white; margin: 5px 0; text-align: center; }
.product-features { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
.pros-cons { display: flex; gap: 20px; margin: 10px 0; }
.pros  { color: #2e7d32; }
.cons  { color: #c62828; }
.recommendation { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
.product-link {
    display: inline-block;
    background-color: white;
    color: black !important;
    padding: 8px 16px;
    border-radius: 5px;
    text-decoration: none;
    margin-top: 10px;
    font-weight: bold;
    border: 1px solid #e0e0e0;
    text-align: center;
}
.product-link:hover { background-color: #f5f5f5; border-color: #bdbdbd; }

/* Scores */
.score-container { display: flex; gap: 10px; margin: 10px 0; flex-wrap: wrap; }
.score-item { background-color: #f8f9fa; padding: 5px 10px; border-radius: 5px; min-width: 100px; text-align: center; }
.score-label { font-size: 0.8em; color: #666; }
.score-value { font-size: 1.1em; font-weight: bold; color: #1a237e; }
.overall-score { background-color: white; color: black; padding: 8px; border-radius: 5px; text-align: center; margin-top: 10px; width: fit-content; }
.overall-score-label { font-size: 0.8em; opacity: 0.9; color: black; }
.overall-score-value { font-size: 1.2em; font-weight: bold; color: black; }

/* Analysis */
.analysis-section { background-color: #f8f9fa; padding: 12px; border-radius: 5px; margin: 8px 0; }
.analysis-title   { font-size: 0.9em; font-weight: bold; color: #1a237e; margin-bottom: 5px; }
.analysis-content { font-size: 0.9em; color: #333; line-height: 1.4; }

/* Recommendations */
.recommendations-header { text-align: center !important; margin: 20px auto !important; }
.overall-analysis       { text-align: center !important; margin: 20px auto !important; }
.processed-query        { text-align: center !important; margin: 20px auto !important; max-width: 80% !important; }
"""

st.markdown(f"<style>{CUSTOM_CSS}</style><div class='custom-title'>🛍️ AI Shopping Assistant</div>",
            unsafe_allow_html=True)

# ── Session state ─────────────────────────────────────────────────────────────
if 'results' not in st.session_state:
    st.session_state.results = None

# ── Helper functions ──────────────────────────────────────────────────────────

def _fmt_price(price: str) -> str:
    if price and price != 'N/A' and not price.startswith('$'):
        return f"${price}"
    return price or 'N/A'


def display_product_image(url: str, width: int = 200) -> None:
    """Display product image with a text fallback if the URL is broken."""
    if url:
        try:
            st.image(url, width=width)
            return
        except Exception:
            pass
    st.markdown(
        f'<div style="width:{width}px;height:{width}px;background:#eee;'
        'display:flex;align-items:center;justify-content:center;'
        'border-radius:8px;color:#999;font-size:0.8rem;">No Image</div>',
        unsafe_allow_html=True,
    )


def display_rating(rating, reviews) -> None:
    if rating and rating != 'N/A':
        st.markdown(
            f'<div class="product-rating">⭐ {rating} ({reviews} reviews)</div>',
            unsafe_allow_html=True,
        )


def _render_left_col(product: Dict[str, Any], img_width: int = 200) -> None:
    """Shared left-column layout: image, price, rating, link, score."""
    st.markdown('<div style="display:flex;flex-direction:column;align-items:center;width:100%;">',
                unsafe_allow_html=True)
    display_product_image(product.get('image', ''), width=img_width)
    price = _fmt_price(product.get('price', 'N/A'))
    st.markdown(f'<div class="product-price" style="margin-top:0.5rem;">{price}</div>',
                unsafe_allow_html=True)
    display_rating(product.get('rating', 'N/A'), product.get('reviews', 'N/A'))
    if product.get('url'):
        st.markdown(
            f'<a href="{product["url"]}" class="product-link" target="_blank" '
            'style="margin-top:0.5rem;">View Product</a>',
            unsafe_allow_html=True,
        )
    if 'analysis' in product and isinstance(product['analysis'], dict):
        score = product['analysis'].get('scores', {}).get('overall_score', '')
        if score:
            st.markdown(
                f'<div style="display:flex;justify-content:center;width:100%;margin-top:0.5rem;">'
                f'<div class="overall-score">'
                f'<div class="overall-score-label">Overall Score</div>'
                f'<div class="overall-score-value">{score}/10</div>'
                f'</div></div>',
                unsafe_allow_html=True,
            )
    st.markdown('</div>', unsafe_allow_html=True)


def display_product_card(product: Dict[str, Any]) -> None:
    """Full product card for the All Products section."""
    st.markdown('<div class="product-card">', unsafe_allow_html=True)
    st.markdown(f'<div class="product-title">{product["title"]}</div>', unsafe_allow_html=True)

    col1, col2 = st.columns([1, 2])
    with col1:
        _render_left_col(product, img_width=200)
    with col2:
        analysis = product.get('analysis', {})
        if isinstance(analysis, dict):
            if 'key_features' in analysis:
                st.markdown('<div class="product-features">', unsafe_allow_html=True)
                st.markdown("**Key Features:**")
                st.markdown(analysis['key_features'])
                st.markdown('</div>', unsafe_allow_html=True)

            st.markdown('<div class="pros-cons">', unsafe_allow_html=True)
            if 'pros' in analysis:
                st.markdown('<div class="pros">', unsafe_allow_html=True)
                st.markdown("**Pros:**")
                st.markdown(analysis['pros'])
                st.markdown('</div>', unsafe_allow_html=True)
            if 'cons' in analysis:
                st.markdown('<div class="cons">', unsafe_allow_html=True)
                st.markdown("**Cons:**")
                st.markdown(analysis['cons'])
                st.markdown('</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)

            if 'scores' in analysis:
                st.markdown('<div class="score-container">', unsafe_allow_html=True)
                for k, v in analysis['scores'].items():
                    if k != 'overall_score':
                        st.markdown(
                            f'<div class="score-item">'
                            f'<div class="score-label">{k.replace("_"," ").title()}</div>'
                            f'<div class="score-value">{v}/10</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
                st.markdown('</div>', unsafe_allow_html=True)

            reason = analysis.get('reason', '')
            if reason:
                st.markdown(
                    f'<div class="analysis-section">'
                    f'<div class="analysis-title">Why</div>'
                    f'<div class="analysis-content">{reason}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    st.markdown('</div>', unsafe_allow_html=True)


def display_recommendations(
    recommendations: List[Dict[str, Any]],
    ranked_products: List[Dict[str, Any]],
) -> None:
    st.markdown(
        '<div class="recommendations-header" style="font-size:2.5rem;font-weight:bold;">🌟 Top Recommendations</div>',
        unsafe_allow_html=True,
    )

    for product in recommendations:
        st.markdown('<div class="top-recommendation">', unsafe_allow_html=True)
        st.markdown(
            f'<div class="recommendation-title" style="font-size:1.8rem;margin-bottom:1rem;'
            f'text-align:center;">{product["title"]}</div>',
            unsafe_allow_html=True,
        )
        col1, col2 = st.columns([1, 2])
        with col1:
            _render_left_col(product, img_width=200)
        with col2:
            st.markdown(
                '<div style="display:flex;align-items:center;height:100%;min-height:200px;">',
                unsafe_allow_html=True,
            )
            reason = product.get('recommendation_reason', '')
            if reason:
                st.markdown(
                    f'<div class="recommendation-reason" style="font-size:1.1rem;line-height:1.6;'
                    f'color:white;padding:1rem;background:rgba(255,255,255,0.1);'
                    f'border-radius:8px;width:100%;">{reason}</div>',
                    unsafe_allow_html=True,
                )
            st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

    # All products — collapsible
    st.markdown("---")
    st.markdown(
        '<div class="recommendations-header" style="font-size:2.5rem;font-weight:bold;">📋 All Products</div>',
        unsafe_allow_html=True,
    )
    for product in ranked_products:
        score = product.get('analysis', {}).get('scores', {}).get('overall_score', '?')
        price = _fmt_price(product.get('price', 'N/A'))
        with st.expander(f"{product['title']}  ·  {price}  ·  Score: {score}/10"):
            display_product_card(product)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    col1, col2 = st.columns(2)
    with col1:
        query = st.text_input("🔍 What are you looking for?",
                              placeholder="e.g., Running Shoes, Coffee Machine, Laptop...")
        max_price = st.number_input("💰 Maximum Price ($)", min_value=0, value=0, step=100)
    with col2:
        additional_requirements = st.text_area(
            "📌 Additional Requirements",
            placeholder="e.g., waterproof, size L, 16GB RAM, organic...",
            help="Specify features or specifications you want.",
            height=121,
        )

    # Narrow the search button
    _, btn_col, _ = st.columns([2, 1, 2])
    with btn_col:
        search_clicked = st.button("Search", use_container_width=True)

    if search_clicked:
        if not query:
            st.warning("Please enter a search query.")
        else:
            graph = ShoppingGraph()
            results = None
            session_id = str(uuid.uuid4())
            t_start = time.time()

            with st.status("Running search pipeline...", expanded=True) as status:
                try:
                    status.update(label="Step 1/4: Processing your query...")
                    state = asyncio.run(
                        graph._process_query_node(
                            _initial_state(query, max_price, additional_requirements)
                        )
                    )

                    status.update(label="Step 2/4: Searching for products...")
                    state = asyncio.run(graph._search_products_node(state))

                    status.update(label="Step 3/4: Fetching & extracting specifications (may take a minute)...")
                    state = asyncio.run(graph._extract_specifications_node(state))

                    status.update(label="Step 4/4: Ranking products...")
                    state = asyncio.run(graph._rank_products_node(state))

                    _log_search(session_id, t_start, state)
                    save_to_csv(state)

                    results = {
                        "processed_query": state.get("processed_query", {}),
                        "products": state.get("products", []),
                        "detailed_products": state.get("detailed_products", []),
                        "ranked_products": state.get("ranked_products", []),
                        "recommendations": state.get("recommendations", []),
                        "status": state.get("status", {}),
                    }
                    status.update(label="✅ Done!", state="complete", expanded=False)

                except Exception as e:
                    status.update(label=f"❌ Error: {e}", state="error", expanded=True)
                    st.error(f"Something went wrong: {e}")

            if results:
                # Show any per-step failures
                for step, msg in results.get("status", {}).items():
                    if "Failed" in str(msg):
                        st.error(f"**{step}**: {msg}")

                st.session_state.results = results

    # Always render results if present (survives reruns)
    if st.session_state.results:
        res = st.session_state.results
        if res.get('recommendations'):
            display_recommendations(
                recommendations=res['recommendations'],
                ranked_products=res['ranked_products'],
            )
        else:
            st.warning("No recommendations found. Try adjusting your search criteria.")


def _initial_state(query, max_price, additional_requirements):
    from backend import ProductState
    return ProductState(
        query=query,
        max_price=max_price,
        additional_requirements=additional_requirements,
        products=[],
        processed_query={},
        detailed_products=[],
        ranked_products=[],
        recommendations=[],
        status={},
        durations_ms={},
    )


if __name__ == "__main__":
    main()
