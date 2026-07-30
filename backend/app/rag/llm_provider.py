"""
LLM provider abstraction for answer generation.

Default: Ollama (local, free, runs on the user's machine — requires
`ollama pull llama3.1` and the Ollama service running).
Optional: OpenAI, if LLM_PROVIDER=openai and OPENAI_API_KEY is set.
"""

from app.core.config import settings
from app.core.logging import logger


class LLMProvider:
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError


class OllamaLLM(LLMProvider):
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url
        self.model = model

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        import httpx

        try:
            response = httpx.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            return response.json()["message"]["content"].strip()
        except httpx.ConnectError as exc:
            raise RuntimeError(
                "Could not reach Ollama. Is it installed and running? "
                "Start it with `ollama serve`, and make sure the model is pulled "
                f"with `ollama pull {self.model}`."
            ) from exc


class OpenAILLM(LLMProvider):
    def __init__(self, api_key: str, model: str):
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self.model = model

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )
        return response.choices[0].message.content.strip()


def get_llm_provider() -> LLMProvider:
    """
    Not cached (unlike embeddings) — cheap to construct, and this keeps
    provider selection responsive to .env changes without a restart-only
    lru_cache footgun during development.
    """
    if settings.LLM_PROVIDER == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("LLM_PROVIDER=openai but OPENAI_API_KEY is not set in .env")
        return OpenAILLM(api_key=settings.OPENAI_API_KEY, model=settings.OPENAI_MODEL)

    logger.debug(f"Using Ollama LLM: {settings.OLLAMA_MODEL} @ {settings.OLLAMA_BASE_URL}")
    return OllamaLLM(base_url=settings.OLLAMA_BASE_URL, model=settings.OLLAMA_MODEL)
