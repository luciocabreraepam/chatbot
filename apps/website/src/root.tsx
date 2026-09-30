import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";

import appCssHref from "./app.css?url";
import stylexCssHref from "./stylex.css?url";
import { DevStyleXInject } from "./components/DevStyleXInject";

export const Layout = ({ children }: { readonly children: React.ReactNode }) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <Meta />
      <link href={appCssHref} rel="stylesheet" />
      <DevStyleXInject cssHref={stylexCssHref} />
      <Links />
    </head>
    <body>
      {children}
      <ScrollRestoration />
      <Scripts />
    </body>
  </html>
);

export default function App() {
  return <Outlet />;
}

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "monospace",
        color: "#f8fafc",
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginBottom: "1rem" }}>{message}</h1>
      <p style={{ color: "#94a3b8" }}>{details}</p>
      {stack && (
        <pre
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#1e293b",
            borderRadius: "8px",
            overflow: "auto",
            fontSize: "12px",
          }}
        >
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
};
