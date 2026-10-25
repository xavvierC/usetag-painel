import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store";
export const metadata: Metadata = {
  title: "USETAG | Vendas e Comissão",
  description: "Seu espaço de vendas, comissões e pedidos.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
