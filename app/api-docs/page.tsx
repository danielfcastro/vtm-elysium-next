export default function SwaggerPage() {
  return (
    <html lang="en">
      <head>
        <title>VTM Elysium API Documentation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.0/swagger-ui.css"
        />
        <style>
          {`
            body {
              margin: 0;
              padding: 0;
              background: #1a1a1a;
            }
            .swagger-ui .info .title {
              color: #90ee90 !important;
            }
            .swagger-ui .info .description {
              color: #ddd !important;
            }
            .swagger-ui textarea {
              background: #2a2a2a !important;
              color: #fff !important;
            }
          `}
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script
          src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.0/swagger-ui-bundle.js"
          charSet="UTF-8"
        />
        <script
          src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.0/swagger-ui-standalone-preset.js"
          charSet="UTF-8"
        />
        <script
          src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.0/swagger-initializer.js"
          charSet="UTF-8"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = () => {
                window.ui = SwaggerUIBundle({
                  url: "/api/swagger",
                  dom_id: "#swagger-ui",
                  deepLinking: true,
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                  ],
                  layout: "StandaloneLayout",
                  docExpansion: "list",
                  filter: true,
                  showExtensions: true,
                  showCommonExtensions: true,
                });
              };
            `,
          }}
        />
      </body>
    </html>
  );
}
