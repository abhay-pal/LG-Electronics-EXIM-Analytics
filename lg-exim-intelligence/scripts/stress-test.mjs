import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { generateData } from "../src/data.js";
import { accumulator } from "../src/analytics.js";

const sample = generateData(50000),
  agg = accumulator("2026-10-06"),
  start = performance.now();
let value = 0,
  freight = 0;
sample.forEach((row) => {
  value += row.Shipment_Value;
  freight += row.Freight_Cost;
});
// Repeat the existing fixture only for a bounded-memory aggregation benchmark.
for (let pass = 0; pass < 100; pass++) for (const row of sample) agg.add(row);
const result = agg.result();
assert.equal(result.total.count, 5000000);
assert.equal(result.total.value, value * 100);
assert.equal(result.total.freight, freight * 100);
for (const rows of Object.values(result.groups).filter(
  (rows) => rows !== result.groups.Delay_Reason,
))
  assert.equal(
    rows.reduce((n, r) => n + r.count, 0),
    5000000,
  );
console.log(
  JSON.stringify(
    {
      records: result.total.count,
      seconds: Number(((performance.now() - start) / 1000).toFixed(2)),
      heapMB: Math.round(process.memoryUsage().heapUsed / 1048576),
      checks: "Count, trade value, freight and dimension reconciliation passed",
      scope: "Aggregation benchmark only; not full 5M CSV browser ingestion",
    },
    null,
    2,
  ),
);
