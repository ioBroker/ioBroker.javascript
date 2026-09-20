# Funktionspläne (FBD)

Ein Funktionsplan ist Logik aus Bausteinen, so wie eine SPS in CFC programmiert wird: Timer, Flipflops, Vergleiche
und Arithmetik, verbunden mit ioBroker-Datenpunkten. Er ist für Logik gedacht, die dauerhaft läuft - Verzögerungen,
Selbsthaltungen, Schwellwerte - und für Nutzer, die diese Art aus der SPS-Welt kennen. Wer auf ein einzelnes Ereignis
reagieren will, ist mit Blockly oder Rules meist einfacher unterwegs.

Beim Speichern wird der Plan in JavaScript übersetzt und läuft wie jedes andere Skript dieses Adapters.

## Einen Plan anlegen

Ein neues Skript hinzufügen und **Funktionsplan** wählen. Der Editor hat drei Bereiche:

- **Palette** (links), mit einer Suche und drei Reitern:
  - **Blöcke**: die Bausteine nach Kategorien - auf die Fläche ziehen oder anklicken. Eine Kategorie klappt mit
    einem Klick auf ihren Namen auf und zu.
  - **Variablen**: die Datenpunkte, die der Plan liest und schreibt; ein Klick zeigt den Baustein.
  - **Favoriten**: die Bausteine, die mit dem Stern markiert sind - er erscheint, wenn die Maus über einem Baustein
    steht.
- **Fläche**: einen Ausgang (rechts am Baustein) mit einem Eingang (links) verbinden. Nur passende Typen lassen
  sich verbinden - die Farbe eines Anschlusses zeigt seinen Typ; wird eine Verbindung auf einem unpassenden
  Anschluss losgelassen, steht oben, warum. Ein Eingang nimmt genau eine Verbindung. `Entf` löscht das Ausgewählte.
- **Eigenschaften** (rechts): **Eigenschaften** zeigt die Einstellungen des gewählten Bausteins in Abschnitten, die
  auf- und zuklappen - Allgemein (Instanzname, Typ, ein Kommentar), Parameter, Eingänge und bei Timern, Flipflops,
  Flanken und Regelungsbausteinen eine **Vorschau**: ein Zeitdiagramm des Bausteins mit seinen Werten.
  **Dokumentation** beschreibt den Baustein und seine Anschlüsse. Ist nichts gewählt: die Einstellungen des Plans
  und die Tastenkürzel.

Ein Baustein zeigt das Wichtige direkt in sich: den Datenpunkt, den er liest oder schreibt, den Wert eines `CONST`
und die Werte der Eingänge, die nicht verbunden sind - sie lassen sich gleich dort ändern: Ein Klick schaltet ein
BOOL um, alles andere wird eingetippt und mit `Enter` übernommen. Im Kopf eines Bausteins zeigt das Zahnrad seine
Eigenschaften, das Menü `⋮` dupliziert oder löscht ihn (online auch: Haltepunkt; bei einem eigenen Baustein:
Innenansicht).

Probleme stehen unten auf der Fläche; ein Klick wählt den Baustein aus. Ein Plan mit Fehlern lässt sich speichern,
sein Skript läuft aber nicht, sondern meldet die Fehler im Protokoll.

Der Knopf **FBD → JS** zeigt den erzeugten Code.

Bearbeiten geht wie gewohnt: `Strg+Z` / `Strg+Y` (oder die Knöpfe der Werkzeugleiste) machen rückgängig und
wiederholen, `Strg+C`, `Strg+X` und `Strg+V` kopieren, schneiden aus und fügen die ausgewählten Bausteine samt der
Verbindungen zwischen ihnen ein - auch in einen anderen Plan. Eingefügte Bausteine bekommen neue IDs und, wo der
alte Name vergeben ist, neue Namen.

Die Leiste über der Fläche zeigt den Plan (und den Pfad in eine Instanz hinein) und hat die Werkzeuge:

- den Zoom: kleiner, der Zoom (ein Klick: 100 %), größer
- **Automatisch anordnen** stellt die Bausteine in Spalten entlang des Datenflusses auf: Eingänge links, Ausgänge
  rechts, jeder Baustein auf der Höhe der Bausteine, mit denen er verbunden ist. Kommentare bleiben, wo sie sind.
  `Strg+Z` nimmt es zurück.
- **Im Plan suchen** (`Strg+F`) findet Bausteine nach Instanzname, Typ, Datenpunkt oder anderem Parameter, Kommentare
  nach ihrem Text. `Enter` geht zum nächsten Treffer, `Umschalt+Enter` zum vorigen, `Esc` schließt die Suche.
- **Raster** an oder aus (mit Raster rasten die Bausteine ein), und Verbindungen als Kurven oder rechtwinklig wie in
  CFC - beides merkt sich der Browser, nicht der Plan
- rechts die Onlineansicht, siehe unten

**Verbindungsmarken**: Eine Verbindung quer durch den Plan lässt sich statt als Linie als Marke an beiden Enden
zeigen - Verbindung auswählen und in ihren Eigenschaften **Als Verbindungsmarke zeigen** einschalten. Beide Marken
zeigen den Namen des Bausteins, von dem die Verbindung kommt, oder einen eigenen. Ein Doppelklick auf eine Marke
springt zum anderen Ende. Nur die Darstellung ändert sich, die Verbindung wirkt wie zuvor.

## Onlineansicht

**Online** (rechts in der Leiste über der Fläche) zeigt die Werte des laufenden Plans: an jedem Ausgang,
BOOL-Leitungen grün (`TRUE`) oder grau (`FALSE`), andere Leitungen mit ihrem Wert in der Mitte. Neben oder unter dem
Knopf stehen:

- der Zykluszähler - er bleibt stehen, wenn der Plan nicht mehr rechnet
- eine Warnung, wenn keine Daten kommen (das Skript läuft nicht, oder seine Instanz ist gestoppt)
- ein Hinweis, wenn der Plan nach dem Speichern geändert wurde: Die Werte gehören zur gespeicherten Fassung

Schlägt ein Zyklus fehl, wird der Baustein, dessen Code fehlschlug, rot umrandet und der Fehler unten links
aufgeführt; auch das Protokoll nennt den Baustein (`Error in the function block diagram in block b7: ...`).

Die Werte fließen nur, solange ein Editor den Plan online zeigt: Der Editor fragt alle 10 s beim Adapter an, nach
30 s ohne Anfrage hört der Plan auf zu senden. Es kommen höchstens vier Aktualisierungen pro Sekunde, jede nur mit den
geänderten Werten. Ein Plan, der vor dieser Version gespeichert wurde, zeigt den Zykluszähler, aber keine Werte -
einmal speichern.

### In eine Instanz hinein

Ein Doppelklick auf eine Instanz eines eigenen Bausteins (oder **Innenansicht** in ihren Eigenschaften) zeigt den
Plan des Bausteins - so, wie dieser Plan ihn mitführt, nur lesbar - und online mit den Werten genau dieser Instanz.
Eine Instanz darin öffnet sich genauso; der Pfad oben links führt zurück, ebenso `Esc`. Werte im Inneren lassen sich
erzwingen; Haltepunkte werden im Plan selbst gesetzt. Die Werte im Inneren brauchen einen Plan, der mit dieser
Version gespeichert wurde.

### Werte erzwingen, Haltepunkte, Einzelschritte

Solange der Plan online gezeigt wird, lässt er sich steuern:

- **Erzwingen**: einen Baustein (oder eine Verbindung) auswählen - die Eigenschaften zeigen seine Ausgänge mit ihren
  Werten. **TRUE** / **FALSE** oder ein Wert und **Erzwingen** halten den Ausgang auf diesem Wert, gleich was der
  Baustein rechnet; die Bausteine dahinter und die Datenpunkte, die der Plan schreibt, bekommen den erzwungenen Wert.
  Ein erzwungener Wert ist orange umrandet; **Freigeben** lässt ihn los.
- **Haltepunkte**: der Punkt oben links an einem Baustein, `F9` oder **Haltepunkt** in seinen Eigenschaften. Der
  Plan hält vor diesem Baustein an; der Baustein, der als nächster läuft, ist gelb umrandet, und die Werte zeigen, wie
  weit der Zyklus kam.
- Die Knöpfe links von **Online**: **Anhalten** / **Fortsetzen** (`F8`), **Ein Zyklus** und **Ein Baustein** (`F10`).
  Solange der Plan wartet, warten auch die Änderungen seiner Eingänge. Ein Zyklus von Hand rechnet mit einer
  Zykluszeit als vergangener Zeit - Timer verhalten sich so, wie sie es täten, egal wie lange der Plan wartete.

Das alles endet mit der Onlineansicht: Schaltet der Editor sie aus, wird er geschlossen oder verschwindet er (30 s
ohne Anfrage), gibt die Laufzeit die erzwungenen Werte frei, entfernt die Haltepunkte und läuft weiter - und
protokolliert das. Beim Speichern des Plans bleiben erzwungene Werte und Haltepunkte erhalten, solange die
Onlineansicht offen ist. Haltepunkte und Einzelschritte brauchen einen Plan, der mit dieser Version gespeichert
wurde; ein älterer lässt sich schon erzwingen und anhalten.

**Vorsicht:** Ein erzwungener Wert wirkt auf echte Geräte - der Plan schreibt seine Datenpunkte damit.

## Bausteine

| Kategorie  | Bausteine                                                        |
|------------|------------------------------------------------------------------|
| ioBroker   | `STATE_IN`, `STATE_OUT`, `CONST`                                 |
| Logik      | `AND`, `OR`, `XOR`, `NOT`                                        |
| Speicher   | `RS`, `SR`, `R_TRIG`, `F_TRIG`                                   |
| Zeit       | `TON`, `TOF`, `TP`, `BLINK`                                      |
| Zähler     | `CTU`, `CTD`, `CTUD`                                             |
| Vergleich  | `GT`, `GE`, `LT`, `LE`, `EQ`, `NE`                               |
| Arithmetik | `ADD`, `SUB`, `MUL`, `DIV`, `MIN`, `MAX`, `ROUND`                |
| Umwandlung | `TO_BOOL`, `TO_INT`, `TO_REAL`, `TO_TIME`, `TO_STRING`, `CONCAT` |
| Regelung   | `HYST`, `RAMP`, `PT1`, `PID`                                     |
| Kalender   | `CLOCK`, `TIMEWINDOW`, `SCHEDULE`, `ASTRO`                       |
| Meldungen  | `LOG`, `NOTIFY`, `SENDTO`                                         |
| Experte    | `JS`                                                             |

Namen und Verhalten folgen IEC 61131-3. `AND`, `OR`, `XOR`, `ADD`, `MUL`, `MIN`, `MAX` und `CONCAT` haben 2 bis 16
Eingänge. Zeiten werden wie `500ms`, `2s`, `1m30s` oder `T#2s` eingegeben, Uhrzeiten wie `08:30`.

Die Regelungsbausteine:

- `HYST` - Zweipunktschalter: `Q` geht an, wenn `IN` über `HIGH` steigt, und aus, wenn `IN` unter `LOW` fällt;
  dazwischen bleibt `Q`, wie es ist. Eine Heizung, die unter `LOW` einschaltet, nimmt `Q` invertiert (`NOT` oder
  ein invertierter Eingang).
- `RAMP` - `OUT` folgt `IN`, ändert sich aber um höchstens `UP` pro Sekunde aufwärts und `DOWN` pro Sekunde abwärts;
  `0` begrenzt nicht. Sie beginnt bei `IN`.
- `PT1` - Tiefpass erster Ordnung: `OUT` folgt `IN` mit der Zeitkonstante `T` (nach `T` sind 63 % eines Sprungs
  erreicht). Glättet einen unruhigen Wert; er beginnt bei `IN`.
- `PID` - PID-Regler: Sollwert `SP`, Istwert `PV`, Stellgröße `Y` zwischen `YMIN` und `YMAX`. `KP` ist die
  Verstärkung, `TN` die Nachstellzeit des I-Anteils, `TV` die Vorhaltzeit; `TN` oder `TV` gleich `0` lässt den Anteil
  weg. Steht `Y` an einer Grenze, wächst der I-Anteil nicht weiter (Anti-Windup); der D-Anteil wird aus `PV` gebildet,
  ein neuer Sollwert gibt also keinen Stoß. `RST` löscht den I-Anteil.

`RAMP`, `PT1` und `PID` hängen von der Zeit ab: Ein Plan mit ihnen läuft zyklisch.

Blinker und Zähler:

- `BLINK` - solange `EN` wahr ist, ist `Q` für `TH` wahr und für `TL` falsch, beginnend mit wahr.
- `CTU` zählt die steigenden Flanken an `CU`; `R` setzt `CV` auf 0 zurück, `Q` ist wahr, sobald `CV` `PV` erreicht
  hat. `CTD` zählt bei `CD` herunter, `LD` lädt `PV`, `Q` ist bei 0 und darunter wahr. `CTUD` kann beides; `R` geht
  vor `LD`, und Flanken an `CU` und `CD` im selben Zyklus heben sich auf. Ein Eingang, der beim Start des Skripts
  schon wahr ist, ist keine Flanke. Der Zählerstand bleibt über einen Neustart des Skripts nicht erhalten.

Umwandlung: `TO_BOOL`, `TO_INT`, `TO_REAL`, `TO_TIME` und `TO_STRING` nehmen jeden Typ. `TO_INT` rundet, ein
Dezimalkomma gilt als Punkt, und was keine Zahl ist, ergibt 0; `TO_TIME` liest eine Zahl als ms und einen Text wie
`2s` oder `08:30`. `CONCAT` fügt seine Eingänge zu einem Text zusammen - Zahlen so, wie sie sind, also vorher mit
`ROUND` runden (`DIGITS` Nachkommastellen, 0 bis 10).

Der Kalender:

- `CLOCK` - die Ortszeit: `TOD` (Uhrzeit), `HOUR`, `MIN`, `WDAY` (1 Montag ... 7 Sonntag), `DAY`, `MONTH`, `YEAR`.
- `TIMEWINDOW` - `Q` ist von `START` bis `END` an den gewählten Tagen wahr (jeden Tag, Montag bis Freitag, Samstag
  und Sonntag). Ein Fenster über Mitternacht wie `22:00` bis `06:00` gehört zu dem Tag, an dem es beginnt: Bei
  Montag bis Freitag reicht es von Freitagnacht bis Samstagmorgen, aber nicht von Sonntagnacht in den Montag.
- `SCHEDULE` - `Q` ist einen Zyklus lang wahr, wenn die Zeit des Cron-Musters kommt, etwa `0 8 * * 1-5` für 8:00 von
  Montag bis Freitag, oder mit Sekunden vorne `*/5 * * * * *` für alle 5 Sekunden. Der Knopf neben dem Feld öffnet den Dialog für das Muster.
- `ASTRO` - `Q` ist von einem Sonnenereignis bis zu einem anderen wahr, etwa von `sunset` bis `sunrise`, jeweils mit
  einem Versatz in Minuten. `START` und `END` sind die Zeiten der beiden Ereignisse heute. Die Position ist die aus den
  Einstellungen des Adapters; ohne sie gibt es keine Zeiten, und `Q` bleibt falsch.

`CLOCK`, `TIMEWINDOW` und `ASTRO` lassen einen Plan zyklisch laufen. `SCHEDULE` nicht: Wenn seine Zeit kommt, läuft
der Plan sofort, und gleich danach noch einmal, um den Impuls zu beenden.

- `STATE_IN` liest einen Datenpunkt und wandelt ihn in den gewählten Typ (`BOOL`, `INT`, `REAL`, `STRING`). Ein
  Wert, der sich nicht wandeln lässt, wird einmal im Protokoll gemeldet und als 0 gelesen. Ändert sich die ID des
  Datenpunkts - im Dialog gewählt oder eingetippt -, wird der Typ aus seinem Objekt übernommen, und ein Baustein,
  der noch seinen ersten Namen hat, bekommt den Namen des Datenpunkts. Den Typ kann man danach anders setzen; neu
  übernommen wird er erst mit der nächsten ID.
- `STATE_OUT` schreibt einen Datenpunkt nur, wenn sich der Wert ändert. `Mindestzeit zwischen zwei
  Schreibvorgängen` begrenzt, wie oft er schreibt; der letzte Wert wird geschrieben, wenn die Zeit um ist.
- `CONST` ist ein Wert des gewählten Typs. Mit einem Eingang anderen Typs verbunden, übernimmt er dessen Typ und
  behält seinen Wert, soweit es geht (`"0"` wird für eine `TIME` zu 0 ms) - außer er speist schon andere Eingänge,
  die den neuen Typ nicht nehmen.

Die Meldungen:

- `LOG` schreibt eine Zeile ins ioBroker-Protokoll, mit der gewählten Stufe (`info`, `warn`, `error`, `debug`):
  bei steigender Flanke an `TRIG` oder wann immer sich `IN` ändert. `%s` im Text ist der Wert von `IN`. Höchstens
  20 Zeilen pro Minute - ein Plan, der alle 200 ms läuft, würde das Protokoll sonst fluten; die 20. Zeile sagt das.
- `NOTIFY` sendet den Text als ioBroker-Benachrichtigung - als Meldung oder als Alarm -, `SENDTO` an einen Adapter
  wie `telegram.0`, `pushover.0` oder `email.0`, als `{ text, message, title, subject }` mit dem gewählten Befehl
  (`send`). Beide senden, wenn `LOG` schreiben würde, höchstens 5-mal pro Minute; das Protokoll sagt, wenn mehr
  ausgelassen wurden.

Der Expertenbaustein `JS` führt eigenen Code aus. Der Code ist der Rumpf einer Funktion, die die Eingänge `IN1` ...
`INn` (0 bis 8, beliebiger Typ) bekommt, dazu `dt` (ms seit dem letzten Zyklus), `firstScan` und `state` - ein Objekt,
das von einem Zyklus zum nächsten erhalten bleibt. Er gibt den Wert von `OUT1` zurück oder ein Feld
`[OUT1, OUT2, ...]` für mehr Ausgänge (1 bis 8); wo er `undefined` liefert, behält ein Ausgang seinen Wert. Die
Ausgänge dürfen an Eingänge jedes Typs, der Code muss also liefern, was diese erwarten.

```js
// zählt, wie oft IN1 über IN2 gestiegen ist
if (IN1 > IN2 && !state.above) {
    state.count = (state.count || 0) + 1;
}
state.above = IN1 > IN2;
return state.count || 0;
```

Der Code läuft im Skript des Plans, er kann also Funktionen der Skripte wie `log()` aufrufen - er sollte aber auf
nichts warten: Der nächste Baustein braucht seine Ausgänge sofort. Ein Syntaxfehler wird schon vor dem Speichern
angezeigt, ein Fehler beim Ausführen am Baustein.

Signaltypen: `BOOL`, `INT`, `REAL`, `TIME`, `STRING`. Ein `INT` darf an einen `REAL`-Eingang; andere Umwandlungen
geschehen nicht von selbst.

## Eigene Bausteine

Ein Plan kann selbst ein Baustein sein, den andere Pläne beliebig oft einsetzen - wie ein Funktionsbaustein in der
SPS. Dazu in den Einstellungen des Plans **Dieser Plan ist ein Baustein** einschalten und dem Baustein einen Namen
und eine Beschreibung geben.

- Die Eingänge des Bausteins sind `FB_IN`-Bausteine, seine Ausgänge `FB_OUT`-Bausteine (Kategorie **Schnittstelle**,
  nur im Plan eines Bausteins angeboten). Der Anschlussname ist der Name des Ein- oder Ausgangs am Baustein; `FB_IN`
  hat außerdem einen Typ und den Wert, den der Eingang hat, wenn er nicht verbunden ist.
- Ein Baustein greift nicht auf Datenpunkte zu: `STATE_IN` und `STATE_OUT` sind in ihm nicht erlaubt, `CONST`
  schon. Er darf andere eigene Bausteine verwenden, aber nicht sich selbst.
- Jede Instanz hat ihren eigenen Zustand - zwei Instanzen eines Bausteins mit einem Timer laufen unabhängig.
- Das Skript eines Bausteins tut nichts, wenn es läuft; der Baustein arbeitet nur in den Plänen, die ihn einsetzen.

Die Bausteine aller Pläne stehen in der Palette unter **Eigene Bausteine**. Der Plan, der einen Baustein einsetzt,
speichert eine Kopie davon und damit die Version: Jede gespeicherte Änderung eines Bausteins ist eine neue Version.
Pläne mit einer älteren arbeiten mit ihr weiter und zeigen einen Hinweis - **Aktualisieren** in den Eigenschaften
einer Instanz übernimmt die neue Version in den Plan, **Baustein öffnen** öffnet den Plan des Bausteins.
Verbindungen zu Ein- oder Ausgängen, die es nicht mehr gibt, entfernt das Aktualisieren.

Weil die Kopie im Plan steht, läuft ein Plan weiter, wenn der Baustein gelöscht wird, und lässt sich allein
exportieren und importieren. Beim Kopieren von Instanzen in einen anderen Plan kommt der Baustein mit.

Ein Fehler in einem Baustein wird an der Instanz gemeldet, die ihn ausgeführt hat, im Editor und im Protokoll.

## Ausführung

Die Bausteine laufen in der Reihenfolge des Datenflusses; die Zahl in der Ecke jedes Bausteins ist seine Position.
Was gleichzeitig laufen könnte, läuft von links nach rechts, dann von oben nach unten.

- **Ereignisgesteuert**: Hängt kein Baustein von der Zeit ab, läuft der Plan, sobald sich ein Eingang ändert.
  Änderungen innerhalb von 20 ms laufen gemeinsam in einem Zyklus.
- **Zyklisch**: Sobald der Plan einen Timer enthält, läuft er alle 200 ms (50 ms bis 10 s, siehe Einstellungen des
  Plans) und zusätzlich direkt nach der Änderung eines Eingangs.

Die Betriebsart wird automatisch gewählt oder in den Einstellungen des Plans festgelegt.

Eine Rückkopplung ist nur über einen speichernden Baustein erlaubt (Timer, Zähler, Flipflop, Flanke, Regelungsbaustein,
`JS`, eigener Baustein): Die zurückführende
Verbindung liest, was dieser Baustein im vorigen Zyklus ausgegeben hat, und wird als Doppelstrich gezeichnet. Eine
Rückkopplung ohne einen solchen Baustein ist ein Fehler.

Ein Timer zählt ab dem Zyklus, in dem er die Änderung seines Eingangs sieht. Er läuft also nie vor seiner Zeit ab,
höchstens einen Zyklus später.

## Grenzen

- Nicht für sicherheitsgerichtete Funktionen. Ein Plan läuft in einem ioBroker-Skript, ohne Echtzeitgarantien.
- Der Zustand der Bausteine bleibt über einen Neustart des Skripts nicht erhalten.
- Noch nicht vorhanden: Haltepunkte in einem eigenen Baustein, eine manuelle Ausführungsreihenfolge, Verbindungen,
  die um Bausteine herum geführt werden.

## Ablage

Der Plan steht im Skript selbst, als letzte Zeile von `common.source` (`//#fbd:{...}`); darüber steht der erzeugte
Code. Der Plan enthält die Kopien der eigenen Bausteine, die er einsetzt. Die Bausteine der Bibliothek sind im Modul `@iobroker/fb-runtime` umgesetzt, das mit dem Adapter kommt, und werden nicht in
jedes Skript kopiert.
