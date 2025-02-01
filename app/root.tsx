import { rootAuthLoader } from "@clerk/remix/ssr.server";
import { ClerkApp } from "@clerk/remix";
import { LoaderFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import "./tailwind.css";
export const loader: LoaderFunction = (args) =>
  rootAuthLoader(args, { secretKey: process.env.CLERK_SECRET_KEY });

function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

// Error boundary is added as another named export in the same file
export function ErrorBoundary() {
  const error = useRouteError();

  // We wrap our error UI in the same HTML structure as our App component
  // This ensures styles and scripts are properly loaded even during errors
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* Check if it's a known route error (like 404 or 500) */}
        {isRouteErrorResponse(error) ? (
          <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">
                {error.status} {error.statusText}
              </h1>
              <p className="text-gray-300">{error.data}</p>
            </div>
          </div>
        ) : (
          // Handle unknown errors
          <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
              <p className="text-gray-300">
                {error instanceof Error ? error.message : String(error)}
              </p>
            </div>
          </div>
        )}
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

// ClerkApp wrapper remains at the bottom
export default ClerkApp(App);
