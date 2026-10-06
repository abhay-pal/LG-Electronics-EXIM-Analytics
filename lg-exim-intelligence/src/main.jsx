import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileCheck2,
  Truck,
  Handshake,
  TriangleAlert,
  Factory,
  RadioTower,
  Database,
  Download,
  Upload,
  Search,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  Columns3,
  Menu,
  LoaderCircle,
  ArrowUpRight,
} from "lucide-react";
import { VIEWS, DEFAULT_FILTERS, FIELDS, NUMBERS } from "./analytics";
import "./styles.css";

const ICONS = [
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileCheck2,
  Truck,
  Handshake,
  TriangleAlert,
  Factory,
  RadioTower,
  Database,
];
const COLORS = [
  "#a50034",
  "#187d91",
  "#e4ae40",
  "#4266b0",
  "#7b8993",
  "#cf6654",
  "#56846b",
  "#926388",
  "#699da5",
  "#b69a60",
];
const compact = (n) =>
  n === null || n === undefined
    ? "N/A"
    : new Intl.NumberFormat("en-IN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
const money = (n) =>
  n === null || n === undefined ? "N/A" : `INR ${compact(n)}`;
const count = (n) => (n ?? 0).toLocaleString("en-IN");
const decimal = (n, suffix = "") =>
  n === null || n === undefined ? "N/A" : `${n.toFixed(1)}${suffix}`;
const percent = (n) => decimal(n, "%");
const title = (k) => k.replaceAll("_", " ");
const metricFormats = {
  count: compact,
  Import: compact,
  Export: compact,
  value: money,
  freight: money,
  duty: money,
  costPerKg: (n) => (n === null ? "N/A" : `INR ${n.toFixed(2)}/kg`),
  variance: percent,
  onTimePct: percent,
  dispatchPct: percent,
  slaPct: percent,
  otdPct: percent,
  delayPct: percent,
  avgTat: (n) => decimal(n, " d"),
  avgLead: (n) => decimal(n, " d"),
  avgDelay: (n) => decimal(n, " d"),
  delayed: compact,
  exceptions: compact,
  pending: compact,
  cumulative: percent,
};
const M = {
  count: "Shipment records",
  value: "Trade value",
  freight: "Freight cost",
  duty: "Customs duty",
  costPerKg: "Freight / kg",
  variance: "Variance vs mode",
  onTimePct: "On-time arrival",
  dispatchPct: "On-time dispatch",
  slaPct: "SLA compliance",
  otdPct: "Supplier OTD",
  delayPct: "Delay rate",
  avgTat: "Clearance TAT",
  avgLead: "Arrival lead time",
  avgDelay: "Delay days",
  delayed: "Delayed records",
  exceptions: "Exceptions",
  pending: "Pending customs",
  Import: "Import",
  Export: "Export",
  cumulative: "Cumulative share",
};
const notes = {
  onTimePct:
    "Actual arrival on or before ETA / records with actual arrival and ETA. Future actual arrivals excluded.",
  avgTat:
    "Average Clearance TAT for records cleared by the source as-of date; pending records excluded.",
  avgLead:
    "Actual arrival minus ETD, averaged over arrived records with valid dates.",
  dispatchPct:
    "Actual Dispatch Date on or before ETD / records with actual dispatch and ETD.",
  otdPct:
    "Factory Delivery Date on or before Planned Delivery Date / delivered records with both dates.",
  slaPct:
    "Clearance TAT <= record-level SLA Days / cleared records with positive SLA Days.",
  costPerKg:
    "Sum of freight / sum of weight, using only records with freight and positive weight.",
  variance:
    "Lane freight per kg compared with the weighted freight per kg for the same transport mode. This is a descriptive comparison, not a savings estimate.",
  pending:
    "Import records with BOE Date on/before the as-of date and no clearance by that date.",
  count:
    "One source row is treated as one shipment record. CSV must use one row per shipment.",
};

function Chart({ heading, description, children, wide = false }) {
  return (
    <section className={`chart-panel ${wide ? "wide" : ""}`}>
      <div className="chart-heading">
        <h3>{heading}</h3>
        {description && (
          <span title={description} aria-label={description}>
            <Info size={14} />
          </span>
        )}
      </div>
      <div className="plot">{children}</div>
    </section>
  );
}
function Missing({ fields }) {
  return (
    <div className="missing">
      <Database size={24} />
      <strong>Measurement unavailable</strong>
      <span>Required: {fields.join(", ")}</span>
    </div>
  );
}
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <b>{label || payload[0]?.payload?.name}</b>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p, i) => (
          <div key={i}>
            <i style={{ background: p.color || p.fill }} />
            <span>{p.name}</span>
            <strong>{(metricFormats[p.dataKey] || compact)(p.value)}</strong>
          </div>
        ))}
    </div>
  );
}
function Bars({
  rows,
  metric = "count",
  limit = 10,
  color = COLORS[1],
  reference,
}) {
  const data = rows
    .filter((r) => r[metric] !== null && r[metric] !== undefined)
    .sort((a, b) =>
      metric === "variance"
        ? Math.abs(b[metric]) - Math.abs(a[metric])
        : b[metric] - a[metric],
    )
    .slice(0, limit);
  if (!data.length) return <Missing fields={[M[metric] || metric]} />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 26, top: 8, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} stroke="#edf0f2" />
        <XAxis
          type="number"
          tickFormatter={metricFormats[metric] || compact}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={
            metric.endsWith("Pct")
              ? [0, 100]
              : metric === "variance"
                ? ["auto", "auto"]
                : undefined
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          tick={{ fontSize: 10 }}
          tickFormatter={(s) => (s.length > 23 ? s.slice(0, 21) + "..." : s)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        {(reference !== undefined || metric === "variance") && (
          <ReferenceLine x={reference ?? 0} stroke="#b6bdc4" />
        )}
        <Bar
          dataKey={metric}
          name={M[metric]}
          fill={color}
          barSize={15}
          radius={[0, 2, 2, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
function Trend({ rows, metrics = ["count"], area = false }) {
  if (
    !rows.some((r) => metrics.some((m) => r[m] !== null && r[m] !== undefined))
  )
    return <Missing fields={metrics.map((m) => M[m] || m)} />;
  const Container = area ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Container
        data={rows}
        margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="#edf0f2" />
        <XAxis
          dataKey="name"
          tickFormatter={(s) =>
            new Date(s + "-01T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })
          }
          tick={{ fontSize: 10 }}
          minTickGap={25}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={metricFormats[metrics[0]] || compact}
          tick={{ fontSize: 10 }}
          width={68}
          axisLine={false}
          tickLine={false}
          domain={metrics[0].endsWith("Pct") ? [0, 100] : undefined}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        {metrics.map((m, i) =>
          area ? (
            <Area
              key={m}
              type="linear"
              dataKey={m}
              name={M[m]}
              stroke={COLORS[i]}
              fill={COLORS[i]}
              fillOpacity={0.08}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={m}
              type="linear"
              dataKey={m}
              name={M[m]}
              stroke={COLORS[i]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ),
        )}
      </Container>
    </ResponsiveContainer>
  );
}
function Donut({ rows, metric = "count" }) {
  if (!rows.length) return <Missing fields={[M[metric]]} />;
  return (
    <div className="donut-layout">
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey={metric}
              nameKey="name"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={1}
              stroke="none"
              isAnimationActive={false}
            >
              {rows.map((r, i) => (
                <Cell key={r.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => (metricFormats[metric] || compact)(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="donut-legend">
        {rows.map((r, i) => (
          <div key={r.name}>
            <i style={{ background: COLORS[i % COLORS.length] }} />
            <span title={r.name}>{r.name}</span>
            <b>{compact(r[metric])}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
function Pareto({ rows }) {
  return rows.length ? (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={rows}
        margin={{ top: 10, left: 0, right: 5, bottom: 38 }}
      >
        <CartesianGrid vertical={false} stroke="#edf0f2" />
        <XAxis
          dataKey="name"
          interval={0}
          angle={-30}
          textAnchor="end"
          tick={{ fontSize: 9 }}
          tickFormatter={(s) => s.replace("Freight Forwarder", "Forwarder")}
          height={50}
        />
        <YAxis
          yAxisId="count"
          tickFormatter={compact}
          tick={{ fontSize: 10 }}
          width={45}
        />
        <YAxis
          yAxisId="percent"
          orientation="right"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10 }}
          width={40}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          yAxisId="count"
          dataKey="count"
          name="Delayed records"
          fill={COLORS[0]}
        />
        <Line
          yAxisId="percent"
          dataKey="cumulative"
          name="Cumulative share"
          stroke={COLORS[1]}
          dot={false}
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  ) : (
    <div className="missing">No delayed records in scope</div>
  );
}
function Metric({ label, value, note, accent = false }) {
  return (
    <div className={`metric ${accent ? "accent" : ""}`}>
      <span>
        {label}
        {note && <Info size={12} tabIndex={0} title={note} />}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
function Summary({ view, data }) {
  const t = data.total,
    g = data.groups,
    imports = g.Shipment_Type.find((r) => r.name === "Import"),
    exports = g.Shipment_Type.find((r) => r.name === "Export");
  const common = [
    ["Shipment records", count(t.count), notes.count],
    ["Trade value", t.valueN ? money(t.value) : "N/A"],
    ["On-time arrival", percent(t.onTimePct), notes.onTimePct],
    ["Delayed records", count(t.delayed), "Source Delay Days > 0."],
    ["Freight cost", t.freightN ? money(t.freight) : "N/A"],
    ["Arrival lead time", decimal(t.avgLead, " days"), notes.avgLead],
  ];
  const specific = {
    Executive: [
      common[0],
      ["Import value", imports?.valueN ? money(imports.value) : "N/A"],
      ["Export value", exports?.valueN ? money(exports.value) : "N/A"],
      common[2],
      common[3],
      common[4],
    ],
    Import: common,
    Export: [
      common[0],
      common[1],
      ["On-time dispatch", percent(t.dispatchPct), notes.dispatchPct],
      common[2],
      common[3],
      common[4],
    ],
    Customs: [
      common[0],
      [
        "Cleared records",
        count(t.cleared),
        "Clearance Date on/before the source as-of date.",
      ],
      ["Clearance TAT", decimal(t.avgTat, " days"), notes.avgTat],
      ["Pending customs", count(t.pending), notes.pending],
      ["Customs duty", t.dutyN ? money(t.duty) : "N/A"],
      ["SLA compliance", percent(t.slaPct), notes.slaPct],
    ],
    Freight: [
      common[0],
      common[4],
      ["Freight / kg", metricFormats.costPerKg(t.costPerKg), notes.costPerKg],
      [
        "Avg freight / record",
        t.freightN ? money(t.freight / t.freightN) : "N/A",
      ],
      ["Freight coverage", `${count(t.freightN)} records`],
      ["Weight coverage", `${count(t.weightN)} records`],
    ],
    "CHA / Forwarder": [
      common[0],
      ["SLA compliance", percent(t.slaPct), notes.slaPct],
      common[2],
      ["Clearance TAT", decimal(t.avgTat, " days"), notes.avgTat],
      ["Exception records", count(t.exceptions)],
      common[4],
    ],
    "Delay & RCA": [
      common[0],
      common[3],
      [
        "Delay rate",
        percent(t.delayPct),
        "Records with Delay Days > 0 / filtered records with numeric Delay Days.",
      ],
      [
        "Critical risk",
        count(g.Risk_Status.find((r) => r.name === "Critical")?.count),
      ],
      [
        "Average delay",
        decimal(t.avgDelay, " days"),
        "Average source Delay Days over records with a numeric value, including zero.",
      ],
      ["Exception records", count(t.exceptions)],
    ],
    Supplier: [
      common[0],
      ["Supplier OTD", percent(t.otdPct), notes.otdPct],
      common[5],
      common[2],
      ["Supplier count", count(g.Supplier.length)],
      common[3],
    ],
    "Control Tower": [
      common[0],
      [
        "Critical risk",
        count(g.Risk_Status.find((r) => r.name === "Critical")?.count),
      ],
      common[3],
      ["Pending customs", count(t.pending), notes.pending],
      ["Exception trade value", t.valueN ? money(t.value) : "N/A"],
      common[4],
    ],
  };
  const requiredLabels = {
    "Delayed records": ["Delay_Days"],
    "Critical risk": ["Risk_Status"],
    "Cleared records": ["Clearance_Date"],
    "Pending customs": ["BOE_Date", "Clearance_Date"],
    "Supplier count": ["Supplier"],
  };
  return (
    <div className="metrics">
      {(specific[view] || common).map(([label, value, note], i) => (
        <Metric
          key={label}
          label={label}
          value={
            (requiredLabels[label] || []).some(
              (field) => !data.source.fields.includes(field),
            ) ||
            (label === "Delayed records" && !t.delayN)
              ? "N/A"
              : value
          }
          note={note}
          accent={i === 0}
        />
      ))}
    </div>
  );
}
function Analytics({ view, data }) {
  const g = data.groups,
    m = data.monthly;
  const required = {
    value: ["Shipment_Value"],
    freight: ["Freight_Cost"],
    duty: ["Customs_Duty"],
    costPerKg: ["Freight_Cost", "Weight_KG"],
    variance: ["Freight_Cost", "Weight_KG", "Mode"],
    onTimePct: ["Actual_Arrival", "ETA"],
    dispatchPct: ["Actual_Dispatch_Date", "ETD"],
    otdPct: ["Factory_Delivery_Date", "Planned_Delivery_Date"],
    slaPct: ["SLA_Days", "Clearance_Date", "Clearance_TAT"],
    avgTat: ["Clearance_Date", "Clearance_TAT"],
    avgLead: ["Actual_Arrival", "ETD"],
    avgDelay: ["Delay_Days"],
    delayed: ["Delay_Days"],
    delayPct: ["Delay_Days"],
  };
  const unavailable = (keys) =>
    keys.filter((k) => !data.source.fields.includes(k));
  const bar = (
    heading,
    key,
    metric = "count",
    description = notes[metric],
    color,
  ) => ({
    heading,
    description,
    node: unavailable([
      ...(key === "Lane"
        ? ["Origin_Country", "Destination_Country", "Mode"]
        : [key]),
      ...(required[metric] || []),
    ]).length ? (
      <Missing
        fields={unavailable([
          ...(key === "Lane"
            ? ["Origin_Country", "Destination_Country", "Mode"]
            : [key]),
          ...(required[metric] || []),
        ])}
      />
    ) : (
      <Bars rows={g[key]} metric={metric} color={color} />
    ),
  });
  const trend = (heading, metrics, description) => ({
    heading,
    description: `${description || "ETD month cohorts."} Boundary months may be partial.`,
    node: unavailable(metrics.flatMap((metric) => required[metric] || []))
      .length ? (
      <Missing
        fields={[
          ...new Set(
            unavailable(metrics.flatMap((metric) => required[metric] || [])),
          ),
        ]}
      />
    ) : (
      <Trend rows={m} metrics={metrics} />
    ),
  });
  const donut = (heading, key) => ({
    heading,
    node: unavailable([key]).length ? (
      <Missing fields={[key]} />
    ) : (
      <Donut rows={g[key]} />
    ),
  });
  const layouts = {
    Executive: [
      trend(
        "Shipment trend",
        ["Import", "Export"],
        "Monthly records by ETD; entire selected period.",
      ),
      trend("Trade value trend", ["value"], "INR, grouped by ETD month."),
      donut("Shipment status", "Shipment_Status"),
      bar("Origin countries", "Origin_Country", "value"),
      bar("Port throughput", "Port"),
      donut("Material mix", "Material_Category"),
    ],
    Import: [
      trend("Import value trend", ["value"]),
      bar("Origin country value", "Origin_Country", "value"),
      bar("Material value", "Material_Category", "value"),
      bar("Port import value", "Port", "value"),
      trend("Arrival lead time trend", ["avgLead"], notes.avgLead),
      bar("Lead time by origin", "Origin_Country", "avgLead"),
    ],
    Export: [
      trend("Export value trend", ["value"]),
      bar("Destination value", "Destination_Country", "value"),
      bar("Product value", "Material_Category", "value"),
      trend("Dispatch performance", ["dispatchPct"], notes.dispatchPct),
      bar(
        "On-time dispatch by destination",
        "Destination_Country",
        "dispatchPct",
      ),
      donut("Export status", "Shipment_Status"),
    ],
    Customs: [
      trend("Clearance TAT trend", ["avgTat"], notes.avgTat),
      {
        heading: "Pending BOE aging",
        description:
          "Days from BOE Date to source as-of date, for imports not yet cleared.",
        node: unavailable(["BOE_Date", "Clearance_Date"]).length ? (
          <Missing fields={unavailable(["BOE_Date", "Clearance_Date"])} />
        ) : (
          <Bars rows={data.aging} color={COLORS[2]} />
        ),
      },
      donut("Customs status", "Customs_Status"),
      bar("Clearance TAT by port", "Port", "avgTat"),
      trend("Customs duty trend", ["duty"]),
      bar("Customs duty by material", "Material_Category", "duty"),
    ],
    Freight: [
      trend("Freight cost trend", ["freight"]),
      bar("Total cost by mode", "Mode", "freight"),
      bar("Forwarder freight cost", "Freight_Forwarder", "freight"),
      bar("Cost per kg by mode", "Mode", "costPerKg"),
      bar("Lane cost variance", "Lane", "variance", notes.variance, COLORS[3]),
      bar("Lane freight cost", "Lane", "freight"),
    ],
    "CHA / Forwarder": [
      bar("CHA SLA compliance", "CHA", "slaPct"),
      bar("Forwarder on-time arrival", "Freight_Forwarder", "onTimePct"),
      donut("CHA shipment share", "CHA"),
      donut("Forwarder shipment share", "Freight_Forwarder"),
      bar("CHA clearance TAT", "CHA", "avgTat"),
      bar("Forwarder exceptions", "Freight_Forwarder", "exceptions"),
    ],
    "Delay & RCA": [
      {
        heading: "Delay reason Pareto",
        description:
          "Source-reported reasons for records with Delay Days > 0; cumulative share of all delayed records. Not proof of causality.",
        node: <Pareto rows={data.pareto} />,
      },
      donut("Risk mix", "Risk_Status"),
      trend("Delayed shipment trend", ["delayed"]),
      bar("Delayed records by port", "Port", "delayed"),
      bar("Average delay by port", "Port", "avgDelay"),
      bar("Reported delay reasons", "Delay_Reason"),
    ],
    Supplier: [
      bar("Supplier on-time delivery", "Supplier", "otdPct"),
      bar("Supplier arrival lead time", "Supplier", "avgLead"),
      donut("Supplier shipment share", "Supplier"),
      bar(
        "Supplier delay rate",
        "Supplier",
        "delayPct",
        "Delayed records / all records per supplier.",
      ),
      bar("Supplier trade value", "Supplier", "value"),
      bar("Supplier exception records", "Supplier", "exceptions"),
    ],
    "Control Tower": [
      donut("Exception risk mix", "Risk_Status"),
      bar("Exceptions by port", "Port"),
      trend("Exception trend", ["count"]),
      donut("Exception shipment status", "Shipment_Status"),
    ],
  };
  return (
    <div className={`charts ${view === "Control Tower" ? "tower-charts" : ""}`}>
      {layouts[view]?.map((c) => (
        <Chart key={c.heading} heading={c.heading} description={c.description}>
          {c.node}
        </Chart>
      ))}
    </div>
  );
}
const DEFAULT_COLUMNS = [
  "Shipment_ID",
  "Shipment_Type",
  "ETD",
  "Origin_Country",
  "Destination_Country",
  "Port",
  "Material_Category",
  "Shipment_Status",
  "Delay_Days",
  "Delay_Reason",
  "Risk_Status",
  "Shipment_Value",
  "Freight_Cost",
];
function Records({
  data,
  view,
  page,
  setPage,
  columns,
  setColumns,
  search,
  setSearch,
  exportRows,
  openRow,
  busy,
}) {
  const [picker, setPicker] = useState(false);
  const pages = Math.max(1, Math.ceil(data.matched / 50));
  return (
    <section className="records-section">
      <div className="records-heading">
        <div>
          <h3>
            {view === "Control Tower"
              ? "Actual exception records"
              : "Shipment record explorer"}
          </h3>
          <span>{count(data.matched)} matching records</span>
        </div>
        <div className="record-actions">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Search records"
              placeholder="Shipment, supplier, port..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="column-wrap">
            <button
              className="button"
              onClick={() => setPicker(!picker)}
              aria-expanded={picker}
            >
              <Columns3 size={15} />
              Columns
            </button>
            {picker && (
              <div className="column-picker">
                <div>
                  <strong>Visible columns</strong>
                  <button
                    className="icon-button"
                    aria-label="Close column picker"
                    onClick={() => setPicker(false)}
                  >
                    <X size={15} />
                  </button>
                </div>
                {data.source.fields.map((c) => (
                  <label key={c}>
                    <input
                      type="checkbox"
                      checked={columns.includes(c)}
                      onChange={() =>
                        setColumns((cols) =>
                          cols.includes(c)
                            ? cols.length > 1
                              ? cols.filter((x) => x !== c)
                              : cols
                            : [...cols, c],
                        )
                      }
                    />
                    {title(c)}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            className="button"
            onClick={exportRows}
            disabled={busy || !data.matched}
          >
            <Download size={15} />
            CSV
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{title(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={`${row.Shipment_ID}-${i}`}>
                {columns.map((c, j) => (
                  <td key={c} className={j === 0 ? "first-col" : ""}>
                    {c === "Shipment_ID" ? (
                      <button
                        className="record-link"
                        onClick={() => openRow(row)}
                      >
                        {row[c]}
                      </button>
                    ) : c === "Risk_Status" ? (
                      <span
                        className={`risk risk-${(row[c] || "").replaceAll(" ", "").toLowerCase()}`}
                      >
                        {row[c] || "N/A"}
                      </span>
                    ) : NUMBERS.has(c) ? (
                      row[c] === null ||
                      row[c] === undefined ||
                      row[c] === "" ? (
                        "N/A"
                      ) : c.includes("Cost") ||
                        c.includes("Value") ||
                        c.includes("Duty") ||
                        c.includes("Charges") ? (
                        money(row[c])
                      ) : (
                        Number(row[c]).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })
                      )
                    ) : (
                      row[c] || "N/A"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          {data.matched ? count((page - 1) * 50 + 1) : 0} -{" "}
          {count(Math.min(page * 50, data.matched))} of {count(data.matched)}
        </span>
        <div>
          <button
            className="icon-button"
            title="Previous page"
            disabled={page <= 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page {count(page)} / {count(pages)}
          </span>
          <button
            className="icon-button"
            title="Next page"
            disabled={page >= pages || busy}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
function Source({ source, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="source-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Dataset and definitions"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>Dataset & definitions</h2>
          <button
            className="icon-button"
            aria-label="Close dataset details"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <dl>
          <dt>Source</dt>
          <dd>{source.name}</dd>
          <dt>Classification</dt>
          <dd>{source.classification}</dd>
          <dt>Records</dt>
          <dd>{count(source.count)}</dd>
          <dt>ETD coverage</dt>
          <dd>
            {source.minDate} to {source.maxDate}
          </dd>
          <dt>As-of date</dt>
          <dd>{source.asOf}</dd>
          <dt>Currency</dt>
          <dd>INR; source values must be in INR</dd>
          <dt>Grain</dt>
          <dd>One source row per shipment; duplicates are not deduplicated</dd>
          <dt>Missing numeric cells</dt>
          <dd>Excluded from averages and sums; not replaced with zero</dd>
          {source.invalid > 0 && (
            <>
              <dt>Invalid numeric cells</dt>
              <dd>{count(source.invalid)} treated as missing</dd>
            </>
          )}
        </dl>
        <div className="definition-list">
          {Object.entries(notes).map(([key, note]) => (
            <p key={key}>
              <b>{M[key]}:</b> {note}
            </p>
          ))}
        </div>
        {source.classification === "Synthetic" && (
          <p className="source-note">
            Generated sample records. Source statuses and milestone dates can
            disagree; this is not verified operational data.
          </p>
        )}
      </section>
    </div>
  );
}
function Detail({ row, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shipment details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <small>Shipment detail</small>
            <h2>{row.Shipment_ID}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close shipment details"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="route">
          <strong>{row.Origin_Country || "N/A"}</strong>
          <ArrowUpRight size={18} />
          <strong>{row.Destination_Country || "N/A"}</strong>
        </div>
        <dl>
          {Object.entries(row).map(([key, value]) => (
            <React.Fragment key={key}>
              <dt>{title(key)}</dt>
              <dd>{value === null || value === "" ? "N/A" : String(value)}</dd>
            </React.Fragment>
          ))}
        </dl>
      </aside>
    </div>
  );
}
function App() {
  const worker = useRef(null),
    request = useRef(0),
    exports = useRef(new Map()),
    fileInput = useRef(null);
  const [view, setView] = useState("Executive"),
    [filters, setFilters] = useState(DEFAULT_FILTERS),
    [data, setData] = useState(null),
    [source, setSource] = useState(null),
    [busy, setBusy] = useState(true),
    [importing, setImporting] = useState(false),
    [exporting, setExporting] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [more, setMore] = useState(false),
    [page, setPage] = useState(1),
    [columns, setColumns] = useState(DEFAULT_COLUMNS),
    [detail, setDetail] = useState(null),
    [showSource, setShowSource] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
    const w = new Worker(new URL("./data.worker.js", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = async ({ data: message }) => {
      if (message.type === "ready") {
        setSource(message.source);
        setImporting(false);
        setError("");
        setData(null);
        setFilters(DEFAULT_FILTERS);
        setPage(1);
        setColumns(
          DEFAULT_COLUMNS.filter((c) => message.source.fields.includes(c)),
        );
      }
      if (message.type === "result" && message.id === request.current) {
        setData(message);
        setBusy(false);
      }
      if (message.type === "progress") setProgress(message.count);
      if (message.type === "error") {
        if (typeof message.id === "number" && message.id !== request.current)
          return;
        setError(message.message);
        setBusy(false);
        setImporting(false);
        setExporting(false);
        const exp = exports.current.get(message.id);
        if (exp) {
          await exp.writer?.abort();
          exports.current.delete(message.id);
        }
      }
      if (message.type === "exportChunk") {
        const exp = exports.current.get(message.id);
        if (exp) {
          try {
            if (exp.writer) await exp.writer.write(message.text);
            else exp.parts.push(message.text);
            w.postMessage({ type: "exportAck", key: message.key });
          } catch (e) {
            w.postMessage({
              type: "exportAck",
              key: message.key,
              error: e.message,
            });
          }
        }
      }
      if (message.type === "exportDone") {
        const exp = exports.current.get(message.id);
        if (!exp) return;
        try {
          await exp.pending;
          if (exp.writer) await exp.writer.close();
          else {
            const url = URL.createObjectURL(
              new Blob(exp.parts, { type: "text/csv;charset=utf-8;" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = exp.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }
          setToast(`${count(message.count)} records exported`);
        } catch (e) {
          setError(e.message);
        } finally {
          exports.current.delete(message.id);
          setExporting(false);
        }
      }
    };
    w.onerror = (e) => {
      setError(e.message || "Data worker failed");
      setBusy(false);
      setImporting(false);
    };
    w.postMessage({ type: "init" });
    return () => w.terminate();
  }, []);
  useEffect(() => {
    if (!source || importing) return;
    setBusy(true);
    const id = ++request.current;
    const timer = setTimeout(
      () =>
        worker.current.postMessage({ type: "query", id, filters, view, page }),
      220,
    );
    return () => clearTimeout(timer);
  }, [source, filters, view, page, importing]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDetail(null);
        setShowSource(false);
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };
  const selectView = (v) => {
    setView(v);
    setPage(1);
    setFilters((f) => ({ ...f, search: "", exceptions: false }));
    setMobileNav(false);
  };
  async function exportRows() {
    if (!data || exporting) return;
    if (data.matched > 100000 && !window.showSaveFilePicker) {
      setError(
        "Large exports require a browser with direct file saving (Chrome or Edge). CSV exports above 100,000 rows are streamed directly to disk.",
      );
      return;
    }
    const name = `LG-EXIM-${view.replaceAll(" / ", "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
      id = `export-${Date.now()}`;
    let writer = null;
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
        });
        writer = await handle.createWritable();
      }
      exports.current.set(id, {
        name,
        writer,
        parts: [],
        pending: Promise.resolve(),
      });
      setExporting(true);
      worker.current.postMessage({
        type: "export",
        id,
        filters,
        view,
        columns,
      });
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    }
  }
  const changeFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Select a CSV file.");
      return;
    }
    request.current++;
    setImporting(true);
    setProgress(0);
    setError("");
    worker.current.postMessage({ type: "load", file });
  };
  const active = Object.values(filters).some(
    (v) => v && v !== "All" && v !== false,
  );
  const tableView = ["Data Explorer", "Control Tower"].includes(view);
  const fields = source?.fields || [];
  const missingFields =
    view === "Export"
      ? ["Actual_Dispatch_Date"].filter((f) => !fields.includes(f))
      : view === "Supplier"
        ? ["Planned_Delivery_Date"].filter((f) => !fields.includes(f))
        : ["Customs", "CHA / Forwarder"].includes(view)
          ? ["SLA_Days"].filter((f) => !fields.includes(f))
          : [];
  return (
    <div className="app">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">LG</div>
          <div>
            <strong>EXIM Analytics</strong>
            <span>Trade operations</span>
          </div>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="nav-label">ANALYSIS</div>
        <nav>
          {VIEWS.map((v, i) => {
            const Icon = ICONS[i];
            return (
              <button
                key={v}
                className={v === view ? "active" : ""}
                onClick={() => selectView(v)}
              >
                <Icon size={17} />
                <span>{v}</span>
                <small>{String(i + 1).padStart(2, "0")}</small>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-photo" />
          <button onClick={() => setShowSource(true)} disabled={!source}>
            <Database size={16} />
            <div>
              <strong>
                {source ? count(source.count) : "Loading"} records
              </strong>
              <span>{source?.classification || "Dataset"}</span>
            </div>
            <Info size={14} />
          </button>
          <span className="capacity">CSV capacity: 50 lakh records</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="masthead">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <h1>LG EXIM Analytics</h1>
            <span className="division">Import / Export</span>
          </div>
          <div className="masthead-actions">
            <button
              className="source-button"
              onClick={() => setShowSource(true)}
              disabled={!source}
            >
              <span
                className={`source-dot ${source?.classification === "Synthetic" ? "sample" : ""}`}
              />
              {source?.classification || "Loading source"}
              <Info size={13} />
            </button>
            <button
              className="icon-button"
              title="Download filtered CSV"
              onClick={exportRows}
              disabled={!data || busy || importing || exporting}
            >
              <Download size={17} />
            </button>
          </div>
        </header>
        <main>
          <div className="view-heading">
            <div>
              <h2>
                {view === "Executive"
                  ? "Executive overview"
                  : view === "CHA / Forwarder"
                    ? "CHA & forwarder performance"
                    : view}
              </h2>
              <span>
                {source
                  ? `${source.minDate} - ${source.maxDate}`
                  : "Preparing dataset"}
                <i />
                As of {source?.asOf || "..."}
              </span>
            </div>
            <div className="heading-actions">
              <button
                className="button"
                onClick={() => fileInput.current.click()}
                disabled={importing || exporting}
              >
                <Upload size={15} />
                Load CSV
              </button>
              <input
                ref={fileInput}
                className="file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={changeFile}
              />
              <span className="scope-count">
                {data ? count(data.total.count) : "..."}
                <small>records in scope</small>
              </span>
            </div>
          </div>
          <div className="filters">
            <div className="filter-row">
              <label className="date-filter">
                <span>ETD period</span>
                <div>
                  <input
                    aria-label="ETD start date"
                    type="date"
                    value={filters.start}
                    onChange={(e) => setFilter("start", e.target.value)}
                  />
                  <span>to</span>
                  <input
                    aria-label="ETD end date"
                    type="date"
                    value={filters.end}
                    onChange={(e) => setFilter("end", e.target.value)}
                  />
                </div>
              </label>
              {["flow", "mode", "port"].map((k) => (
                <FilterSelect
                  key={k}
                  name={k}
                  value={filters[k]}
                  values={data?.options[k] || []}
                  change={(v) => setFilter(k, v)}
                />
              ))}
              <button
                className={`button ${more ? "selected" : ""}`}
                onClick={() => setMore(!more)}
                aria-expanded={more}
              >
                <SlidersHorizontal size={15} />
                Filters{active && <i className="active-dot" />}
              </button>
              <button
                className="icon-button"
                title="Reset all filters"
                aria-label="Reset all filters"
                onClick={reset}
              >
                <RotateCcw size={16} />
              </button>
              {busy && (
                <LoaderCircle
                  size={16}
                  className="spinner"
                  aria-label="Updating charts"
                />
              )}
            </div>
            {more && (
              <div className="filter-row extra-filters">
                {[
                  "country",
                  "material",
                  "risk",
                  "supplier",
                  "cha",
                  "forwarder",
                  "status",
                ].map((k) => (
                  <FilterSelect
                    key={k}
                    name={k}
                    value={filters[k]}
                    values={data?.options[k] || []}
                    change={(v) => setFilter(k, v)}
                  />
                ))}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={filters.exceptions}
                    onChange={(e) => setFilter("exceptions", e.target.checked)}
                  />
                  Exceptions only
                </label>
              </div>
            )}
          </div>
          {error && (
            <div className="message error" role="alert">
              <TriangleAlert size={17} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {importing ? (
            <div className="loading-state">
              <LoaderCircle className="spinner" size={28} />
              <h3>Importing shipment records</h3>
              <strong>{count(progress)} rows processed</strong>
            </div>
          ) : !data ? (
            <div className="loading-state">
              <LoaderCircle className="spinner" size={28} />
              <h3>Calculating dashboard</h3>
            </div>
          ) : (
            <>
              <div className="population-label">
                <span>
                  {["Import", "Customs", "Supplier"].includes(view)
                    ? "IMPORT RECORDS"
                    : view === "Export"
                      ? "EXPORT RECORDS"
                      : view === "Control Tower"
                        ? "EXCEPTION RECORDS"
                        : "ALL FLOWS"}
                  {active ? " / FILTERED" : ""}
                </span>
                <span>
                  {busy
                    ? "Updating..."
                    : `${count(data.seen)} source records reviewed`}
                </span>
              </div>
              {view !== "Data Explorer" && <Summary view={view} data={data} />}{" "}
              {missingFields.length > 0 && (
                <div className="coverage-note">
                  <Info size={14} />
                  <span>
                    {view === "Export"
                      ? "Dispatch performance"
                      : view === "Supplier"
                        ? "Supplier OTD"
                        : "Contractual SLA"}
                    : unavailable in this source. Missing{" "}
                    {missingFields.map(title).join(", ")}.
                  </span>
                </div>
              )}
              {!data.total.count ? (
                <div className="empty-state">
                  <Search size={26} />
                  <h3>No records in this scope</h3>
                  <button className="button" onClick={reset}>
                    <RotateCcw size={15} />
                    Reset filters
                  </button>
                </div>
              ) : (
                <>
                  {view !== "Data Explorer" && (
                    <Analytics view={view} data={data} />
                  )}{" "}
                  {view === "Data Explorer" && (
                    <div className="explorer-summary">
                      <Metric
                        label="Source records"
                        value={count(source.count)}
                      />
                      <Metric
                        label="Matching records"
                        value={count(data.matched)}
                      />
                      <Metric label="Visible columns" value={columns.length} />
                      <Metric label="Dataset" value={source.classification} />
                    </div>
                  )}
                </>
              )}
              {tableView && (
                <Records
                  data={data}
                  view={view}
                  page={page}
                  setPage={setPage}
                  columns={columns}
                  setColumns={setColumns}
                  search={filters.search}
                  setSearch={(v) => setFilter("search", v)}
                  exportRows={exportRows}
                  openRow={setDetail}
                  busy={busy || exporting}
                />
              )}
              {view === "Data Explorer" && (
                <section className="schema-section">
                  <h3>CSV schema</h3>
                  <p>
                    One row per shipment. Required: Shipment ID, Shipment Type
                    (Import / Export), ETD. Dates: YYYY-MM-DD. Currency: INR.
                  </p>
                  <div>
                    {FIELDS.map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          <footer>
            <span>LG Electronics / EXIM</span>
            <button onClick={() => setShowSource(true)} disabled={!source}>
              Source & metric definitions <Info size={12} />
            </button>
          </footer>
        </main>
      </div>
      {showSource && source && (
        <Source source={source} onClose={() => setShowSource(false)} />
      )}{" "}
      {detail && <Detail row={detail} onClose={() => setDetail(null)} />}{" "}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {exporting && (
        <div className="export-status">
          <LoaderCircle className="spinner" size={15} />
          Exporting filtered records...
        </div>
      )}
    </div>
  );
}
function FilterSelect({ name, value, values, change }) {
  return (
    <label className="filter-select">
      <span>
        {name === "flow"
          ? "Flow"
          : name === "country"
            ? "Origin / destination"
            : name === "cha"
              ? "CHA"
              : name[0].toUpperCase() + name.slice(1)}
      </span>
      <select
        aria-label={
          name === "country"
            ? "Origin or destination"
            : name[0].toUpperCase() + name.slice(1)
        }
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        <option value="All">
          All{" "}
          {name === "flow"
            ? "flows"
            : name === "country"
              ? "countries"
              : name + "s"}
        </option>
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
const root =
  import.meta.hot?.data.root || createRoot(document.getElementById("root"));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<App />);
