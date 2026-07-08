import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import PaymentReturnClient from "./_components/PaymentReturnClient";

export default function PaymentReturnPage() {
  return (
    <ErrorBoundary>
      <PaymentReturnClient />
    </ErrorBoundary>
  );
}
