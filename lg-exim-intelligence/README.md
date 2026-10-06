# LG EXIM Analytics

Operational React / Vite analysis dashboard with ten workspaces: Executive, Import, Export, Customs, Freight, CHA / Forwarder, Delay & RCA, Supplier, Control Tower, and Data Explorer.

## Run

```sh
npm install
npm run dev
npm run build
npm test
npm run test:scale
```

## Data

The initial source is the existing 50,000-row synthetic fixture, not actual LG operational records. Load a CSV to replace it. Successful imports persist in IndexedDB across reloads. Failed imports preserve the preceding dataset.

CSV imports support up to 5,000,000 records, parsed in 1 MB chunks on a Web Worker and stored in IndexedDB batches. Only aggregates and a 50-row record page reach the React UI. Aggregation and filtering scan the selected source without keeping millions of row objects in the UI. Available browser disk quota and source width constrain practical import capacity; five million wide records can require several GB. This is a local analytical tool, not a multi-user warehouse or live source connection.

Required columns: `Shipment_ID`, `Shipment_Type` (`Import` / `Export`), and `ETD` (`YYYY-MM-DD`). One row represents one shipment record; duplicate IDs are not deduplicated. All dates use `YYYY-MM-DD`, and financial values must be numeric INR amounts. CSV schema is available in Data Explorer. Missing or invalid numeric values are excluded from calculations, not converted into zero.

Dispatch performance requires `Actual_Dispatch_Date` and `ETD`. Supplier OTD requires `Factory_Delivery_Date` and `Planned_Delivery_Date`. Contractual SLA requires `SLA_Days`, `Clearance_Date`, and `Clearance_TAT`. These are unavailable in the original fixture and are never fabricated. Measurement definitions, cohort eligibility and source classification are available in the source panel.

Customs and supplier views use imports; export views use exports. Shared filters intersect each view's population. All time trends use ETD cohorts. Pending BOE aging uses the source as-of date and uncleared import records. Control Tower charts and rows use exactly the same exception population. Exceptions are positive delay days, Attention / Critical risk, or Delayed / Customs Pending / Documentation Pending source statuses.

CSV export uses the filtered population and selected visible columns. Chrome / Edge can stream exports directly to disk with backpressure. Other browsers support in-memory downloads up to 100,000 rows. Values that could be spreadsheet formulas are escaped. IndexedDB data stays local; no uploaded shipment data is sent to a server.

## Verification

`npm test` checks reconciliation, weighted denominators, missing values, pending aging, Pareto, date cohorts and filter intersections. `npm run test:scale` repeats the fixture only for an isolated 5-million-record aggregation benchmark; benchmark results are not dashboard observations.

To generate a separate synthetic CSV for browser ingestion testing:

```sh
node scripts/generate-scale-fixture.mjs /tmp/lg-exim-scale-test.csv
```

The generated file contains unique test IDs and 5 million rows. It is test data, not an operational source.
