import InvitationBalanceCard from "../../events/InvitationBalanceCard";

export default function LastEventQuota({ balance, subscription, event }) {
  if (!balance) return null;
  return (
    <InvitationBalanceCard
      compact
      balance={balance}
      currentSubscription={subscription}
      event={event}
      returnTo="Home"
    />
  );
}
