import Papa from "papaparse";
import { generateData } from "./data";
import { accumulator, matches, NUMBERS, number, date } from "./analytics";

let sample = null,
  source = {
    name: "Generated sample",
    classification: "Synthetic",
    count: 0,
    asOf: "2026-10-06",
    fields: [],
  },
  db = null,
  currentRequest = 0,
  loading = false;
const acknowledgements = new Map();
async function metadata(value) {
  const store = await new Promise((resolve, reject) => {
    const request = indexedDB.open("lg-exim-metadata", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("source");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = store.transaction("source", value ? "readwrite" : "readonly"),
        request = value
          ? tx.objectStore("source").put(value, "active")
          : tx.objectStore("source").get("active");
      let result;
      request.onsuccess = () => (result = request.result);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    store.close();
  }
}
const putBatch = (id, rows) =>
  new Promise((resolve, reject) => {
    const tx = db.transaction("batches", "readwrite");
    tx.objectStore("batches").put(rows, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
async function scan(visit, flush, stop = () => false) {
  const snapshot = sample,
    connection = db,
    batches = source.batches;
  if (snapshot) {
    for (let i = 0; i < snapshot.length; i++) {
      visit(snapshot[i]);
      if ((i + 1) % 2000 === 0) {
        await flush?.();
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (stop()) return;
      }
    }
    await flush?.();
    return;
  }
  for (let i = 0; i < batches; i++) {
    if (stop()) return;
    const rows = await new Promise((resolve, reject) => {
      const request = connection
        .transaction("batches")
        .objectStore("batches")
        .get(i);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    let pending = 0;
    for (const row of rows || []) {
      visit(row);
      if (++pending % 2000 === 0) await flush?.();
    }
    await flush?.();
    if (stop()) return;
  }
}
async function query({ id, filters, view, page = 1, pageSize = 50 }) {
  currentRequest = id;
  const agg = accumulator(source.asOf),
    rows = [],
    offset = (page - 1) * pageSize;
  let matched = 0,
    seen = 0;
  await scan(
    (row) => {
      agg.options(row);
      seen++;
      if (!matches(row, filters, view)) return;
      agg.add(row);
      if (matched >= offset && rows.length < pageSize) rows.push(row);
      matched++;
    },
    null,
    () => currentRequest !== id,
  );
  if (currentRequest === id)
    self.postMessage({
      type: "result",
      id,
      ...agg.result(),
      rows,
      matched,
      source,
      seen,
    });
}
async function ingest(file) {
  loading = true;
  // Import into a fresh staging database; the previous source survives failed imports.
  const stagingName = `lg-exim-staging-${Date.now()}`;
  const staging = await new Promise((resolve, reject) => {
    const request = indexedDB.open(stagingName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("batches");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const oldDB = db,
    oldSample = sample,
    oldSource = source;
  let count = 0,
    batches = 0,
    fields = [],
    minDate = "",
    maxDate = "",
    invalid = 0;
  db = staging;
  try {
    await new Promise((resolve, reject) =>
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        chunkSize: 1024 * 1024,
        transformHeader: (h) =>
          h
            .trim()
            .replace(/^\uFEFF/, "")
            .replace(/[\s-]+/g, "_"),
        chunk(result, parser) {
          parser.pause();
          (async () => {
            fields = result.meta.fields || fields;
            const required = ["Shipment_ID", "Shipment_Type", "ETD"];
            if (required.some((k) => !fields.includes(k)))
              throw new Error(`Required columns: ${required.join(", ")}`);
            if (result.errors.length)
              throw new Error(`CSV parse error: ${result.errors[0].message}`);
            const rows = result.data.map((row) => {
              for (const key of fields) {
                if (NUMBERS.has(key)) {
                  const raw = String(row[key] ?? "").trim();
                  row[key] = number(raw);
                  if (raw && row[key] === null) invalid++;
                } else row[key] = String(row[key] ?? "").trim();
              }
              if (
                !row.Shipment_ID ||
                !["Import", "Export"].includes(row.Shipment_Type) ||
                !date(row.ETD)
              )
                throw new Error(
                  "Every row requires a shipment ID, Import/Export flow and ETD in YYYY-MM-DD format.",
                );
              return row;
            });
            count += rows.length;
            if (count > 5000000)
              throw new Error("The CSV exceeds the 5,000,000-record limit.");
            for (const row of rows) {
              if (!minDate || row.ETD < minDate) minDate = row.ETD;
              if (row.ETD > maxDate) maxDate = row.ETD;
            }
            await putBatch(batches++, rows);
            self.postMessage({
              type: "progress",
              count,
              bytes: result.meta.cursor,
              totalBytes: file.size,
            });
            parser.resume();
          })().catch((error) => {
            reject(error);
            parser.abort();
          });
        },
        complete: resolve,
        error: reject,
      }),
    );
    if (!count) throw new Error("The CSV contains no shipment records.");
    source = {
      name: file.name,
      classification: "Uploaded CSV",
      count,
      batches,
      fields,
      minDate,
      maxDate,
      asOf: new Date().toISOString().slice(0, 10),
      invalid,
      dbName: stagingName,
    };
    await metadata(source);
    sample = null;
    oldDB?.close();
    if (oldSource.dbName) indexedDB.deleteDatabase(oldSource.dbName);
    self.postMessage({ type: "ready", source });
  } catch (error) {
    db = oldDB;
    sample = oldSample;
    source = oldSource;
    staging.close();
    indexedDB.deleteDatabase(stagingName);
    throw error;
  } finally {
    loading = false;
  }
}
async function exportCSV({ id, filters, view, columns }) {
  let rows = [],
    count = 0,
    sequence = 0;
  const send = (text) =>
    new Promise((resolve, reject) => {
      const key = `${id}:${sequence++}`;
      acknowledgements.set(key, { resolve, reject });
      self.postMessage({ type: "exportChunk", id, key, text });
    });
  await send(
    Papa.unparse({ fields: columns, data: [] }, { escapeFormulae: true }) +
      "\r\n",
  );
  const flush = async () => {
    if (rows.length) {
      const chunk = rows;
      rows = [];
      await send(Papa.unparse(chunk, { escapeFormulae: true }) + "\r\n");
    }
  };
  await scan((row) => {
    if (!matches(row, filters, view)) return;
    rows.push(columns.map((c) => row[c] ?? ""));
    count++;
  }, flush);
  self.postMessage({ type: "exportDone", id, count });
}
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "exportAck") {
      const ack = acknowledgements.get(data.key);
      if (ack) {
        acknowledgements.delete(data.key);
        data.error ? ack.reject(new Error(data.error)) : ack.resolve();
      }
      return;
    }
    if (loading && data.type !== "load")
      throw new Error("Wait for the CSV import to finish.");
    if (data.type === "init") {
      const saved = await metadata();
      if (saved) {
        db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(saved.dbName, 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (!db.objectStoreNames.contains("batches"))
          throw new Error(
            "The saved dataset is unavailable. Load the source CSV again.",
          );
        source = saved;
      } else {
        sample = generateData();
        source.fields = Object.keys(sample[0]);
        source.count = sample.length;
        source.minDate = sample.reduce(
          (a, r) => (r.ETD < a ? r.ETD : a),
          "9999",
        );
        source.maxDate = sample.reduce((a, r) => (r.ETD > a ? r.ETD : a), "");
      }
      self.postMessage({ type: "ready", source });
    } else if (data.type === "load") {
      currentRequest = -1;
      await ingest(data.file);
    } else if (data.type === "query") await query(data);
    else if (data.type === "export") await exportCSV(data);
  } catch (error) {
    self.postMessage({ type: "error", id: data.id, message: error.message });
  }
};
