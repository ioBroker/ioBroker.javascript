# Funktionspläne (FBD)

Ein Funktionsplan ist Logik aus Bausteinen, so wie eine SPS in CFC programmiert wird: Timer, Flipflops, Vergleiche
und Arithmetik, verbunden mit ioBroker-Datenpunkten. Er ist für Logik gedacht, die dauerhaft läuft - Verzögerungen,
Selbsthaltungen, Schwellwerte - und für Nutzer, die diese Art aus der SPS-Welt kennen. Wer auf ein einzelnes Ereignis
reagieren will, ist mit Blockly oder Rules meist einfacher unterwegs.

Beim Speichern wird der Plan in JavaScript übersetzt und läuft wie jedes andere Skript dieses Adapters.

## Einen Plan anlegen

Ein neues Skript hinzufügen und **Funktionsplan** wählen. Der Editor hat drei Bereiche:

- **Palette** (links): die Bausteine nach Kategorien. Einen Baustein auf die Fläche ziehen oder anklicken.
- **Fläche**: einen Ausgang (rechts am Baustein) mit einem Eingang (links) verbinden. Nur passende Typen lassen
  sich verbinden; ein Eingang nimmt genau eine Verbindung. `Entf` löscht das Ausgewählte.
- **Eigenschaften** (rechts): die Einstellungen des gewählten Bausteins - Instanzname, der gelesene oder
  geschriebene Datenpunkt, die Werte nicht verbundener Eingänge, invertierte Eingänge. Ist nichts gewählt, die
  Einstellungen des Plans.

Probleme stehen unten links auf der Fläche; ein Klick wählt den Baustein aus. Ein Plan mit Fehlern lässt sich
speichern, sein Skript läuft aber nicht, sondern meldet die Fehler im Protokoll.

Der Knopf **FBD → JS** zeigt den erzeugten Code.

## Bausteine

| Kategorie  | Bausteine                                         |
|------------|---------------------------------------------------|
| ioBroker   | `STATE_IN`, `STATE_OUT`, `CONST`                  |
| Logik      | `AND`, `OR`, `XOR`, `NOT`, `RS`, `SR`, `R_TRIG`, `F_TRIG` |
| Zeit       | `TON`, `TOF`, `TP`                                |
| Vergleich  | `GT`, `GE`, `LT`, `LE`, `EQ`, `NE`                |
| Arithmetik | `ADD`, `SUB`, `MUL`, `DIV`, `MIN`, `MAX`          |

Namen und Verhalten folgen IEC 61131-3. `AND`, `OR`, `XOR`, `ADD`, `MUL`, `MIN` und `MAX` haben 2 bis 16 Eingänge.
Zeiten werden wie `500ms`, `2s`, `1m30s` oder `T#2s` eingegeben.

- `STATE_IN` liest einen Datenpunkt und wandelt ihn in den gewählten Typ (`BOOL`, `INT`, `REAL`, `STRING`). Ein
  Wert, der sich nicht wandeln lässt, wird einmal im Protokoll gemeldet und als 0 gelesen. Beim Auswählen eines
  Datenpunkts wird der Typ aus seinem Objekt übernommen.
- `STATE_OUT` schreibt einen Datenpunkt nur, wenn sich der Wert ändert. `Mindestzeit zwischen zwei
  Schreibvorgängen` begrenzt, wie oft er schreibt; der letzte Wert wird geschrieben, wenn die Zeit um ist.

Signaltypen: `BOOL`, `INT`, `REAL`, `TIME`, `STRING`. Ein `INT` darf an einen `REAL`-Eingang; andere Umwandlungen
geschehen nicht von selbst.

## Ausführung

Die Bausteine laufen in der Reihenfolge des Datenflusses; die Zahl in der Ecke jedes Bausteins ist seine Position.
Was gleichzeitig laufen könnte, läuft von links nach rechts, dann von oben nach unten.

- **Ereignisgesteuert**: Hängt kein Baustein von der Zeit ab, läuft der Plan, sobald sich ein Eingang ändert.
  Änderungen innerhalb von 20 ms laufen gemeinsam in einem Zyklus.
- **Zyklisch**: Sobald der Plan einen Timer enthält, läuft er alle 200 ms (50 ms bis 10 s, siehe Einstellungen des
  Plans) und zusätzlich direkt nach der Änderung eines Eingangs.

Die Betriebsart wird automatisch gewählt oder in den Einstellungen des Plans festgelegt.

Eine Rückkopplung ist nur über einen speichernden Baustein erlaubt (Timer, Flipflop, Flanke): Die zurückführende
Verbindung liest, was dieser Baustein im vorigen Zyklus ausgegeben hat, und wird als Doppelstrich gezeichnet. Eine
Rückkopplung ohne einen solchen Baustein ist ein Fehler.

Ein Timer zählt ab dem Zyklus, in dem er die Änderung seines Eingangs sieht. Er läuft also nie vor seiner Zeit ab,
höchstens einen Zyklus später.

## Grenzen

- Nicht für sicherheitsgerichtete Funktionen. Ein Plan läuft in einem ioBroker-Skript, ohne Echtzeitgarantien.
- Der Zustand der Bausteine bleibt über einen Neustart des Skripts nicht erhalten.
- Noch nicht vorhanden: Onlineansicht der Werte, eigene Bausteine und Unterpläne, Kopieren und Einfügen,
  Rückgängig, automatisches Anordnen.

## Ablage

Der Plan steht im Skript selbst, als letzte Zeile von `common.source` (`//#fbd:{...}`); darüber steht der erzeugte
Code. Die Bausteine sind im Modul `@iobroker/fb-runtime` umgesetzt, das mit dem Adapter kommt, und werden nicht in
jedes Skript kopiert.
