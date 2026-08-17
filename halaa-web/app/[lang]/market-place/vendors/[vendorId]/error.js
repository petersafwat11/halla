"use client";

export default function VendorProfileError({ reset }) {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <h1>Unable to load this vendor</h1>
        <p>Please check your connection and try again.</p>
        <button type="button" onClick={reset} style={{ border: 0, borderRadius: 10, padding: "11px 18px", background: "#c28e5c", color: "#fff", cursor: "pointer" }}>Try again</button>
      </div>
    </main>
  );
}
