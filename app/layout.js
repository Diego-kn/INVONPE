import "./globals.css";

export const metadata = {
  title: 'Control de Indumentaria',
  description: 'Gestión de indumentaria e inventario',
  icons: {
    icon: '/favicon.ico', // O '/favicon.ico'
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/logo.png" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}