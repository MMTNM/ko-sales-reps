export default function DbError({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  const isConn = msg.includes("ECONNREFUSED") || msg.includes("connect");

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-800 space-y-2">
      <p className="font-semibold text-base">
        {isConn ? "⚠️ Cannot connect to PostgreSQL" : "⚠️ Database error"}
      </p>
      {isConn ? (
        <ol className="list-decimal list-inside space-y-1 text-red-700">
          <li>
            Download and open{" "}
            <a href="https://postgresapp.com" target="_blank" rel="noreferrer" className="underline font-medium">
              Postgres.app
            </a>
          </li>
          <li>Click <strong>Initialize</strong> in the app window</li>
          <li>
            Open the psql terminal inside Postgres.app and run:{" "}
            <code className="bg-red-100 px-1 rounded">CREATE DATABASE ko_roofing_sales;</code>
          </li>
          <li>Restart the dev server — the table will be created automatically</li>
        </ol>
      ) : (
        <pre className="text-xs bg-red-100 rounded p-3 overflow-x-auto">{msg}</pre>
      )}
    </div>
  );
}
