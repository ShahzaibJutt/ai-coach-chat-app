async def update_user_memory(openai_client, prompt: str) -> str:
    """
    Use OpenAI to process the given prompt and extract/update the user's memory.
    Returns the updated memory as plain text.
    """
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            max_tokens=256,
            stream=False,
        )
        # Extract the content from the first message.
        updated_memory = response.choices[0].message.content.strip()
        return updated_memory
    except Exception as e:
        print(f"[ERROR] Failed to update user memory: {e}")
        raise
