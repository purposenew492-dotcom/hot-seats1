import "./globals.css";

export const metadata = {
  title: "Hot Seats — Top Ticket Trends",
  description: "Ticket business intelligence platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
