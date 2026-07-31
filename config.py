"""Configuration for the LLM Council Streamlit app."""

import os

try:
    import streamlit as st
except ModuleNotFoundError:  # allow importing config without streamlit installed
    st = None


# Council members - list of OpenRouter model identifiers.
# Each of these answers the question independently and then ranks its peers.
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "anthropic/claude-sonnet-4.5",
    "x-ai/grok-4",
]

# Chairman model - synthesizes the final response from the council's work.
CHAIRMAN_MODEL = "google/gemini-3-pro-preview"

# Fast/cheap model used to generate short conversation titles.
TITLE_MODEL = "google/gemini-2.5-flash"

# OpenRouter API endpoint.
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Request timeout (seconds) for a single model call.
REQUEST_TIMEOUT = 120.0


def get_api_key() -> str | None:
    """Resolve the OpenRouter API key from Streamlit secrets or the environment.

    Precedence: environment variable ``OPENROUTER_API_KEY`` first, then
    ``st.secrets``. Returns ``None`` when no key is configured.
    """
    env_key = os.getenv("OPENROUTER_API_KEY")
    if env_key:
        return env_key

    if st is not None:
        try:
            return st.secrets["OPENROUTER_API_KEY"]
        except (KeyError, FileNotFoundError):
            return None

    return None
