<img src="../../admin/javascript.svg" alt="ioBroker.javascript" width="100" />

# ioBroker.javascript

## Inhaltsverzeichnis

- [Blockly](blockly.md)
- [Benutzung](usage.md)

## KI-Codegenerator - Unterstützung eigener API-Endpunkte

Der integrierte KI-Codegenerator unterstützt nicht nur die OpenAI-API, sondern auch jeden OpenAI-kompatiblen API-Endpunkt. So können alternative Anbieter genutzt werden, z.B.:

- **Google Gemini** (kostenlos verfügbar, empfohlen)
- **DeepSeek** (sehr günstig)
- **OpenRouter** (Multi-Provider-Gateway)
- **Ollama** (lokale LLMs)
- **LM Studio** (lokale LLMs)
- **Anthropic** (über OpenAI-kompatiblen Proxy)
- Jeder andere Anbieter mit einem OpenAI-kompatiblen `/v1/chat/completions`-Endpunkt

### Empfohlene Anbieter

#### Google Gemini (kostenlos, empfohlen)

Google bietet ein großzügiges kostenloses Kontingent mit einem OpenAI-kompatiblen Endpunkt — ideal für die ioBroker-Skript-Generierung:

| Modell | Anfragen/Min | Anfragen/Tag | Qualität |
|--------|-------------|-------------|----------|
| Gemini 2.5 Flash | 10 | 500 | Sehr gut für Code |
| Gemini 2.5 Pro | 5 | 25 | Ausgezeichnet |
| Gemini 2.0 Flash | 15 | 1500 | Gut |

Einrichtung:
1. Kostenlosen API-Key holen: https://aistudio.google.com/apikey
2. **Base-URL** auf `https://generativelanguage.googleapis.com/v1beta/openai` setzen
3. Ein Gemini-Modell wählen (z.B. `gemini-2.5-flash`)

#### DeepSeek (sehr günstig)

DeepSeek bietet hervorragende Code-Generierung zu sehr niedrigen Kosten (~0,001€ pro Anfrage):
- API-Key holen: https://platform.deepseek.com/
- **Base-URL** auf `https://api.deepseek.com/v1` setzen
- Empfohlenes Modell: `deepseek-chat`

#### Lokale Modelle (Ollama / LM Studio)

Lokale Modelle laufen auf eigener Hardware ohne Internet. Für gute ioBroker-Code-Generierung werden jedoch Modelle mit mindestens 14B+ Parametern empfohlen. Kleine Modelle (7B) erzeugen häufig falsche API-Aufrufe.

- **Ollama**: **Base-URL** auf `http://localhost:11434/v1` setzen, beliebigen Text als API-Key verwenden
- **LM Studio**: **Base-URL** auf `http://localhost:1234/v1` setzen

**Hinweis:** Die kostenlose Version der OpenAI-API (ChatGPT) bietet keinen API-Zugang mehr für Code-Generierung. Google Gemini (kostenlos) oder DeepSeek (sehr günstig) sind empfohlene Alternativen.

### Konfiguration

In den Adapter-Einstellungen unter "Haupteinstellungen" befinden sich folgende Felder für die KI-Konfiguration:

| Einstellung | Beschreibung |
|-------------|-------------|
| **ChatGPT API-Schlüssel** | Der API-Schlüssel. Erforderlich für alle Anbieter. Für Ollama kann ein beliebiger nicht-leerer Wert verwendet werden (z.B. `ollama`). |
| **Eigene API Base-URL** | Die Base-URL des API-Anbieters. Leer lassen für OpenAI. Beispiele: `https://generativelanguage.googleapis.com/v1beta/openai` (Google Gemini), `http://localhost:11434/v1` (Ollama). |

### API-Verbindung testen

Mit dem Button **"API-Verbindung testen"** in den Adapter-Einstellungen kann die Konfiguration überprüft werden. Der Test:
- Verbindet sich mit dem konfigurierten API-Endpunkt
- Validiert den API-Schlüssel
- Gibt die Anzahl der verfügbaren Modelle zurück

### Dynamisches Laden der Modelle

Beim Öffnen des KI-Codegenerator-Dialogs im Skript-Editor werden die verfügbaren Modelle automatisch vom konfigurierten API-Endpunkt abgerufen. Das Modell-Dropdown wird dynamisch befüllt — es gibt keine fest hinterlegte Modellliste.

### Fehlerbehandlung

Wenn der API-Endpunkt nicht erreichbar ist oder einen Fehler zurückgibt, werden benutzerfreundliche Meldungen angezeigt:
- Verbindungsfehler (Endpunkt nicht erreichbar)
- Ungültiger API-Schlüssel (401)
- Zugriff verweigert (403)
- Modell nicht gefunden (404)

Bei fehlgeschlagenem Modellabruf wird ein **Erneut versuchen**-Button angezeigt, sodass ein erneuter Versuch ohne Schließen des Dialogs möglich ist.
