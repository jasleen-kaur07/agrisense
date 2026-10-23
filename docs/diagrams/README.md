# AgriSense diagrams (Mermaid, as code)

Each `.mmd` file is plain-text Mermaid. `png/` holds rendered images (already generated).

| File | Diagram |
|---|---|
| 01-architecture | System architecture (components and calls) |
| 02-use-case | Use cases for Farmer and Admin |
| 03-sequence-login | Sign-in sequence (cookies, tokens) |
| 04-sequence-crop-guide | Regional Crop Guide request sequence |
| 05-sequence-prediction | Soil-test prediction sequence (experimental) |
| 06-er-diagram | Database ER diagram (from the live schema) |
| 07-dfd-level0 | Data flow diagram, level 0 (context) |
| 08-dfd-level1 | Data flow diagram, level 1 |
| 09-deployment | Deployment view (Docker Compose) |
| 10-ml-model-pipeline | ML model training and serving pipeline |
| 11-regional-guide-pipeline | Regional Crop Guide calculation |
| 12-class-diagram | Domain model (class diagram) |

## View or edit
- Paste a file's text into https://mermaid.live to edit and export PNG or SVG.
- VS Code: install a Mermaid preview extension. GitHub renders `.mmd` content inside a fenced mermaid block.

## Re-render all PNGs
```bash
cd apps/web
node ../../docs/diagrams/render.mjs   # needs internet once, for the Mermaid script
```

Notes: Mermaid has no native UML use-case shape, so 02 uses a flowchart with the same meaning. The ER diagram marks the farm/field/feedback owner links as "logical" because the services keep separate schemas with no cross-schema foreign keys.
