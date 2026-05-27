import "dotenv/config";
import { Pool } from "pg";
import { pollLatestLedger } from "./ingester.js";
import {
  normalizeLedger,
  normalizeTransactions,
  normalizeOperations,
  normalizePayments,
} from "./transformer.js";
import { writeIngestedData } from "./loader.js";
import { broadcastRealtimeUpdate } from "./websocket.js";
import { validateConfig } from "./config.js";
import { indexerLogger } from "./logger.js";
import http from "http";

// ---------------------------------------------------------------------------
// Validate configuration on startup – fails fast with clear error messages
// ---------------------------------------------------------------------------
const config = validateConfig();

const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl })
  : null;

if (!pool) {
  indexerLogger.warn(
    "DATABASE_URL not set – running without database persistence"
  );
}

// ---------------------------------------------------------------------------
// Main polling cycle
// ---------------------------------------------------------------------------

async function runCycle(): Promise<void> {
  try {
    indexerLogger.debug({ network: config.network }, "Polling Horizon");
    const ingested = await pollLatestLedger(config.network);

    const normalizedData = {
      ledger: normalizeLedger(ingested),
      transactions: normalizeTransactions(ingested),
      operations: normalizeOperations(ingested),
      payments: normalizePayments(ingested),
    };

    await writeIngestedData(pool, normalizedData);

    broadcastRealtimeUpdate({
      network: config.network,
      ledger: normalizedData.ledger.sequence,
      txCount: normalizedData.transactions.length,
      at: new Date().toISOString(),
    });

    indexerLogger.info(
      {
        network: config.network,
        sequence: normalizedData.ledger.sequence,
        txCount: normalizedData.transactions.length,
      },
      "Ledger processed"
    );
  } catch (error: any) {
    indexerLogger.error(
      { error: error?.message ?? String(error) },
      "Cycle error"
    );
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  indexerLogger.info(
    { network: config.network, pollIntervalMs: config.pollIntervalMs },
    "Indexer starting"
  );

  // Health check server
  http
    .createServer((req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            network: config.network,
            time: new Date().toISOString(),
          })
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    })
    .listen(config.healthPort, () => {
      indexerLogger.info(
        { port: config.healthPort },
        "Health check server listening"
      );
    });

  // Initial run
  await runCycle();

  // Polling loop
  setInterval(() => {
    runCycle().catch((err) =>
      indexerLogger.error({ error: err?.message }, "Unhandled cycle error")
    );
  }, config.pollIntervalMs);
}

main().catch((error: any) => {
  indexerLogger.fatal({ error: error?.message ?? String(error) }, "Fatal error");
  process.exit(1);
});
