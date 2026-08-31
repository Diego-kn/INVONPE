import "./globals.css";

export const metadata = {
  title: "INVENTARIO OPERACIONES",
  description: "CONTROL DE INDUMENTARIA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}