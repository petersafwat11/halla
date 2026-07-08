import { redirect } from "next/navigation";

/**
 * Legacy reset-password → canonical change-password redirect (§5.1).
 *
 * The backend now emails `/<lang>/change-password?token=<token>`, but reset
 * emails already in flight (valid up to 1 hour) point at the old
 * `/<lang>/reset-password?token=<token>` shape, which would otherwise 404.
 * This deterministically redirects to the working form while preserving the
 * token, so no in-flight reset link breaks during the cutover. New links never
 * hit this route. Safe across Next 13/14/15 (awaiting params/searchParams works
 * whether they are promises or plain objects).
 */
export const dynamic = "force-dynamic";

export default async function ResetPasswordRedirect(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const lang = params?.lang || "ar";
  const token = searchParams?.token;
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";

  redirect(`/${lang}/change-password${qs}`);
}
