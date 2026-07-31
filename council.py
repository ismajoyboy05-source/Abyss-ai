"""3-stage LLM Council orchestration.

The council works in three stages, following the design from
https://github.com/karpathy/llm-council :

    Stage 1 - Each council model answers the question independently.
    Stage 2 - Each model ranks the (anonymized) peer responses.
    Stage 3 - A designated Chairman model synthesizes a final answer.

All model calls go through the OpenRouter chat-completions API. Requests that
would otherwise run sequentially are fanned out across a thread pool so the
council responds roughly as fast as its slowest member.
"""

from __future__ import annotations

import re
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

import requests

from config import (
    CHAIRMAN_MODEL,
    COUNCIL_MODELS,
    OPENROUTER_API_URL,
    REQUEST_TIMEOUT,
    TITLE_MODEL,
    get_api_key,
)


class CouncilError(Exception):
    """Raised when the council cannot complete a request (e.g. missing key)."""


# --------------------------------------------------------------------------- #
# OpenRouter client
# --------------------------------------------------------------------------- #
def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = REQUEST_TIMEOUT,
) -> Optional[Dict[str, Any]]:
    """Query a single model via OpenRouter.

    Returns a dict with a ``content`` key, or ``None`` if the request failed.
    """
    api_key = get_api_key()
    if not api_key:
        raise CouncilError(
            "No OpenRouter API key found. Set the OPENROUTER_API_KEY environment "
            "variable or add it to .streamlit/secrets.toml."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # Optional attribution headers recommended by OpenRouter.
        "HTTP-Referer": "https://github.com/karpathy/llm-council",
        "X-Title": "LLM Council",
    }
    payload = {"model": model, "messages": messages}

    try:
        response = requests.post(
            OPENROUTER_API_URL, headers=headers, json=payload, timeout=timeout
        )
        response.raise_for_status()
        data = response.json()
        message = data["choices"][0]["message"]
        return {"content": message.get("content", "")}
    except Exception as exc:  # noqa: BLE001 - surface any failure as a skipped model
        print(f"Error querying model {model}: {exc}")
        return None


def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    """Query multiple models in parallel, preserving the input order."""
    with ThreadPoolExecutor(max_workers=max(1, len(models))) as executor:
        results = list(executor.map(lambda m: query_model(m, messages), models))
    return dict(zip(models, results))


# --------------------------------------------------------------------------- #
# Stage 1 - individual responses
# --------------------------------------------------------------------------- #
def stage1_collect_responses(user_query: str) -> List[Dict[str, Any]]:
    """Collect an independent response from each council model."""
    messages = [{"role": "user", "content": user_query}]
    responses = query_models_parallel(COUNCIL_MODELS, messages)

    stage1_results = []
    for model, response in responses.items():
        if response is not None:
            stage1_results.append(
                {"model": model, "response": response.get("content", "")}
            )
    return stage1_results


# --------------------------------------------------------------------------- #
# Stage 2 - anonymized peer ranking
# --------------------------------------------------------------------------- #
def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """Have each model rank the anonymized peer responses.

    Returns the per-model rankings and a mapping from anonymous label
    (``"Response A"``) back to the real model name.
    """
    labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...
    label_to_model = {
        f"Response {label}": result["model"]
        for label, result in zip(labels, stage1_results)
    }

    responses_text = "\n\n".join(
        f"Response {label}:\n{result['response']}"
        for label, result in zip(labels, stage1_results)
    )

    ranking_prompt = f"""You are evaluating different responses to the following question:

Question: {user_query}

Here are the responses from different models (anonymized):

{responses_text}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:"""

    messages = [{"role": "user", "content": ranking_prompt}]
    responses = query_models_parallel(COUNCIL_MODELS, messages)

    stage2_results = []
    for model, response in responses.items():
        if response is not None:
            full_text = response.get("content", "")
            stage2_results.append(
                {
                    "model": model,
                    "ranking": full_text,
                    "parsed_ranking": parse_ranking_from_text(full_text),
                }
            )
    return stage2_results, label_to_model


# --------------------------------------------------------------------------- #
# Stage 3 - chairman synthesis
# --------------------------------------------------------------------------- #
def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Have the Chairman model synthesize the final answer."""
    stage1_text = "\n\n".join(
        f"Model: {result['model']}\nResponse: {result['response']}"
        for result in stage1_results
    )
    stage2_text = "\n\n".join(
        f"Model: {result['model']}\nRanking: {result['ranking']}"
        for result in stage2_results
    )

    chairman_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {user_query}

STAGE 1 - Individual Responses:
{stage1_text}

STAGE 2 - Peer Rankings:
{stage2_text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    messages = [{"role": "user", "content": chairman_prompt}]
    response = query_model(CHAIRMAN_MODEL, messages)

    if response is None:
        return {
            "model": CHAIRMAN_MODEL,
            "response": "Error: Unable to generate final synthesis.",
        }
    return {"model": CHAIRMAN_MODEL, "response": response.get("content", "")}


# --------------------------------------------------------------------------- #
# Ranking helpers
# --------------------------------------------------------------------------- #
def parse_ranking_from_text(ranking_text: str) -> List[str]:
    """Extract the ordered ``Response X`` labels from a FINAL RANKING section."""
    if "FINAL RANKING:" in ranking_text:
        ranking_section = ranking_text.split("FINAL RANKING:")[1]
        numbered_matches = re.findall(r"\d+\.\s*Response [A-Z]", ranking_section)
        if numbered_matches:
            return [re.search(r"Response [A-Z]", m).group() for m in numbered_matches]
        return re.findall(r"Response [A-Z]", ranking_section)

    return re.findall(r"Response [A-Z]", ranking_text)


def calculate_aggregate_rankings(
    stage2_results: List[Dict[str, Any]],
    label_to_model: Dict[str, str],
) -> List[Dict[str, Any]]:
    """Average each model's rank position across all peer rankings."""
    model_positions: Dict[str, List[int]] = defaultdict(list)

    for ranking in stage2_results:
        parsed_ranking = parse_ranking_from_text(ranking["ranking"])
        for position, label in enumerate(parsed_ranking, start=1):
            if label in label_to_model:
                model_positions[label_to_model[label]].append(position)

    aggregate = []
    for model, positions in model_positions.items():
        if positions:
            aggregate.append(
                {
                    "model": model,
                    "average_rank": round(sum(positions) / len(positions), 2),
                    "rankings_count": len(positions),
                }
            )

    aggregate.sort(key=lambda x: x["average_rank"])
    return aggregate


# --------------------------------------------------------------------------- #
# Title generation + full pipeline
# --------------------------------------------------------------------------- #
def generate_conversation_title(user_query: str) -> str:
    """Generate a short (3-5 word) title for a conversation."""
    title_prompt = f"""Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: {user_query}

Title:"""

    messages = [{"role": "user", "content": title_prompt}]
    response = query_model(TITLE_MODEL, messages, timeout=30.0)

    if response is None:
        return "New Conversation"

    title = response.get("content", "New Conversation").strip().strip("\"'")
    if len(title) > 50:
        title = title[:47] + "..."
    return title


def run_full_council(user_query: str) -> Dict[str, Any]:
    """Run the complete 3-stage council process.

    Returns a dict with ``stage1``, ``stage2``, ``stage3`` and ``metadata``
    keys. ``metadata`` contains ``label_to_model`` and ``aggregate_rankings``.
    """
    stage1_results = stage1_collect_responses(user_query)
    if not stage1_results:
        return {
            "stage1": [],
            "stage2": [],
            "stage3": {
                "model": "error",
                "response": "All models failed to respond. Please try again.",
            },
            "metadata": {"label_to_model": {}, "aggregate_rankings": []},
        }

    stage2_results, label_to_model = stage2_collect_rankings(user_query, stage1_results)
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
    stage3_result = stage3_synthesize_final(user_query, stage1_results, stage2_results)

    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": {
            "label_to_model": label_to_model,
            "aggregate_rankings": aggregate_rankings,
        },
    }
