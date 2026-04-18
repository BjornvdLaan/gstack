# PQC Rules

Community-maintained detection rules for [Observer](https://github.com/GetQuantumDrive/observer) —
the post-quantum cryptography scanner.

## Structure

```
rules/
  java.yaml          # Java JCA + Bouncy Castle
  python.yaml        # cryptography, paramiko, pycryptodome
  javascript.yaml    # Web Crypto, Node.js crypto, JOSE/JWT
  go.yaml            # crypto/rsa, crypto/ecdsa, crypto/ecdh, tls
  infra.yaml         # (coming) TLS cert checks, SSH key types
```

## Rule format

Rules use a simple YAML format that is a compatible subset of Semgrep metadata:

```yaml
- id: java-rsa-keygen
  language: java              # java | python | javascript | typescript | go | any
  pattern: 'KeyPairGenerator\.getInstance\s*\(\s*["'']RSA["'']'  # regex, per-line, case-insensitive
  algorithm: RSA              # shown in report
  severity: HIGH              # CRITICAL | HIGH | MEDIUM | LOW | SAFE
  message: "RSA key generation is quantum-vulnerable"
  migration: "Replace with ML-DSA (FIPS 204) or ML-KEM (FIPS 203)"
  metadata:
    semgrep_id: java.lang.security.crypto.rsa-key-size.rsa-key-size  # Semgrep equivalent
    cwe: CWE-327
    references:
      - "NIST FIPS 203"
      - "NIST FIPS 204"
```

### `pattern` field

The `pattern` is a **regex** matched against each line of source code
(case-insensitive, single-line). This is intentional for V1 — fast,
zero dependencies, all languages with one engine.

The `metadata.semgrep_id` documents the equivalent Semgrep rule for future
AST-based detection (V3). To run the Semgrep version today, use the
[Semgrep CLI](https://semgrep.dev) with the referenced rule ID.

## Contributing

1. Fork this repo
2. Add rules to the appropriate `rules/*.yaml` file (or create a new file)
3. Test your pattern against real code before submitting
4. Open a pull request with an example of what the rule catches

## Using this rule set

```yaml
- uses: GetQuantumDrive/observer@v1
  with:
    rule-sets: 'GetQuantumDrive/observer-rules@v1'
```

## License

Apache 2.0 — rules are freely usable in any scanner.
