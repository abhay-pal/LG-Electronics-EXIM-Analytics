import test from "node:test";
import assert from "node:assert/strict";
import {
  accumulator,
  DEFAULT_FILTERS,
  matches,
  exception,
  date,
} from "./analytics.js";

test("Impossible calendar dates are not eligible milestones", () => {
  assert.equal(date("2026-02-31"), null);
  assert.equal(date("2026-02-28"), "2026-02-28");
});
const rows = [
  {
    Shipment_ID: "A",
    Shipment_Type: "Import",
    ETD: "2026-01-01",
    ETA: "2026-01-05",
    Actual_Arrival: "2026-01-05",
    Origin_Country: "Japan",
    Destination_Country: "India",
    Port: "Chennai",
    Mode: "Sea",
    Material_Category: "PCB",
    Supplier: "One",
    Shipment_Value: 100,
    Freight_Cost: 10,
    Weight_KG: 10,
    Clearance_Date: "2026-01-07",
    Clearance_TAT: 2,
    BOE_Date: "2026-01-05",
    SLA_Days: 2,
    Factory_Delivery_Date: "2026-01-08",
    Planned_Delivery_Date: "2026-01-08",
    Delay_Days: 0,
    Risk_Status: "On Track",
  },
  {
    Shipment_ID: "B",
    Shipment_Type: "Import",
    ETD: "2026-01-02",
    ETA: "2026-01-06",
    Actual_Arrival: "2026-01-08",
    Origin_Country: "Japan",
    Destination_Country: "India",
    Port: "Mundra",
    Mode: "Sea",
    Material_Category: "PCB",
    Supplier: "Two",
    Shipment_Value: 300,
    Freight_Cost: 30,
    Weight_KG: 10,
    Clearance_Date: "",
    Clearance_TAT: 9,
    BOE_Date: "2026-01-08",
    SLA_Days: 3,
    Factory_Delivery_Date: "2026-01-12",
    Planned_Delivery_Date: "2026-01-10",
    Delay_Days: 2,
    Delay_Reason: "Customs Hold",
    Risk_Status: "Critical",
  },
  {
    Shipment_ID: "C",
    Shipment_Type: "Export",
    ETD: "2026-03-01",
    ETA: "2026-03-05",
    Actual_Dispatch_Date: "2026-03-02",
    Origin_Country: "India",
    Destination_Country: "UAE",
    Port: "Chennai",
    Mode: "Air",
    Shipment_Value: null,
    Freight_Cost: 50,
    Weight_KG: null,
    Delay_Days: null,
  },
];
function aggregate(data = rows) {
  const a = accumulator("2026-04-01");
  data.forEach((r) => a.add(r));
  return a.result();
}
test("Totals reconcile and rates use eligible record denominators", () => {
  const { total, groups } = aggregate();
  assert.equal(total.count, 3);
  assert.equal(total.value, 400);
  assert.equal(total.freight, 90);
  assert.equal(total.valueN, 2);
  assert.equal(total.costPerKg, 2);
  assert.equal(total.onTimePct, 50);
  assert.equal(total.otdPct, 50);
  assert.equal(total.dispatchPct, 0);
  assert.equal(total.slaPct, 100);
  assert.equal(total.avgTat, 2);
  assert.equal(total.avgLead, 5);
  assert.equal(total.delayPct, 50);
  assert.equal(
    groups.Port.reduce((s, r) => s + r.count, 0),
    total.count,
  );
  assert.equal(
    groups.Shipment_Type.reduce((s, r) => s + (r.value ?? 0), 0),
    total.value,
  );
});
test("Pending aging uses BOE age, not clearance TAT", () => {
  const a = aggregate();
  assert.equal(a.total.pending, 1);
  assert.equal(a.aging.find((r) => r.name === "31+ days").count, 1);
  assert.equal(
    a.aging.reduce((s, r) => s + r.count, 0),
    a.total.pending,
  );
});
test("Pareto reasons include only delayed records and cumulative share ends at 100%", () => {
  const a = aggregate();
  assert.equal(a.pareto.length, 1);
  assert.equal(a.pareto[0].name, "Customs Hold");
  assert.equal(a.pareto[0].cumulative, 100);
});
test("Chronological month keys survive aggregation and empty months do not connect rate observations", () => {
  const a = aggregate();
  assert.deepEqual(
    a.monthly.map((r) => r.name),
    ["2026-01", "2026-02", "2026-03"],
  );
  assert.equal(a.monthly[1].count, 0);
  assert.equal(a.monthly[1].onTimePct, null);
});
test("Missing measurements are distinct from observed zero", () => {
  const a = aggregate([rows[2]]);
  assert.equal(a.total.value, null);
  assert.equal(a.total.avgTat, null);
  assert.equal(a.total.otdPct, null);
  assert.equal(a.total.delayed, null);
  assert.equal(a.total.dispatchPct, 0);
});
test("Future milestones are excluded as of the report date", () => {
  const a = aggregate([
    {
      ...rows[0],
      Actual_Arrival: "2026-05-01",
      Clearance_Date: "2026-05-03",
      Factory_Delivery_Date: "2026-05-04",
      Actual_Dispatch_Date: "2026-05-01",
    },
  ]);
  assert.equal(a.total.arrived, 0);
  assert.equal(a.total.cleared, 0);
  assert.equal(a.total.dispatchN, 0);
  assert.equal(a.total.otdN, 0);
  assert.equal(a.total.pending, 1);
});
test("View scope, filters, search and exceptions intersect; All restores population", () => {
  assert.equal(
    rows.filter((r) => matches(r, DEFAULT_FILTERS, "Executive")).length,
    3,
  );
  assert.equal(
    rows.filter((r) => matches(r, DEFAULT_FILTERS, "Customs")).length,
    2,
  );
  assert.equal(
    rows.filter((r) =>
      matches(r, { ...DEFAULT_FILTERS, flow: "Export" }, "Import"),
    ).length,
    0,
  );
  assert.equal(
    rows.filter((r) =>
      matches(
        r,
        { ...DEFAULT_FILTERS, country: "Japan", start: "2026-01-02" },
        "Executive",
      ),
    ).length,
    1,
  );
  assert.equal(
    rows.filter((r) =>
      matches(
        r,
        { ...DEFAULT_FILTERS, search: "customs hold" },
        "Data Explorer",
      ),
    ).length,
    1,
  );
  assert.equal(
    rows.filter((r) => matches(r, DEFAULT_FILTERS, "Control Tower")).length,
    1,
  );
  assert.equal(exception(rows[0]), false);
});
