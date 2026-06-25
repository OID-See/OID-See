# OID-See — GitHub Actions CI and SARIF Upload

This page explains how to run OID-See as a scheduled GitHub Actions workflow,
upload findings to GitHub code scanning as SARIF, and store raw artefacts for
offline analysis and drift comparison.

See the ready-to-use example workflow at
[`examples/github-actions/oidsee-sarif-scan.yml`](../examples/github-actions/oidsee-sarif-scan.yml).

---

## Table of Contents

1. [Overview](#overview)
2. [Required GitHub Permissions](#required-github-permissions)
3. [Required Secrets](#required-secrets)
4. [Recommended Schedule](#recommended-schedule)
5. [Generated Artefacts](#generated-artefacts)
6. [SARIF Upload Behaviour](#sarif-upload-behaviour)
7. [Drift Comparison in CI](#drift-comparison-in-ci)
8. [Security Considerations](#security-considerations)
9. [Quick Start](#quick-start)

---

## Overview

The example workflow:

1. Checks out the repository and sets up Python.
2. Installs OID-See dependencies from `requirements.txt`.
3. Runs `oidsee_scanner.py` with client-secret authentication against the
   target Entra ID tenant.
4. Produces:
   - An OID-See graph export JSON (`oidsee-export.json`)
   - A SARIF findings file (`oidsee-findings.sarif`)
   - A JSON findings file (`oidsee-findings.json`)
5. Uploads the SARIF file to GitHub code scanning via
   `github/codeql-action/upload-sarif`.
6. Uploads all three files as a workflow artefact for offline use.

---

## Required GitHub Permissions

The workflow requires the following job-level permissions:

| Permission | Level | Reason |
|---|---|---|
| `contents` | `read` | Check out repository code |
| `security-events` | `write` | Upload SARIF to code scanning |
| `actions` | `read` | List and download workflow artefacts |

If your organisation enforces a restrictive default permissions policy, add
the explicit `permissions` block shown in the example workflow to the job.

For **private repositories**, GitHub Advanced Security must be enabled to use
code scanning.  Public repositories can use code scanning without it.

---

## Required Secrets

Store the following as repository secrets (Settings → Secrets and variables →
Actions) or as organisation secrets shared with the repository:

| Secret | Description |
|---|---|
| `AZURE_TENANT_ID` | Directory (tenant) ID GUID of the Entra ID tenant to scan |
| `AZURE_CLIENT_ID` | Application (client) ID of the Entra app registration used for scanning |
| `AZURE_CLIENT_SECRET` | Client secret value for the app registration |

### Entra App Registration

Create a dedicated, least-privilege app registration for CI scanning:

1. Register a new app in Entra ID (Azure portal → App registrations → New).
2. Create a client secret under **Certificates & secrets**.
3. Under **API permissions**, add the following **Application** permissions and
   grant admin consent:

   | Permission | Reason |
   |---|---|
   | `Application.Read.All` | Enumerate app registrations and service principals |
   | `AppRoleAssignment.Read.All` | Read app role assignments |
   | `DelegatedPermissionGrant.Read.All` | Read OAuth2 permission grants |
   | `Directory.Read.All` | Read directory objects |
   | `RoleManagement.Read.Directory` | Read directory role assignments |

4. Do **not** grant write permissions.  The scanner is read-only.
5. Store the tenant ID, client ID, and client secret as GitHub secrets.

> **OIDC / Federated Credentials**: If you prefer to avoid long-lived client
> secrets, you can use Workload Identity Federation (OIDC) by configuring a
> federated credential on the app registration and using the
> `azure/login` action with `client-id`, `tenant-id`, and `subscription-id`.
> Pass the resulting token to `azure-identity`'s `DefaultAzureCredential` by
> setting `--auth-method default` and removing `--client-secret` from the
> command.  Federated credentials are scoped to a specific repository and
> branch, reducing the blast radius of a compromised workflow.

---

## Recommended Schedule

Run the workflow on a recurring schedule to detect drift over time.  The
example uses a weekly cron expression (every Monday at 02:00 UTC):

```yaml
schedule:
  - cron: "0 2 * * 1"
```

Adjust the cadence to match your security posture:

| Cadence | Cron | Use case |
|---|---|---|
| Daily | `0 2 * * *` | High-risk tenants; active permission changes expected |
| Weekly | `0 2 * * 1` | Standard security monitoring |
| Monthly | `0 2 1 * *` | Low-activity tenants or compliance checkpoints |

A `workflow_dispatch` trigger is also included so you can run the scan
manually at any time without waiting for the next scheduled run.  It accepts
an optional `findings_min_level` input (default: `medium`) to control which
risk levels are included in the SARIF output.

---

## Generated Artefacts

Each workflow run produces the following files:

| File | Format | Description |
|---|---|---|
| `oidsee-export.json` | OID-See graph export JSON | Full graph of service principals, permissions, credentials, and risk scores.  Load into the [OID-See web app](https://oid-see.netlify.app/) for interactive exploration. |
| `oidsee-findings.sarif` | SARIF 2.1.0 | Findings filtered to the configured minimum risk level (default: medium and above).  Uploaded to GitHub code scanning. |
| `oidsee-findings.json` | OID-See findings JSON | Full findings array (low and above) for offline analysis and drift comparison. |

All three files are bundled as a single workflow artefact named
`oidsee-scan-<run-id>` with a default retention of 30 days.

> **Treat all artefacts as sensitive security data.**  They contain tenant
> object IDs, permission grant details, risk scores, and credential metadata.
> Review your GitHub repository's artefact visibility and access settings, and
> set a retention period appropriate for your data-handling requirements.

---

## SARIF Upload Behaviour

OID-See SARIF findings map **tenant/runtime objects** (service principals,
applications, OAuth grants) to logical OID-See locations rather than
source-code files.  This is intentional — OID-See analyses live Entra ID
state, not source code.

After upload, findings appear in the repository under **Security → Code
scanning**, labelled with the `oidsee` category.

Key points:

- **Rule IDs** correspond to OID-See risk reason codes (e.g.
  `HAS_PRIVILEGED_SCOPES`, `UNVERIFIED_PUBLISHER`).
- **Locations** reference logical OID-See resource paths (e.g.
  `oidsee/servicePrincipal/<id>`) rather than file paths.
- **Severity mapping**: OID-See `critical` and `high` map to SARIF `error`;
  `medium` maps to `warning`; `low` and `info` map to `note`.
- Findings remain open in code scanning until dismissed or until a subsequent
  upload that does not include them.  If a finding is remediated in the
  tenant, it will be absent from the next scan's SARIF and will be
  automatically closed by GitHub.

**Findings-delta (drift reports) are not emitted as SARIF.**  Use the JSON
artefacts and the `compare_findings.py` tool for drift analysis between runs.
See [Findings Delta / Drift Report](./README.md#findings-delta--drift-report).

**SARIF upload is optional.**  If you do not want findings in code scanning,
remove the `upload-sarif` step.  The JSON and Markdown output formats remain
fully functional and can be used independently.

---

## Drift Comparison in CI

To compare findings between runs, download the `oidsee-findings.json`
artefact from the previous workflow run and pass it to the scanner's
`--compare-findings` flag:

```bash
# Example: pass previous findings JSON to the current run
python oidsee_scanner.py \
  --tenant-id "$AZURE_TENANT_ID" \
  --client-id "$AZURE_CLIENT_ID" \
  --client-secret "$AZURE_CLIENT_SECRET" \
  --auth-method client-secret \
  --out oidsee-export.json \
  --generate-findings oidsee-findings-current.json \
  --compare-findings oidsee-findings-previous.json \
  --delta-output oidsee-findings-delta.json
```

A full drift-enabled workflow would:

1. Download the previous run's `oidsee-findings.json` artefact at the start.
2. Run the scanner with `--compare-findings` pointing to the downloaded file.
3. Upload both the new findings and the delta as artefacts.

---

## Security Considerations

### Credential hygiene

- Rotate the client secret regularly and update the GitHub secret.
- Consider using Workload Identity Federation (OIDC) to avoid long-lived
  secrets entirely.
- Never commit `AZURE_CLIENT_SECRET` or any other credential to the
  repository.

### Least privilege

- Grant only the read-only Graph permissions listed above.
- Do not grant `Directory.ReadWrite.All`, write permissions, or any
  privileged role to the scanning identity.
- Scope the app registration to a single tenant.

### Artefact sensitivity

- Graph exports, findings JSON, and SARIF files contain tenant metadata
  (app IDs, principal IDs, permission grants, risk details).
- Do not commit scan outputs to the repository.
- Set appropriate artefact retention periods and restrict download access
  where possible.
- Consider running the workflow in a private repository so that code scanning
  results are not publicly visible.

### Code scanning visibility

- In private repositories, code scanning results are visible only to
  repository members with at least read access and to organisation security
  managers.
- In public repositories, SARIF uploads are visible to everyone.  If your
  findings contain sensitive tenant details, prefer a private repository.

### Network egress

OID-See contacts Microsoft Graph and, by default, performs optional external
enrichment (DNS, RDAP, IP WHOIS).  If your runner operates behind a
restrictive egress policy, use `--disable-all-enrichment` to restrict
outbound connections to Microsoft Graph only.

---

## Quick Start

1. Fork or clone the repository.
2. Create the Entra app registration as described above.
3. Add `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` as
   repository secrets.
4. Copy
   [`examples/github-actions/oidsee-sarif-scan.yml`](../examples/github-actions/oidsee-sarif-scan.yml)
   to `.github/workflows/oidsee-sarif-scan.yml` in your repository.
5. Push the workflow file and trigger it manually via
   **Actions → OID-See SARIF Scan → Run workflow**.
6. Review findings in **Security → Code scanning**.
