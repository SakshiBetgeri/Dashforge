# InsightIQ — AI Dashboard Builder

Transform raw data into beautiful, high-fidelity dashboards instantly.

## 🚀 Deployment to Netlify

1. **Environmental Configuration**:
   Add `GEMINI_API_KEY` to your Netlify Environment Variables.
   
2. **Build Configuration**:
   - Build Command: `npm run build`
   - Publish Directory: `dist`

3. **SPA Routing**:
   The included `netlify.toml` and `_redirects` handle deep linking for the React application.

## 🛠 Features

- **Multimodal Upload**: Support for CSV and Excel (XLSX/XLS).
- **AI Intelligence**: Automated domain detection and insight synthesis via Gemini Pro.
- **Bento Grid UX**: High-density, glassmorphism-based design system.
- **Neural Insights**: Anomaly detection and strategic opportunity mapping.
- **Responsive Design**: Polished experience across all device classes.

## 📦 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4
- **Animation**: Framer Motion
- **Visualization**: Recharts, D3
- **AI**: Google Gemini API
- **Data**: PapaParse, SheetJS
