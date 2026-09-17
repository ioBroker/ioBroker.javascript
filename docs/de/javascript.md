## Inhalt
- [Globale Funktionen](#globale-funktionen)
    - [Best Practice](#best-practice)

- [Funktionen](#die-folgenden-funktionen-können-in-skripten-verwendet-werden)
    - [require - Modul laden](#require---modul-laden)
    - [console - Gibt die Nachricht im Log aus](#console---gibt-die-nachricht-im-log-aus)
    - [exec - Führt ein Betriebssystem-Kommando aus, z. B. "cp file1 file2"](#exec---führt-ein-betriebssystem-kommando-aus-z-b-cp-file1-file2)
    - [on - Änderungen oder Aktualisierungen eines States abonnieren](#on---änderungen-oder-aktualisierungen-eines-states-abonnieren)
    - [once](#once)
    - [subscribe - wie on](#subscribe---wie-on)
    - [unsubscribe](#unsubscribe)
    - [getSubscriptions](#getsubscriptions)
    - [getFileSubscriptions](#getfilesubscriptions)
    - [schedule](#schedule)
        - [Zeitplan](#zeitplan)
        - [Astro-Funktion](#astro-funktion)
    - [scheduleById](#schedulebyid)
    - [getSchedules](#getschedules)
    - [clearSchedule](#clearschedule)
    - [getAttr](#getattr)
    - [getAstroDate](#getastrodate)
    - [isAstroDay](#isastroday)
    - [compareTime](#comparetime)
    - [setState](#setstate)
    - [setStateAsync](#setstateasync)
    - [setStateDelayed](#setstatedelayed)
    - [clearStateDelayed](#clearstatedelayed)
    - [getStateDelayed](#getstatedelayed)
    - [getState](#getstate)
    - [getStateAsync](#getstateasync)
    - [existsState](#existsstate)
    - [getObject](#getobject)
    - [setObject](#setobject)
    - [existsObject](#existsobject)
    - [extendObject](#extendobject)
    - [deleteObject](#deleteobject)
    - [getIdByName](#getidbyname)
    - [getEnums](#getenums)
    - [createState](#createstate)
    - [createStateAsync](#createstateasync)
    - [deleteState](#deletestate)
    - [deleteStateAsync](#deletestateasync)
    - [sendTo](#sendto)
    - [sendToAsync](#sendtoasync)
    - [sendToHost](#sendtohost)
    - [sendToHostAsync](#sendtohostasync)
    - [setInterval](#setinterval)
    - [clearInterval](#clearinterval)
    - [setTimeout](#settimeout)
    - [clearTimeout](#cleartimeout)
    - [setImmediate](#setimmediate)
    - [formatDate](#formatdate)
    - [formatTimeDiff](#formattimediff)
    - [getDateObject](#getdateobject)
    - [formatValue](#formatvalue)
    - [adapterSubscribe](#adaptersubscribe)
    - [adapterUnsubscribe](#adapterunsubscribe)
    - [$ - Selektor](#---selektor)
    - [readFile](#readfile)
    - [writeFile](#writefile)
    - [delFile](#delfile)
    - [renameFile](#renamefile)
    - [onFile](#onfile)
    - [offFile](#offfile)
    - [onStop](#onstop)
    - [getHistory](#gethistory)
    - [runScript](#runscript)
    - [runScriptAsync](#runscriptasync)
    - [startScript](#startscript)
    - [startScriptAsync](#startscriptasync)
    - [stopScript](#stopscript)
    - [stopScriptAsync](#stopscriptasync)
    - [isScriptActive](#isscriptactive)
    - [name](#scriptname)
    - [instance](#instance)
    - [SECRETS](#secrets)
    - [messageTo](#messageto)
    - [messageToAsync](#messagetoasync)
    - [onMessage](#onmessage)
    - [onMessageUnregister](#onmessageunregister)
    - [onLog](#onlog)
    - [onLogUnregister](#onlogunregister)
    - [wait](#wait)
    - [sleep](#sleep)
    - [httpGet](#httpget)
    - [httpPost](#httppost)
    - [createTempFile](#createtempfile)
    - [registerNotification](#registernotification)

- [Skriptaktivität](#skriptaktivität)

## Globale Funktionen
Globale Skripte können im Ordner `global` definiert werden.
Alle globalen Skripte stehen in allen Instanzen zur Verfügung. Ist ein globales Skript deaktiviert, wird es nicht verwendet.
Ein globales Skript wird einfach dem normalen Skript vorangestellt und zusammen mit diesem kompiliert. Daher können über globale Skripte keine Daten zwischen Skripten ausgetauscht werden. Dafür sollten States verwendet werden.

Um globale Funktionen in TypeScript zu verwenden, müssen sie zuerst mit `declare` deklariert werden, damit der Compiler die globalen Funktionen kennt. Beispiel:
```typescript
// globales Skript:
// ================
function globalFn(arg: string): void {
    // eigentliche Implementierung
}

// normales Skript:
// ================
declare function globalFn(arg: string): void;
// wie gewohnt verwenden:
globalFn('test');
```

#### Best Practice:
Es empfiehlt sich, zwei Instanzen des JavaScript-Adapters anzulegen: eine "test"- und eine "production"-Instanz.
Nachdem das Skript in der "test"-Instanz getestet wurde, kann es nach "production" verschoben werden. So lässt sich die "test"-Instanz beliebig neu starten.

## Die folgenden Funktionen können in Skripten verwendet werden:

### require - Modul laden
```js
const mod = require('module_name');
```
Folgende Module sind bereits vorgeladen: `node:dgram`, `node:crypto`, `node:dns`, `node:events`, `node:fs`, `node:http`, `node:https`, `node:http2`, `node:net`, `node:os`, `node:path`, `node:util`, `node:stream`, `node:zlib`, `suncalc2`, `axios`, `wake_on_lan`, `request` (veraltet)

Um andere Module zu verwenden, trägt man den Namen (und die Version) des Moduls in der Instanzkonfiguration ein. ioBroker installiert das Modul dann. Anschließend kann es in den Skripten geladen (require) und verwendet werden.

### console - Gibt die Nachricht im Log aus
Die Verwendung ist dieselbe wie in `javascript`

### exec - Führt ein Betriebssystem-Kommando aus, z. B. `cp file1 file2`
```js
exec(cmd, [options], callback);
```

Führt ein Systemkommando aus und liefert dessen Ausgaben.

```js
// Liste der Dateien und Verzeichnisse in /var/log abrufen
exec('ls /var/log', (error, stdout, stderr) => {
    log('stdout: ' + stdout);
});
```

Node.js verwendet /bin/sh zum Ausführen von Kommandos. Soll eine andere Shell verwendet werden, kann das Optionsobjekt genutzt werden, wie in der [Node.js-Dokumentation](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback) zu child_process.exec beschrieben.
Es empfiehlt sich, bei Kommandos immer vollständige Pfadnamen anzugeben, damit sichergestellt ist, dass das richtige Kommando ausgeführt wird.

**Hinweis:** Um diese Funktion aufzurufen, muss die Option *Kommando "exec" erlauben* aktiviert sein.

### on - Änderungen oder Aktualisierungen eines States abonnieren
```js
on(pattern, callbackOrId, value);
```

Die Callback-Funktion erhält als Parameter ein Objekt mit folgendem Inhalt:
```js
{
    id: 'javascript.0.myplayer',
    state: {
        val:  'new state',
        ts:   1416149118,
        ack:  true,
        lc:   1416149118,
        from: 'system.adapter.sonos.0'
    },
    oldState: {
        val:  'old state',
        ts:   1416148233,
        ack:  true,
        lc:   1416145154,
        from: 'system.adapter.sonos.0'
    }
}
```

**Hinweis:** `state` hieß früher `newState`. Diese Bezeichnung funktioniert weiterhin.

Beispiel:
```js
let timer;

// State "javascript.0.counter" anlegen
createState('counter', 0);

// Bei Änderung
on('adapter.0.device.channel.sensor', (data) => {
    // Aber nicht öfter als alle 30 Sekunden
    if (!timer) {
        timer = setTimeout(() => {
            timer = null;
        }, 30000);

        // Bestätigten Wert setzen
        setState('counter', 1 + getState('counter'), true);

        // Oder ein unbestätigtes Kommando setzen
        setState('adapter.0.device.channel.actor', true);
    }
});
```

Folgende Parameter können zur Definition des Triggers verwendet werden:

| Parameter   | Typ/Wert | Beschreibung                                                                                                                                                         |
|-------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| logic       | string   | Logik "and" oder "or" zur Verknüpfung der Bedingungen \(Standard: "and"\)                                                                                            |
|             |          |                                                                                                                                                                      |
| id          | string   | ID ist gleich der angegebenen                                                                                                                                        |
|             | RegExp   | ID entspricht dem regulären Ausdruck                                                                                                                                 |
|             | Array    | ID ist in einer Liste erlaubter IDs enthalten                                                                                                                        |
|             |          |                                                                                                                                                                      |
| name        | string   | Name ist gleich dem angegebenen                                                                                                                                      |
|             | RegExp   | Name entspricht dem regulären Ausdruck                                                                                                                               |
|             | Array    | Name ist in einer Liste erlaubter Namen enthalten                                                                                                                    |
|             |          |                                                                                                                                                                      |
| change      | string   | "eq", "ne", "gt", "ge", "lt", "le", "any"                                                                                                                            |
|             | "eq"     | (gleich)              Neuer Wert muss gleich dem alten sein (state.val == oldState.val)                                                                              |
|             | "ne"     | (ungleich)            Neuer Wert muss ungleich dem alten sein (state.val != oldState.val) **Ist das Muster ein ID-String, wird dieser Wert standardmäßig verwendet** |
|             | "gt"     | (größer)              Neuer Wert muss größer als der alte sein (state.val > oldState.val)                                                                            |
|             | "ge"     | (größer oder gleich)  Neuer Wert muss größer oder gleich dem alten sein (state.val >= oldState.val)                                                                  |
|             | "lt"     | (kleiner)             Neuer Wert muss kleiner als der alte sein (state.val < oldState.val)                                                                           |
|             | "le"     | (kleiner oder gleich) Neuer Wert muss kleiner oder gleich dem alten sein (state.val <= oldState.val)                                                                 |
|             | "any"    | Trigger wird ausgelöst, sobald ein neuer Wert eintrifft                                                                                                              |
|             |          |                                                                                                                                                                      |
| val         | mixed    | Neuer Wert muss gleich dem angegebenen sein                                                                                                                          |
| valNe       | mixed    | Neuer Wert muss ungleich dem angegebenen sein                                                                                                                        |
| valGt       | mixed    | Neuer Wert muss größer als der angegebene sein                                                                                                                       |
| valGe       | mixed    | Neuer Wert muss größer oder gleich dem angegebenen sein                                                                                                              |
| valLt       | mixed    | Neuer Wert muss kleiner als der angegebene sein                                                                                                                      |
| valLe       | mixed    | Neuer Wert muss kleiner oder gleich dem angegebenen sein                                                                                                             |
|             |          |                                                                                                                                                                      |
| ack         | boolean  | Bestätigungsstatus (ack) des neuen Werts ist gleich dem angegebenen                                                                                                  |
| q           | number   | Qualitätscode des neuen Werts ist gleich dem angegebenen. Mit '*' passt jeder Code. **Ist q nicht angegeben, wird q = 0 als Muster gesetzt!**                        |
|             |          |                                                                                                                                                                      |
| oldVal      | mixed    | Vorheriger Wert muss gleich dem angegebenen sein                                                                                                                     |
| oldValNe    | mixed    | Vorheriger Wert muss ungleich dem angegebenen sein                                                                                                                   |
| oldValGt    | mixed    | Vorheriger Wert muss größer als der angegebene sein                                                                                                                  |
| oldValGe    | mixed    | Vorheriger Wert muss größer oder gleich dem angegebenen sein                                                                                                         |
| oldValLt    | mixed    | Vorheriger Wert muss kleiner als der angegebene sein                                                                                                                 |
| oldValLe    | mixed    | Vorheriger Wert muss kleiner oder gleich dem angegebenen sein                                                                                                        |
|             |          |                                                                                                                                                                      |
| oldAck      | bool     | Bestätigungsstatus (ack) des vorherigen Werts ist gleich dem angegebenen                                                                                             |
| oldQ        | number   | Qualitätscode des vorherigen Werts ist gleich dem angegebenen. Mit '*' passt jeder Code                                                                              |
|             |          |                                                                                                                                                                      |
| ts          | number   | Zeitstempel des neuen Werts muss gleich dem angegebenen sein (state.ts == ts)                                                                                        |
| tsGt        | number   | Zeitstempel des neuen Werts muss größer als der angegebene sein (state.ts > ts)                                                                                      |
| tsGe        | number   | Zeitstempel des neuen Werts muss größer oder gleich dem angegebenen sein (state.ts >= ts)                                                                            |
| tsLt        | number   | Zeitstempel des neuen Werts muss kleiner als der angegebene sein (state.ts < ts)                                                                                     |
| tsLe        | number   | Zeitstempel des neuen Werts muss kleiner oder gleich dem angegebenen sein (state.ts <= ts)                                                                           |
|             |          |                                                                                                                                                                      |
| oldTs       | number   | Vorheriger Zeitstempel muss gleich dem angegebenen sein (oldState.ts == ts)                                                                                          |
| oldTsGt     | number   | Vorheriger Zeitstempel muss größer als der angegebene sein (oldState.ts > ts)                                                                                        |
| oldTsGe     | number   | Vorheriger Zeitstempel muss größer oder gleich dem angegebenen sein (oldState.ts >= ts)                                                                              |
| oldTsLt     | number   | Vorheriger Zeitstempel muss kleiner als der angegebene sein (oldState.ts < ts)                                                                                       |
| oldTsLe     | number   | Vorheriger Zeitstempel muss kleiner oder gleich dem angegebenen sein (oldState.ts <= ts)                                                                             |
|             |          |                                                                                                                                                                      |
| lc          | number   | Zeitstempel der letzten Änderung muss gleich dem angegebenen sein (state.lc == lc)                                                                                   |
| lcGt        | number   | Zeitstempel der letzten Änderung muss größer als der angegebene sein (state.lc > lc)                                                                                 |
| lcGe        | number   | Zeitstempel der letzten Änderung muss größer oder gleich dem angegebenen sein (state.lc >= lc)                                                                       |
| lcLt        | number   | Zeitstempel der letzten Änderung muss kleiner als der angegebene sein (state.lc < lc)                                                                                |
| lcLe        | number   | Zeitstempel der letzten Änderung muss kleiner oder gleich dem angegebenen sein (state.lc <= lc)                                                                      |
|             |          |                                                                                                                                                                      |
| oldLc       | number   | Vorheriger Zeitstempel der letzten Änderung muss gleich dem angegebenen sein (oldState.lc == lc)                                                                     |
| oldLcGt     | number   | Vorheriger Zeitstempel der letzten Änderung muss größer als der angegebene sein (oldState.lc > lc)                                                                   |
| oldLcGe     | number   | Vorheriger Zeitstempel der letzten Änderung muss größer oder gleich dem angegebenen sein (oldState.lc >= lc)                                                         |
| oldLcLt     | number   | Vorheriger Zeitstempel der letzten Änderung muss kleiner als der angegebene sein (oldState.lc < lc)                                                                  |
| oldLcLe     | number   | Vorheriger Zeitstempel der letzten Änderung muss kleiner oder gleich dem angegebenen sein (oldState.lc <= lc)                                                        |
|             |          |                                                                                                                                                                      |
| channelId   | string   | Kanal-ID muss gleich der angegebenen sein                                                                                                                            |
|             | RegExp   | Kanal-ID entspricht dem regulären Ausdruck                                                                                                                           |
|             | Array    | Kanal-ID ist in einer Liste erlaubter Kanal-IDs enthalten                                                                                                            |
|             |          |                                                                                                                                                                      |
| channelName | string   | Kanalname muss gleich dem angegebenen sein                                                                                                                           |
|             | RegExp   | Kanalname entspricht dem regulären Ausdruck                                                                                                                          |
|             | Array    | Kanalname ist in einer Liste erlaubter Kanalnamen enthalten                                                                                                          |
|             |          |                                                                                                                                                                      |
| deviceId    | string   | Geräte-ID muss gleich der angegebenen sein                                                                                                                           |
|             | RegExp   | Geräte-ID entspricht dem regulären Ausdruck                                                                                                                          |
|             | Array    | Geräte-ID ist in einer Liste erlaubter Geräte-IDs enthalten                                                                                                          |
|             |          |                                                                                                                                                                      |
| deviceName  | string   | Gerätename muss gleich dem angegebenen sein                                                                                                                          |
|             | RegExp   | Gerätename entspricht dem regulären Ausdruck                                                                                                                         |
|             | Array    | Gerätename ist in einer Liste erlaubter Gerätenamen enthalten                                                                                                        |
|             |          |                                                                                                                                                                      |
| enumId      | string   | State gehört zum angegebenen Enum                                                                                                                                    |
|             | RegExp   | Eine Enum-ID des States entspricht dem angegebenen regulären Ausdruck                                                                                                |
|             | Array    | Eine Enum-ID des States ist in der angegebenen Liste von Enum-IDs enthalten                                                                                          |
|             |          |                                                                                                                                                                      |
| enumName    | string   | State gehört zum angegebenen Enum                                                                                                                                    |
|             | RegExp   | Ein Enum-Name des States entspricht dem angegebenen regulären Ausdruck                                                                                               |
|             | Array    | Ein Enum-Name des States ist in der angegebenen Liste von Enum-Namen enthalten                                                                                       |
|             |          |                                                                                                                                                                      |
| from        | string   | Neuer Wert stammt vom angegebenen Adapter                                                                                                                            |
|             | RegExp   | Neuer Wert stammt von einem Adapter, der dem regulären Ausdruck entspricht                                                                                           |
|             | Array    | Neuer Wert stammt von einem Adapter aus der angegebenen Liste erlaubter Adapter                                                                                      |
|             |          |                                                                                                                                                                      |
| fromNe      | string   | Neuer Wert stammt nicht vom angegebenen Adapter                                                                                                                      |
|             | RegExp   | Neuer Wert stammt nicht von einem Adapter, der dem regulären Ausdruck entspricht                                                                                     |
|             | Array    | Neuer Wert stammt nicht von einem Adapter aus der angegebenen Liste verbotener Adapter                                                                               |
|             |          |                                                                                                                                                                      |
| oldFrom     | string   | Alter Wert stammt vom angegebenen Adapter                                                                                                                            |
|             | RegExp   | Alter Wert stammt von einem Adapter, der dem regulären Ausdruck entspricht                                                                                           |
|             | Array    | Alter Wert stammt von einem Adapter aus der angegebenen Liste erlaubter Adapter                                                                                      |
|             |          |                                                                                                                                                                      |
| oldFromNe   | string   | Alter Wert stammt nicht vom angegebenen Adapter                                                                                                                      |
|             | RegExp   | Alter Wert stammt nicht von einem Adapter, der dem regulären Ausdruck entspricht                                                                                     |
|             | Array    | Alter Wert stammt nicht von einem Adapter aus der angegebenen Liste verbotener Adapter                                                                               |

Beispiele:
Trigger auf alle States mit der ID `'*.STATE'`, wenn sie bestätigt (ack) sind und den neuen Wert `true` haben.

```js
{
    "id": /\.STATE$/,
    "val": true,
    "ack": true,
    "logic": "and"
}
```

**Hinweis:** RegExp kann direkt verwendet werden:

```js
on(/^system\.adapter\..*\.\d+\.memRss$/, function (obj) {
});

// entspricht
on({id: /^system\.adapter\..*\.\d+\.memRss$/, change: "ne"}, function (obj) {
});
```

Um zwei States einfach miteinander zu verbinden, schreibt man:
```js
on('stateId1', 'stateId2');
```

Alle Änderungen von *stateId1* werden in *stateId2* geschrieben.

Ist der Parameter `value` in Kombination mit einer State-ID als zweitem Parameter gesetzt, wird der State bei jeder Änderung mit `value` befüllt.
```js
on('stateId1', 'stateId2', 'triggered');
setState('stateId1', 'new value');

// stateId2 wird auf 'triggered' gesetzt.
```

Die Funktion `on` gibt einen Handler zurück. Dieser Handler kann zum Beenden des Abonnements verwendet werden.

*Hinweis:* Standardmäßig werden nur States mit der Qualität 0x00 an die Callback-Funktion übergeben. Um alle Ereignisse zu erhalten, muss `{q: '*'}` zur Muster-Struktur hinzugefügt werden.

*Hinweis:* Standardmäßig ist "change" gleich "any", außer wenn nur eine ID als String angegeben wird (wie `on('id', () => {});`). Im letzteren Fall wird change auf "ne" gesetzt.

*Hinweis:* Sollen auch das Löschen oder Ablaufen von States als Trigger erkannt werden, muss change mit `ne` oder `any` UND q mit `*` als Filter verwendet werden!

*Hinweis:* Ab Version 4.3.2 kann der Trigger-Typ als zweiter Parameter angegeben werden: `on('my.id.0', 'any', obj => log(obj.state.val));`

### once
Registriert ein einmaliges Abonnement, das nach dem ersten Aufruf automatisch beendet wird. Wie [on](#on---änderungen-oder-aktualisierungen-eines-states-abonnieren), wird aber nur einmal ausgeführt.

```js
once(pattern, callback);
```

### subscribe - wie **[on](#on---änderungen-oder-aktualisierungen-eines-states-abonnieren)**

### unsubscribe
```js
unsubscribe(id);
// oder
unsubscribe(handler);
```

Entfernt alle Abonnements für die angegebene Objekt-ID oder den angegebenen Handler.

```js
// Per Handler
let mySubscription = on({ id: 'javascript.0.myState', change: 'any' }, (data) => {
    // Abonnement nach dem ersten Trigger beenden
    if (unsubscribe(mySubscription)) {
        log('Subscription deleted');
    }
});

// Per Objekt-ID
on({ id: 'javascript.0.myState1', change: 'ne' }, (data) => {
    log('Some event');
});

on({ id: 'javascript.0.myState1', change: 'any' }, (data) => {
    // Abonnement beenden
    if (unsubscribe('javascript.0.myState1')) {
        log('All subscriptions deleted');
    }
});
```

### getSubscriptions
Liefert die Liste der Abonnements.

Beispiel für ein Ergebnis:
```js
{
    'megad.0.dataPointName': [
        {
            name : 'script.js.NameOfScript',
            pattern : {
                id : 'megad.0.dataPointName',
                change : 'ne'
            }
        }
    ]
}
```

### getFileSubscriptions
Liefert die Liste der Datei-Abonnements.

Beispiel für ein Ergebnis:
```js
{
    'vis.0$%$main/*': [
        {
            name : 'script.js.NameOfScript',
            id : 'vis.0',
            fileNamePattern: 'main/*'
        }
    ]
}
```

### schedule
```js
schedule(pattern, callback);
```

Zeitplaner mit Astro-Funktion.

#### Zeitplan
Das Muster kann ein String mit [Cron-Syntax](http://en.wikipedia.org/wiki/Cron) sein, der aus 5 (ohne Sekunden) oder 6 (mit Sekunden) Stellen besteht:
```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ │
│ │ │ │ │ └───── Wochentag (0 - 6) (0 bis 6 entspricht Sonntag bis Samstag, alternativ Namen verwenden; 7 ist Sonntag, wie 0)
│ │ │ │ └────────── Monat (1 - 12)
│ │ │ └─────────────── Tag des Monats (1 - 31)
│ │ └──────────────────── Stunde (0 - 23)
│ └───────────────────────── Minute (0 - 59)
└───────────────────────────── [optional] Sekunde (0 - 59)
```

```js
// Beispiel mit 5 Stellen:
schedule('*/2 * * * *', () => {
    log('Will be triggered every 2 minutes!');
});

// Beispiel mit 6 Stellen:
schedule('*/3 * * * * *', () => {
    log('Will be triggered every 3 seconds!');
});
```

Das Muster kann auch ein Objekt sein. Das wird vor allem verwendet, wenn Sekunden benötigt werden:

Das Objekt kann folgende Eigenschaften haben:
- `second`
- `minute`
- `hour`
- `date`
- `month`
- `year`
- `dayOfWeek`

```js
schedule({ second: [20, 25] }, () => {
    log('Will be triggered at xx:xx:20 and xx:xx:25 of every minute!');
});

schedule({ hour: 12, minute: 30 }, () => {
    log('Will be triggered at 12:30!');
});
```
Das Muster kann auch ein JavaScript-Date-Objekt (ein bestimmter Zeitpunkt) sein - in diesem Fall wird der Zeitplan nur ein einziges Mal ausgelöst.

Werden Start- oder Endzeiten für einen Zeitplan benötigt, lässt sich das ebenfalls mit einem Objekt umsetzen. In diesem Fall hat das Objekt folgende Eigenschaften:
- `start`
- `end`
- `rule`

start und end legen jeweils ein Date-Objekt, einen Datums-String oder eine Anzahl von Millisekunden seit dem 01. Januar 1970 00:00:00 UTC fest.
Die Regel (rule) ist ein Zeitplan-String mit [Cron-Syntax](http://en.wikipedia.org/wiki/Cron) oder ein Objekt:
```js
let startTime = new Date(Date.now() + 5000);
let endTime = new Date(startTime.getTime() + 5000);
schedule({ start: startTime, end: endTime, rule: '*/1 * * * * *' }, () => {
    log('It will run after 5 seconds and stop after 10 seconds');
});
```

Die Regel selbst kann auch ein Objekt sein:

```js
let today = new Date();
let startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let endTime =  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
let ruleData = { hour: 12, minute: 30 };
schedule({ start: startTime, end: endTime, rule: ruleData }, () => {
    log('Will be triggered at 12:30, starting tomorow, ending in 7 days');
});
```

#### Astro-Funktion

Die Astro-Funktion kann über das Attribut "astro" verwendet werden:

```js
schedule({ astro: 'sunrise' }, () => {
    log("Sunrise!");
});

schedule({ astro: 'sunset', shift: 10 }, () => {
    log("10 minutes after sunset!");
});
```

Das Attribut "shift" ist der Versatz in Minuten. Er kann auch negativ sein, um einen Zeitpunkt vor dem Astro-Ereignis festzulegen.

Folgende Werte können als Attribut in der Astro-Funktion verwendet werden:

- `"sunrise"`: Sonnenaufgang (die Oberkante der Sonne erscheint am Horizont)
- `"sunriseEnd"`: Ende des Sonnenaufgangs (die Unterkante der Sonne berührt den Horizont)
- `"goldenHourEnd"`: Ende der morgendlichen goldenen Stunde (weiches Licht, die beste Zeit zum Fotografieren)
- `"solarNoon"`: Sonnenmittag (die Sonne steht am höchsten)
- `"goldenHour"`: Beginn der abendlichen goldenen Stunde
- `"sunsetStart"`: Beginn des Sonnenuntergangs (die Unterkante der Sonne berührt den Horizont)
- `"sunset"`: Sonnenuntergang (die Sonne verschwindet unter dem Horizont, die abendliche bürgerliche Dämmerung beginnt)
- `"dusk"`: Abenddämmerung (die abendliche nautische Dämmerung beginnt)
- `"nauticalDusk"`: nautische Abenddämmerung (die abendliche astronomische Dämmerung beginnt)
- `"night"`: Beginn der Nacht (dunkel genug für astronomische Beobachtungen)
- `"nightEnd"`: Ende der Nacht (die morgendliche astronomische Dämmerung beginnt)
- `"nauticalDawn"`: nautische Morgendämmerung (die morgendliche nautische Dämmerung beginnt)
- `"dawn"`: Morgendämmerung (die morgendliche nautische Dämmerung endet, die morgendliche bürgerliche Dämmerung beginnt)
- `"nadir"`: Nadir (der dunkelste Moment der Nacht, die Sonne steht am tiefsten)

**Hinweis:** Um die "astro"-Funktion zu verwenden, müssen "latitude" und "longitude" (Breiten- und Längengrad) in den Einstellungen des JavaScript-Adapters definiert sein.

**Hinweis:** An manchen Orten kann es vorkommen, dass kein night/nightEnd existiert. Mehr dazu [hier](https://github.com/mourner/suncalc/issues/70).

**Hinweis:** Die Funktion "on" kann mit einer kleinen Anpassung auch für Zeitpläne verwendet werden:
```js
on({ time: '*/2 * * * *' }, () => {
    log((new Date()).toString() + " - Will be triggered every 2 minutes!");
});

on({ time: { hour: 12, minute: 30 }}, () => {
    log((new Date()).toString() + " - Will be triggered at 12:30!");
});

on({ astro: 'sunset', shift: 10 }, () => {
    log((new Date()).toString() + " - 10 minutes after sunset!");
});
```
### scheduleById
```js
scheduleById(id, callback);
scheduleById(id, ack, callback);
```

Ermöglicht das Anlegen eines Zeitplans auf Basis eines State-Werts. Ändert sich der State-Wert, wird der alte Zeitplan gelöscht und automatisch ein neuer Zeitplan angelegt.

Unterstützte Formate:

- `[h]h:[m]m:ss` (z. B. `12:42:15`, `15:3:12`, `3:10:25`)
- `[h]h:[m]m` (z. B. `13:37`, `9:40`)

```js
scheduleById('0_userdata.0.configurableTimeFormat', () => {
    log('Executed!');
});
```

Beispiel: State anlegen und bei Änderungen einen Zeitplan registrieren:

```js
createState(
    '0_userdata.0.myTime',
    '00:00:00', // Standardwert
    {
        type: 'string',
        read: true,
        write: true
    },
    () => {
        scheduleById('0_userdata.0.myTime', () => {
            log('Executed!');
        });
    }
);
```

### getSchedules
```js
const list = getSchedules(true);
```
Liefert die Liste aller CRON-Jobs und Zeitpläne (außer Astro).
Das Argument muss `true` sein, wenn man die Liste für **jedes laufende Skript** erhalten möchte. Andernfalls werden nur die Zeitpläne des aktuellen Skripts zurückgegeben.

```js
const list = getSchedules(true);
list.forEach(schedule => log(JSON.stringify(schedule)));

// Alle Zeitpläne in allen Skripten löschen!
list.forEach(schedule => clearSchedule(schedule));
```

Beispielausgabe:
```
2020-11-01 20:15:19.929  - {"type":"cron","pattern":"0 * * * *","scriptName":"script.js.Heizung","id":"cron_1604258108384_74924"}
2020-11-01 20:15:19.931  - {"type":"schedule","schedule":"{"period":{}}","scriptName":"script.js.Heizung","id":"schedule_19576"}
```

### clearSchedule
Wenn **keine** "astro"-Funktion verwendet wird, kann man den Zeitplan später abbrechen. Dazu muss das Zeitplan-Objekt gespeichert werden:

```js
let sch = schedule('*/2 * * * *', () => { /* ... */ });

// später:
clearSchedule(sch);
```

`clearSchedule` akzeptiert alles, was `schedule` zurückgibt (ein CRON-Job-Objekt oder die ID eines Zeitplans aus dem Zeit-Assistenten)
und außerdem die Einträge von [getSchedules](#getschedules):

```js
// Alle Zeitpläne dieses Skripts löschen
getSchedules().forEach(sch => clearSchedule(sch));
```

Die Funktion gibt `true` zurück, wenn der Zeitplan gefunden und gelöscht wurde, andernfalls `false`.
Zeitpläne, die mit der Astro-Option angelegt wurden, können auf diese Weise nicht gelöscht werden.

### getAttr
```js
getAttr({ attr1: { attr2: 5 } }, 'attr1.attr2');
```
Liefert ein Attribut des Objekts. Der Pfad zum Attribut kann verschachtelt sein, wie im Beispiel.

Ist das erste Attribut ein String, versucht die Funktion, den String als JSON zu parsen.

### getAstroDate
```js
getAstroDate(pattern, date, offsetMinutes);
```
Liefert ein JavaScript-Date-Objekt für den angegebenen Astro-Namen (z. B. `"sunrise"` oder `"sunriseEnd"`). Die gültigen Werte sind in der Liste der erlaubten Werte im Abschnitt [Astro](#astro-funktion) der Funktion *schedule* aufgeführt.

Das zurückgegebene Date-Objekt wird für das übergebene *date* berechnet. Wird kein Datum angegeben, wird der aktuelle Tag verwendet.

```js
let sunriseEnd = getAstroDate('sunriseEnd');
log(`Sunrise ends today at ${sunriseEnd.toLocaleTimeString()}`);

let today = new Date();
let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let tomorrowNight = getAstroDate('night', tomorrow);
```

**Hinweis: Abhängig vom geografischen Standort kann es vorkommen, dass z. B. 'night'/'nightEnd' zu bestimmten Zeitpunkten nicht existieren (z. B. an nördlichen Standorten jedes Jahr im Mai/Juni)!**

Mit Webseiten wie [suncalc.net](http://suncalc.net) kann man prüfen, ob die Zeitpunkte korrekt sind.

### isAstroDay
```js
isAstroDay();
```
Gibt `true` zurück, wenn die aktuelle Zeit zwischen dem astronomischen Sonnenaufgang und Sonnenuntergang liegt.

### compareTime
```js
compareTime(startTime, endTime, operation, timeToCompare);
```
Vergleicht die angegebene Zeit mit Grenzwerten.

Ist `timeToCompare` nicht angegeben, wird die aktuelle Zeit verwendet.

Folgende Operationen sind möglich:

- `">"` - wenn die angegebene Zeit größer als `startTime` ist
- `">="` - wenn die angegebene Zeit größer oder gleich `startTime` ist
- `"<"` - wenn die angegebene Zeit kleiner als `startTime` ist
- `"<="` - wenn die angegebene Zeit kleiner oder gleich `startTime` ist
- `"=="` - wenn die angegebene Zeit gleich `startTime` ist
- `"<>"` - wenn die angegebene Zeit ungleich `startTime` ist
- `"between"` - wenn die angegebene Zeit zwischen `startTime` und `endTime` liegt
- `"not between"` - wenn die angegebene Zeit nicht zwischen `startTime` und `endTime` liegt

Die Zeit kann ein Date-Objekt, ein Datum mit Uhrzeit oder nur eine Uhrzeit sein.

Für die Zeitangabe kann man Astro-Namen verwenden. Alle 3 Parameter können als Astro-Zeit angegeben werden.
Folgende Werte sind möglich: `sunrise`, `sunset`, `sunriseEnd`, `sunsetStart`, `dawn`, `dusk`, `nauticalDawn`, `nauticalDusk`, `nightEnd`, `night`, `goldenHourEnd`, `goldenHour`.
Details siehe [Astro](#astro-funktion).

```js
log(compareTime('sunsetStart', 'sunsetEnd', 'between') ? 'Now is sunrise' : 'Now is no sunrise');
```

Die Zeit kann auch mit einem Offset angegeben werden:

```js
log(compareTime({ astro: 'sunsetStart', offset: 30 }, { astro: 'sunrise', offset: -30 }, '>') ? 'Now is at least 30 minutes after sunset' : 'No idea');
```

Struktur eines Astro-Objekts.

```js
{
    astro: 'sunsetStart',// Pflichtangabe, kann als String statt als Objekt angegeben werden, wenn offset und date Standardwerte haben
    offset: 30,          // optional
    date:   new Date()   // optional
}
```

### setState
```js
setState(id, state, ack, callback);
```

*Hinweis*: Die folgenden Befehle sind identisch

```js
setState('myState', 1, false);
setState('myState', { val: 1, ack: false });
setState('myState', 1);
```

Zur Verwendung von `ack` siehe https://github.com/ioBroker/ioBroker/wiki/Adapter-Development-Documentation#commands-and-statuses
Kurz:
- `ack` = `false` : Das Skript möchte ein Kommando senden, das vom Zielgerät/Adapter ausgeführt werden soll
- `ack` = `true`  : Das Kommando wurde erfolgreich ausgeführt, und der State wird als positives Ergebnis aktualisiert

### setStateAsync
```js
await setStateAsync(id, state, ack);
```
Wie setState, aber mit `promise`.

### setStateDelayed
```js
setStateDelayed(id, state, isAck, delay, clearRunning, callback);
```

Wie setState, aber mit einer Verzögerung in Millisekunden. Dabei kann man (standardmäßig) alle laufenden Verzögerungen für diese ID löschen. Z. B.

```js
// Das Licht in der Küche in einer Sekunde EINschalten
setStateDelayed('Kitchen.Light.Lamp', true,  1000);

// Das Licht in der Küche in 5 Sekunden AUSschalten und den ersten Timeout weiterlaufen lassen.
setStateDelayed('Kitchen.Light.Lamp', false, 5000, false, () => {
    log('Lamp is OFF');
});
```
Die Funktion gibt den Handler des Timers zurück, und dieser Timer kann mit clearStateDelayed einzeln gestoppt werden.

### setStateChanged
```js
await setStateChanged(id, state, ack);
```
Wie setState, setzt den Wert aber nur, wenn er sich tatsächlich geändert hat.

### setStateChangedAsync
```js
await setStateChangedAsync(id, state, ack);
```
Wie setStateChanged, aber mit `promise`.

### clearStateDelayed
```js
clearStateDelayed(id);
```

Löscht alle verzögerten Aufgaben für die angegebene State-ID oder eine bestimmte verzögerte Aufgabe.

```js
setStateDelayed('Kitchen.Light.Lamp', false,  10000); // Das Licht in der Küche in zehn Sekunden AUSschalten
let timer = setStateDelayed('Kitchen.Light.Lamp', true, 5000, false); // Das Licht in der Küche in fünf Sekunden EINschalten
clearStateDelayed('Kitchen.Light.Lamp', timer); // Es wird nichts eingeschaltet
clearStateDelayed('Kitchen.Light.Lamp'); // Alle laufenden verzögerten Aufgaben für diese ID löschen
```

### getStateDelayed
```js
getStateDelayed(id);
```

Dies ist ein synchroner Aufruf, der die Liste aller laufenden Timer (setStateDelayed) für diese ID liefert.
Man kann die Funktion auch ohne ID aufrufen und erhält dann die Timer für alle IDs.
Ruft man die Funktion für eine bestimmte Objekt-ID auf, erhält man folgende Antwort:

```js
getStateDelayed('hm-rpc.0.LQE91119.1.STATE');

// liefert ein Array wie
[
    { timerId: 1, left: 1123,   delay: 5000,  val: true,  ack: false },
    { timerId: 2, left: 12555,  delay: 15000, val: false, ack: false },
]
```

Fragt man alle IDs ab, sieht die Antwort so aus:

```js
getStateDelayed();

// liefert ein Objekt wie
{
    'hm-rpc.0.LQE91119.1.STATE': [
        { timerId: 1, left: 1123,   delay: 5000,   val: true,  ack: false },
        { timerId: 2, left: 12555,  delay: 15000,  val: false, ack: false },
    ],
    'hm-rpc.0.LQE91119.2.LEVEL': [
        { timerId: 3, left: 5679, delay: 10000,   val: 100,  ack: false },
    ],
}
```

- `left` ist die verbleibende Zeit in Millisekunden
- `delay` ist der ursprüngliche Verzögerungswert in Millisekunden

Man kann auch direkt anhand der timerId abfragen. In diesem Fall lautet die Antwort:

```js
getStateDelayed(3);

// liefert ein Objekt wie
{ id: 'hm-rpc.0.LQE91119.2.LEVEL', left: 5679, delay: 10000, val: 100, ack: false }
```

### getState
```js
getState(id);
```

Liefert den State mit der angegebenen ID in folgender Form:

```js
{
    val: value,
    ack: true/false,
    ts: timestamp,
    lc: lastchanged,
    from: origin
}
```

Existiert der State nicht, wird eine Warnung ins Log geschrieben und das Objekt `{ val: null, notExist: true }` zurückgegeben.
Um die Warnung zu vermeiden, sollte man vor dem Aufruf von getState prüfen, ob der State existiert (siehe [existsState](#existsstate)).

### getStateAsync
```js
const stateObject = await getStateAsync(id);
```
Wie getState, aber mit `promise`.

### existsState
```js
existsState(id, (err, isExists) => {});
```

Ist die Option "Nicht alle Zustände beim Start abonnieren" deaktiviert, kann man einen einfacheren Aufruf verwenden:

```js
existsState(id)
```
In diesem Fall gibt die Funktion true oder false zurück.

Prüft, ob ein State existiert.

### getObject
```js
getObject(id, enumName);
```
Liefert die Beschreibung der Objekt-ID, wie sie im System gespeichert ist.
Man kann den Namen eines Enums angeben. Ist dieser angegeben, werden dem Ergebnis zwei zusätzliche Attribute hinzugefügt: enumIds und enumNames.
Diese Arrays enthalten alle Enums, in denen die ID Mitglied ist. Z. B.:

```js
getObject('adapter.N.objectName', 'rooms');
```

liefert in enumIds alle Räume, in denen das angefragte Objekt Mitglied ist. Gibt man "true" als enumName an, erhält man *alle* Enums zurück.

### setObject
```js
setObject(id, obj, callback);
```
Schreibt ein Objekt in die DB. Dieses Kommando kann in den Einstellungen des Adapters deaktiviert werden. Die Funktion sollte vorsichtig verwendet werden, da sonst die globalen Einstellungen beschädigt werden können.

Man sollte sie verwenden, um ein vorhandenes, zuvor gelesenes Objekt zu **ändern**, z. B.:
```js
const obj = getObject('adapter.N.objectName');
obj.native.settings = 1;
setObject('adapter.N.objectName', obj, (err) => {
    if (err) log('Cannot write object: ' + err);
});
```

### existsObject
```js
existsObject(id, function (err, isExists) {});
```

Ist die Option "Nicht alle Zustände beim Start abonnieren" deaktiviert, kann man einen einfacheren Aufruf verwenden:

```js
existsObject(id)
```
In diesem Fall gibt die Funktion true oder false zurück.

Prüft, ob ein Objekt existiert.


### extendObject
```js
extendObject(id, obj, callback);
```

Fast dasselbe wie `setObject`, allerdings wird das Objekt zuerst gelesen und dann versucht, alle Einstellungen zusammenzuführen.

Verwendung z. B. so:
```js
// Instanz stoppen
extendObject('system.adapter.sayit.0', {common: {enabled: false}});
```

### deleteObject
```js
deleteObject(id, isRecursive, callback);
```

Löscht ein Objekt anhand der ID aus der DB. Hat das Objekt den Typ `state`, wird auch der State-Wert gelöscht.

Zusätzlich kann der Parameter `isRecursive` angegeben werden, dann werden auch alle Kindobjekte der angegebenen ID gelöscht. Sehr gefährlich!

Verwendung z. B. so:
```js
// State löschen
deleteObject('javascript.0.createdState');
```

*Hinweis: Die Option `isRecursive` ist nur mit js-controller >= 2.2.x verfügbar*

### getIdByName
```js
getIdByName(name, alwaysArray);
```

Liefert die ID des Objekts mit dem angegebenen Namen.
Gibt es mehr als ein Objekt mit diesem Namen, ist das Ergebnis ein Array.
Ist das Flag `alwaysArray` gesetzt, ist das Ergebnis immer ein Array, sofern eine ID gefunden wurde.
### getEnums
```js
getEnums(enumName);
```

Liefert die Liste der vorhandenen Enums mit ihren Mitgliedern, z. B.:

```js
getEnums('rooms');

// liefert alle Räume, z. B.:
[
    {
        id: 'enum.rooms.LivingRoom',
        members: [ 'hm-rpc.0.JEQ0024123.1', 'hm-rpc.0.BidCoS-RF.4' ],
        name: 'Living room'
    },
    {
        id: 'enum.rooms.Bath',
        members: [ 'hm-rpc.0.JEQ0024124.1', 'hm-rpc.0.BidCoS-RF.5' ],
        name: 'Bath'
    }
]

getEnums('functions');

// liefert alle Funktionen, z. B.:
[
    {
        id: 'enum.functions.light',
        members: [
            '0_userdata.0.AnotherOne',
            '0_userdata.0.MyLigh'
        ],
        name: {
            en: 'Light',
            ru: 'Свет',
            de: 'Licht',
            fr: 'Lumière',
            it: 'Leggero',
            nl: 'Licht',
            pl: 'Lekki',
            pt: 'Luz',
            es: 'Luz',
            'zh-cn': '光'
        }
    }
]
```

### createState
```js
createState(name, initialValue, forceCreation, common, native, callback);
```
Legt State und Objekt im javascript-Namensraum an, falls sie nicht existieren, z. B. `javascript.0.mystate`.

!! Eigene States sollten bevorzugt mit der vollständigen ID `0_userdata.0.mystate` angelegt werden !!!

#### Parameter:

- `name`: Name des States ohne Namensraum, z. B. `mystate`
- `initialValue`: Die Variable kann nach dem Anlegen initialisiert werden. Der Wert "undefined" bedeutet, dass der Wert nicht initialisiert wird.
- `forceCreation`: State anlegen/überschreiben, unabhängig davon, ob der State bereits existiert oder nicht.
- `common`: common-Beschreibung des Objekts, siehe Beschreibung [hier](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state)
- `native`: native-Beschreibung eines Objekts. Beliebige spezifische Informationen.
- `callback`: wird aufgerufen, nachdem der State angelegt und initialisiert wurde.

Setzt man in `common` das Flag `alias` auf `true`, wird ein Alias mit demselben Namen wie der State (aber im Namensraum `alias.0`) angelegt.
Der Alias wird nur angelegt, wenn er noch nicht existiert.

Folgende Einstellungen für Aliase sind ebenfalls gültig:
```js
common => {
    alias: {
        id: 'alias.0.myOtherState', // wird automatisch angelegt, falls noch nicht vorhanden
        write: 'val * 1000', // Umrechnungsfunktion für das Schreiben in den angelegten State
        read: 'val / 1000'   // Umrechnungsfunktion für das Lesen aus dem angelegten State
    }
}
```

oder

```js
common => {
    alias: {
        id: 'alias.0.myOtherState', // wird automatisch angelegt, falls noch nicht vorhanden
    }
}
```

Es gibt auch Kurzformen von createState:

- `createState('myDatapoint')` - legt den State einfach an, falls er nicht existiert
- `createState('myDatapoint', 1)` - legt den State an, falls er nicht existiert, und initialisiert ihn mit dem Wert 1
- `createState('myDatapoint', { type: 'string', role: 'json', read: true, write: false }, () => { log('created'); });` - mit common-Definitionen wie type, read, write und role
- `createState('myDatapoint', { name: 'My own datapoint', unit: '°C' }, () => { log('created'); });`
- `createState('myDatapoint', 1, { name: 'My own datapoint', unit: '°C' })` - legt den State mit bestimmtem Namen und bestimmter Einheit an, falls er nicht existiert

#### Ein Objekt an zweiter Position ist immer das `common`

Diese Kurzformen sind der Grund, warum ein Objekt an zweiter Position **nie** als Initialwert
gelesen wird. `createState('myDatapoint', {}, { type: 'object' })` macht daher nicht das, wonach es aussieht:
Das `{}` wird zu `common`, und `{ type: 'object' }` rückt an die Stelle von `native`.

Um einem State einen Initialwert zu geben, der kein primitiver Wert ist, gibt man ihn in `common.def` an:

```js
createState('0_userdata.0.myObject', { name: 'My object', type: 'object', read: true, write: true, def: {} });
```

Ein State vom Typ `object`, `json` oder `array` speichert seinen Wert als JSON, daher beginnt der obige State
mit dem String `'{}'` - genau so, wie `setState('0_userdata.0.myObject', {})` ihn speichern würde. Der Standardwert
wird automatisch in einen String umgewandelt; `def: '{}'` selbst anzugeben funktioniert ebenso.

### createStateAsync
```js
await createStateAsync(name, initialValue, forceCreation, common, native);
```

Wie `createState`, aber es wird ein Promise zurückgegeben.

### deleteState
```js
deleteState(name, callback);
```
Löscht State und Objekt im javascript-Namensraum, z. B. `javascript.0.mystate`. States anderer Adapter können nicht gelöscht werden.

```js
deleteState('myDatapoint')
```
löscht den State einfach, falls er existiert.

### deleteStateAsync
```js
await deleteStateAsync(name);
```

Wie `deleteState`, aber es wird ein Promise zurückgegeben.

### createAlias
```js
createAlias(name, alias, forceCreation, common, native, callback);
```

Legt einen Alias im Namensraum `alias.0` an, falls er nicht existiert, z. B. `javascript.0.myalias`, der auf einen State oder auf States zum Lesen/Schreiben verweist.
Die common-Definition wird aus dem Objekt der Lese-Alias-ID übernommen, ein übergebenes common hat jedoch Vorrang.

#### Parameter:

- `name`: ID des neuen Alias-States (auch ohne Alias-Namensraum möglich), z. B. `test.mystate` (der Namensraum `alias.0.` wird ergänzt = `alias.0.test.mystate`)
- `alias`: kann entweder eine vorhandene State-ID als String sein oder ein Objekt mit vollständiger Alias-Definition inklusive Lese-/Schreib-IDs und Lese-/Schreibfunktionen. Hinweis: Alias-Definitionen können nicht als Teil des Parameters common gesetzt werden!
- `forceCreation`: Alias anlegen/überschreiben, unabhängig davon, ob der State bereits existiert oder nicht.
- `common`: common-Beschreibung des Alias-Objekts, siehe Beschreibung [hier](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state). Hier angegebene Werte haben Vorrang vor der common-Definition des Objekts der Lese-Alias-ID. Hinweis: Alias-Definitionen können nicht als Teil dieses common-Parameters gesetzt werden, siehe Parameter alias!
- `native`: native-Beschreibung eines Objekts. Beliebige spezifische Informationen.
- `callback`: wird aufgerufen, nachdem der State angelegt und initialisiert wurde.

Es gibt auch Kurzformen von createAlias:

- `createAlias('myAlias', 'myDatapoint')` - legt einfach alias.0.myAlias an, das auf javascript.X.myDatapoint verweist, falls es nicht existiert
- `createAlias('myAlias', { id: { read: 'myReadDatapoint', write: 'myWriteDatapoint' }})` - legt einen Alias an, der auf unterschiedliche States zum Lesen/Schreiben verweist

Weitere Details siehe createState, die Funktion arbeitet ähnlich.

### createAliasAsync
```js
await createAliasAsync(name, alias, forceCreation, common, native);
```

Wie `createAlias`, aber es wird ein Promise zurückgegeben.
### sendTo
```js
sendTo(adapter, command, message, callback);
sendTo(adapter, command, message, options, callback);
```

Sendet eine Nachricht an eine bestimmte oder an alle Instanzen eines Adapters. Wird nur der Adaptername angegeben, wird die Nachricht an alle Instanzen gesendet.

Welche Nachrichten konkret unterstützt werden, ist in der Dokumentation des jeweiligen Adapters beschrieben.

Beispiel (mit benutzerdefiniertem Timeout):

```js
sendTo('telegram', { user: 'UserName', text: 'Test message' }, { timeout: 2000 });
```

Einige Adapter unterstützen auch Antworten auf die gesendeten Nachrichten (z. B. history, sql, telegram).
Die Antwort wird nur dann an den Callback zurückgegeben, wenn die Nachricht an eine bestimmte Instanz gesendet wird!

Beispiel (mit Callback):

```js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, (res) => {
    log(`Sent to ${res} users`);
});
```

*Der Standard-Timeout beträgt 20000 Millisekunden (sofern eine Callback-Funktion angegeben wurde)*

```js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, { timeout: 2000 }, (res) => {
    log(`Sent to ${res} users`);
});
```

### sendToAsync
```js
await sendToAsync(adapter, command, message);
await sendToAsync(adapter, command, message, options);
```
Wie sendTo, jedoch mit `promise`.

Beispiel:

```js
const res = await sendToAsync('sql.0', 'getEnabledDPs', {});
log(JSON.stringify(res));
```

### sendToHost
```js
sendToHost(hostName, command, message, callback);
```

Sendet eine Nachricht an die Controller-Instanz.

Die folgenden Kommandos werden unterstützt:
- `'cmdExec'`
- `'getRepository'`
- `'getInstalled'`
- `'getVersion'`
- `'getDiagData'`
- `'getLocationOnDisk'`
- `'getDevList'`
- `'getLogs'`
- `'getLogFile'`
- `'getLogFiles'`
- `'delLogs'`
- `'getHostInfo'`
- `'getHostInfoShort'`
- `'updateMultihost'`
- `'upgradeController'` - Aktualisiert den js-controller auf die neueste Version
- `'getInterfaces'` - Liefert alle verfügbaren Netzwerkschnittstellen des Systems
- `'upload'` - Startet einen Adapter-Upload
- `'rebuildAdapter'`
- `'readBaseSettings'`
- `'writeBaseSettings'`
- `'addNotification'`
- `'clearNotifications'`
- `'getNotifications'`
- `'updateLicenses'` - Liest die Lizenzen von iobroker.net
- `'upgradeOsPackages'`
- `'restartController'`

Dabei handelt es sich um recht spezielle Kommandos, die nur selten benötigt werden.

Beispiel:

```js
sendToHost('myComputer', 'cmdExec', { data: 'ls /' }, (res) => {
    log('List of files: ' + res.data);
});
```

**Hinweis:** Um diese Funktion aufzurufen, muss die Option *Kommando "sendToHost" erlauben* aktiviert sein.

### sendToHostAsync
```js
await sendToHostAsync(hostName, command, message);
```
Wie sendToHost, jedoch mit `promise`.

### setInterval
```js
setInterval(callback, ms, arg1, arg2, arg3, arg4);
```

Wie `setInterval` in JavaScript.

### clearInterval
```js
clearInterval(id);
```

Wie `clearInterval` in JavaScript.

### setTimeout
```js
setTimeout(callback, ms, arg1, arg2, arg3, arg4);
```
Wie `setTimeout` in JavaScript.

### clearTimeout
```js
clearTimeout(id);
```

Wie `clearTimeout` in JavaScript.

### setImmediate
```js
setImmediate(callback, arg1, arg2, arg3, arg4);
```

Wie `setImmediate` in JavaScript und nahezu identisch mit `setTimeout(callback, 0, arg1, arg2, arg3, arg4)`, jedoch mit höherer Priorität.

### formatDate
```js
formatDate(millisecondsOrDate, format);
```

#### Parameter:

- `millisecondsOrDate`: Anzahl der Millisekunden aus state.ts oder state.lc (Millisekunden seit 1970.01.01 00:00:00), ein JavaScript-Objekt *new Date()* oder die Anzahl der Millisekunden aus *(new Date().getTime())*
- `format`: Kann `null` sein, dann wird das Zeitformat des Systems verwendet, andernfalls

* YYYY, JJJJ, ГГГГ - Jahr vierstellig, z. B. 2015
* YY, JJ, ГГ - Jahr zweistellig, z. B. 15
* MM, ММ(kyrillisch) - Monat zweistellig, z. B. 01
* M, М(kyrillisch) - Monat ohne führende Null, z. B. 1
* DD, TT, ДД - Tag zweistellig, z. B. 02
* D, T, Д - Tag ohne führende Null, z. B. 2
* hh, SS, чч - Stunden zweistellig, z. B. 03
* h, S, ч - Stunden ohne führende Null, z. B. 3
* mm, мм(kyrillisch) - Minuten zweistellig, z. B. 04
* m, м(kyrillisch) - Minuten ohne führende Null, z. B. 4
* ss, сс(kyrillisch) - Sekunden zweistellig, z. B. 05
* s, с(kyrillisch) - Sekunden ohne führende Null, z. B. 5
* sss, ссс(kyrillisch) - Millisekunden
* WW, НН(kyrillisch) - Wochentag ausgeschrieben als Text
* W, Н(kyrillisch) - Wochentag abgekürzt als Text
* OO, ОО(kyrillisch) - Monatsname ausgeschrieben
* OOO, ООО(kyrillisch) - Monatsname ausgeschrieben im Genitiv
* O, О(kyrillisch) - Monatsname abgekürzt

#### Beispiel

```js
formatDate(new Date(), "YYYY-MM-DD") // => Datum "2015-02-24"
formatDate(new Date(), "hh:mm") // => Stunden und Minuten "17:41"
formatDate(state.ts) // => "24.02.2015"
formatDate(state.ts, "JJJJ.MM.TT SS:mm:ss.sss") // => "2015.02.15 17:41:98.123"
formatDate(new Date(), "WW") // => Wochentag "Tuesday"
formatDate(new Date(), "W") // => Wochentag "Tu"
```

### formatTimeDiff
```js
formatTimeDiff(milliseconds, format);
```

#### Parameter:

- `milliseconds`: Differenz in Millisekunden*
- `format`: Kann `null` sein, dann wird das Format `hh:mm:ss` verwendet, andernfalls

* DD, TT, ДД - Tage zweistellig, z. B. "02"
* D, T, Д - Tage ohne führende Null, z. B. "2"
* hh, SS, чч - Stunden zweistellig, z. B. "03"
* h, S, ч - Stunden ohne führende Null, z. B. "3"
* mm, мм(kyrillisch) - Minuten zweistellig, z. B. "04"
* m, м(kyrillisch) - Minuten ohne führende Null, z. B. "4"
* ss, сс(kyrillisch) - Sekunden zweistellig, z. B. "05"
* s, с(kyrillisch) - Sekunden ohne führende Null, z. B. "5"

Mit dem Escape-Zeichen `\` lässt sich die Ersetzung verhindern, z. B. `DD \Day\s, h \hour\s, m \minute, ss \second\s`

#### Beispiel

```js
formatTimeDiff(60000, "mm:ss") // => "01:00"

const diff = 172800000 + 10800000 + 540000 + 15000; // 2 Tage, 3 Stunden, 9 Minuten + 15 Sekunden
formatTimeDiff(diff); // "51:09:15"
formatTimeDiff(diff, 'DD hh:mm'); // "02 03:09"
formatTimeDiff(diff, 'D hh:mm'); // "2 03:09"
formatTimeDiff(diff, 'hh:mm:ss'); // "51:09:15"
formatTimeDiff(diff, 'h:m:s'); // "51:9:15"
formatTimeDiff(diff, 'hh:mm'); // "51:09"
formatTimeDiff(diff, 'mm:ss'); // "3069:15"
formatTimeDiff(diff, 'hh'); // "51"
formatTimeDiff(diff, 'mm'); // "3069"
```

### getDateObject
```js
getDateObject(stringOrNumber);
```

Wandelt einen String oder eine Zahl in ein Date-Objekt um.
Wird nur die Uhrzeit angegeben, wird das aktuelle Datum ergänzt und anschließend die Umwandlung versucht.

```js
getDateObject('20:00'); // 2024-05-18T18:00:00.000Z
getDateObject('2024-01-01'); // 2024-01-01T00:00:00.000Z
```

### formatValue
```js
formatValue(value, decimals, format);
```

Formatiert einen beliebigen Wert (auch Strings) als Zahl. Ersetzt den Punkt durch ein Komma, wenn dies im System so konfiguriert ist.
Decimals gibt die Anzahl der Nachkommastellen an. Der Standardwert ist 2.
Format ist optional:
 - '.,': 1234.567 => 1.234,56
 - ',.': 1234.567 => 1,234.56
 - ' .': 1234.567 => 1 234.56


### adapterSubscribe
```js
adapterSubscribe(id);
```

Sendet an einen Adapter die Nachricht "subscribe", um den Adapter zu informieren. Hat der Adapter in common das Flag "subscribable", wird diese Funktion bei "subscribe" automatisch aufgerufen.

### adapterUnsubscribe
```js
adapterUnsubscribe(id);
```

Sendet an einen Adapter die Nachricht `unsubscribe`, um den Adapter zu informieren, dass er die Werte nicht mehr abfragen soll.

### $ - Selektor
```js
$(selector).on((obj) => {}); // Registriert ein Abonnement für jeden passenden State
$(selector).toArray(); // Liefert alle zum Selektor-Ausdruck passenden Objekt-IDs (erfordert Version >= 8.2.0)
$(selector).each((id, i) => {}); // Iteriert über alle passenden States
$(selector).setState(value, ack, callback); // Setzt den State-Wert aller passenden Objekt-IDs (Callback ist optional)
$(selector).setStateAsync(value, ack); // Setzt den State-Wert aller passenden Objekt-IDs - gibt ein Promise zurück
$(selector).setStateChanged(value, ack, callback); // Setzt den State-Wert aller passenden Objekt-IDs, falls sich der Wert geändert hat (Callback ist optional)
$(selector).setStateChangedAsync(value, ack, callback); // Setzt den State-Wert aller passenden Objekt-IDs, falls sich der Wert geändert hat - gibt ein Promise zurück
$(selector).setStateDelayed(state, isAck, delay, clearRunning, callback); // Setzt den State-Wert aller passenden Objekt-IDs mit der angegebenen Verzögerung
$(selector).getState(); // Liefert alle States
$(selector).getStateAsync(); // Liefert alle States - gibt ein Promise zurück
```

Format des Selektors:
```js
"name[commonAttr=something1](enumName=something2){nativeName=something3}[id=idfilter][state.id=idfilter]"
```

name kann sein: state, channel, device oder schedule
`idfilter` kann Platzhalter '*' enthalten

Präfixe ***(nicht implementiert - sollte diskutiert werden)*** :

* \# - nach Name statt nach ID auswählen
* . - nach Rolle filtern
* § - nach Raum filtern

***Beispiel***:

- `$('state[id=*.STATE]')` oder `$('state[state.id=*.STATE]')` oder `$('*.STATE')` - wählt alle States aus, deren ID auf ".STATE" endet.
- `$('state[id='hm-rpc.0.*]')` oder `$('hm-rpc.0.*')` - liefert alle States der Adapterinstanz hm-rpc.0
- `$('channel(rooms=Living room)')` - alle States im Raum "Living room"
- `$('channel{TYPE=BLIND}[state.id=*.LEVEL]')` - liefert alle Rollläden von Homematic
- `$('channel[role=switch](rooms=Living room)[state.id=*.STATE]').setState(false)` - schaltet alle States mit .STATE von Kanälen mit der Rolle "switch" im Raum "Living room" auf false
- `$('channel[state.id=*.STATE](functions=Windows)').each(function (id, i) {log(id);});` - gibt alle States des Enums "windows" im Log aus
- `$('schedule[id=*65]').each(function (id, i) {log(id);});` - gibt alle Zeitpläne aus, deren ID auf 65 endet
- `$('.switch §"Living room")` - nimmt die States aller Schalter im Raum 'Living room' ***(nicht implementiert - sollte diskutiert werden)***
- `$('channel .switch §"Living room")` - nimmt die States aller Schalter im Raum 'Living room' ***(nicht implementiert - sollte diskutiert werden)***

***Erklärung***
Als Beispiel dient folgender Code:
```js
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').on(obj => {
   log('New state ' + obj.id + ' = ' + obj.state.val);
});
```

Dieser Code sucht in Kanälen.
Er findet alle Kanäle mit `common.role="switch"`, die zu `enum.rooms.Wohnzimmer` gehören.
Von diesen Kanälen werden alle States genommen, deren ID auf `".STATE"` endet, und alle diese States werden abonniert.
Ändert sich einer dieser States, wird der Callback wie bei der Funktion "on" aufgerufen.

Folgende Funktionen sind möglich: setState, getState (nur vom ersten), on, each, toArray

```js
// Alle Schalter im "Wohnzimmer" einschalten
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setState(true);
```

Die "each"-Schleife lässt sich abbrechen, indem man false zurückgibt, z. B.:
```js
// Die ersten zwei IDs aller Schalter im "Wohnzimmer" ausgeben
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').each((id, i) => {
    log(id);
    if (i == 1) {
        return false;
    }
});
```
Alternativ kann man ein gewöhnliches Array der IDs abrufen und es beliebig weiterverarbeiten:
```js
// States holen und nur diejenigen mit dem Wert `true` herausfiltern
const enabled = $('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').toArray().filter((id) => getState(id)?.val === true);
```

### readFile
```js
readFile(adapter, fileName, (error, bytes) => {});
```

Das Ergebnis wird im Callback übergeben.
Liest eine Datei aus der DB aus dem Ordner `javascript.0`.

Das Argument *adapter* kann weggelassen werden.

```js
// vis-Views lesen
readFile('vis.0', '/main/vis-views.json', (error, data) => {
    log(data.substring(0, 50));
});

// Dasselbe wie
//readFile('/../vis.0/main/vis-views.json', (error, data) => {
//     log(data.substring(0, 50));
//});
```

Standardmäßig ist das Arbeitsverzeichnis/der Adapter `javascript.0`.

### writeFile
```js
writeFile(adapter, fileName, bytes, (error) => {});
```

Der optionale Fehlercode wird im Callback übergeben. Das Argument *adapter* kann weggelassen werden.
fileName ist der Name der Datei in der DB. Alle Dateien werden im Ordner "javascript" gespeichert.
Um in andere Ordner zu schreiben, z. B. nach "/vis.0/", verwendet man setFile.

Eine Datei wie `'/subfolder/file.txt'` wird unter `"/javascript/subfolder/file.txt"` gespeichert und ist über den Webserver unter `"http://ip:8082/javascript/subfolder/file.txt"` erreichbar.

```js
// Screenshot in der DB speichern
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile(null, '/screenshots/1.png', data, (error) => {
    log('file written');
});

// Dasselbe wie
//writeFile('/screenshots/1.png', data, function (error) {
//    log('file written');
//});
```

```js
// Datei in '/vis.0' in der DB speichern
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile('vis.0', '/screenshots/1.png', data, (error) => {
    log('file written');
});
```

### delFile
```js
delFile(adapter, fileName, (error) => {});
```

Löscht eine Datei oder ein Verzeichnis. fileName ist der Name der Datei oder des Verzeichnisses in der DB.

Der alternative Name dieser Methode ist `unlink`

### renameFile
```js
renameFile(adapter, oldName, newName, (error) => {});
```

Benennt eine Datei oder ein Verzeichnis um. oldName ist der Name der Datei oder des Verzeichnisses in der DB, der in newName umbenannt wird.

Der alternative Name dieser Methode ist `rename`

### onFile
```js
onFile(id, fileName, withFile, (id, fileName, size, fileData, mimeType) => {});
// oder
onFile(id, fileName, (id, fileName, size) => {});
```

Abonniert Dateiänderungen:
- `id` ist die ID eines Objekts vom Typ `meta`, z. B. `vis.0`
- `fileName` ist ein Dateiname oder ein Muster, z. B. `main/*` oder `main/vis-view.json`
- `withFile` gibt an, ob der Dateiinhalt im Callback übergeben werden soll oder nicht. Die Übergabe des Dateiinhalts kostet Speicher und Zeit; möchte man nur über Änderungen informiert werden, setzt man `withFile` auf false.

Argumente im Callback:
- `id` - ID des `meta`-Objekts;
- `fileName` - Dateiname (kein Muster);
- `size` - neue Dateigröße;
- `fileData` - Dateiinhalt vom Typ `Buffer`, wenn die Datei binär ist (anhand der Dateiendung erkannt), sonst `string`. Wird nur bei `withFile` übergeben;
- `mimeType` - MIME-Typ der Datei, z. B. `image/jpeg`. Wird nur bei `withFile` übergeben;

**Wichtig**: Diese Funktionalität ist nur mit js-controller@4.1.x oder neuer verfügbar.

### offFile
```js
offFile(id, fileName);
// oder
onFile(id, fileName);
```
Beendet das Abonnement von Dateiänderungen:
- `id` ist die ID eines Objekts vom Typ `meta`, z. B. `vis.0`
- `fileName` ist ein Dateiname oder ein Muster, z. B. `main/*` oder `main/vis-view.json`

**Wichtig**: Diese Funktionalität ist nur mit js-controller@4.1.x oder neuer verfügbar.

### onStop
```js
onStop (() => { /* etwas tun, wenn das Skript gestoppt wird */ }, timeout);
```
Registriert einen Callback, der aufgerufen wird, wenn das Skript gestoppt wird. Wird z. B. verwendet, um die Kommunikation zu beenden oder Verbindungen zu schließen.

```js
// Verbindung aufbauen
const conn = require('net');
// ...

// Verbindung schließen, wenn das Skript gestoppt wird
onStop((callback) => {
    if (conn) {
        // Verbindung schließen
        conn.destroy();
    }
    callback();
}, 2000 /*ms*/);
```
`timeout` beträgt standardmäßig 1000 ms.

### getHistory
```js
getHistory(instance, options, (error, result, options, instance) => {});
```

Liest die Historie aus der angegebenen Instanz. Ist keine Instanz angegeben, wird die im System eingestellte Standard-Historieninstanz verwendet.
```js
// Historie von 'system.adapter.admin.0.memRss' aus dem SQL-Treiber lesen
const end = new Date().getTime();
getHistory(
    'sql.0',
    {
        id:         'system.adapter.admin.0.memRss',
        start:      end - 3600000,
        end:        end,
        aggregate:  'm4',
        timeout:    2000
    },
    (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    }
);
```

Die möglichen Optionen sind [hier](https://github.com/ioBroker/ioBroker.history#access-values-from-javascript-adapter) beschrieben.

Zusätzlich zu diesen Parametern muss "id" angegeben werden, optional kann auch timeout angegeben werden (Standard: 20000 ms).

Ein weiteres Beispiel:
```js
// Die letzten 50 Einträge aus der Standard-Historieninstanz ohne Aggregation abrufen:
getHistory({
        id:         'system.adapter.admin.0.alive',
        aggregate:  'none',
        count:      50
    }, (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    });
```

**Hinweis: ** Selbstverständlich muss die Historie für die gewählte ID zuerst im Admin aktiviert werden.
### runScript
```js
runScript('scriptName', () => {
    // Callback ist optional
    log('Srcipt started, but not yet executed');
});
```

Startet andere Skripte (und auch sich selbst) anhand des Namens bzw. startet sie neu.

```js
// Skript neu starten
runScript('groupName.scriptName1');
```

### runScriptAsync
Wie runScript, aber mit `promise`.
```js
runScriptAsync('scriptName')
    .then(() => log('Script started, but not yet executed'));

// oder

await runScriptAsync('scriptName');
log(`Script was restarted`);
```

### startScript
```js
startScript('scriptName', ignoreIfStarted, callback);
```

Startet das Skript. Wenn ignoreIfStarted auf true gesetzt ist, passiert nichts, falls das Skript bereits läuft, andernfalls wird das Skript neu gestartet.

```js
startScript('scriptName', true); // Skript starten, falls es nicht gestartet ist
```

### startScriptAsync
Wie startScript, aber mit `promise`.

```js
startScriptAsync('scriptName', ignoreIfStarted)
    .then(started => log(`Script was ${started ? 'started' : 'already started'}`));

// oder

const started = await startScriptAsync('scriptName', ignoreIfStarted);
log(`Script was ${started ? 'started' : 'already started'}`);
```

Startet das Skript. Wenn ignoreIfStarted auf true gesetzt ist, passiert nichts, falls das Skript bereits läuft, andernfalls wird das Skript neu gestartet.

```js
startScript('scriptName', true); // Skript starten, falls es nicht gestartet ist
```

### stopScript
```js
stopScript('scriptName', callback);
```

Wenn stopScript ohne Argumente aufgerufen wird, stoppt sich das Skript selbst:

```js
stopScript();
```

### stopScriptAsync
Wie stopScript, aber mit `promise`:
```js
stopScriptAsync('scriptName')
    .then(stopped => log(`Script was ${stopped ? 'stopped' : 'already stopped'}`));

// oder
const stopped = await stopScriptAsync('scriptName');
log(`Script was ${stopped ? 'stopped' : 'already stopped'}`);
```

Wenn stopScript ohne Argumente aufgerufen wird, stoppt sich das Skript selbst:

```js
stopScript();
```

### isScriptActive
```js
isScriptActive('scriptName');
```

Gibt zurück, ob ein Skript aktiviert oder deaktiviert ist. Dabei ist zu beachten, dass damit nicht angegeben wird, ob das Skript gerade läuft oder nicht.
Das Skript kann beendet, aber dennoch aktiviert sein.

Es ist keine Funktion. Es ist eine Variable mit der JavaScript-Instanz, die im Gültigkeitsbereich des Skripts sichtbar ist.

### toInt
### toFloat
### toBoolean
### jsonataExpression

### wait
Pausiert einfach die Ausführung des Skripts.
Achtung: Diese Funktion ist ein `promise` und muss wie folgt aufgerufen werden:
```js
await wait(1000);
```

### sleep
Wie [wait](#wait)

### messageTo
```js
messageTo({ instance: 'instance', script: 'script.js.common.scriptName', message: 'messageName' }, data, { timeout: 1000 }, result =>
    log(JSON.stringify(result)));
```

Sendet die Nachricht über den "Nachrichtenbus" an ein anderes Skript. Oder sogar an einen Handler im selben Skript.

Das Timeout für den Callback beträgt standardmäßig 5 Sekunden.

Das Ziel kann verkürzt werden zu:

```js
messageTo('messageName', data, (result) => {
    log(JSON.stringify(result));
});
```

Callback und Optionen sind optional, das Timeout beträgt standardmäßig 5000 Millisekunden (falls ein Callback angegeben ist).

```js
messageTo('messageName', dataWithNoResponse);
```

### messageToAsync
```js
onMessage('myTopic', async (data, callback) => {
    log(data);

    if (!data.myPayload) {
        // Fehler zurückgeben (Promise reject)
        callback({ error: 'something went wrong!!' });
    } else {
        // Ergebnis zurückgeben (Promise resolve)
        callback({ result: 'ok' });
    }
});

(async () => {
    try {
        const msg = await messageToAsync({ instance: 0, script: 'script.js.test2', message: 'myTopic' }, { myPayload: true }, { timeout: 1000 });
        log(`Done with: ${JSON.stringify(msg)}`);
    } catch (error) {
        // Inhalt von result.error
        console.error(error);
    }
})();
```

### onMessage
```js
onMessage('messageName', (data, callback) => {
    log(`Received data: ${data}`);

    callback({ result: Date.now() });
});
```

Abonniert den Nachrichtenbus des `javascript`-Adapters und liefert die Antwort über den Callback.
Die Antwort des Skripts, das als erstes antwortet, wird als Antwort akzeptiert, alle anderen Antworten werden ignoriert.

Um eine Nachricht an ein JavaScript-Skript zu senden, die dann von diesem Handler empfangen wird, verwendet man [messageTo](#messageto).

Um eine Nachricht von einem beliebigen anderen Adapter zu senden, verwendet man

```js
adapter.sendTo('javascript.0', 'toScript', {
    script: 'script.js.messagetest',
    message: 'messageName',
    data: {
        flag: true
    }
});
```

Um eine Nachricht über die CLI zu senden, verwendet man

```bash
iob message javascript.0 toScript '{"script": "script.js.messagetest", "message": "messageName", "data": { "flag": true }}'
```

### onMessageUnregister
```js
const id = onMessage('messageName', (data, callback) => {
    log(data);
    callback({ result: Date.now() });
});

// Abonnement eines bestimmten Handlers beenden
onMessageUnregister(id);
// oder Abonnement über den Namen beenden
onMessageUnregister('messageName');
```

Beendet das Abonnement dieser Nachricht.

### onLog
```js
onLog('error', data => {
    sendTo('telegram.0', { user: 'UserName', text: data.message });
    log('Following was sent to telegram: ' + data.message);
});
```

Abonniert Logs mit dem angegebenen Schweregrad.

*Wichtig:* Im Handler können keine Logs mit demselben Schweregrad ausgegeben werden, um Endlosschleifen zu vermeiden.

Beispielsweise erzeugt dies keine Logs:
```js
onLog('error', data => {
    console.error('Error: ' + data.message);
});
```

Um alle Logs zu empfangen, kann `*` verwendet werden. In diesem Fall wird die Log-Ausgabe im Handler vollständig deaktiviert.

```js
onLog('*', data => {
    console.error('Error: ' + data.message); // erzeugt keine Logs
});
```

### onLogUnregister
```js
function logHandler(data) {
    console.error('Error: ' + data.message);
}
const id = onLog('warn', logHandler);

// Abonnement über die ID beenden
onLogUnregister(id);
// oder Abonnement über die Handler-Funktion beenden
onLogUnregister(logHandler);
// oder Abonnement aller Handler mit einem bestimmten Schweregrad beenden
onLogUnregister('warn');
```

Beendet das Abonnement dieser Logs.

### httpGet

*Erfordert Version >= 7.9.0*

```js
httpGet('http://jsonplaceholder.typicode.com/posts', (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
```

Der zweite Parameter kann ein Objekt mit weiteren Optionen sein (optional). Alle Optionen sind optional. Unterstützte Flags:

- `timeout` (number) - Timeout in Millisekunden
- `responseType` (string) - Unterstützte Werte sind `text` (Standard) oder `arraybuffer` für Binärdaten in der Antwort
- `basicAuth` (object) - Zugangsdaten für die HTTP-Basic-Authentifizierung, z. B. `{ user: 'admin', password: 'iobroker' }`
- `bearerAuth` (string) - Token für die Bearer-Authentifizierung
- `headers` (object) - Zusätzliche benutzerdefinierte HTTP-Header, z. B. `{ 'Accept-Language': 'en-GB,en;q=0.9' }`
- `validateCertificate` (boolean) - Erlaubt selbstsignierte Zertifikate, wenn `false`

```js
httpGet('http://jsonplaceholder.typicode.com/posts', { timeout: 1000 }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
```

Datei in das ioBroker-Dateisystem herunterladen:

```js
httpGet('http://1.2.3.4/image.jpg', { responseType: 'arraybuffer' }, async (err, response) => {
    if (!err) {
        writeFile('0_userdata.0', 'test.jpg', response.data, (err) => {
            if (err) {
                console.error(err);
            }
        });
    } else {
        console.error(err);
    }
});
```

Zertifikatsprüfung deaktivieren - *Erfordert Version >= 8.4.0*

```js
httpGet('http://jsonplaceholder.typicode.com/posts', { validateCertificate: false }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
```

### httpPost

*Erfordert Version >= 7.9.0*

```js
httpPost('http://jsonplaceholder.typicode.com/posts', { title: 'foo', body: 'bar', userId: 1 }, (error, response) => {
    if (!error) {
        console.log(response.statusCode);
        console.log(response.data);
        console.log(response.headers);
    } else {
        console.error(error);
    }
});
```

Mit benutzerdefinierten Headern und Authentifizierung

```js
httpPost(
    'http://jsonplaceholder.typicode.com/posts',
    {
        title: 'foo',
        body: 'bar',
        userId: 1
    },
    {
        timeout: 2000,
        basicAuth: {
            user: 'admin',
            password: 'dg2LdALNznHFNo'
        },
        headers: {
            'Cookie': 'PHPSESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1'
        }
    },
    (error, response) => {
        if (!error) {
            console.log(response.statusCode);
            console.log(response.data);
            console.log(response.headers);
        } else {
            console.error(error);
        }
    }
);
```

### createTempFile

*Erfordert Version >= 8.3.0*

```js
httpGet('https://raw.githubusercontent.com/ioBroker/ioBroker.javascript/master/admin/javascript.svg', { responseType: 'arraybuffer' }, async (err, response) => {
    if (err) {
        console.error(err);
    } else {
        const tempFilePath = createTempFile('javascript.svg', response.data);
        console.log(`Saved to ${tempFilePath}`);

        // Den neuen Pfad in anderen Skripten verwenden (z. B. sendTo)
    }
});
```

```js
onFile('0_userdata.0', '*.jpg', true, async (id, fileName, size, data, mimeType) => {
    const tempFilePath = createTempFile(fileName, response.data);

    // Den neuen Pfad in anderen Skripten verwenden (z. B. sendTo)
});
```

```js
readFile('0_userdata.0', 'test.jpg', (err, data, mimeType) => {
    if (err) {
        console.error(err);
    } else {
        const tempFilePath = createTempFile('test.jpg', data);

        // Den neuen Pfad in anderen Skripten verwenden (z. B. sendTo)
        sendTo('telegram.0', 'send', {
            text: tempFilePath,
            caption: 'Just a test image',
            user: 'yourUsername',
        });
    }
});
```

### registerNotification

*Erfordert Version >= 8.8.0*

```js
registerNotification('This is just an information'); // Benachrichtigung
registerNotification('This is an important message!', true); // Alarm
```

## Globale Skriptvariablen
### scriptName
`scriptName` - Der Name des Skripts.

```js
log(`Script ${scriptName} started!`);
```

### instance
`instance` - Die JavaScript-Instanz, in der ein Skript ausgeführt wird (z. B. `0`).

```js
log(`Script ${scriptName} started started by ${instance}`);
```

### defaultDataDir
`defaultDataDir` - Absoluter Pfad zu iobroker-data.

```js
log(`Data dir: ${defaultDataDir}`);
```

### verbose
`verbose` - Ist der ausführliche Modus (Verbose) aktiviert?

```js
log(`Verbose mode: ${verbose ? 'enabled' : 'disabled'}`);

// Beispiel
if (verbose) {
    log('...');
}
```

### SECRETS
`SECRETS` - Die Zugangsdaten aus dem zentralen Zugangsdaten-Speicher von ioBroker.

Die Zugangsdaten werden in der Admin-Oberfläche unter **Allgemeine Einstellungen** -> **Zugangsdaten** verwaltet. Jeder Zugangsdaten-Eintrag
hat eine ID (wie `CameraPassword`) und enthält entweder einen einzelnen Schlüssel **key** (z. B. einen API-Schlüssel oder ein Passwort) oder ein
Paar aus **login**/**password**. Die geheimen Felder werden mit dem System-Secret verschlüsselt gespeichert und
den Skripten bereits entschlüsselt übergeben:

```js
// Zugangsdaten-Eintrag vom Typ "key"
httpGet(`http://camera.local/snapshot?password=${SECRETS.CameraPassword.key}`, (err, result) => {
    // ...
});

// Zugangsdaten-Eintrag vom Typ "login"
log(`Mail account: ${SECRETS.MyMailAccount.login} / ${SECRETS.MyMailAccount.password}`);

// IDs von Zugangsdaten, die keine gültigen Variablennamen sind
log(SECRETS['My camera'].key);
```

`SECRETS` ist schreibgeschützt und immer aktuell: Wenn ein Zugangsdaten-Eintrag in der Admin-Oberfläche hinzugefügt, geändert oder gelöscht wird,
wird der neue Wert sofort verwendet - weder der Adapter noch das Skript müssen neu gestartet werden.

Wenn ein Zugangsdaten-Eintrag nicht existiert, wird `undefined` zurückgegeben:

```js
if (SECRETS.CameraPassword) {
    log('The camera password is defined');
}
```

#### Welche Felder hat ein Zugangsdaten-Eintrag?

Jeder Zugangsdaten-Eintrag hat entweder einen einzelnen `key` oder ein Paar `login`/`password`. Es gibt drei Möglichkeiten, das herauszufinden:

- In den Instanzeinstellungen des JavaScript-Adapters listet der Abschnitt **Verfügbare Zugangsdaten** jeden
  Zugangsdaten-Eintrag mit seinen Feldern und dem kopierfertigen Ausdruck auf.
- Im Editor bietet die Autovervollständigung nach `SECRETS.` die vorhandenen Zugangsdaten an und nach dem
  nächsten Punkt genau die Felder, die dieser Zugangsdaten-Eintrag hat.
- In einem Skript:

```js
log(JSON.stringify(Object.keys(SECRETS.CameraPassword))); // ["key"]
log(JSON.stringify(Object.keys(SECRETS.MyMailAccount))); // ["login","password"]
```

Blockly hat für denselben Zweck einen **Zugangsdaten**-Baustein - siehe die
[Blockly-Dokumentation](../en/blockly.md#credential) (englisch).

Der Zugriff kann mit der Instanzoption **Skripten den Zugriff auf die Zugangsdaten erlauben** abgeschaltet werden.
`SECRETS` ist dann leer, und es wird eine Warnung ins Log geschrieben.

**Hinweis:** Dies erfordert js-controller 7.2 oder neuer.

## Option - "Nicht alle Zustände beim Start abonnieren"
Es gibt zwei Modi, States zu abonnieren:

1. Der Adapter abonniert beim Start alle States und empfängt alle Änderungen aller States (getState(id) ist einfach zu verwenden, benötigt aber mehr CPU und RAM):

```js
log(getState('someID').val);
```

2. Der Adapter abonniert die angegebene ID jedes Mal, wenn `on/subscribe` aufgerufen wird. In diesem Modus empfängt der Adapter nur Aktualisierungen für die gewünschten States. Diese Option benötigt weniger RAM und ist effizienter, allerdings kann man nicht synchron über getState auf States zugreifen. **Man muss Callbacks oder Promises verwenden, um auf die States zuzugreifen**:

```js
getState('someID', (error, state) => {
    log(state.val);
});
```

Grund: Der Adapter hat den Wert des States nicht im RAM und muss ihn aus der zentralen State-Datenbank anfordern.

## Skriptaktivität

Skripte können über States aktiviert und deaktiviert werden. Für jedes Skript wird ein State mit dem Namen `javascript.INSTANCE.scriptEnabled.SCRIPT_NAME` angelegt.
Skripte können aktiviert und deaktiviert werden, indem dieser State mit `ack=false` gesteuert wird.
