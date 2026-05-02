import React from "react";
import ActivitySummery from "./activitySummery/ActivitySummery";
import TopVendors from "./topVendors/TopVendors";
import styles from "./bottom.module.css";

const Bottom = ({ bestVendors, lastEvents }) => {
  return (
    <div className={styles.container}>
      {/* <ActivitySummery lastEvents={lastEvents} /> */}
      <TopVendors bestVendors={bestVendors} />
    </div>
  );
};

export default Bottom;
