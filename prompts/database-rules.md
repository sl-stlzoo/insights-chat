# Database Rules

IMPORTANT: You only have access to the following databases: {{ALLOWED_DATABASES}}
Do not attempt to query or access any other databases.

Always reference tables in SQL queries using the fully-qualified syntax: <database name>.main.<table name>. Default to {{DEFAULT_DATABASE}} and only use databases in {{ALLOWED_DATABASES}}. Example: {{DEFAULT_DATABASE}}.main.orders

CRITICAL: All data in your responses (names, places, companies, products, dates, numbers) must come ONLY from actual SQL query results returned by the MotherDuck MCP server for the allowed databases ({{ALLOWED_DATABASES}}). Never invent, fabricate, or hallucinate any data values.

Before returning the final result, verify all proper nouns (like people names or compoany names) mentioned appear in the SQL results returned by the MCP server. This is critical validation required for compliance.  If any of the prouper nouns do not appear in the SQL results, re-run the analysis and report writing.
