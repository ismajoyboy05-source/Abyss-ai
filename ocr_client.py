"""Client for the hosted Unlimited-OCR model.

This module talks to the official Gradio Space
(https://huggingface.co/spaces/baidu/Unlimited-OCR) via ``gradio_client`` so we
get access to Baidu's ``Unlimited-OCR`` vision-language model without loading its
weights locally (the model needs a CUDA GPU; Streamlit Community Cloud has none).

The Space exposes a Gradio 6 ``Server`` with a streaming ``/run_ocr`` endpoint
that runs on ZeroGPU, so a Hugging Face token is recommended (and required for
anything beyond the small anonymous ZeroGPU allowance).

PDFs are rasterized to page images *client-side* with PyMuPDF and each page is
sent to the single-image endpoint, which keeps every GPU call short.
"""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass
from typing import Callable, Iterator, List, Optional

# Default hosted endpoint. Point this at a fork if the official Space is busy.
DEFAULT_SPACE_ID = "baidu/Unlimited-OCR"
DEFAULT_API_NAME = "/run_ocr"

# Model modes exposed by the Space.
MODES = {
    "gundam": "Gundam · fast (640px crop)",
    "base": "Base · accurate (1024px)",
}
DEFAULT_MODE = "gundam"
DEFAULT_PROMPT = "document parsing."


class OCRError(Exception):
    """Raised when an OCR request cannot be completed."""


@dataclass
class OCRConfig:
    space_id: str = DEFAULT_SPACE_ID
    api_name: str = DEFAULT_API_NAME
    hf_token: Optional[str] = None


def get_hf_token() -> Optional[str]:
    """Resolve a Hugging Face token from the environment or Streamlit secrets."""
    for var in ("HF_TOKEN", "HUGGINGFACE_TOKEN", "HUGGING_FACE_HUB_TOKEN"):
        if os.getenv(var):
            return os.getenv(var)
    try:
        import streamlit as st

        for key in ("HF_TOKEN", "HUGGINGFACE_TOKEN"):
            try:
                return st.secrets[key]
            except (KeyError, FileNotFoundError):
                continue
    except ModuleNotFoundError:
        pass
    return None


def build_client(config: OCRConfig):
    """Create a ``gradio_client.Client`` for the configured Space."""
    try:
        from gradio_client import Client
    except ModuleNotFoundError as exc:  # pragma: no cover - dependency guard
        raise OCRError(
            "gradio_client is not installed. Add it to requirements.txt."
        ) from exc

    try:
        return Client(config.space_id, hf_token=config.hf_token or None)
    except Exception as exc:  # noqa: BLE001 - surface connection issues clearly
        raise OCRError(
            f"Could not connect to Space '{config.space_id}': {exc}"
        ) from exc


def _extract_text(update: object) -> str:
    """Normalize a streamed ``/run_ocr`` value into plain text.

    The endpoint yields ``{"text": str, "done": bool}`` dicts, but forks may
    return a bare string; handle both defensively.
    """
    if isinstance(update, dict):
        return str(update.get("text", ""))
    if isinstance(update, (list, tuple)) and update:
        return _extract_text(update[0])
    return str(update)


def ocr_image_stream(
    client,
    image_path: str,
    mode: str = DEFAULT_MODE,
    prompt: str = DEFAULT_PROMPT,
    api_name: str = DEFAULT_API_NAME,
) -> Iterator[str]:
    """Yield the accumulated OCR text for a single image as it streams in."""
    from gradio_client import handle_file

    try:
        job = client.submit(
            handle_file(image_path), mode, prompt, api_name=api_name
        )
    except Exception as exc:  # noqa: BLE001
        raise OCRError(f"OCR request failed to start: {exc}") from exc

    last = ""
    try:
        for update in job:
            text = _extract_text(update)
            if text:
                last = text
                yield last
    except Exception as exc:  # noqa: BLE001
        # Fall back to a blocking result if streaming iteration failed.
        try:
            result = job.result()
            text = _extract_text(result)
            if text:
                yield text
                return
        except Exception:
            pass
        raise OCRError(f"OCR request failed: {exc}") from exc

    if not last:
        # Some endpoints only return the final value via .result().
        try:
            text = _extract_text(job.result())
            if text:
                yield text
        except Exception:
            pass


def ocr_image(
    client,
    image_path: str,
    mode: str = DEFAULT_MODE,
    prompt: str = DEFAULT_PROMPT,
    api_name: str = DEFAULT_API_NAME,
) -> str:
    """Return the final OCR text for a single image."""
    result = ""
    for partial in ocr_image_stream(client, image_path, mode, prompt, api_name):
        result = partial
    return result


def pdf_to_images(pdf_path: str, dpi: int = 200) -> List[str]:
    """Rasterize every page of a PDF to a PNG (CPU only). Returns file paths."""
    try:
        import fitz  # PyMuPDF
    except ModuleNotFoundError as exc:  # pragma: no cover - dependency guard
        raise OCRError(
            "PyMuPDF (pymupdf) is required to process PDFs."
        ) from exc

    doc = fitz.open(pdf_path)
    tmp_dir = tempfile.mkdtemp(prefix="pdf_ocr_")
    matrix = fitz.Matrix(dpi / 72, dpi / 72)
    paths: List[str] = []
    try:
        for i, page in enumerate(doc):
            out = os.path.join(tmp_dir, f"page_{i + 1:04d}.png")
            page.get_pixmap(matrix=matrix).save(out)
            paths.append(out)
    finally:
        doc.close()
    return paths


def ocr_pages(
    client,
    image_paths: List[str],
    mode: str = DEFAULT_MODE,
    prompt: str = DEFAULT_PROMPT,
    api_name: str = DEFAULT_API_NAME,
    on_page_start: Optional[Callable[[int, int], None]] = None,
) -> Iterator[tuple[int, str]]:
    """OCR a list of page images in order.

    Yields ``(page_index, page_text)`` tuples as each page completes. The
    optional ``on_page_start`` callback receives ``(page_number, total)`` before
    each page begins.
    """
    total = len(image_paths)
    for idx, path in enumerate(image_paths):
        if on_page_start is not None:
            on_page_start(idx + 1, total)
        yield idx, ocr_image(client, path, mode, prompt, api_name)
