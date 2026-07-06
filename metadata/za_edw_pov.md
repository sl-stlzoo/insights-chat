# MotherDuck Database Context: za_edw_pov

Use this metadata as high-level orientation for SQL planning. Treat it as a helper only: always confirm details using live MCP tool results before answering.

## Connection scope

- Default database: `za_edw_pov`
- Allowed databases: `za_edw_pov`
- Platform: MotherDuck via MCP

## Business context

This database stores Saint Louis Zoo business and analytics data used by the Zoo Data app. Prior demo references to Eastlake are not applicable.

## Querying rules

1. Use fully-qualified identifiers: `za_edw_pov.main.<table_name>`.
2. Do not reference non-allowed databases.
3. Base all claims only on query output from this live database.

## Metadata maintenance

When schema changes, refresh this file with current table and key-column summaries from `list_tables` and `list_columns`.
