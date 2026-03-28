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

- `score` powinien być w zakresie 1–10
- `summary` to podsumowanie (PL) z kroku Blue Hat (czysty tekst, bez JSON/markdown/list)
- gdy `include_trace=true`, zobaczysz przebieg w `rounds[]` (per kapelusz i per aktor)

````bash
curl -s http://127.0.0.1:8000/v1/six-hats \
  -H 'content-type: application/json' \
  -d '{
    "project": {
      "project_title": "InnoYield: predykcyjna giełda innowacji miejskich",
      "project_description": "Platforma łączy prediction market z systemem nagradzania wkładu. Mieszkańcy i urzędnicy obstawiają prawdopodobieństwo sukcesu projektów, a autorzy rozwijają pomysły przez kolejne etapy PoC.",
      "additional_context": "Cel pilotażu: 3 miasta, horyzont 12 miesięcy, KPI: liczba wdrożeń, oszczędności budżetowe, retencja użytkowników.",
      "language": "pl"
    },
    "mode": "actors",
    "include_trace": true
  }' | jq

### Aktorzy vs Kapelusze (ważne)

Domyślnie (`mode: "actors"`) system rozdziela:

- **Aktorów** – stałe persony (np. radca prawny, inżynier ML, mieszkaniec)
- **Kapelusze** – tryby myślenia / ograniczenia na daną iterację (white/red/black/yellow/green)

Czyli w każdej iteracji przechodzisz po kapeluszach, a **każdy aktor** wypowiada się w ramach aktualnego kapelusza.

Jeśli nie podasz `actors`, serwis **wygeneruje automatycznie 3 aktorów** przy pomocy LLM na podstawie opisu projektu.
Wygenerowani aktorzy to **role / stanowiska** (np. "Dyrektor produktu", "Radca prawny (RODO)") — nie imiona i nazwiska.
Możesz to nadpisać, przekazując własne `actors` w request.

Na końcu jest osobny krok **Blue Hat**, który robi syntezę i wystawia `score` + `summary`.
W trybie `actors` ten krok jest wykonywany przez **jedną personę** ("boss" / facylitator), a nie przez wszystkich aktorów.

Możesz ją nadpisać polem `blue_actor`:

```json
{
  "mode": "actors",
  "blue_actor": {"name": "Dyrektor", "persona": "Jesteś dyrektorem. Podejmujesz decyzję i ustalasz priorytety."}
}
```

Możesz też podać własnych aktorów:

```bash
curl -s http://127.0.0.1:8000/v1/six-hats \
  -H 'content-type: application/json' \
  -d '{
    "project": {
      "project_title": "…",
      "project_description": "…",
      "language": "pl"
    },
    "mode": "actors",
    "actors": [
      {"name": "CFO", "persona": "Jesteś CFO. Patrzysz na koszty, ryzyko i ROI."},
      {"name": "CTO", "persona": "Jesteś CTO. Patrzysz na wykonalność, utrzymanie i bezpieczeństwo."}
    ],
    "include_trace": true
  }' | jq
````

### Tryb legacy

Jeśli chcesz zachować wcześniejsze zachowanie (jedna persona na kapelusz), ustaw:

```json
{ "mode": "legacy" }
```

```

4. Logi „co każdy agent powiedział”

Serwer loguje wyjście każdego kapelusza w stdout (widzisz je w terminalu z `uvicorn`).

## Konfiguracja (env)

- `MODEL_NAME` (domyślnie: `speakleash/Bielik-1.5B-v3.0-Instruct`)
- `DEVICE` (np. `cuda`, `mps`, `cpu`; domyślnie auto)
- `MAX_NEW_TOKENS`, `MAX_TOTAL_NEW_TOKENS`, `TEMPERATURE`, `TOP_P`
```
