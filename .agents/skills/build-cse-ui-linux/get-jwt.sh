#!/usr/bin/env sh
# Fetch a Camelot Unchained WebAPI access token (JWT) for browser development.
#
# Prints ONLY the token, so it can be piped straight into a tool:
#   TOKEN=$(./get-jwt.sh)
#   # then in the browser devtools console:
#   # localStorage.setItem('cu.dev.accessToken', '<paste>')
#
# Credentials are read from CU_USER / CU_PASS. Keep them out of shell history:
#   printf "export CU_USER='you@example.com'\nexport CU_PASS='...'\n" > ~/.cu_secrets.sh
#   chmod 600 ~/.cu_secrets.sh && source ~/.cu_secrets.sh
#
# Never commit a token or a credentials file.

set -eu

: "${CU_USER:?CU_USER is not set - source your secrets file first}"
: "${CU_PASS:?CU_PASS is not set - source your secrets file first}"

AUTH_URL="${CU_AUTH_URL:-https://api.camelotunchained.com/auth/token}"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required (https://jqlang.github.io/jq/)" >&2
  exit 1
fi

# Build the request body with jq so credentials are escaped correctly.
body=$(jq -n --arg email "$CU_USER" --arg password "$CU_PASS" '{email: $email, password: $password}')

response=$(curl -sS -X POST \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data "$body" \
  "$AUTH_URL") || { echo "error: request to $AUTH_URL failed" >&2; exit 1; }

token=$(printf '%s' "$response" | jq -r '.access_token // empty')

if [ -z "$token" ]; then
  echo "error: no access_token in the response:" >&2
  printf '%s\n' "$response" >&2
  exit 1
fi

printf '%s\n' "$token"
