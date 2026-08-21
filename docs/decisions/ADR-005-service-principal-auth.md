# ADR-005. Service principal authentication for ALM operations

Status: Accepted. Privilege posture is temporary, see Debt.
Date: Module 1, Stage 6.

## Context

Interactive pac auth profiles expire after roughly an hour. The silent token
refresh does not carry the MFA claim from the original browser sign-in, so
Dataverse rejects the refreshed token. Solution export, import and pipeline
operations cannot depend on a credential that fails mid-operation.

## Decision

One Microsoft Entra application registration, HELIOS ALM Service Principal,
single tenant, no redirect URI, no API permissions. Client secret with a six
month expiry.

Application users created from that registration in HELIOS DEV and HELIOS TEST,
each assigned System Administrator. SANDBOX deferred to Module 11.

Two pac auth profiles, HELIOS-DEV-SPN and HELIOS-TEST-SPN, authenticating with
the OAuth 2.0 client credentials grant.

The three interactive profiles from Module 0 are retained. Service principal
profiles are used for CLI and automation. Interactive profiles are used for
anything requiring a licensed user.

## Reasoning

Client credentials has no user, no MFA and no interactive challenge, so there is
nothing to prompt for and no claim to drop on refresh. No redirect URI is
configured because there is no user agent to redirect.

Built manually rather than with pac admin create-service-principal. The command
produces the same result in one line but creates a new app registration on every
run, which does not fit one application with application users in several
environments, and it defaults the role to System Administrator without the
decision being made explicitly.

No Entra API permissions were added. Authorisation in Dataverse comes from the
application user record and its security role, not from an Entra API permission.
The app registration is a tenant-level identity; the application user is a
per-environment grant. They are separate decisions and the registration alone
grants nothing.

## Secret handling

The client secret is stored in a user-scoped Windows environment variable,
HELIOS_SPN_SECRET, and referenced as $env:HELIOS_SPN_SECRET so it never appears
in PowerShell command history. It is not in the repository, which is public.

This stores the secret in the user registry hive in plain text. Acceptable on a
personal development tenant. Not acceptable in production, where it would be a
Key Vault reference or Windows Credential Manager. Module 11 uses GitHub Actions
repository secrets for the same credential.

Secret expiry is diarised. An expired client secret causes total, sudden failure
of every automated operation with no code change to explain it.

## Alternatives rejected

pac admin create-service-principal. Faster and correct, but hides the four
distinct objects involved and creates a new registration per environment.

Certificate credential instead of a client secret. Stronger, and required for the
P9 managed identity work in Module 9, which needs a signed assembly and a
federated identity credential. Not needed for CLI authentication and deferred.

Continuing with interactive profiles and re-authenticating hourly. Rejected: an
export that fails part way through leaves a partial unpack and a misleading diff.

## Debt

System Administrator on both application users is a deliberate temporary posture,
not a design choice. G6 requires a custom role granting only the privileges the
plug-ins and flows actually need. That role is built in Module 2, together with
the exercise of stripping a privilege from the application user, observing the
failure, reading the error and restoring it.

Replace by: Module 2.

## References

- https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/auth
- https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/admin
- https://learn.microsoft.com/en-us/power-platform/admin/powerplatform-api-create-service-principal
