// Shared by every email template. Email clients ignore stylesheets,
// inline styles are the only styling that renders reliably.
export const styles = {
  body: { backgroundColor: "#f4f4f5", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" },
  container: { backgroundColor: "#ffffff", borderRadius: "8px", maxWidth: "560px", padding: "32px" },
  // A logo is at most 512px wide and tall (ADR 0026), shown 64px tall.
  logo: { display: "block", margin: "0 0 16px", maxWidth: "100%" },
  heading: { color: "#18181b", fontSize: "20px", margin: "0 0 24px" },
  text: { color: "#27272a", fontSize: "16px", lineHeight: "24px" },
  button: {
    backgroundColor: "#18181b",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "16px",
    padding: "12px 20px",
    textDecoration: "none",
  },
  contact: { color: "#3f3f46", fontSize: "14px", lineHeight: "22px", margin: "0" },
  footer: { color: "#71717a", fontSize: "12px", lineHeight: "18px" },
};
