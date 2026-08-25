# HELIOS

Grid asset intelligence and outage command platform for Aldergate Energy Networks,
a fictional UK electricity distribution network operator.

Built on Microsoft Dataverse as a PL-400 study and portfolio project. Dataverse is
the only data platform. There is no production environment.

## Repository layout

| Path | Contents |
| --- | --- |
| `solutions/` | Unpacked Dataverse solution source, one folder per solution |
| `src/plugins/` | C# plug-in and custom API assemblies, .NET Framework 4.6.2 |
| `src/pcf/` | Power Apps component framework controls |
| `src/functions/` | Azure Functions |
| `src/tools/` | Console applications for data seeding and delta sync |
| `src/webresources/` | Model-driven app client scripts |
| `docs/` | Architecture, logic placement, security model |
| `docs/decisions/` | Architecture decision records |
| `evidence/` | Diagrams, screenshots, Monitor traces, exam drills |
| `.github/workflows/` | GitHub Actions CI/CD |

## Solutions

| Solution | Contents |
| --- | --- |
| HELIOS Core | Tables, relationships, keys, security roles, environment variables |
| HELIOS Logic | Plug-ins, custom APIs, Power Fx functions, business events |
| HELIOS Experience | Canvas app, model-driven app, code components, component library |
| HELIOS Automation | Cloud flows, connection references, custom connector |
| HELIOS Agent | Copilot Studio agent |

## Conventions

- Publisher prefix `hel` on all schema names
- `Hel.` namespace on .NET assemblies
- `HELIOS` prefix on solution and app display names

## Note on credentials

This repository is public and contains no credentials. Client secrets, signing keys,
connection definitions and environment URLs are held in environment variables and
GitHub Actions secrets. See `.gitignore`.
Tooling notes for PowerShell and Git are in docs/tooling-primer.md.