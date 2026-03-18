"use client";

import Script from "next/script";

export default function SwaggerPage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.0/swagger-ui.css"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* ── Reset & base ─────────────────────────────────── */
            *, *::before, *::after { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }

            body {
              background: #0d0d0f !important;
              font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
              color: #e2e8f0;
            }

            /* ── Top header bar ──────────────────────────────── */
            .vtm-api-header {
              position: sticky;
              top: 0;
              z-index: 100;
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 12px 28px;
              background: rgba(13,13,15,0.92);
              backdrop-filter: blur(12px);
              border-bottom: 1px solid rgba(139,0,0,0.35);
              box-shadow: 0 2px 24px rgba(0,0,0,0.55);
            }

            .vtm-api-header .logo-icon {
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #8b0000, #c0392b);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              flex-shrink: 0;
              box-shadow: 0 0 12px rgba(139,0,0,0.5);
            }

            .vtm-api-header .header-text h1 {
              margin: 0;
              font-size: 17px;
              font-weight: 700;
              color: #f8f8f8;
              letter-spacing: 0.02em;
            }

            .vtm-api-header .header-text p {
              margin: 2px 0 0;
              font-size: 12px;
              color: #94a3b8;
            }

            .vtm-api-header .header-badges {
              display: flex;
              gap: 8px;
              margin-left: auto;
              flex-wrap: wrap;
            }

            .vtm-api-header .badge {
              padding: 3px 10px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }
            .badge-version {
              background: rgba(139,0,0,0.25);
              border: 1px solid rgba(139,0,0,0.5);
              color: #f87171;
            }
            .badge-openapi {
              background: rgba(99,102,241,0.18);
              border: 1px solid rgba(99,102,241,0.4);
              color: #a5b4fc;
            }

            /* ── Swagger container ───────────────────────────── */
            #swagger-ui {
              background: #0d0d0f;
              max-width: 1200px;
              margin: 0 auto;
              padding: 0 16px 60px;
            }

            /* ── Global text ─────────────────────────────────── */
            .swagger-ui,
            .swagger-ui * { color: #cbd5e1 !important; }

            .swagger-ui h1, .swagger-ui h2, .swagger-ui h3,
            .swagger-ui h4, .swagger-ui h5, .swagger-ui h6 {
              color: #f1f5f9 !important;
            }

            /* ── Top-bar (filter bar) ─────────────────────────  */
            .swagger-ui .topbar { display: none !important; }

            /* ── Info section ────────────────────────────────── */
            .swagger-ui .information-container {
              background: #111115 !important;
              border: 1px solid rgba(255,255,255,0.06) !important;
              border-radius: 12px !important;
              padding: 28px !important;
              margin: 20px 0 !important;
            }

            .swagger-ui .info {
              margin: 0 !important;
              background: transparent !important;
            }

            .swagger-ui .info .title {
              font-size: 28px !important;
              font-weight: 800 !important;
              color: #f1f5f9 !important;
              letter-spacing: -0.02em !important;
            }

            .swagger-ui .info .title small.version-stamp {
              background: rgba(139,0,0,0.3) !important;
              border: 1px solid rgba(139,0,0,0.5) !important;
              color: #fca5a5 !important;
              border-radius: 6px !important;
              padding: 2px 10px !important;
              font-size: 13px !important;
              font-weight: 600 !important;
              vertical-align: middle !important;
              margin-left: 10px !important;
            }

            .swagger-ui .info .description {
              color: #94a3b8 !important;
              background: transparent !important;
              font-size: 14px !important;
              line-height: 1.7 !important;
            }

            .swagger-ui .info .description p,
            .swagger-ui .info .description li,
            .swagger-ui .info .description ul,
            .swagger-ui .info .description ol,
            .swagger-ui .info .description strong {
              color: #cbd5e1 !important;
            }

            .swagger-ui .info .description code {
              background: rgba(255,255,255,0.07) !important;
              color: #86efac !important;
              border-radius: 4px !important;
              padding: 1px 6px !important;
              font-size: 13px !important;
            }

            .swagger-ui .info .description pre,
            .swagger-ui .info .description .highlight-code {
              background: #1a1a22 !important;
              border: 1px solid rgba(255,255,255,0.07) !important;
              border-radius: 8px !important;
              padding: 14px !important;
              color: #86efac !important;
              font-size: 13px !important;
            }

            /* Markdown tables */
            .swagger-ui .info .description table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            .swagger-ui .info .description th {
              background: rgba(255,255,255,0.05) !important;
              color: #f1f5f9 !important;
              padding: 8px 12px !important;
              text-align: left !important;
              border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            }
            .swagger-ui .info .description td {
              padding: 7px 12px !important;
              border-bottom: 1px solid rgba(255,255,255,0.05) !important;
              color: #cbd5e1 !important;
            }

            /* ── Scheme / Servers bar ────────────────────────── */
            .swagger-ui .scheme-container {
              background: #111115 !important;
              border: 1px solid rgba(255,255,255,0.06) !important;
              border-radius: 10px !important;
              padding: 14px 20px !important;
              margin: 12px 0 !important;
              box-shadow: none !important;
            }

            .swagger-ui .servers-title,
            .swagger-ui .scheme-container .schemes > label {
              color: #94a3b8 !important;
              font-size: 12px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.08em !important;
            }

            .swagger-ui select {
              background: #1a1a22 !important;
              color: #e2e8f0 !important;
              border: 1px solid rgba(255,255,255,0.12) !important;
              border-radius: 6px !important;
              padding: 6px 10px !important;
              font-size: 13px !important;
            }

            /* ── Auth button ─────────────────────────────────── */
            .swagger-ui .auth-wrapper {
              margin: 12px 0 !important;
            }

            .swagger-ui .btn.authorize {
              background: linear-gradient(135deg, #8b0000, #c0392b) !important;
              color: #fff !important;
              border: none !important;
              border-radius: 8px !important;
              padding: 8px 20px !important;
              font-weight: 600 !important;
              font-size: 13px !important;
              cursor: pointer !important;
              box-shadow: 0 0 12px rgba(139,0,0,0.4) !important;
              transition: opacity 0.2s !important;
            }

            .swagger-ui .btn.authorize:hover { opacity: 0.85 !important; }
            .swagger-ui .btn.authorize svg { fill: #fff !important; }

            .swagger-ui .btn.authorize.locked {
              background: #1a2a1a !important;
              border: 1px solid #22c55e !important;
              color: #86efac !important;
              box-shadow: 0 0 10px rgba(34,197,94,0.25) !important;
            }
            .swagger-ui .btn.authorize.locked svg { fill: #86efac !important; }

            /* ── Filter input ────────────────────────────────── */
            .swagger-ui .filter-container {
              background: transparent !important;
              margin: 8px 0 !important;
            }

            .swagger-ui .filter .operation-filter-input {
              background: #111115 !important;
              border: 1px solid rgba(255,255,255,0.1) !important;
              border-radius: 8px !important;
              color: #e2e8f0 !important;
              padding: 8px 14px !important;
              font-size: 13px !important;
              width: 100% !important;
            }

            .swagger-ui .filter .operation-filter-input::placeholder {
              color: #475569 !important;
            }

            /* ── Tag sections ────────────────────────────────── */
            .swagger-ui .opblock-tag {
              border-bottom: 1px solid rgba(255,255,255,0.07) !important;
              padding: 14px 0 !important;
              font-size: 18px !important;
              font-weight: 700 !important;
              color: #f1f5f9 !important;
              letter-spacing: -0.01em !important;
            }

            .swagger-ui .opblock-tag:hover {
              background: rgba(255,255,255,0.02) !important;
              border-radius: 8px !important;
            }

            .swagger-ui .opblock-tag-section h3 {
              margin: 0 !important;
            }

            /* Tag description */
            .swagger-ui .opblock-tag small {
              color: #64748b !important;
              font-size: 13px !important;
              font-weight: 400 !important;
            }

            /* ── Operation blocks ────────────────────────────── */
            .swagger-ui .opblock {
              border-radius: 10px !important;
              border: 1px solid rgba(255,255,255,0.06) !important;
              margin: 6px 0 !important;
              overflow: hidden !important;
              background: #111115 !important;
              box-shadow: none !important;
              transition: border-color 0.2s !important;
            }

            .swagger-ui .opblock:hover {
              border-color: rgba(255,255,255,0.12) !important;
            }

            .swagger-ui .opblock.is-open {
              border-color: rgba(255,255,255,0.12) !important;
            }

            /* Method colour bands */
            .swagger-ui .opblock.opblock-get    { border-left: 3px solid #3b82f6 !important; }
            .swagger-ui .opblock.opblock-post   { border-left: 3px solid #22c55e !important; }
            .swagger-ui .opblock.opblock-put    { border-left: 3px solid #f97316 !important; }
            .swagger-ui .opblock.opblock-patch  { border-left: 3px solid #a855f7 !important; }
            .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444 !important; }

            .swagger-ui .opblock .opblock-summary {
              background: transparent !important;
              cursor: pointer !important;
              padding: 10px 16px !important;
              align-items: center !important;
            }

            .swagger-ui .opblock .opblock-summary:hover {
              background: rgba(255,255,255,0.03) !important;
            }

            /* Method badges */
            .swagger-ui .opblock-summary-method {
              border-radius: 6px !important;
              font-size: 11px !important;
              font-weight: 800 !important;
              letter-spacing: 0.05em !important;
              min-width: 64px !important;
              text-align: center !important;
              padding: 4px 8px !important;
            }

            .swagger-ui .opblock-get    .opblock-summary-method { background: #1d4ed8 !important; }
            .swagger-ui .opblock-post   .opblock-summary-method { background: #15803d !important; }
            .swagger-ui .opblock-put    .opblock-summary-method { background: #c2410c !important; }
            .swagger-ui .opblock-patch  .opblock-summary-method { background: #7e22ce !important; }
            .swagger-ui .opblock-delete .opblock-summary-method { background: #b91c1c !important; }

            .swagger-ui .opblock-summary-path {
              color: #e2e8f0 !important;
              font-size: 14px !important;
              font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
            }

            .swagger-ui .opblock-summary-description {
              color: #64748b !important;
              font-size: 13px !important;
            }

            /* ── Expanded operation body ──────────────────────── */
            .swagger-ui .opblock-body {
              background: #0d0d0f !important;
              border-top: 1px solid rgba(255,255,255,0.06) !important;
            }

            .swagger-ui .opblock-section-header {
              background: #111115 !important;
              border-bottom: 1px solid rgba(255,255,255,0.06) !important;
            }

            .swagger-ui .opblock-section-header h4 {
              color: #94a3b8 !important;
              font-size: 12px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.1em !important;
            }

            /* ── Parameters ──────────────────────────────────── */
            .swagger-ui .parameter-name {
              color: #fbbf24 !important;
              font-weight: 600 !important;
              font-family: 'JetBrains Mono', monospace !important;
              font-size: 13px !important;
            }

            .swagger-ui .parameter-in {
              color: #475569 !important;
              font-size: 11px !important;
            }

            .swagger-ui table thead tr td,
            .swagger-ui table thead tr th {
              border-bottom: 1px solid rgba(255,255,255,0.08) !important;
              color: #94a3b8 !important;
              font-size: 12px !important;
            }

            .swagger-ui table tbody tr td {
              border-bottom: 1px solid rgba(255,255,255,0.04) !important;
              color: #cbd5e1 !important;
            }

            /* ── Prop types ──────────────────────────────────── */
            .swagger-ui .prop-name {
              color: #93c5fd !important;
              font-family: 'JetBrains Mono', monospace !important;
              font-size: 13px !important;
            }

            .swagger-ui .prop-type {
              color: #86efac !important;
              font-size: 12px !important;
            }

            .swagger-ui .prop-format {
              color: #64748b !important;
              font-size: 11px !important;
            }

            /* ── Response codes ──────────────────────────────── */
            .swagger-ui .response-col_status {
              font-weight: 700 !important;
            }

            .swagger-ui table.responses-table .response-col_status {
              font-size: 13px !important;
              font-weight: 700 !important;
            }

            .swagger-ui .response-col_description { color: #94a3b8 !important; }

            /* ── Code / textarea ─────────────────────────────── */
            .swagger-ui textarea,
            .swagger-ui .body-param textarea {
              background: #1a1a22 !important;
              color: #e2e8f0 !important;
              border: 1px solid rgba(255,255,255,0.1) !important;
              border-radius: 8px !important;
              font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
              font-size: 13px !important;
              padding: 10px !important;
            }

            .swagger-ui .highlight-code,
            .swagger-ui .microlight {
              background: #1a1a22 !important;
              border-radius: 8px !important;
              padding: 12px !important;
              font-size: 13px !important;
            }

            /* ── Example / model ─────────────────────────────── */
            .swagger-ui .model-title { color: #fbbf24 !important; font-weight: 700 !important; }

            .swagger-ui .model-box {
              background: #1a1a22 !important;
              border: 1px solid rgba(255,255,255,0.07) !important;
              border-radius: 8px !important;
            }

            .swagger-ui section.models {
              background: #111115 !important;
              border: 1px solid rgba(255,255,255,0.06) !important;
              border-radius: 12px !important;
              padding: 16px !important;
              margin-top: 20px !important;
            }

            .swagger-ui section.models h4 {
              color: #f1f5f9 !important;
              font-size: 18px !important;
              font-weight: 700 !important;
              border-bottom: 1px solid rgba(255,255,255,0.07) !important;
              padding-bottom: 12px !important;
            }

            /* ── Execute button ──────────────────────────────── */
            .swagger-ui .btn.execute {
              background: linear-gradient(135deg, #1d4ed8, #3b82f6) !important;
              color: #fff !important;
              border: none !important;
              border-radius: 8px !important;
              font-weight: 600 !important;
              font-size: 13px !important;
              padding: 8px 20px !important;
              box-shadow: 0 0 12px rgba(59,130,246,0.35) !important;
            }

            .swagger-ui .btn.execute:hover { opacity: 0.85 !important; }

            /* ── Generic btn ─────────────────────────────────── */
            .swagger-ui .btn {
              border-radius: 6px !important;
              font-size: 13px !important;
              font-weight: 500 !important;
            }

            /* ── Scrollbar ───────────────────────────────────── */
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #111115; }
            ::-webkit-scrollbar-thumb { background: #2d2d3a; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #3d3d50; }

            /* ── Markdown inline code ────────────────────────── */
            .swagger-ui .markdown code {
              background: rgba(255,255,255,0.06) !important;
              color: #86efac !important;
              border-radius: 4px !important;
              padding: 1px 6px !important;
            }

            /* ── "Try it out" notice ─────────────────────────── */
            .swagger-ui .try-out__btn {
              color: #94a3b8 !important;
              border-color: rgba(255,255,255,0.15) !important;
              border-radius: 6px !important;
            }

            .swagger-ui .try-out__btn:hover {
              border-color: rgba(255,255,255,0.3) !important;
              color: #e2e8f0 !important;
            }

            /* ── Response body bg ────────────────────────────── */
            .swagger-ui .responses-inner h4,
            .swagger-ui .responses-inner h5 {
              color: #94a3b8 !important;
            }

            /* loading */
            .swagger-ui .loading-container { background: transparent !important; }
          `,
        }}
      />

      {/* Header */}
      <header className="vtm-api-header">
        <div className="logo-icon">🧛</div>
        <div className="header-text">
          <h1>VTM Elysium API</h1>
          <p>Interactive API Documentation</p>
        </div>
        <div className="header-badges">
          <span className="badge badge-version">v2.1.0</span>
          <span className="badge badge-openapi">OpenAPI 3.0</span>
        </div>
      </header>

      <div id="swagger-ui" />

      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.0/swagger-ui-bundle.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.0/swagger-ui-standalone-preset.js"
        strategy="beforeInteractive"
      />
      <Script
        dangerouslySetInnerHTML={{
          __html: `
            window.onload = function() {
              window.ui = SwaggerUIBundle({
                url: "/api/swagger",
                dom_id: "#swagger-ui",
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                plugins: [
                  SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                docExpansion: "list",
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                tryItOutEnabled: true,
                displayRequestDuration: true,
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                syntaxHighlight: {
                  activated: true,
                  theme: "monokai"
                }
              });
            };
          `,
        }}
        strategy="afterInteractive"
      />
    </>
  );
}
