import { Cell, Pie, PieChart } from "recharts";
import styles from "./customPieChart.module.css";
import { useTranslation } from "react-i18next";

const COLORS = ["#C28E5C", "#D6B392", "#F5ECE4"];

const CustomPieChart = ({ data: guestStats }) => {
  const { t } = useTranslation("adminDashboard");

  // Transform guest stats data
  const chartData = [
    { name: "confirmed", value: guestStats?.totalConfirmed || 0 },
    { name: "declined", value: guestStats?.totalDeclined || 0 },
    { name: "pending", value: guestStats?.totalPending || 0 },
  ];
  console.log("chartData", chartData);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const statsItems = [
    {
      label: t("charts.confirmed"),
      value: guestStats?.totalConfirmed || 0,
      percentage:
        total > 0
          ? Math.round(((guestStats?.totalConfirmed || 0) / total) * 100)
          : 0,
    },
    {
      label: t("charts.declined"),
      value: guestStats?.totalDeclined || 0,
      percentage:
        total > 0
          ? Math.round(((guestStats?.totalDeclined || 0) / total) * 100)
          : 0,
    },
    {
      label: t("charts.pending"),
      value: guestStats?.totalPending || 0,
      percentage:
        total > 0
          ? Math.round(((guestStats?.totalPending || 0) / total) * 100)
          : 0,
    },
  ];
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("charts.guestResponse")}</h3>
        <p className={styles.totalGuests}>{total}</p>
      </div>
      <div className={styles.body}>
        <div className={styles.stats}>
          {statsItems.map((item, index) => (
            <div className={styles.item} key={index}>
              <span></span>
              <p className={styles.statText}>
                {item.percentage}% {item.label}
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
              innerRadius={45}
              outerRadius={65}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </div>
      </div>
    </div>
  );
};

export default CustomPieChart;
