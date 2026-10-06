export const VIEWS = [
  "Executive",
  "Import",
  "Export",
  "Customs",
  "Freight",
  "CHA / Forwarder",
  "Delay & RCA",
  "Supplier",
  "Control Tower",
  "Data Explorer",
];
export const FIELDS = [
  "Shipment_ID",
  "Shipment_Type",
  "ETD",
  "ETA",
  "Actual_Arrival",
  "Actual_Dispatch_Date",
  "Planned_Delivery_Date",
  "Factory_Delivery_Date",
  "Origin_Country",
  "Destination_Country",
  "Port",
  "Material_Category",
  "Mode",
  "Supplier",
  "Customer",
  "CHA",
  "Freight_Forwarder",
  "Shipment_Status",
  "Customs_Status",
  "Risk_Status",
  "Delay_Reason",
  "Delay_Days",
  "Shipment_Value",
  "Freight_Cost",
  "Weight_KG",
  "Customs_Duty",
  "CHA_Charges",
  "Detention_Cost",
  "Demurrage_Cost",
  "BOE_Date",
  "Clearance_Date",
  "Clearance_TAT",
  "SLA_Days",
  "BL_AWB",
  "PO_Number",
  "Invoice_Number",
];
export const NUMBERS = new Set([
  "Delay_Days",
  "Shipment_Value",
  "Freight_Cost",
  "Weight_KG",
  "Customs_Duty",
  "CHA_Charges",
  "Detention_Cost",
  "Demurrage_Cost",
  "Clearance_TAT",
  "SLA_Days",
]);
export const FILTERS = {
  flow: "Shipment_Type",
  mode: "Mode",
  port: "Port",
  country: "country",
  material: "Material_Category",
  risk: "Risk_Status",
  supplier: "Supplier",
  cha: "CHA",
  forwarder: "Freight_Forwarder",
  status: "Shipment_Status",
};
export const DEFAULT_FILTERS = {
  start: "",
  end: "",
  flow: "All",
  mode: "All",
  port: "All",
  country: "All",
  material: "All",
  risk: "All",
  supplier: "All",
  cha: "All",
  forwarder: "All",
  status: "All",
  search: "",
  exceptions: false,
};
export const number = (value) =>
  value !== "" &&
  value !== null &&
  value !== undefined &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;
const dateCache = new Map();
export function date(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  if (dateCache.has(value)) return dateCache.get(value);
  const timestamp = Date.parse(value),
    valid =
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
        ? value
        : null;
  if (dateCache.size < 10000) dateCache.set(value, valid);
  return valid;
}
export const days = (a, b) =>
  date(a) && date(b) ? (Date.parse(a) - Date.parse(b)) / 86400000 : null;
export function exception(row) {
  return (
    number(row.Delay_Days) > 0 ||
    ["Critical", "Attention"].includes(row.Risk_Status) ||
    ["Customs Pending", "Documentation Pending", "Delayed"].includes(
      row.Shipment_Status,
    )
  );
}
export function matches(row, filters, view) {
  if (
    (view === "Import" && row.Shipment_Type !== "Import") ||
    (view === "Export" && row.Shipment_Type !== "Export") ||
    (["Customs", "Supplier"].includes(view) && row.Shipment_Type !== "Import")
  )
    return false;
  if (
    (filters.start && (!date(row.ETD) || row.ETD < filters.start)) ||
    (filters.end && (!date(row.ETD) || row.ETD > filters.end))
  )
    return false;
  for (const [key, field] of Object.entries(FILTERS)) {
    if (
      filters[key] &&
      filters[key] !== "All" &&
      (key === "country"
        ? row.Origin_Country !== filters[key] &&
          row.Destination_Country !== filters[key]
        : row[field] !== filters[key])
    )
      return false;
  }
  if ((view === "Control Tower" || filters.exceptions) && !exception(row))
    return false;
  return (
    !filters.search ||
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(filters.search.toLowerCase()),
    )
  );
}
function emptyMetric(name = "") {
  return {
    name,
    count: 0,
    value: 0,
    valueN: 0,
    freight: 0,
    freightN: 0,
    weight: 0,
    weightN: 0,
    duty: 0,
    dutyN: 0,
    delayed: 0,
    delay: 0,
    delayN: 0,
    arrived: 0,
    onTime: 0,
    cleared: 0,
    tat: 0,
    tatN: 0,
    pending: 0,
    exceptions: 0,
    dispatchN: 0,
    dispatchOnTime: 0,
    otdN: 0,
    otdOnTime: 0,
    lead: 0,
    leadN: 0,
    slaN: 0,
    slaPass: 0,
    costWeightFreight: 0,
    costWeightKG: 0,
  };
}
function add(m, row, asOf) {
  m.count++;
  for (const [field, key] of [
    ["Shipment_Value", "value"],
    ["Freight_Cost", "freight"],
    ["Weight_KG", "weight"],
    ["Customs_Duty", "duty"],
    ["Delay_Days", "delay"],
  ]) {
    const v = number(row[field]);
    if (v !== null) {
      m[key] += v;
      m[key + "N"]++;
    }
  }
  const arrival = days(row.Actual_Arrival, row.ETA);
  if (arrival !== null && row.Actual_Arrival <= asOf) {
    m.arrived++;
    if (arrival <= 0) m.onTime++;
  }
  if (number(row.Delay_Days) > 0) m.delayed++;
  if (exception(row)) m.exceptions++;
  if (date(row.Clearance_Date) && row.Clearance_Date <= asOf) {
    m.cleared++;
    const tat = number(row.Clearance_TAT);
    if (tat !== null && tat >= 0) {
      m.tat += tat;
      m.tatN++;
      const target = number(row.SLA_Days);
      if (target !== null && target > 0) {
        m.slaN++;
        if (tat <= target) m.slaPass++;
      }
    }
  }
  if (
    row.Shipment_Type === "Import" &&
    date(row.BOE_Date) &&
    row.BOE_Date <= asOf &&
    (!date(row.Clearance_Date) || row.Clearance_Date > asOf)
  )
    m.pending++;
  const dispatch = days(row.Actual_Dispatch_Date, row.ETD);
  if (dispatch !== null && row.Actual_Dispatch_Date <= asOf) {
    m.dispatchN++;
    if (dispatch <= 0) m.dispatchOnTime++;
  }
  const otd = days(row.Factory_Delivery_Date, row.Planned_Delivery_Date);
  if (otd !== null && row.Factory_Delivery_Date <= asOf) {
    m.otdN++;
    if (otd <= 0) m.otdOnTime++;
  }
  const lead = days(row.Actual_Arrival, row.ETD);
  if (lead !== null && lead >= 0 && row.Actual_Arrival <= asOf) {
    m.lead += lead;
    m.leadN++;
  }
  const cost = number(row.Freight_Cost),
    kg = number(row.Weight_KG);
  if (cost !== null && kg !== null && kg > 0) {
    m.costWeightFreight += cost;
    m.costWeightKG += kg;
  }
}
function merge(m, r) {
  m.count += r.count;
  m.value += r.value;
  m.valueN += r.valueN;
  m.freight += r.freight;
  m.freightN += r.freightN;
  m.weight += r.weight;
  m.weightN += r.weightN;
  m.duty += r.duty;
  m.dutyN += r.dutyN;
  m.delayed += r.delayed;
  m.delay += r.delay;
  m.delayN += r.delayN;
  m.arrived += r.arrived;
  m.onTime += r.onTime;
  m.cleared += r.cleared;
  m.tat += r.tat;
  m.tatN += r.tatN;
  m.pending += r.pending;
  m.exceptions += r.exceptions;
  m.dispatchN += r.dispatchN;
  m.dispatchOnTime += r.dispatchOnTime;
  m.otdN += r.otdN;
  m.otdOnTime += r.otdOnTime;
  m.lead += r.lead;
  m.leadN += r.leadN;
  m.slaN += r.slaN;
  m.slaPass += r.slaPass;
  m.costWeightFreight += r.costWeightFreight;
  m.costWeightKG += r.costWeightKG;
}
const ratio = (a, b) => (b ? a / b : null);
export function finish(m) {
  return {
    ...m,
    value: m.valueN ? m.value : null,
    freight: m.freightN ? m.freight : null,
    duty: m.dutyN ? m.duty : null,
    delayed: m.delayN ? m.delayed : null,
    onTimePct: ratio(m.onTime * 100, m.arrived),
    otdPct: ratio(m.otdOnTime * 100, m.otdN),
    dispatchPct: ratio(m.dispatchOnTime * 100, m.dispatchN),
    slaPct: ratio(m.slaPass * 100, m.slaN),
    avgTat: ratio(m.tat, m.tatN),
    avgLead: ratio(m.lead, m.leadN),
    avgDelay: ratio(m.delay, m.delayN),
    costPerKg: ratio(m.costWeightFreight, m.costWeightKG),
    delayPct: ratio(m.delayed * 100, m.delayN),
  };
}
export function accumulator(asOf) {
  const total = emptyMetric(),
    buckets = {},
    trend = {},
    age = {
      "0-3 days": 0,
      "4-7 days": 0,
      "8-14 days": 0,
      "15-30 days": 0,
      "31+ days": 0,
    },
    options = {};
  const dimensions = [
    "Shipment_Type",
    "Shipment_Status",
    "Origin_Country",
    "Destination_Country",
    "Port",
    "Material_Category",
    "Customs_Status",
    "Mode",
    "Freight_Forwarder",
    "CHA",
    "Risk_Status",
    "Delay_Reason",
    "Supplier",
    "Lane",
  ];
  dimensions.forEach((k) => (buckets[k] = new Map()));
  return {
    add(row) {
      const record = emptyMetric();
      add(record, row, asOf);
      merge(total, record);
      const month = date(row.ETD)?.slice(0, 7);
      if (month) {
        trend[month] ??= { ...emptyMetric(month), Import: 0, Export: 0 };
        merge(trend[month], record);
        if (["Import", "Export"].includes(row.Shipment_Type))
          trend[month][row.Shipment_Type]++;
      }
      for (const key of dimensions) {
        if (key === "Delay_Reason" && !(number(row.Delay_Days) > 0)) continue;
        const label =
          key === "Lane"
            ? `${row.Origin_Country || "Unknown"} > ${row.Destination_Country || "Unknown"} / ${row.Mode || "Unknown"}`
            : row[key] || "Unknown";
        const map = buckets[key];
        if (!map.has(label)) map.set(label, emptyMetric(label));
        merge(map.get(label), record);
      }
      const aging = days(asOf, row.BOE_Date);
      if (
        row.Shipment_Type === "Import" &&
        aging !== null &&
        aging >= 0 &&
        (!date(row.Clearance_Date) || row.Clearance_Date > asOf)
      )
        age[
          aging <= 3
            ? "0-3 days"
            : aging <= 7
              ? "4-7 days"
              : aging <= 14
                ? "8-14 days"
                : aging <= 30
                  ? "15-30 days"
                  : "31+ days"
        ]++;
    },
    options(row) {
      for (const [key, field] of Object.entries(FILTERS)) {
        options[key] ??= new Set();
        for (const value of key === "country"
          ? [row.Origin_Country, row.Destination_Country]
          : [row[field]])
          if (value && options[key].size < 2000) options[key].add(value);
      }
    },
    result() {
      const groups = Object.fromEntries(
        Object.entries(buckets).map(([key, map]) => [
          key,
          [...map.values()].map(finish).sort((a, b) => b.count - a.count),
        ]),
      );
      const months = Object.keys(trend).sort();
      if (months.length) {
        const cursor = new Date(months[0] + "-01T00:00:00Z"),
          last = months.at(-1);
        while (cursor.toISOString().slice(0, 7) <= last) {
          const key = cursor.toISOString().slice(0, 7);
          trend[key] ??= { ...emptyMetric(key), Import: 0, Export: 0 };
          cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
      }
      const monthly = Object.values(trend)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(finish);
      for (const lane of groups.Lane) {
        const mode = groups.Mode.find((m) => lane.name.endsWith(`/ ${m.name}`));
        lane.variance =
          mode?.costPerKg && lane.costPerKg !== null
            ? (lane.costPerKg / mode.costPerKg - 1) * 100
            : null;
      }
      const pareto = [...groups.Delay_Reason].sort((a, b) => b.count - a.count);
      let cumulative = 0;
      pareto.forEach((r) => {
        cumulative += r.count;
        r.cumulative = total.delayed
          ? (cumulative / total.delayed) * 100
          : null;
      });
      return {
        total: finish(total),
        groups,
        monthly,
        aging: Object.entries(age).map(([name, count]) => ({ name, count })),
        pareto,
        options: Object.fromEntries(
          Object.entries(options).map(([k, v]) => [k, [...v].sort()]),
        ),
      };
    },
  };
}
