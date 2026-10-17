export const printStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap');

  :root {
    --paper: #f7f3ec;
    --ink: #17140f;
    --ink-muted: #6b655b;
    --rule: #d9d3c7;
    --burgundy: #6d1f2e;
  }

  @page {
    size: A4 portrait;
    margin: 12mm 10mm 14mm 10mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    background-color: var(--paper);
    color: var(--ink);
    font-family: 'Newsreader', Georgia, serif;
    margin: 0;
    padding: 0;
    line-height: 1.45;
    font-size: 10pt;
  }

  .sans {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Page breaks */
  .page {
    page-break-after: always;
    position: relative;
    min-height: 265mm;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Folio headers & footers */
  .folio-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 4px;
    margin-bottom: 12px;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ink-muted);
  }

  .folio-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--rule);
    padding-top: 4px;
    margin-top: 16px;
    font-size: 8pt;
    color: var(--ink-muted);
  }

  /* Masthead */
  .masthead {
    text-align: center;
    border-bottom: 3px double var(--ink);
    padding-bottom: 8px;
    margin-bottom: 14px;
  }
  .masthead-title {
    font-size: 38pt;
    font-weight: 600;
    letter-spacing: -0.03em;
    margin: 0;
    line-height: 1;
    color: var(--ink);
  }
  .masthead-subbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--ink);
    border-bottom: 1px solid var(--ink);
    padding: 3px 0;
    margin-top: 6px;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-muted);
  }

  /* Headlines */
  h1, h2, h3, h4 {
    margin: 0;
    color: var(--ink);
    font-family: 'Newsreader', Georgia, serif;
  }

  .headline-of-the-day {
    font-size: 15pt;
    font-style: italic;
    font-weight: 500;
    text-align: center;
    margin: 10px 0 14px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--rule);
    color: var(--ink);
  }

  /* Section Dividers */
  .section-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 8px 0;
  }
  .section-divider .line {
    flex: 1;
    height: 1.5px;
    background-color: var(--ink);
  }
  .section-divider .title {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--ink);
  }

  /* Columns */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .three-col {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .lead-grid {
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    gap: 16px;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 12px;
    margin-bottom: 12px;
  }

  /* Drop Caps */
  .drop-cap::first-letter {
    font-family: 'Newsreader', Georgia, serif;
    float: left;
    font-size: 3.4em;
    line-height: 0.75;
    margin-top: 0.05em;
    padding-right: 0.12em;
    color: var(--burgundy);
    font-weight: 600;
  }

  /* Story Cards in Print */
  .story-item {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 12px;
  }
  .story-tag {
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--burgundy);
    margin-bottom: 2px;
  }
  .story-title {
    font-size: 11pt;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 4px;
    color: var(--ink);
  }
  .story-summary {
    font-size: 8.5pt;
    line-height: 1.4;
    color: rgba(23, 20, 15, 0.88);
    text-align: justify;
  }
  .story-meta {
    font-size: 7pt;
    color: var(--ink-muted);
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
  }
  .why-shown-note {
    font-size: 7pt;
    font-style: italic;
    color: var(--ink-muted);
    margin-top: 2px;
  }

  /* Boxed Callouts */
  .callout-box {
    border: 1px solid var(--ink);
    padding: 8px 10px;
    margin: 10px 0;
    background-color: rgba(247, 243, 236, 0.8);
    page-break-inside: avoid;
  }
  .impact-box {
    border-left: 3.5px solid var(--burgundy);
    background-color: rgba(109, 31, 46, 0.04);
    padding: 6px 10px;
    margin: 6px 0;
    font-size: 8pt;
    font-style: italic;
    page-break-inside: avoid;
  }

  /* QR Code Grid on Back Page */
  .qr-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 12px;
    border-top: 1px solid var(--rule);
    padding-top: 10px;
  }
  .qr-item {
    text-align: center;
    page-break-inside: avoid;
  }
  .qr-item img {
    width: 60px;
    height: 60px;
    margin: 0 auto;
    display: block;
  }
  .qr-title {
    font-size: 6.5pt;
    font-weight: 600;
    margin-top: 4px;
    line-height: 1.2;
    max-height: 2.4em;
    overflow: hidden;
  }

  /* Weekly / Edition Reading Summary */
  .reading-summary-banner {
    border: 1.5px solid var(--ink);
    padding: 10px 14px;
    margin-bottom: 14px;
    background-color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;
