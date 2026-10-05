# LG Electronics EXIM Analytics

Portfolio/demo EXIM analytics command center for Greater Noida operations. All records are **synthetic** and are not LG operational data.

## Data scale
The browser uses a deterministic virtual-data engine representing **5,000,000 rows per analytical table** over the latest 24-month window. Rows are generated on demand, so the Git repository and GitHub Pages site remain fast instead of shipping multi-GB CSV files.

Tables: Shipments, Customs, Freight, CHA/Forwarder, Supplier/Delay analytical views. The Data Explorer can generate/download selected synthetic extracts.

## GitHub Pages
Deployment is configured in `.github/workflows/pages.yml` using GitHub Actions.
