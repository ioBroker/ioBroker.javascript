<img src="../../admin/javascript.svg" alt="ioBroker.javascript" width="100" />

# ioBroker.javascript

## Inhaltsverzeichnis

- [Blockly](blockly.md)
- [Benutzung](usage.md)

## KI-Codegenerator - Unterstützung eigener API-Endpunkte

Der integrierte KI-Codegenerator unterstützt nicht nur die OpenAI-API, sondern auch jeden OpenAI-kompatiblen API-Endpunkt. So können alternative Anbieter genutzt werden, z.B.:

- **Ollama** (lokale LLMs)
- **LM Studio** (lokale LLMs)
- **OpenRouter** (Multi-Provider-Gateway)
- **DeepSeek**
- **Anthropic** (über OpenAI-kompatiblen Proxy)
- Jeder andere Anbieter mit einem OpenAI-kompatiblen `/v1/chat/completions`-Endpunkt

### Konfiguration

In den Adapter-Einstellungen unter "Haupteinstellungen" befinden sich drei Felder für die KI-Konfiguration:

| Einstellung | Beschreibung |
|-------------|-------------|
| **ChatGPT API-Schlüssel** | Der API-Schlüssel. Erforderlich für alle Anbieter. Für Ollama kann ein beliebiger nicht-leerer Wert verwendet werden (z.B. `ollama`). |
| **Eigene API Base-URL** | Die Base-URL des API-Anbieters. Leer lassen für OpenAI. Beispiele: `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio). |
| **Eigener Modellname** | Überschreibt die Modellauswahl im Dropdown mit einem festen Modellnamen. |

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
