import Link from "next/link";

export default function VendorNotFound() {
  return <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}><div><h1>Vendor not found</h1><p>This vendor is no longer available in the marketplace.</p><Link href="../..">Back to marketplace</Link></div></main>;
}
