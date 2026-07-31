"""LLM Council - a Streamlit app.

Ask a question and let a council of LLMs deliberate: each model answers
independently, then ranks its peers' anonymized answers, and finally a
Chairman model synthesizes the council's collective wisdom into one answer.

Inspired by https://github.com/karpathy/llm-council
"""

import streamlit as st

from config import CHAIRMAN_MODEL, COUNCIL_MODELS
from council import (
    CouncilError,
    calculate_aggregate_rankings,
    generate_conversation_title,
    get_api_key,
    stage1_collect_responses,
    stage2_collect_rankings,
    stage3_synthesize_final,
)

st.set_page_config(page_title="LLM Council", page_icon="🏛️", layout="centered")


def short_name(model: str) -> str:
    """Human-friendly model name (strip the provider prefix)."""
    return model.split("/", 1)[-1]


def render_deliberation(message: dict) -> None:
    """Render the council's Stage 1 / Stage 2 work for an assistant message."""
    stage1 = message["stage1"]
    stage2 = message["stage2"]
    metadata = message.get("metadata", {})
    aggregate = metadata.get("aggregate_rankings", [])
    label_to_model = metadata.get("label_to_model", {})
    model_to_label = {v: k for k, v in label_to_model.items()}

    with st.expander("🗳️ Council deliberation", expanded=False):
        tab_responses, tab_rankings = st.tabs(
            ["Stage 1 · Individual responses", "Stage 2 · Peer rankings"]
        )

        with tab_responses:
            if stage1:
                sub_tabs = st.tabs([short_name(r["model"]) for r in stage1])
                for sub_tab, result in zip(sub_tabs, stage1):
                    with sub_tab:
                        label = model_to_label.get(result["model"])
                        if label:
                            st.caption(f"Anonymized as **{label}** during ranking")
                        st.markdown(result["response"])
            else:
                st.info("No individual responses were collected.")

        with tab_rankings:
            if aggregate:
                st.markdown("**Aggregate leaderboard** (lower average rank is better)")
                st.dataframe(
                    [
                        {
                            "Rank": i + 1,
                            "Model": short_name(row["model"]),
                            "Avg. rank": row["average_rank"],
                            "Votes": row["rankings_count"],
                        }
                        for i, row in enumerate(aggregate)
                    ],
                    hide_index=True,
                    use_container_width=True,
                )
            st.divider()
            for result in stage2:
                with st.expander(f"{short_name(result['model'])}'s evaluation"):
                    st.markdown(result["ranking"])


def render_assistant_message(message: dict) -> None:
    """Render a full assistant turn: final answer + collapsible deliberation."""
    stage3 = message["stage3"]
    st.markdown(stage3["response"])
    st.caption(f"Final synthesis by the Chairman · {short_name(stage3['model'])}")
    render_deliberation(message)


# --------------------------------------------------------------------------- #
# Sidebar
# --------------------------------------------------------------------------- #
with st.sidebar:
    st.header("🏛️ LLM Council")
    st.write(
        "A council of models answers your question, ranks each other's "
        "anonymized answers, and a Chairman synthesizes the final reply."
    )

    st.subheader("Council members")
    for model in COUNCIL_MODELS:
        st.markdown(f"- `{short_name(model)}`")
    st.markdown(f"**Chairman:** `{short_name(CHAIRMAN_MODEL)}`")

    st.divider()
    if get_api_key():
        st.success("OpenRouter API key detected.")
    else:
        st.error(
            "No OpenRouter API key found. Set `OPENROUTER_API_KEY` as an "
            "environment variable or in `.streamlit/secrets.toml`."
        )

    st.divider()
    if st.button("🧹 New conversation", use_container_width=True):
        st.session_state.messages = []
        st.session_state.title = None
        st.rerun()


# --------------------------------------------------------------------------- #
# Conversation state + replay
# --------------------------------------------------------------------------- #
if "messages" not in st.session_state:
    st.session_state.messages = []
if "title" not in st.session_state:
    st.session_state.title = None

st.title(st.session_state.title or "🏛️ LLM Council")

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        if message["role"] == "user":
            st.markdown(message["content"])
        else:
            render_assistant_message(message)


# --------------------------------------------------------------------------- #
# Handle a new question
# --------------------------------------------------------------------------- #
prompt = st.chat_input("Ask the council a question…")

if prompt:
    if not get_api_key():
        st.error(
            "Please configure your OpenRouter API key before asking a question."
        )
        st.stop()

    is_first_message = len(st.session_state.messages) == 0
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        try:
            with st.status("Convening the council…", expanded=True) as status:
                if is_first_message:
                    status.update(label="Naming the conversation…")
                    st.session_state.title = generate_conversation_title(prompt)

                status.update(label="Stage 1 · Collecting individual responses…")
                stage1_results = stage1_collect_responses(prompt)
                if not stage1_results:
                    status.update(label="All models failed", state="error")
                    st.error("All models failed to respond. Please try again.")
                    st.session_state.messages.pop()
                    st.stop()
                st.write(f"✅ {len(stage1_results)} council members responded.")

                status.update(label="Stage 2 · Collecting peer rankings…")
                stage2_results, label_to_model = stage2_collect_rankings(
                    prompt, stage1_results
                )
                aggregate = calculate_aggregate_rankings(
                    stage2_results, label_to_model
                )
                st.write("✅ Peer rankings tallied.")

                status.update(label="Stage 3 · Chairman synthesizing final answer…")
                stage3_result = stage3_synthesize_final(
                    prompt, stage1_results, stage2_results
                )
                st.write("✅ Final answer ready.")

                status.update(
                    label="Council complete", state="complete", expanded=False
                )

            assistant_message = {
                "role": "assistant",
                "stage1": stage1_results,
                "stage2": stage2_results,
                "stage3": stage3_result,
                "metadata": {
                    "label_to_model": label_to_model,
                    "aggregate_rankings": aggregate,
                },
            }
            st.session_state.messages.append(assistant_message)
            render_assistant_message(assistant_message)

            if is_first_message:
                st.rerun()

        except CouncilError as exc:
            st.error(str(exc))
            st.session_state.messages.pop()
