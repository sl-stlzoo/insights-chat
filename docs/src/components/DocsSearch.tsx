import { create, insertMultiple, search as searchIndex } from '@orama/orama';
import { useEffect, useState } from 'react';
import searchDocuments from '../generated/search-index.json';

type SearchDocument = {
  id: string;
  title: string;
  description: string;
  slug: string;
  body: string;
};

type SearchResult = SearchDocument & {
  score?: number;
};

export default function DocsSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [ready, setReady] = useState(false);
  const [database, setDatabase] = useState<Awaited<ReturnType<typeof create>> | null>(null);

  useEffect(() => {
    async function initialize() {
      const db = await create({
        schema: {
          title: 'string',
          description: 'string',
          slug: 'string',
          body: 'string',
        },
      });

      await insertMultiple(db, searchDocuments as SearchDocument[]);
      setDatabase(db);
      setReady(true);
    }

    initialize();
  }, []);

  useEffect(() => {
    async function runSearch() {
      if (!database || !query.trim()) {
        setResults([]);
        return;
      }

      const response = await searchIndex(database, {
        term: query,
        limit: 12,
        properties: ['title', 'description', 'body'],
      });

      setResults(response.hits.map((hit) => ({ ...(hit.document as SearchDocument), score: hit.score })));
    }

    void runSearch();
  }, [database, query]);

  return (
    <div className="orama-search-shell">
      <label className="orama-search-label" htmlFor="orama-search-input">
        Search the docs
      </label>
      <input
        id="orama-search-input"
        className="orama-search-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={ready ? 'Search architecture, ADRs, README rollups, and deployment notes' : 'Preparing search index...'}
        type="search"
        value={query}
      />

      {query.trim() ? (
        <div className="orama-search-results">
          {results.length > 0 ? (
            results.map((result) => (
              <a className="orama-search-result" href={`/docs${result.slug}`} key={result.id}>
                <div className="orama-search-result-title">{result.title}</div>
                {result.description ? (
                  <p>{result.description}</p>
                ) : (
                  <p>{result.body.slice(0, 180)}...</p>
                )}
              </a>
            ))
          ) : (
            <div className="orama-search-empty">No matching docs yet. Try a wider term.</div>
          )}
        </div>
      ) : (
        <div className="orama-search-empty">
          Try terms like <code>Container Apps</code>, <code>Entra</code>, <code>phase tracker</code>, or <code>README</code>.
        </div>
      )}
    </div>
  );
}
