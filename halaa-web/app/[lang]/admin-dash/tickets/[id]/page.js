import { redirect } from "next/navigation";

export default async function TicketRedirect({ params }) {
  const { lang } = await params;
  redirect(`/${lang}/admin-dash/tickets`);
}
