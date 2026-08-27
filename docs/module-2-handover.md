# Module 2 handover

Written at the close of Module 1 and the PowerShell, Git and sequencing
remediation. Everything below the horizontal rule is the opening message for
the Module 2 chat. Paste it verbatim. Do not use the Module Build Prompt from
02-Master-Build-Prompt.md, because it inherits the peer framing from the
kickoff prompt.

---

Starting Module 2, Data model and security, for the HELIOS build.

OVERRIDE ON THE PROJECT BRIEF
The knowledge files say to treat me as a peer and skip explanation. Ignore
that. I am a learner. Before every instruction, explain what the thing is in
plain language, why it exists, why it comes at this point in the sequence,
and what its business value is. Define every term the first time it appears,
even if we used it in an earlier module. My goal is full end-to-end
understanding of Power Platform, not a finished build.

Keep everything else from the brief: exact click paths, exact field values,
complete code, a verification step per stage, preview against GA status,
Exam angle and What breaks here blocks, no em dashes, no bold in body text.
One stage per response, wait for my confirmation before the next.

WHAT EXISTS
M0: three developer environments (HELIOS DEV, TEST, SANDBOX), full toolchain,
repo at github.com/Femiace/helios-platform cloned to C:\dev\helios-platform.
M1: publisher aldergateenergynetworks, prefix hel, option value prefix 10000.
Five segmented solutions, Core > Logic > Automation > Agent > Experience.
Three environment variables, one connection reference. Service principal with
application users in DEV and TEST. Five pac auth profiles. Pipeline DEV to
TEST scaffolded. ADR-000 to ADR-007 committed.
Remediation: PowerShell and Git taught from scratch, dependency sequencing
method, scripts/export-all.ps1 hardened with auth profile enforcement,
publish before export, and exit codes for CI. Managed pack from source
verified working.

AGREED STAGE PLAN FOR MODULE 2
1  Data modelling concepts, ownership types, permanent decisions, ADR
2  Business units, teams, security structure
3  hel_region and hel_substation, columns, first relationship
4  hel_asset, alternate key, change tracking, column security flag
5  hel_outage and hel_workorder, autonumber, access team template
6  Six supporting tables and global choices
7  hel_fieldnote custom activity table, relationship map verified
8  hel_assettelemetry elastic table and its limitations
9  Five security roles plus G6 least privilege application user role
10 Column security profiles on hel_replacementcost and hel_compensationdue
11 Export, unpack, commit, ADRs, docs/security-model.md, close-out

Start with Stage 1 only.

COMMIT CONVENTION
M{module} {component ID or schema name}: what changed
Repository housekeeping uses a plain repo: or docs: prefix.

DEFERRALS AND FORWARD RISKS
- HeliosDataSeeder console app sits between M4 and M5, not in M2
- No .cdsproj files exist yet. pac solution add-reference needs them in M4
  and M6. Use pac solution clone or sync to create them before M4.
- *.snk is gitignored and correctly so. Plug-in signing in M6 and P9 in M9
  will need a GitHub Actions secret instead.
- The DEV to TEST pipeline is a personal pipeline. Personal pipelines cannot
  be extended, so the F6 pre-deployment gate in M11 needs a custom host.
- hel_KeyVaultSecret is Azure track only. The Secret data type supports
  Azure Key Vault and nothing else.

KNOWN ERRORS IN THE PROJECT KNOWLEDGE FILES
- Docs 03 and 04 say pipeline targets only need to be Managed Environments
  if they are not developer environments. Wrong. All targets must be.
- Doc 04 offers a secret environment variable as the non-Azure fallback for
  Key Vault. Wrong. They are the same mechanism.
  