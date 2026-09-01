import "./globals.css";

export const metadata = {
  title: 'Control de Indumentaria',
  description: 'Gestión de indumentaria e inventario',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}