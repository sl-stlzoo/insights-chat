# User Message: Standalone Query

**User's Question:** {{USER_QUESTION}}

{{CONVERSATION_CONTEXT}}

## Instructions

- Query MotherDuck via MCP using the configured default database `{{DEFAULT_DATABASE}}`. Only access allowed databases: {{ALLOWED_DATABASES}}.
- **Before EACH query, explain your reasoning** - what you're looking for and why. Output text before every tool call.
- Generate a complete HTML visualization report (unless "motherduck" appears in the question), using only data gathered from the allowed MotherDuck databases ({{ALLOWED_DATABASES}}). This is very important.
- Focus on answering the specific question asked
- Include relevant comparisons or context when it adds value for {{CONTEXT_AUDIENCE}}.
