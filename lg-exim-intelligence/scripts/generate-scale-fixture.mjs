import { createWriteStream } from "node:fs";
import { once } from "node:events";

const file = process.argv[2];
if (!file)
  throw new Error(
    "Pass an output CSV path for the synthetic load-test fixture.",
  );
const stream = createWriteStream(file, { flags: "wx" });
stream.write(
  "Shipment_ID,Shipment_Type,ETD,Shipment_Value,Freight_Cost,Weight_KG\n",
);
for (let batch = 0; batch < 1000; batch++) {
  const rows = [];
  for (let i = 0; i < 5000; i++)
    rows.push(`LOADTEST-${batch * 5000 + i + 1},Import,2026-01-01,100,10,10\n`);
  if (!stream.write(rows.join(""))) await once(stream, "drain");
}
stream.end();
await once(stream, "finish");
console.log(`5,000,000 synthetic test rows written to ${file}`);
