import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import styles from "./pieChart.module.css";
import { useTranslation } from "react-i18next";

const RADIAN = Math.PI / 180;
const COLORS = ["#C28E5C", "#D6B392"];
const STATUS_COLORS = ["#D38200", "#3498DB", "#2A8C5B", "#9B59B6"]; // pending_scheduling, scheduled, live, completed
const STATUS_KEYS = ["pending_scheduling", "scheduled", "live", "completed"];

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  if ((percent ?? 0) < 0.08) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
  const y = cy + radius * Math.sin(-(midAngle ?? 0) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
      fontFamily="Cairo, sans-serif"
    >
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
};

export default function PieChartComponent({ data, title, type = "revenue", colors }) {
  const { t } = useTranslation("adminDashboard");

  // Transform data based on type
  let chartData = [];
  let total = 0;
  let statsItems = [];

  if (type === "revenue" && data) {
    // Filter out non-numeric values like currency
    const numericEntries = Object.entries(data).filter(
      ([key, value]) => typeof value === "number" && key !== "change"
    );

    chartData = numericEntries.map(([key, value]) => ({
      name: key,
      value: value || 0,
    }));

    // Total is the sum of thisPeriod value or all numeric values
    total =
      data.thisPeriod || chartData.reduce((sum, item) => sum + item.value, 0);

    // Build stats items with proper labels
    statsItems = numericEntries.map(([key, value], index) => ({
      label: t(`charts.${key.toLowerCase()}`, key),
      value: `${value}${data.currency ? ` ${data.currency}` : ""}`,
      colorIndex: index,
    }));

    // Add change percentage if available
    if (data.change !== undefined) {
      statsItems.push({
        label: t("charts.change", "Change"),
        value: `${data.change}%`,
        colorIndex: statsItems.length,
      });
    }
  } else if (type === "tickets" && data) {
    const resolvedTickets = data.resolved || 0;
    const pendingTickets = data.totalPending || 0;

    chartData = [
      { name: "resolved", value: resolvedTickets },
      { name: "pending", value: pendingTickets },
    ];
    total = data.allTickets || 0;

    statsItems = [
      { label: t("charts.resolved"), value: resolvedTickets, colorIndex: 0 },
      { label: t("charts.open"), value: pendingTickets, colorIndex: 1 },
    ];
  } else if (type === "subscriptions" && data) {
    const numericEntries = Object.entries(data).filter(
      ([, value]) => typeof value === "number"
    );

    chartData = numericEntries.map(([key, value]) => ({
      name: key,
      value: value || 0,
    }));

    total = chartData.reduce((sum, item) => sum + item.value, 0);

    statsItems = numericEntries.map(([key, value], index) => ({
      label: t(`charts.${key.toLowerCase()}`, key),
      value,
      colorIndex: index,
    }));
  } else if (type === "eventsByStatus" && data) {
    chartData = STATUS_KEYS.map((key) => ({
      name: key,
      value: data[key] || 0,
    })).filter((item) => item.value > 0);

    total = chartData.reduce((sum, item) => sum + item.value, 0);

    statsItems = STATUS_KEYS.map((key, index) => ({
      label: t(`tables.recentEvents.status.${key}`, key),
      value: data[key] || 0,
      colorIndex: index,
    }));
  }

  const activeColors = colors || (type === "eventsByStatus" ? STATUS_COLORS : COLORS);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title || t(`charts.${type}`)}</h3>
        <p className={styles.totalGuests}>{total}</p>
      </div>
      <div className={styles.body}>
        <div className={styles.stats}>
          {statsItems.map((item, index) => (
            <div className={styles.item} key={index}>
              <span style={{ background: activeColors[index % activeColors.length] }}></span>
              <p className={styles.statText}>
                {item.label}: {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className={styles.chart}>
          <PieChart width={130} height={130}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={65}
              fill="#8884d8"
              paddingAngle={0}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={activeColors[index % activeColors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </div>
      </div>
    </div>
  );
}
