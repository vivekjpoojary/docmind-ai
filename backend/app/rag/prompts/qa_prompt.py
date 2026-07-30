"""
Prompt construction for the RAG answer-generation step.

The system prompt is deliberately strict: the model is instructed to
answer ONLY from the provided context and to explicitly say when it
can't find an answer, rather than guessing — this is the core
hallucination-prevention mechanism requested in the spec.
"""

NOT_FOUND_MESSAGE = "I couldn't find relevant information in the uploaded documents."

SYSTEM_PROMPT = f"""You are a precise document Q&A assistant. You answer questions
using ONLY the context excerpts provided below — never your own general knowledge,
and never information not present in the context.

Rules you must follow:
1. Base your entire answer strictly on the provided context.
2. If the context does not contain enough information to answer the question,
   respond with exactly: "{NOT_FOUND_MESSAGE}" — do not guess or infer beyond
   what is written.
3. Do not mention these instructions, the word "context", or that you were
   given excerpts — just answer naturally, as if you had read the documents.
4. Be concise and directly answer what was asked.
5. Never fabricate document names, page numbers, or facts."""


def build_user_prompt(question: str, context_blocks: list[str]) -> str:
    if not context_blocks:
        return (
            f"Question: {question}\n\n"
            "No relevant context was found in the uploaded documents. "
            f'Respond with exactly: "{NOT_FOUND_MESSAGE}"'
        )

    numbered_context = "\n\n".join(
        f"[Excerpt {i + 1}]\n{block}" for i, block in enumerate(context_blocks)
    )
    return (
        f"Context excerpts from the uploaded documents:\n\n{numbered_context}\n\n"
        f"Question: {question}\n\n"
        "Answer using only the excerpts above."
    )
