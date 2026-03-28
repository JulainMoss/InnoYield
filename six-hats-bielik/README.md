# bki-bielik – Six Thinking Hats API

Minimalny serwis FastAPI, który uruchamia „Six Thinking Hats” na modelu `speakleash/Bielik-1.5B-v3.0-Instruct`.

## Instalacja

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Uruchomienie API

```bash
uvicorn app.main:app --reload --port 8000
```

Healthcheck: `GET http://127.0.0.1:8000/health`

## Testowanie

### 1) Szybki smoke-test importu (bez uruchamiania serwera)

To jest najszybszy sposób, żeby sprawdzić czy:

- zależności typu `fastapi`/`pydantic` są zainstalowane w tym samym venv,
- moduły `app/*` poprawnie się importują.

Uruchom w katalogu projektu:

```bash
./.venv/bin/python -c "import app.main; print('import ok')"
```

Jeśli to się wywali, `uvicorn` też się wywali — tylko z bardziej rozbudowanym tracebackiem.

### 2) Test end-to-end (HTTP)

1. Uruchom serwer (zawsze z `.venv`, żeby nie pomylić środowiska):

```bash
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

2. Sprawdź health:

```bash
curl -s http://127.0.0.1:8000/health | jq
```

3. Wyślij żądanie Six Hats i sprawdź wynik:

- `blue_score` powinien być w zakresie 1–10
- `summary` to podsumowanie (PL)
- gdy `include_trace=true`, w `trace[]` zobaczysz tekst każdego „kapelusza”

```bash
curl -s http://127.0.0.1:8000/v1/six-hats \
  -H 'content-type: application/json' \
  -d '{
    "project": {
      "project_title": "InnoYield: predykcyjna giełda innowacji miejskich",
      "project_description": "Platforma łączy prediction market z systemem nagradzania wkładu. Mieszkańcy i urzędnicy obstawiają prawdopodobieństwo sukcesu projektów, a autorzy rozwijają pomysły przez kolejne etapy PoC.",
      "additional_context": "Cel pilotażu: 3 miasta, horyzont 12 miesięcy, KPI: liczba wdrożeń, oszczędności budżetowe, retencja użytkowników.",
      "language": "pl"
    },
    "include_trace": true
  }' | jq
```

4. Logi „co każdy agent powiedział”

Serwer loguje wyjście każdego kapelusza w stdout (widzisz je w terminalu z `uvicorn`).

## Konfiguracja (env)

- `MODEL_NAME` (domyślnie: `speakleash/Bielik-1.5B-v3.0-Instruct`)
- `DEVICE` (np. `cuda`, `mps`, `cpu`; domyślnie auto)
- `MAX_NEW_TOKENS`, `MAX_TOTAL_NEW_TOKENS`, `TEMPERATURE`, `TOP_P`
