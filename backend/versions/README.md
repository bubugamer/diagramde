Place versioned PlantUML jars here, e.g. versions/1.2023.10/plantuml.jar. The backend uses these paths to execute rendering with resource limits.

Suggested setup:
- Download from https://plantuml.com/download and place the jar under versions/<version>/plantuml.jar.
- Example (1.2023.10): `mkdir -p versions/1.2023.10 && curl -L -o versions/1.2023.10/plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2023.10/plantuml-1.2023.10.jar`
- Keep the jar filename exactly `plantuml.jar` so server.ts can find it.
