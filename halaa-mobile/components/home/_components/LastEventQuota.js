import InvitationBalanceCard from "../../events/InvitationBalanceCard";

export default function LastEventQuota({ balance }) {
  if (!balance) return null;
  return <InvitationBalanceCard compact balance={balance} returnTo="Home" />;
}
