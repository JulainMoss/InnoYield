from __future__ import annotations

import json
import logging
import re
import threading
from dataclasses import dataclass

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from . import config

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LLMRuntime:
    model_name: str
    device: str


_lock = threading.Lock()
_tokenizer = None
_model = None
_runtime: LLMRuntime | None = None


def _detect_device() -> str:
    if config.DEVICE:
        return config.DEVICE
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def get_runtime() -> LLMRuntime:
    global _tokenizer, _model, _runtime

    with _lock:
        if _runtime is not None:
            return _runtime

        device = _detect_device()
        model_name = config.MODEL_NAME

        logger.info("Loading tokenizer: %s", model_name)
        _tokenizer = AutoTokenizer.from_pretrained(model_name)

        # bfloat16 works best on CUDA; MPS/CPU are safer with float32.
        torch_dtype = torch.bfloat16 if device == "cuda" else torch.float32

        logger.info("Loading model: %s (dtype=%s)", model_name, torch_dtype)
        _model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch_dtype)
        _model.to(device)
        _model.eval()

        _runtime = LLMRuntime(model_name=model_name, device=device)
        return _runtime


def generate_chat(messages: list[dict], *, max_new_tokens: int) -> str:
    runtime = get_runtime()
    assert _tokenizer is not None and _model is not None

    input_tensors = _tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    )
    input_tensors = input_tensors.to(runtime.device)

    # Guardrail: don't allow single hat to explode token count.
    max_new_tokens = int(max_new_tokens)
    max_new_tokens = max(16, min(max_new_tokens, config.MAX_NEW_TOKENS))

    with torch.inference_mode():
        output_ids = _model.generate(
            **input_tensors,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=config.TEMPERATURE,
            top_p=config.TOP_P,
            repetition_penalty=config.REPETITION_PENALTY,
        )

    prompt_len = input_tensors["input_ids"].shape[-1]
    completion_ids = output_ids[0][prompt_len:]
    text = _tokenizer.decode(completion_ids, skip_special_tokens=True)
    return text.strip()


_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


def extract_json(text: str) -> dict | None:
    match = _JSON_RE.search(text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None
