#!/usr/bin/env bash
# Simula il portale: crea un JWT di test con il nome indicato, lo passa all'applicazione in esecuzione
# nel cookie "portal_session" e mostra se l'autologin scatta. Non legge utenti e non avvia nulla.
#
# Uso:   ./test.sh nome.cognome [url]        (url di default: http://localhost:8091)
# Serve: applicazione già avviata con PORTAL_AUTOLOGIN_INSECURE=1 (token di test non firmato davvero),
#        oppure con la chiave pubblica del portale e un token firmato con la chiave privata corrispondente
#        (PORTAL_TEST_PRIVATE_KEY=percorso/chiave.pem ./test.sh nome.cognome).
set -euo pipefail

NAME_ARG="${1:-}"
if [ -z "$NAME_ARG" ]; then
    echo "Uso: $0 nome.cognome [url]"
    exit 1
fi
BASE="${2:-http://localhost:8091}"
BASE="${BASE%/}"

# Come nel portale: il claim "name" è nome.cognome, senza dominio
NAME=$(echo "$NAME_ARG" | cut -d@ -f1 | tr '[:upper:]' '[:lower:]')

# JWT con i claim del portale. Senza chiave privata la firma è finta: vale solo con PORTAL_AUTOLOGIN_INSECURE=1.
TOKEN=$(python3 - "$NAME" "${PORTAL_TEST_PRIVATE_KEY:-}" <<'PY'
import sys, base64, json, time, subprocess
name, key = sys.argv[1], sys.argv[2]
b = lambda x: base64.urlsafe_b64encode(x).rstrip(b'=').decode()
now = int(time.time())
header = b(json.dumps({"alg": "RS256", "typ": "JWT", "kid": "test"}).encode())
claims = b(json.dumps({
    "sub": "7", "iss": "portal-genai-auth", "aud": "portal-backend",
    "iat": now, "exp": now + 3600, "name": name,
    "preferred_username": name + "@accenture.com", "email": name + "@accenture.com",
    "roles": ["user"],
}).encode())
signing = f"{header}.{claims}"
if key:
    sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", key],
                         input=signing.encode(), capture_output=True, check=True).stdout
else:
    sig = b"unsigned-test-signature"
print(f"{signing}.{b(sig)}")
PY
)

echo "🔗 Applicazione: $BASE"
echo "🎫 JWT di test per: $NAME"

if ! curl -s -o /dev/null --max-time 5 "$BASE/api/practices"; then
    echo "❌ L'applicazione non risponde su $BASE (passa l'URL come secondo parametro)."
    exit 1
fi

# La chiamata che farebbe il portale: la pagina riceve il cookie portal_session
RESPONSE=$(curl -s --max-time 10 -H "Cookie: portal_session=$TOKEN" "$BASE/api/auth/me")
USER_JSON=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    u = json.load(sys.stdin).get('user')
except Exception:
    u = None
print((u['username'] + ' (ruolo: ' + u['role'] + ')') if u else '')
")

echo "---------------------------------------------------------"
if [ -n "$USER_JSON" ]; then
    echo "✅ AUTOLOGIN: l'applicazione ti ha loggato come $USER_JSON"
else
    echo "⛔ NESSUN AUTOLOGIN per '$NAME'. Possibili motivi:"
    echo "   • l'utente non è presente (o non è attivo) nell'applicazione"
    echo "   • il server non è avviato con PORTAL_AUTOLOGIN_INSECURE=1 (o la firma non è valida)."
    echo "     Riavvialo così:  PORTAL_AUTOLOGIN_INSECURE=1 ./start_local.sh   (porta 8091)"
fi
echo "---------------------------------------------------------"

# Pagina nel browser: l'applicazione (in modalità test) imposta il cookie del portale e ti porta alla home già loggato
echo ""
if curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE/api/auth/test-portal-cookie?token=x" | grep -q 404; then
    echo "ℹ️  Il server non espone l'apertura automatica (serve PORTAL_AUTOLOGIN_INSECURE=1 e il codice aggiornato)."
    echo "    Nel browser, console (Cmd+Opt+J) su $BASE, incolla:"
    echo "      document.cookie='portal_session=$TOKEN; path=/'; location.reload();"
else
    echo "🌐 Apro la pagina già loggata come $NAME..."
    open "$BASE/api/auth/test-portal-cookie?token=$TOKEN" 2>/dev/null || echo "Apri: $BASE/api/auth/test-portal-cookie?token=<jwt>"
fi
