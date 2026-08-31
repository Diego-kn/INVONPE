import "./globals.css";

export const metadata = {
  title: "Sistema de Inventario",
  description: "Control de chalecos y polos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}